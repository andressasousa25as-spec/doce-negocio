# Painel ADM (gráficos, clientes, novidades, e-mail, WhatsApp, CSV) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o `DashboardAdm` em um painel com indicadores+gráfico, gestão de clientes (via função segura), e avisos in-app com envio por e-mail (Resend) e WhatsApp (link), além de exportação CSV.

**Architecture:** Lógica de métricas/CSV/WhatsApp em funções puras testáveis (Vitest). Escritas administrativas em perfis e envio de e-mail passam por Edge Functions (`service_role` + checagem `is_adm`). Avisos numa tabela nova com RLS; exibição na Home calculada por data de agendamento.

**Tech Stack:** React + Vite + TS, Supabase (Postgres + Edge Functions Deno), Resend (e-mail), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-10-painel-adm-graficos-novidades-design.md`

**Projeto Supabase:** `tahjqrlbbzbtawthzrfc` (migração e deploy de funções são feitos pelo controlador via Supabase MCP).

**Pré-requisito da parte de e-mail:** conta no Resend + secret `RESEND_API_KEY` e `EMAIL_FROM` (configurados no fim; o resto funciona sem isso).

---

## Task 1: Tipos novos (Aviso) + funções puras de métricas (TDD)

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/admMetrics.ts`
- Test: `src/lib/admMetrics.test.ts`

- [ ] **Step 1: Adicionar tipo `Aviso` ao fim de `src/types/index.ts`**

```ts
export interface Aviso {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'promo' | 'alerta'
  ativo: boolean
  agendado_para?: string | null
  created_at: string
}
```

- [ ] **Step 2: Escrever o teste `src/lib/admMetrics.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { calcularIndicadores, agruparCadastros } from './admMetrics'
import type { Perfil } from '../types'

function p(over: Partial<Perfil>): Perfil {
  return {
    id: Math.random().toString(), created_at: '2026-06-01T00:00:00Z', updated_at: '',
    nome: 'X', email: 'x@x.com', cidade: 'Macapá', ativo: false, plano: 'completo',
    status_assinatura: 'trial', valor_plano: 0, data_inicio: '2026-06-01', is_adm: false, ...over,
  }
}
const hoje = new Date('2026-06-10T12:00:00')

describe('calcularIndicadores', () => {
  it('conta total, ativos, em teste, vencendo e receita', () => {
    const perfis: Perfil[] = [
      p({ status_assinatura: 'ativa', plano: 'completo', valor_plano: 99, data_venc: '2026-07-10' }),
      p({ status_assinatura: 'ativa', plano: 'basico', valor_plano: 59, data_venc: '2026-06-13' }), // vence em 3 dias
      p({ status_assinatura: 'trial', data_venc: '2026-06-12' }),
      p({ status_assinatura: 'expirada', data_venc: '2026-06-01' }),
    ]
    const r = calcularIndicadores(perfis, hoje)
    expect(r.total).toBe(4)
    expect(r.ativos).toBe(2)
    expect(r.emTeste).toBe(1)
    expect(r.vencendo7).toBe(2) // o ativo que vence 13/06 e o trial que vence 12/06
    expect(r.receitaMensal).toBe(158) // 99 + 59
  })
})

describe('agruparCadastros', () => {
  it('agrupa por mês (6 meses) somando cadastros', () => {
    const perfis = [ p({ created_at: '2026-06-02T00:00:00Z' }), p({ created_at: '2026-06-09T00:00:00Z' }), p({ created_at: '2026-05-20T00:00:00Z' }) ]
    const r = agruparCadastros(perfis, 'mes', hoje)
    expect(r.length).toBe(6)
    expect(r[r.length - 1].valor).toBe(2) // junho
    expect(r[r.length - 2].valor).toBe(1) // maio
  })
  it('agrupa por dia (30 dias)', () => {
    const perfis = [ p({ created_at: '2026-06-10T08:00:00Z' }), p({ created_at: '2026-06-10T09:00:00Z' }) ]
    const r = agruparCadastros(perfis, 'dia', hoje)
    expect(r.length).toBe(30)
    expect(r[r.length - 1].valor).toBe(2) // hoje
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL (módulo `./admMetrics` não existe).

- [ ] **Step 4: Implementar `src/lib/admMetrics.ts`**

```ts
import type { Perfil } from '../types'

export interface Indicadores {
  total: number
  ativos: number
  emTeste: number
  vencendo7: number
  receitaMensal: number
}

function diaUTC(s: string): number { return new Date(s + 'T12:00:00').getTime() }

export function calcularIndicadores(perfis: Perfil[], agora: Date = new Date()): Indicadores {
  const hoje = agora.getTime()
  const em7 = hoje + 7 * 24 * 60 * 60 * 1000
  let ativos = 0, emTeste = 0, vencendo7 = 0, receitaMensal = 0
  for (const p of perfis) {
    const venc = p.data_venc ? diaUTC(p.data_venc) : 0
    const vencOk = venc >= hoje
    if (p.status_assinatura === 'ativa' && vencOk) { ativos++; receitaMensal += p.valor_plano || 0 }
    if (p.status_assinatura === 'trial' && vencOk) emTeste++
    if ((p.status_assinatura === 'ativa' || p.status_assinatura === 'trial') && venc >= hoje && venc <= em7) vencendo7++
  }
  return { total: perfis.length, ativos, emTeste, vencendo7, receitaMensal }
}

export interface Barra { label: string; valor: number }

export function agruparCadastros(perfis: Perfil[], modo: 'mes' | 'dia', agora: Date = new Date()): Barra[] {
  const MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const barras: Barra[] = []
  if (modo === 'mes') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const valor = perfis.filter(p => {
        const c = new Date(p.created_at)
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
      }).length
      barras.push({ label: MES[d.getMonth()], valor })
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - i)
      const valor = perfis.filter(p => {
        const c = new Date(p.created_at)
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth() && c.getDate() === d.getDate()
      }).length
      barras.push({ label: String(d.getDate()).padStart(2, '0'), valor })
    }
  }
  return barras
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS (testes anteriores + os novos).

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/admMetrics.ts src/lib/admMetrics.test.ts
git commit -m "feat(adm): tipo Aviso + metricas puras (indicadores e crescimento)"
```

---

## Task 2: Funções puras CSV e WhatsApp (TDD)

**Files:**
- Create: `src/lib/csv.ts`, `src/lib/whatsapp.ts`
- Test: `src/lib/csv.test.ts`, `src/lib/whatsapp.test.ts`

- [ ] **Step 1: Testes**

Create `src/lib/whatsapp.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { linkWhatsApp } from './whatsapp'

describe('linkWhatsApp', () => {
  it('monta link wa.me com 55 e mensagem encodada', () => {
    expect(linkWhatsApp('(96) 99999-1234', 'Olá, tudo bem?'))
      .toBe('https://wa.me/5596999991234?text=Ol%C3%A1%2C%20tudo%20bem%3F')
  })
  it('retorna null para telefone vazio/curto', () => {
    expect(linkWhatsApp('', 'oi')).toBeNull()
    expect(linkWhatsApp('123', 'oi')).toBeNull()
  })
})
```

Create `src/lib/csv.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { gerarCsvClientes } from './csv'
import type { Perfil } from '../types'

const base: Perfil = {
  id: '1', created_at: '', updated_at: '', nome: 'Maria, Silva', email: 'm@x.com',
  telefone: '96999990000', cidade: 'Macapá', ativo: true, plano: 'completo',
  status_assinatura: 'ativa', valor_plano: 99, data_inicio: '2026-06-01', data_venc: '2026-07-01', is_adm: false,
}

describe('gerarCsvClientes', () => {
  it('gera cabeçalho e linhas, com aspas em campos com vírgula', () => {
    const csv = gerarCsvClientes([base])
    const linhas = csv.trim().split('\n')
    expect(linhas[0]).toBe('Nome,Email,Telefone,Cidade,Plano,Status,Vencimento')
    expect(linhas[1]).toContain('"Maria, Silva"')
    expect(linhas[1]).toContain('m@x.com')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar `src/lib/whatsapp.ts`**

```ts
export function linkWhatsApp(telefone: string | undefined | null, mensagem: string): string | null {
  const digitos = (telefone || '').replace(/\D/g, '')
  if (digitos.length < 10) return null
  const comDDI = digitos.startsWith('55') ? digitos : '55' + digitos
  return `https://wa.me/${comDDI}?text=${encodeURIComponent(mensagem)}`
}
```

- [ ] **Step 4: Implementar `src/lib/csv.ts`**

```ts
import type { Perfil } from '../types'

function campo(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function gerarCsvClientes(perfis: Perfil[]): string {
  const cab = ['Nome', 'Email', 'Telefone', 'Cidade', 'Plano', 'Status', 'Vencimento']
  const linhas = perfis.map(p => [
    p.nome, p.email, p.telefone || '', p.cidade, p.plano, p.status_assinatura, p.data_venc || '',
  ].map(campo).join(','))
  return [cab.join(','), ...linhas].join('\n')
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/csv.ts src/lib/csv.test.ts src/lib/whatsapp.ts src/lib/whatsapp.test.ts
git commit -m "feat(adm): funcoes puras CSV e link de WhatsApp"
```

---

## Task 3: Migração `avisos` + RLS (controlador via Supabase MCP)

**Files:**
- Create: `supabase/migrations/20260610120000_avisos.sql`

- [ ] **Step 1: Escrever a migração**

```sql
create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  tipo text not null default 'info',
  ativo boolean not null default true,
  agendado_para timestamptz,
  created_at timestamptz not null default now()
);

alter table public.avisos enable row level security;

create policy "avisos_select_ativos" on public.avisos
  for select to authenticated using (ativo = true);

create policy "avisos_admin_all" on public.avisos
  for all to authenticated
  using (exists (select 1 from public.perfis where id = auth.uid() and is_adm = true))
  with check (exists (select 1 from public.perfis where id = auth.uid() and is_adm = true));
```

- [ ] **Step 2: Aplicar (controlador)**

Aplicar via Supabase MCP `apply_migration(project_id='tahjqrlbbzbtawthzrfc', name='avisos', query=<acima>)`.
Expected: sucesso; `list_tables` mostra `avisos`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260610120000_avisos.sql
git commit -m "feat(db): tabela avisos com RLS (leitura ativa, escrita admin)"
```

---

## Task 4: Serviços (avisos, admin, e-mail) no supabaseService

**Files:**
- Modify: `src/services/supabaseService.ts`

- [ ] **Step 1: Adicionar serviços ao fim de `src/services/supabaseService.ts`**

```ts
import type { Aviso } from '../types'

// ── AVISOS ───────────────────────────────────────────────────────────────────
export const avisoService = {
  async listarVisiveis(): Promise<Aviso[]> {
    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('avisos').select('*')
      .eq('ativo', true)
      .or(`agendado_para.is.null,agendado_para.lte.${agora}`)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Aviso[]
  },
  async listarTodos(): Promise<Aviso[]> {
    const { data, error } = await supabase.from('avisos').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Aviso[]
  },
  async criar(aviso: Pick<Aviso, 'titulo' | 'mensagem' | 'tipo'> & { agendado_para?: string | null }) {
    const { data, error } = await supabase.from('avisos').insert(aviso).select().single()
    if (error) throw error
    return data as Aviso
  },
  async alternar(id: string, ativo: boolean) {
    const { error } = await supabase.from('avisos').update({ ativo }).eq('id', id)
    if (error) throw error
  },
  async excluir(id: string) {
    const { error } = await supabase.from('avisos').delete().eq('id', id)
    if (error) throw error
  },
}

// ── ADMIN (ajustes de perfil via Edge Function) ──────────────────────────────
type AcaoAdm =
  | { acao: 'definir_plano'; alvoId: string; dados: { plano: 'basico' | 'completo' } }
  | { acao: 'dar_dias'; alvoId: string; dados: { dias: number } }
  | { acao: 'bloquear'; alvoId: string; dados?: Record<string, never> }
  | { acao: 'editar_dados'; alvoId: string; dados: { nome?: string; nome_negocio?: string; telefone?: string; cidade?: string } }

export const admService = {
  async executar(payload: AcaoAdm) {
    const { data, error } = await supabase.functions.invoke('admin-perfil', { body: payload })
    if (error) throw error
    return data
  },
}

// ── E-MAIL (Resend via Edge Function) ────────────────────────────────────────
export const emailService = {
  async enviar(assunto: string, corpo: string): Promise<{ enviados: number; falhas: number }> {
    const { data, error } = await supabase.functions.invoke('enviar-email', { body: { assunto, corpo } })
    if (error) throw error
    return data as { enviados: number; falhas: number }
  },
}
```

- [ ] **Step 2: Verificar build**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/services/supabaseService.ts
git commit -m "feat(adm): servicos de avisos, admin-perfil e e-mail"
```

---

## Task 5: Banner de avisos na Home

**Files:**
- Create: `src/components/AvisosBanner.tsx`
- Modify: `src/components/Home.tsx`

- [ ] **Step 1: Criar `src/components/AvisosBanner.tsx`**

```tsx
import { useState, useEffect } from 'react'
import type { Aviso } from '../types'
import { avisoService } from '../services/supabaseService'

const COR: Record<Aviso['tipo'], { bg: string; bd: string; tx: string }> = {
  info:   { bg: '#EFF6FF', bd: '#BFDBFE', tx: '#1D4ED8' },
  promo:  { bg: '#FDF2F8', bd: '#FBCFE8', tx: '#BE185D' },
  alerta: { bg: '#FFFBEB', bd: '#FDE68A', tx: '#92400E' },
}

export default function AvisosBanner() {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [fechados, setFechados] = useState<string[]>(() => JSON.parse(localStorage.getItem('avisos_fechados') || '[]'))

  useEffect(() => { avisoService.listarVisiveis().then(setAvisos).catch(() => {}) }, [])

  function fechar(id: string) {
    const novo = [...fechados, id]
    setFechados(novo)
    localStorage.setItem('avisos_fechados', JSON.stringify(novo))
  }

  const visiveis = avisos.filter(a => !fechados.includes(a.id))
  if (visiveis.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
      {visiveis.map(a => {
        const c = COR[a.tipo] || COR.info
        return (
          <div key={a.id} style={{ backgroundColor: c.bg, border: `1px solid ${c.bd}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, color: c.tx, fontSize: 13, margin: '0 0 2px' }}>{a.titulo}</p>
              <p style={{ fontSize: 13, color: '#4B5563', margin: 0, lineHeight: 1.5 }}>{a.mensagem}</p>
            </div>
            <button onClick={() => fechar(a.id)} aria-label="Fechar aviso" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9CA3AF', flexShrink: 0 }}>✕</button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Renderizar na Home**

Em `src/components/Home.tsx`, adicionar o import no topo:

```tsx
import AvisosBanner from './AvisosBanner'
```

E, no JSX retornado, como **primeiro elemento dentro da coluna esquerda** (`left`), antes do banner de boas-vindas, inserir:

```tsx
      <AvisosBanner />
```

- [ ] **Step 3: Verificar build**

Run: `npx tsc -b && npm run build`
Expected: sucesso.

- [ ] **Step 4: Commit**

```bash
git add src/components/AvisosBanner.tsx src/components/Home.tsx
git commit -m "feat(adm): banner de avisos na Home das clientes"
```

---

## Task 6: Edge Function `admin-perfil`

**Files:**
- Create: `supabase/functions/admin-perfil/index.ts`

- [ ] **Step 1: Escrever a função**

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supaUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: ud } = await supaUser.auth.getUser()
    const user = ud?.user
    if (!user) return new Response(JSON.stringify({ error: 'nao autenticado' }), { status: 401, headers: cors })

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: me } = await admin.from('perfis').select('is_adm').eq('id', user.id).single()
    if (!me?.is_adm) return new Response(JSON.stringify({ error: 'sem permissao' }), { status: 403, headers: cors })

    const { acao, alvoId, dados } = await req.json()
    if (!alvoId) return new Response(JSON.stringify({ error: 'alvo invalido' }), { status: 400, headers: cors })

    const hoje = new Date()
    let update: Record<string, unknown> = {}
    if (acao === 'definir_plano') {
      const venc = new Date(); venc.setMonth(venc.getMonth() + 1)
      update = { status_assinatura: 'ativa', ativo: true, plano: dados.plano === 'completo' ? 'completo' : 'basico', valor_plano: dados.plano === 'completo' ? 99 : 59, data_venc: venc.toISOString().split('T')[0] }
    } else if (acao === 'dar_dias') {
      const { data: alvo } = await admin.from('perfis').select('data_venc').eq('id', alvoId).single()
      const base = alvo?.data_venc && new Date(alvo.data_venc + 'T12:00:00') > hoje ? new Date(alvo.data_venc + 'T12:00:00') : hoje
      base.setDate(base.getDate() + Number(dados.dias || 0))
      update = { status_assinatura: 'ativa', ativo: true, data_venc: base.toISOString().split('T')[0] }
    } else if (acao === 'bloquear') {
      update = { status_assinatura: 'cancelada', ativo: false }
    } else if (acao === 'editar_dados') {
      const permitido = ['nome', 'nome_negocio', 'telefone', 'cidade']
      for (const k of permitido) if (k in dados) update[k] = dados[k]
    } else {
      return new Response(JSON.stringify({ error: 'acao invalida' }), { status: 400, headers: cors })
    }

    const { error } = await admin.from('perfis').update(update).eq('id', alvoId)
    if (error) { console.error(error); return new Response(JSON.stringify({ error: 'falha ao atualizar' }), { status: 500, headers: cors }) }
    return new Response(JSON.stringify({ ok: true, update }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'erro interno' }), { status: 500, headers: cors })
  }
})
```

- [ ] **Step 2: Deploy (controlador)**

Deploy via Supabase MCP `deploy_edge_function(project_id='tahjqrlbbzbtawthzrfc', name='admin-perfil', verify_jwt=false, files=[index.ts])`.
Expected: ACTIVE.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/admin-perfil/index.ts
git commit -m "feat(fn): admin-perfil (ajustes de cliente com checagem is_adm)"
```

---

## Task 7: Edge Function `enviar-email` (Resend)

**Files:**
- Create: `supabase/functions/enviar-email/index.ts`

- [ ] **Step 1: Escrever a função**

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supaUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: ud } = await supaUser.auth.getUser()
    const user = ud?.user
    if (!user) return new Response(JSON.stringify({ error: 'nao autenticado' }), { status: 401, headers: cors })

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: me } = await admin.from('perfis').select('is_adm').eq('id', user.id).single()
    if (!me?.is_adm) return new Response(JSON.stringify({ error: 'sem permissao' }), { status: 403, headers: cors })

    const { assunto, corpo } = await req.json()
    const { data: perfis } = await admin.from('perfis').select('email').eq('is_adm', false)
    const emails = (perfis || []).map((p: { email: string }) => p.email).filter(Boolean)

    const apiKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('EMAIL_FROM')
    if (!apiKey || !from) return new Response(JSON.stringify({ error: 'email nao configurado' }), { status: 503, headers: cors })

    let enviados = 0, falhas = 0
    for (const to of emails) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, subject: assunto, html: `<p>${corpo}</p>` }),
        })
        if (r.ok) enviados++; else { falhas++; console.error('resend', await r.text()) }
      } catch (e) { falhas++; console.error(e) }
    }
    return new Response(JSON.stringify({ enviados, falhas }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'erro interno' }), { status: 500, headers: cors })
  }
})
```

- [ ] **Step 2: Deploy (controlador)**

Deploy via Supabase MCP `deploy_edge_function(project_id='tahjqrlbbzbtawthzrfc', name='enviar-email', verify_jwt=false, files=[index.ts])`.
Expected: ACTIVE. (Funciona de verdade só após configurar `RESEND_API_KEY`/`EMAIL_FROM` na Task 11; antes disso retorna 503.)

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/enviar-email/index.ts
git commit -m "feat(fn): enviar-email via Resend (checagem is_adm)"
```

---

## Task 8: DashboardAdm com abas + Visão Geral

**Files:**
- Modify: `src/pages/DashboardAdm.tsx`
- Create: `src/components/adm/AdmVisaoGeral.tsx`

- [ ] **Step 1: Criar `src/components/adm/AdmVisaoGeral.tsx`**

```tsx
import { useState } from 'react'
import type { Perfil } from '../../types'
import { calcularIndicadores, agruparCadastros } from '../../lib/admMetrics'
import { gerarCsvClientes } from '../../lib/csv'

export default function AdmVisaoGeral({ clientes }: { clientes: Perfil[] }) {
  const [modo, setModo] = useState<'mes' | 'dia'>('mes')
  const ind = calcularIndicadores(clientes)
  const barras = agruparCadastros(clientes, modo)
  const max = Math.max(1, ...barras.map(b => b.valor))

  function exportar() {
    const csv = gerarCsvClientes(clientes)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = 'clientes-doce-negocio.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const cards = [
    { l: 'Total de clientes', v: ind.total, c: '#DB2777', bg: '#fff' },
    { l: 'Assinantes ativos', v: ind.ativos, c: '#16A34A', bg: '#fff' },
    { l: 'Em teste', v: ind.emTeste, c: '#7C3AED', bg: '#fff' },
    { l: 'Vencendo (7 dias)', v: ind.vencendo7, c: '#DC2626', bg: '#FEF2F2' },
    { l: 'Receita / mês', v: 'R$ ' + ind.receitaMensal.toFixed(2).replace('.', ','), c: '#111827', bg: '#fff' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
        {cards.map(c => (
          <div key={c.l} style={{ backgroundColor: c.bg, borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 4px' }}>{c.l}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: c.c, margin: 0 }}>{c.v}</p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>Crescimento de cadastros</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['mes', 'dia'] as const).map(m => (
              <button key={m} onClick={() => setModo(m)} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', backgroundColor: modo === m ? '#EC4899' : '#FCE7F3', color: modo === m ? '#fff' : '#9D2463' }}>
                {m === 'mes' ? 'Mensal' : 'Diário'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: modo === 'mes' ? 10 : 3, height: 160, overflowX: 'auto' }}>
          {barras.map((b, i) => (
            <div key={i} style={{ flex: 1, minWidth: modo === 'dia' ? 8 : 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              {b.valor > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#DB2777' }}>{b.valor}</span>}
              <div style={{ width: '100%', maxWidth: 34, height: Math.round((b.valor / max) * 120), minHeight: b.valor > 0 ? 4 : 0, backgroundColor: '#EC4899', borderRadius: '6px 6px 0 0' }} />
              <span style={{ fontSize: 9, color: '#9CA3AF' }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={exportar} style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 12, border: '1px solid #FBCFE8', backgroundColor: '#fff', color: '#BE185D', cursor: 'pointer' }}>
        ⬇️ Exportar planilha (CSV)
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Reescrever `src/pages/DashboardAdm.tsx` como shell de abas**

```tsx
import { useState, useEffect } from 'react'
import type { Perfil } from '../types'
import { perfilService } from '../services/supabaseService'
import AdmVisaoGeral from '../components/adm/AdmVisaoGeral'
import AdmClientes from '../components/adm/AdmClientes'
import AdmNovidades from '../components/adm/AdmNovidades'

interface Props { perfil: Perfil; onLogout: () => void }
type AbaAdm = 'visao' | 'clientes' | 'novidades'

const ABAS: { id: AbaAdm; label: string; icon: string }[] = [
  { id: 'visao', label: 'Visão Geral', icon: '📊' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'novidades', label: 'Novidades', icon: '📢' },
]

export default function DashboardAdm({ perfil, onLogout }: Props) {
  const [aba, setAba] = useState<AbaAdm>('visao')
  const [clientes, setClientes] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)

  function carregar() {
    setLoading(true)
    perfilService.listarTodos()
      .then(d => setClientes((d || []).filter((p: Perfil) => !p.is_adm)))
      .finally(() => setLoading(false))
  }
  useEffect(() => { carregar() }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#FFF0F5,#FFF8F0)', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#BE185D', margin: 0 }}>🛡️ Painel ADM</h1>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Olá, {perfil.nome}</p>
          </div>
          <button onClick={onLogout} style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>Sair</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{ fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', backgroundColor: aba === a.id ? '#EC4899' : '#fff', color: aba === a.id ? '#fff' : '#6B7280' }}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#F9A8D4' }}>Carregando...</div>
        ) : aba === 'visao' ? (
          <AdmVisaoGeral clientes={clientes} />
        ) : aba === 'clientes' ? (
          <AdmClientes clientes={clientes} onMudou={carregar} />
        ) : (
          <AdmNovidades clientes={clientes} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build (vai falhar até Tasks 9 e 10)**

Run: `npx tsc -b`
Expected: erro "Cannot find module AdmClientes/AdmNovidades" — esperado. Não commitar ainda; fechar junto na Task 10.

---

## Task 9: Aba Clientes (lista + Gerenciar + WhatsApp)

**Files:**
- Create: `src/components/adm/AdmClientes.tsx`

- [ ] **Step 1: Criar `src/components/adm/AdmClientes.tsx`**

```tsx
import { useState } from 'react'
import type { Perfil } from '../../types'
import { admService } from '../../services/supabaseService'
import { linkWhatsApp } from '../../lib/whatsapp'

const STATUS: Record<string, { l: string; bg: string; tx: string }> = {
  ativa: { l: 'Ativo', bg: '#DCFCE7', tx: '#16A34A' },
  trial: { l: 'Teste', bg: '#EDE9FE', tx: '#7C3AED' },
  expirada: { l: 'Vencido', bg: '#FEE2E2', tx: '#DC2626' },
  cancelada: { l: 'Bloqueado', bg: '#F3F4F6', tx: '#6B7280' },
}

export default function AdmClientes({ clientes, onMudou }: { clientes: Perfil[]; onMudou: () => void }) {
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState<Perfil | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', nome_negocio: '', telefone: '', cidade: '' })

  function abrir(c: Perfil) {
    setSel(c)
    setForm({ nome: c.nome || '', nome_negocio: c.nome_negocio || '', telefone: c.telefone || '', cidade: c.cidade || '' })
  }

  async function acao(p: Parameters<typeof admService.executar>[0]) {
    setSalvando(true)
    try { await admService.executar(p); onMudou(); setSel(null) }
    catch { alert('Não foi possível salvar. Tente de novo.') }
    finally { setSalvando(false) }
  }

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.email?.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)}
        style={{ width: '100%', border: '1px solid #FBCFE8', borderRadius: 12, padding: '10px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />

      {filtrados.map(c => {
        const s = STATUS[c.status_assinatura] || STATUS.expirada
        return (
          <div key={c.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: '#374151', fontSize: 14, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome_negocio || c.email}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: s.bg, color: s.tx }}>{s.l}</span>
              <button onClick={() => abrir(c)} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: '#FCE7F3', color: '#BE185D' }}>Gerenciar</button>
            </div>
          </div>
        )
      })}

      {sel && (
        <div onClick={() => !salvando && setSel(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', width: '100%', maxWidth: 448, borderRadius: '24px 24px 0 0', padding: 22, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontWeight: 700, color: '#374151', fontSize: 15, margin: 0 }}>{sel.nome}</h3>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9CA3AF' }}>✕</button>
            </div>

            <div>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>Plano e acesso</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button disabled={salvando} onClick={() => acao({ acao: 'definir_plano', alvoId: sel.id, dados: { plano: 'basico' } })} style={btn('#FCE7F3', '#BE185D')}>Ativar Básico</button>
                <button disabled={salvando} onClick={() => acao({ acao: 'definir_plano', alvoId: sel.id, dados: { plano: 'completo' } })} style={btn('#EC4899', '#fff')}>Ativar Completo</button>
                <button disabled={salvando} onClick={() => acao({ acao: 'bloquear', alvoId: sel.id })} style={btn('#FEF2F2', '#DC2626')}>Bloquear</button>
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>Dar dias grátis</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[7, 15, 30].map(d => (
                  <button key={d} disabled={salvando} onClick={() => acao({ acao: 'dar_dias', alvoId: sel.id, dados: { dias: d } })} style={btn('#F0FDF4', '#16A34A')}>+{d} dias</button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>Editar dados</p>
              {(['nome', 'nome_negocio', 'telefone', 'cidade'] as const).map(k => (
                <input key={k} placeholder={k} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #FBCFE8', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
              ))}
              <button disabled={salvando} onClick={() => acao({ acao: 'editar_dados', alvoId: sel.id, dados: form })} style={{ ...btn('#EC4899', '#fff'), width: '100%' }}>Salvar dados</button>
            </div>

            {linkWhatsApp(sel.telefone, `Olá ${sel.nome}! Aqui é do Doce Negócio.`) && (
              <a href={linkWhatsApp(sel.telefone, `Olá ${sel.nome}! Aqui é do Doce Negócio.`)!} target="_blank" rel="noreferrer"
                style={{ textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '11px', borderRadius: 12, backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                📱 Abrir WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function btn(bg: string, tx: string): React.CSSProperties {
  return { fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: bg, color: tx }
}
```

- [ ] **Step 2: Build (ainda falta AdmNovidades)**

Run: `npx tsc -b`
Expected: resta só o erro de `AdmNovidades`. Seguir.

---

## Task 10: Aba Novidades (form + lista + e-mail + WhatsApp)

**Files:**
- Create: `src/components/adm/AdmNovidades.tsx`

- [ ] **Step 1: Criar `src/components/adm/AdmNovidades.tsx`**

```tsx
import { useState, useEffect } from 'react'
import type { Perfil, Aviso } from '../../types'
import { avisoService, emailService } from '../../services/supabaseService'
import { linkWhatsApp } from '../../lib/whatsapp'

export default function AdmNovidades({ clientes }: { clientes: Perfil[] }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [tipo, setTipo] = useState<Aviso['tipo']>('info')
  const [agendar, setAgendar] = useState('')
  const [porEmail, setPorEmail] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [zap, setZap] = useState<string>('')

  function carregar() { avisoService.listarTodos().then(setAvisos).catch(() => {}) }
  useEffect(() => { carregar() }, [])

  async function publicar() {
    if (!titulo || !mensagem) return
    setSalvando(true)
    try {
      await avisoService.criar({ titulo, mensagem, tipo, agendado_para: agendar ? new Date(agendar).toISOString() : null })
      if (porEmail) {
        const r = await emailService.enviar(titulo, mensagem)
        alert(`E-mails enviados: ${r.enviados} · falhas: ${r.falhas}`)
      }
      setZap(mensagem)
      setTitulo(''); setMensagem(''); setAgendar(''); setPorEmail('' as unknown as boolean && false)
      carregar()
    } catch { alert('Não foi possível publicar.') }
    finally { setSalvando(false) }
  }

  const comZap = clientes.filter(c => linkWhatsApp(c.telefone, '') !== null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontWeight: 700, color: '#374151', fontSize: 14, margin: 0 }}>Nova novidade</p>
        <input placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} style={inp} />
        <textarea placeholder="Mensagem" value={mensagem} onChange={e => setMensagem(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={tipo} onChange={e => setTipo(e.target.value as Aviso['tipo'])} style={{ ...inp, width: 'auto' }}>
            <option value="info">Info</option><option value="promo">Promoção</option><option value="alerta">Alerta</option>
          </select>
          <label style={{ fontSize: 12, color: '#6B7280' }}>Agendar: <input type="datetime-local" value={agendar} onChange={e => setAgendar(e.target.value)} style={{ ...inp, width: 'auto', display: 'inline-block' }} /></label>
          <label style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={porEmail} onChange={e => setPorEmail(e.target.checked)} /> Enviar por e-mail
          </label>
        </div>
        <button onClick={publicar} disabled={salvando || !titulo || !mensagem} style={{ backgroundColor: salvando ? '#F9A8D4' : '#EC4899', color: '#fff', fontWeight: 700, padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14 }}>
          {salvando ? 'Publicando...' : 'Publicar'}
        </button>
      </div>

      {zap && comZap.length > 0 && (
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', margin: '0 0 8px' }}>📱 Enviar no WhatsApp (clique em cada uma)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {comZap.map(c => (
              <a key={c.id} href={linkWhatsApp(c.telefone, zap)!} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#16A34A', textDecoration: 'none' }}>→ {c.nome} ({c.telefone})</a>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {avisos.map(a => (
          <div key={a.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: '#374151', fontSize: 13, margin: '0 0 2px' }}>{a.titulo}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{a.tipo}{a.agendado_para ? ' · agendado' : ''}{a.ativo ? '' : ' · inativo'}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => avisoService.alternar(a.id, !a.ativo).then(carregar)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: '#FCE7F3', color: '#BE185D' }}>{a.ativo ? 'Desligar' : 'Ligar'}</button>
              <button onClick={() => confirm('Excluir aviso?') && avisoService.excluir(a.id).then(carregar)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: '#FEF2F2', color: '#DC2626' }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', border: '1px solid #FBCFE8', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
```

- [ ] **Step 2: Corrigir detalhe do reset de `porEmail`**

No `publicar`, a linha de reset `setPorEmail(...)` está confusa — trocar por `setPorEmail(false)`. Garantir que a linha final do try seja:

```tsx
      setTitulo(''); setMensagem(''); setAgendar(''); setPorEmail(false)
```

- [ ] **Step 3: Build completo + testes**

Run: `npx tsc -b && npm run build && npm test`
Expected: tudo PASS.

- [ ] **Step 4: Commit (fecha Tasks 8, 9, 10)**

```bash
git add src/pages/DashboardAdm.tsx src/components/adm/
git commit -m "feat(adm): painel com abas Visao Geral, Clientes e Novidades"
```

---

## Task 11: Configurar Resend, deploy e verificação final

- [ ] **Step 1: Conta Resend + secrets (usuária + controlador)**

A usuária cria conta grátis no Resend, gera uma **API Key** e verifica um remetente. Definir os secrets no Supabase (Edge Functions → Secrets):
- `RESEND_API_KEY` = a chave do Resend
- `EMAIL_FROM` = o remetente verificado (ex.: `Doce Negócio <avisos@seudominio.com>`; sem domínio próprio, usar o remetente de teste do Resend)

- [ ] **Step 2: Confirmar deploy das funções**

Via Supabase MCP `list_edge_functions(project_id='tahjqrlbbzbtawthzrfc')` — confirmar `admin-perfil` e `enviar-email` ACTIVE.

- [ ] **Step 3: Publicar frontend**

```bash
git push origin <branch>
```
Merge para `main` após validação no preview (a Vercel republica produção).

- [ ] **Step 4: Verificação manual (logada como admin)**

- [ ] Visão Geral: indicadores corretos; alternar mensal/diário; exportar CSV baixa o arquivo.
- [ ] Clientes: ativar Completo numa cliente de teste → confere no banco que `status_assinatura='ativa'`/`plano='completo'`; dar +7 dias; editar dados; bloquear.
- [ ] Novidades: publicar aviso → aparece na Home de uma cliente; fechar funciona; agendar para o futuro → não aparece até a data.
- [ ] E-mail (após Resend): publicar com "Enviar por e-mail" → recebe e mostra enviados/falhas.
- [ ] WhatsApp: link abre o wa.me com a mensagem pronta.
- [ ] Cliente comum: não consegue ler/abrir o painel ADM nem criar avisos.

---

## Notas de execução

- Tasks 8–10 têm dependências cruzadas (shell + 3 subcomponentes) — commit conjunto no fim da Task 10.
- Migração (Task 3) e deploy de funções (Tasks 6, 7) são executados pelo **controlador** via Supabase MCP no projeto `tahjqrlbbzbtawthzrfc`.
- E-mail só envia de verdade após a Task 11 (Resend); antes disso a função responde 503 e o resto do painel funciona normal.
