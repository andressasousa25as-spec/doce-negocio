# Teste 3 dias, Planos e Assinatura Mercado Pago — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar teste grátis de 3 dias, dois planos por módulo (Básico/Completo) e assinatura recorrente via Mercado Pago com liberação automática de acesso.

**Architecture:** Lógica de acesso centralizada numa função pura no frontend (`calcularAcesso`), que decide entre Dashboard, trava de MEI ou paywall. Pagamento via duas Supabase Edge Functions (criar-assinatura + webhook). Campos de acesso protegidos por privilégios de coluna no Postgres (só `service_role` altera).

**Tech Stack:** React + Vite + TypeScript, Supabase (Postgres + Edge Functions Deno), Mercado Pago Preapproval API, Vitest (novo, para a lógica pura).

**Spec:** `docs/superpowers/specs/2026-06-09-assinatura-trial-mercadopago-design.md`

**Pré-requisitos para a parte de pagamento (Tasks 10-13):**
- Access Token do Mercado Pago (da usuária).
- Project ref do Supabase + acesso para aplicar migração e deploy de funções.

---

## Task 1: Configurar Vitest (infra de testes)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Instalar Vitest**

Run: `npm i -D vitest@^2`
Expected: instala sem erros, adiciona em devDependencies.

- [ ] **Step 2: Criar config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Adicionar script de teste**

Modify `package.json` scripts — adicionar a linha `"test"`:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

- [ ] **Step 4: Rodar para confirmar que não há testes ainda**

Run: `npm test`
Expected: Vitest roda e diz "No test files found" (exit 0) ou similar.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: configura Vitest para testes de logica pura"
```

---

## Task 2: Atualizar os tipos do Perfil

**Files:**
- Modify: `src/types/index.ts:1-18`

- [ ] **Step 1: Adicionar campos de assinatura ao tipo `Perfil`**

Modify a interface `Perfil` para ficar exatamente assim:

```ts
export type StatusAssinatura = 'trial' | 'ativa' | 'expirada' | 'cancelada'
export type Plano = 'basico' | 'completo'

export interface Perfil {
  id: string
  created_at: string
  updated_at: string
  nome: string
  email: string
  telefone?: string
  nome_negocio?: string
  cnpj_mei?: string
  cidade: string
  ativo: boolean
  plano: Plano
  status_assinatura: StatusAssinatura
  valor_plano: number
  data_inicio: string
  data_venc?: string
  mp_subscription_id?: string
  foto_url?: string
  is_adm: boolean
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc -b`
Expected: pode falhar em locais que usam `plano: 'profissional'` — isso é esperado e será corrigido nas tasks seguintes (LoginPage, App). Se falhar SÓ por isso, seguir. Anotar os erros.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: adiciona campos de assinatura ao tipo Perfil"
```

---

## Task 3: Lógica de acesso `calcularAcesso` (TDD)

**Files:**
- Create: `src/lib/acesso.ts`
- Test: `src/lib/acesso.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Create `src/lib/acesso.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularAcesso, type Aba } from './acesso'
import type { Perfil } from '../types'

const base: Perfil = {
  id: '1', created_at: '', updated_at: '', nome: 'Maria', email: 'm@x.com',
  cidade: 'Macapá', ativo: false, plano: 'completo', status_assinatura: 'trial',
  valor_plano: 0, data_inicio: '2026-06-09', data_venc: '2026-06-12', is_adm: false,
}
const hoje = new Date('2026-06-10T12:00:00')

function tem(modulos: Set<Aba>, abas: Aba[]) { return abas.every(a => modulos.has(a)) }

describe('calcularAcesso', () => {
  it('em trial dentro dos 3 dias: acesso total', () => {
    const a = calcularAcesso(base, hoje)
    expect(a.estado).toBe('trial')
    expect(a.diasRestantesTrial).toBe(2)
    expect(tem(a.modulos, ['home','agenda','caixa','clientes','mei','perfil'])).toBe(true)
  })

  it('trial vencido (data_venc passada): bloqueada', () => {
    const a = calcularAcesso({ ...base, data_venc: '2026-06-09' }, hoje)
    expect(a.estado).toBe('bloqueada')
  })

  it('assinatura ativa Básico: trava MEI', () => {
    const p = { ...base, status_assinatura: 'ativa' as const, plano: 'basico' as const, ativo: true, data_venc: '2026-07-10' }
    const a = calcularAcesso(p, hoje)
    expect(a.estado).toBe('ativa')
    expect(a.modulos.has('mei')).toBe(false)
    expect(tem(a.modulos, ['home','agenda','caixa','clientes','perfil'])).toBe(true)
  })

  it('assinatura ativa Completo: tudo liberado', () => {
    const p = { ...base, status_assinatura: 'ativa' as const, plano: 'completo' as const, ativo: true, data_venc: '2026-07-10' }
    expect(calcularAcesso(p, hoje).modulos.has('mei')).toBe(true)
  })

  it('assinatura ativa mas vencida: bloqueada', () => {
    const p = { ...base, status_assinatura: 'ativa' as const, plano: 'completo' as const, data_venc: '2026-06-09' }
    expect(calcularAcesso(p, hoje).estado).toBe('bloqueada')
  })

  it('cancelada: bloqueada', () => {
    expect(calcularAcesso({ ...base, status_assinatura: 'cancelada' }, hoje).estado).toBe('bloqueada')
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test`
Expected: FAIL — `calcularAcesso` não existe.

- [ ] **Step 3: Implementar `acesso.ts`**

Create `src/lib/acesso.ts`:

```ts
import type { Perfil, Plano } from '../types'

export type Aba = 'home' | 'agenda' | 'caixa' | 'clientes' | 'mei' | 'perfil'

export interface Acesso {
  estado: 'trial' | 'ativa' | 'bloqueada'
  plano: Plano
  diasRestantesTrial: number
  modulos: Set<Aba>
}

const MODULOS_BASICO: Aba[] = ['home', 'agenda', 'caixa', 'clientes', 'perfil']
const MODULOS_COMPLETO: Aba[] = ['home', 'agenda', 'caixa', 'clientes', 'mei', 'perfil']

function diaUTC(s: string): number {
  // converte 'YYYY-MM-DD' em timestamp ao meio-dia para evitar fuso
  return new Date(s + 'T12:00:00').getTime()
}

export function calcularAcesso(perfil: Perfil, agora: Date = new Date()): Acesso {
  const hoje = agora.getTime()
  const vencOk = perfil.data_venc ? hoje <= diaUTC(perfil.data_venc) : false

  if (perfil.status_assinatura === 'trial' && vencOk) {
    const ms = diaUTC(perfil.data_venc!) - hoje
    const dias = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
    return { estado: 'trial', plano: 'completo', diasRestantesTrial: dias, modulos: new Set(MODULOS_COMPLETO) }
  }

  if (perfil.status_assinatura === 'ativa' && vencOk) {
    const modulos = perfil.plano === 'completo' ? MODULOS_COMPLETO : MODULOS_BASICO
    return { estado: 'ativa', plano: perfil.plano, diasRestantesTrial: 0, modulos: new Set(modulos) }
  }

  return { estado: 'bloqueada', plano: perfil.plano, diasRestantesTrial: 0, modulos: new Set() }
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npm test`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/acesso.ts src/lib/acesso.test.ts
git commit -m "feat: logica pura de calculo de acesso (trial/ativa/bloqueada)"
```

---

## Task 4: Cadastro grava o trial de 3 dias

**Files:**
- Modify: `src/pages/LoginPage.tsx:38-52`

- [ ] **Step 1: Ajustar o insert do perfil no cadastro**

Modify o bloco `// Cria perfil` em `handleCadastro` para:

```tsx
      // Cria perfil com teste gratis de 3 dias
      const inicio = new Date()
      const venc = new Date()
      venc.setDate(venc.getDate() + 3)
      const { data: perfil } = await supabase.from('perfis').insert({
        id: data.user.id,
        nome, email,
        telefone: tel,
        nome_negocio: negocio,
        ativo: false,
        plano: 'completo',
        status_assinatura: 'trial',
        valor_plano: 0,
        data_inicio: inicio.toISOString().split('T')[0],
        data_venc: venc.toISOString().split('T')[0],
        is_adm: false
      }).select().single()
      if (perfil) onLogin(perfil)
```

- [ ] **Step 2: Atualizar o texto do rodapé do cadastro**

Modify `src/pages/LoginPage.tsx` — o `<p>` com "Plano Profissional · R$89/mês" para:

```tsx
              <p className="text-xs text-center text-gray-400">
                3 dias grátis · Depois a partir de R$59/mês · Cancele quando quiser
              </p>
```

- [ ] **Step 3: Verificar build**

Run: `npx tsc -b`
Expected: sem erros neste arquivo.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat: cadastro inicia teste gratis de 3 dias"
```

---

## Task 5: App decide entre Dashboard e Paywall

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.tsx` (criação do perfil automático em `carregarPerfil`)

- [ ] **Step 1: Ajustar o perfil-automático para trial**

Em `carregarPerfil`, no insert do `novoPerfil`, trocar os campos de plano para:

```tsx
          const venc = new Date()
          venc.setDate(venc.getDate() + 3)
          const { data: novoPerfil } = await supabase
            .from('perfis')
            .insert({
              id: userData.user.id,
              nome: userData.user.email?.split('@')[0] || 'Confeiteira',
              email: userData.user.email || '',
              ativo: false,
              plano: 'completo',
              status_assinatura: 'trial',
              valor_plano: 0,
              data_inicio: new Date().toISOString().split('T')[0],
              data_venc: venc.toISOString().split('T')[0],
              is_adm: false
            })
            .select()
            .maybeSingle()
```

- [ ] **Step 2: Importar acesso + Planos e aplicar o gate**

No topo de `src/App.tsx`, adicionar imports:

```tsx
import { calcularAcesso } from './lib/acesso'
import Planos from './pages/Planos'
```

Substituir o bloco final de renderização (a partir de `// ADM → Painel ADM`) por:

```tsx
  // ADM → Painel ADM
  if (perfil.is_adm) return <DashboardAdm perfil={perfil} onLogout={handleLogout} />

  // Controle de acesso (trial / assinatura / bloqueio)
  const acesso = calcularAcesso(perfil)
  if (acesso.estado === 'bloqueada') {
    return <Planos perfil={perfil} onLogout={handleLogout} />
  }

  // Confeiteira → Dashboard principal
  return <Dashboard perfil={perfil} acesso={acesso} onLogout={handleLogout} setPerfil={setPerfil} />
```

- [ ] **Step 3: Verificar build (vai falhar até Planos/Dashboard existirem)**

Run: `npx tsc -b`
Expected: erro "Cannot find module './pages/Planos'" e prop `acesso` em Dashboard. Esperado — resolvido nas Tasks 6 e 7. Não commitar ainda.

> Nota de execução: esta task fica "aberta" até a Task 7. Commit conjunto no fim da Task 7.

---

## Task 6: Tela de Planos (paywall)

**Files:**
- Create: `src/pages/Planos.tsx`
- Modify: `src/services/supabaseService.ts` (adicionar `assinaturaService`)

- [ ] **Step 1: Adicionar o serviço que chama a Edge Function**

No fim de `src/services/supabaseService.ts`, adicionar:

```ts
// ── ASSINATURA (Mercado Pago) ────────────────────────────────────────────────
export const assinaturaService = {
  async criarLink(plano: 'basico' | 'completo'): Promise<string> {
    const { data, error } = await supabase.functions.invoke('criar-assinatura', {
      body: { plano },
    })
    if (error) throw error
    if (!data?.init_point) throw new Error('Resposta sem init_point')
    return data.init_point as string
  },
}
```

- [ ] **Step 2: Criar a tela de planos**

Create `src/pages/Planos.tsx`:

```tsx
import { useState } from 'react'
import type { Perfil } from '../types'
import { assinaturaService } from '../services/supabaseService'

interface Props { perfil: Perfil; onLogout: () => void }

const PLANOS = [
  { id: 'basico'   as const, nome: 'Básico',   preco: 59, modulos: ['Agenda', 'Clientes', 'Caixa'] },
  { id: 'completo' as const, nome: 'Completo', preco: 99, modulos: ['Agenda', 'Clientes', 'Caixa', 'MEI'], destaque: true },
]

export default function Planos({ perfil, onLogout }: Props) {
  const [carregando, setCarregando] = useState<string>('')
  const [erro, setErro] = useState('')

  async function assinar(plano: 'basico' | 'completo') {
    setErro(''); setCarregando(plano)
    try {
      const url = await assinaturaService.criarLink(plano)
      window.location.href = url
    } catch {
      setErro('Não conseguimos abrir o pagamento. Tente novamente em instantes.')
      setCarregando('')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#FFF0F5,#FFF8F0)', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44 }}>🎂</div>
          <h1 style={{ color: '#BE185D', fontSize: 22, fontWeight: 800, margin: '8px 0 4px' }}>Escolha seu plano</h1>
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>
            Seu teste grátis terminou. Assine para continuar usando o Doce Negócio.
          </p>
        </div>

        {erro && (
          <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 13, borderRadius: 12, padding: 12, marginBottom: 12 }}>{erro}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PLANOS.map(p => (
            <div key={p.id} style={{
              backgroundColor: 'white', borderRadius: 18, padding: 20,
              border: p.destaque ? '2px solid #EC4899' : '1px solid #FCE7F3',
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)', boxSizing: 'border-box',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#374151', margin: 0 }}>{p.nome}</h2>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#DB2777', margin: 0 }}>
                  R$ {p.preco}<span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>/mês</span>
                </p>
              </div>
              <ul style={{ margin: '12px 0 16px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Início', ...p.modulos, 'Perfil'].map(m => (
                  <li key={m} style={{ fontSize: 13, color: '#4B5563' }}>✅ {m}</li>
                ))}
              </ul>
              <button onClick={() => assinar(p.id)} disabled={!!carregando}
                style={{
                  width: '100%', backgroundColor: carregando ? '#F9A8D4' : (p.destaque ? '#EC4899' : '#374151'),
                  color: 'white', fontWeight: 700, padding: '12px 0', borderRadius: 12, border: 'none',
                  cursor: carregando ? 'not-allowed' : 'pointer', fontSize: 14,
                }}>
                {carregando === p.id ? 'Abrindo pagamento...' : `Assinar ${p.nome}`}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: '16px 0 8px' }}>
          Pagamento seguro pelo Mercado Pago (Pix ou cartão). Cancele quando quiser.
        </p>
        <button onClick={onLogout} style={{ display: 'block', margin: '0 auto', background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer' }}>
          Sair da conta ({perfil.email})
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar build (ainda falta a prop do Dashboard)**

Run: `npx tsc -b`
Expected: resta apenas o erro da prop `acesso` em `Dashboard`. Seguir para Task 7.

---

## Task 7: Dashboard recebe acesso — banner de trial e trava de MEI

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Aceitar a prop `acesso` e travar abas**

Em `src/pages/Dashboard.tsx`, adicionar o import e a prop:

```tsx
import type { Acesso, Aba as AbaLib } from '../lib/acesso'
```

Trocar a interface `Props` e a assinatura do componente:

```tsx
interface Props { perfil: Perfil; acesso: Acesso; onLogout: () => void; setPerfil: (p: Perfil) => void }
```

```tsx
export default function Dashboard({ perfil, acesso, onLogout, setPerfil }: Props) {
```

- [ ] **Step 2: Banner de trial no topo da área de conteúdo**

Logo dentro do `<div>` de conteúdo (o que tem `maxWidth: CONTENT_MAX`), como primeiro filho, adicionar:

```tsx
          {acesso.estado === 'trial' && (
            <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#92400E', fontWeight: 600 }}>
                ✨ Teste grátis — {acesso.diasRestantesTrial === 1 ? 'falta 1 dia' : `faltam ${acesso.diasRestantesTrial} dias`}
              </span>
              <button onClick={() => setAba('perfil')} style={{ fontSize: 12, fontWeight: 700, color: 'white', backgroundColor: '#EC4899', border: 'none', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}>
                Assinar agora
              </button>
            </div>
          )}
```

- [ ] **Step 3: Travar o clique nas abas bloqueadas (MEI no Básico)**

Trocar o `onClick` dos botões de aba (tanto na sidebar quanto na nav inferior) para checar acesso. Criar uma função auxiliar logo após o `const [aba, setAba] = useState<Aba>('home')`:

```tsx
  const [upsell, setUpsell] = useState(false)
  function irPara(id: Aba) {
    if (!acesso.modulos.has(id as AbaLib)) { setUpsell(true); return }
    setAba(id)
  }
```

Substituir, nos dois `ABAS.map(...)`, `onClick={() => setAba(a.id)}` por `onClick={() => irPara(a.id)}`.

Nos botões de aba, sinalizar visualmente o cadeado quando bloqueado — no conteúdo do botão da sidebar, trocar `{a.label}` por:

```tsx
{a.label}{!acesso.modulos.has(a.id as AbaLib) && <span style={{ marginLeft: 'auto', fontSize: 12 }}>🔒</span>}
```

- [ ] **Step 4: Modal de upsell para o Completo**

Antes do fechamento do componente (antes do último `</div>` que fecha o root), adicionar:

```tsx
      {upsell && (
        <div onClick={() => setUpsell(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 40 }}>🔒</div>
            <h3 style={{ color: '#BE185D', fontSize: 18, fontWeight: 800, margin: '8px 0 6px' }}>Módulo do plano Completo</h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px' }}>
              O módulo MEI faz parte do plano Completo (R$99/mês). Faça upgrade para liberar as obrigações do MEI.
            </p>
            <button onClick={() => { setUpsell(false); setAba('perfil') }} style={{ width: '100%', backgroundColor: '#EC4899', color: 'white', fontWeight: 700, padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14 }}>
              Ver planos
            </button>
            <button onClick={() => setUpsell(false)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>Agora não</button>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Verificar build completo**

Run: `npx tsc -b`
Expected: PASS (sem erros). Se algum import não usado, remover.

- [ ] **Step 6: Build de produção**

Run: `npm run build`
Expected: build conclui com sucesso.

- [ ] **Step 7: Commit (fecha Tasks 5, 6 e 7)**

```bash
git add src/App.tsx src/pages/Planos.tsx src/pages/Dashboard.tsx src/services/supabaseService.ts
git commit -m "feat: paywall, banner de trial e trava de modulo por plano"
```

---

## Task 8: Seção de Assinatura no Perfil

**Files:**
- Modify: `src/components/PerfilPage.tsx:137-150`

- [ ] **Step 1: Receber a info de acesso/trial via props existentes**

O `PerfilPage` já recebe `perfil`. Substituir o card "💳 Assinatura" (bloco `{/* Pagamento */}`) por um card que mostra status e leva à ação correta:

```tsx
      {/* Assinatura */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 12px', fontWeight: 600, color: '#374151', fontSize: 14 }}>
          💳 Assinatura
        </h3>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px' }}>
          {perfil.status_assinatura === 'trial'
            ? 'Você está no teste grátis. Assine para não perder o acesso.'
            : perfil.status_assinatura === 'ativa'
            ? `Plano ${perfil.plano === 'completo' ? 'Completo' : 'Básico'} ativo.`
            : 'Sem assinatura ativa. Escolha um plano para liberar o app.'}
        </p>
        <button
          onClick={() => { window.location.href = '/?assinar=1' }}
          style={{
            display: 'block', width: '100%', backgroundColor: '#EC4899', color: 'white', fontSize: 14,
            textAlign: 'center', fontWeight: 700, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
          }}>
          {perfil.status_assinatura === 'ativa' ? 'Trocar de plano' : 'Ver planos e assinar'}
        </button>
      </div>
```

- [ ] **Step 2: Tratar o atalho `?assinar=1` no App para abrir a tela de planos**

Em `src/App.tsx`, dentro do bloco de confeiteira (após calcular `acesso`, antes do `return <Dashboard>`), adicionar:

```tsx
  const querAssinar = new URLSearchParams(window.location.search).get('assinar') === '1'
  if (querAssinar) return <Planos perfil={perfil} onLogout={handleLogout} />
```

- [ ] **Step 3: Verificar build**

Run: `npx tsc -b && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/PerfilPage.tsx src/App.tsx
git commit -m "feat: card de assinatura no perfil com status e acesso aos planos"
```

---

## Task 9: Painel ADM — ativar/inativar e trocar plano (fallback)

**Files:**
- Modify: `src/pages/DashboardAdm.tsx`

- [ ] **Step 1: Adicionar ações de ativação por confeiteira**

Em `DashboardAdm`, importar o serviço e adicionar uma função de atualização. No topo:

```tsx
import { perfilService } from '../services/supabaseService'
```
(já existe — manter). Adicionar dentro do componente:

```tsx
  async function ativarPlano(c: Perfil, plano: 'basico' | 'completo') {
    const venc = new Date(); venc.setMonth(venc.getMonth() + 1)
    await perfilService.atualizar(c.id, {
      status_assinatura: 'ativa', ativo: true, plano,
      valor_plano: plano === 'completo' ? 99 : 59,
      data_venc: venc.toISOString().split('T')[0],
    })
    setClientes(cs => cs.map(x => x.id === c.id ? { ...x, status_assinatura: 'ativa', ativo: true, plano } : x))
  }

  async function inativar(c: Perfil) {
    await perfilService.atualizar(c.id, { status_assinatura: 'cancelada', ativo: false })
    setClientes(cs => cs.map(x => x.id === c.id ? { ...x, status_assinatura: 'cancelada', ativo: false } : x))
  }
```

- [ ] **Step 2: Adicionar os botões em cada linha da lista**

Dentro do `clientes.map(c => ...)`, no `<div className="text-right">`, abaixo do preço, adicionar:

```tsx
                  <div className="flex gap-1 mt-2 justify-end">
                    <button onClick={() => ativarPlano(c, 'basico')} className="text-xs px-2 py-1 rounded bg-pink-100 text-pink-700">Básico</button>
                    <button onClick={() => ativarPlano(c, 'completo')} className="text-xs px-2 py-1 rounded bg-pink-500 text-white">Completo</button>
                    <button onClick={() => inativar(c)} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">Inativar</button>
                  </div>
```

- [ ] **Step 3: Verificar build**

Run: `npx tsc -b && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardAdm.tsx
git commit -m "feat: ADM pode ativar/inativar e trocar plano manualmente"
```

> **CHECKPOINT — Fim da Fase 1.** Neste ponto, com a migração da Task 10 aplicada, o app já funciona com trial, paywall e ativação manual via ADM. Bom momento para publicar e testar antes da integração MP. (Se a usuária quiser, dar `git push` aqui.)

---

## Task 10: Migração do banco (colunas + segurança RLS)

**Files:**
- Create: `supabase/migrations/20260609120000_assinatura.sql`

> Aplicar via Supabase MCP (`apply_migration`) ou `supabase db push`. Requer project ref.

- [ ] **Step 1: Conferir RLS atual da tabela `perfis`**

Usar o Supabase MCP `list_tables` / consultar políticas existentes de `perfis` para não duplicar. Anotar as políticas atuais de UPDATE.

- [ ] **Step 2: Escrever a migração**

Create `supabase/migrations/20260609120000_assinatura.sql`:

```sql
-- Campos de assinatura
alter table public.perfis
  add column if not exists status_assinatura text not null default 'trial',
  add column if not exists mp_subscription_id text;

-- Normaliza valores antigos de plano
update public.perfis set plano = 'completo' where plano not in ('basico','completo');

-- Backfill de status para perfis existentes
update public.perfis set status_assinatura = 'ativa'   where ativo = true  and status_assinatura = 'trial';
update public.perfis set status_assinatura = 'expirada' where ativo = false and status_assinatura = 'trial' and data_venc < current_date;

-- Segurança: cliente NÃO pode alterar colunas de acesso (somente service_role)
revoke update on public.perfis from authenticated;
grant  update (nome, telefone, nome_negocio, cnpj_mei, cidade, foto_url, updated_at)
  on public.perfis to authenticated;
```

- [ ] **Step 3: Aplicar a migração**

Via MCP: `apply_migration(name='assinatura', query=<conteúdo acima>)`.
Expected: sucesso. Conferir com `list_tables` que `status_assinatura` e `mp_subscription_id` existem.

- [ ] **Step 4: Teste manual de segurança**

No app logado como confeiteira comum, tentar (via console do navegador) `supabase.from('perfis').update({ ativo: true }).eq('id', <meu_id>)`.
Expected: erro de permissão (coluna não concedida). Atualizar o `nome` deve continuar funcionando.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260609120000_assinatura.sql
git commit -m "feat(db): colunas de assinatura e protecao RLS por coluna"
```

---

## Task 11: Edge Function `criar-assinatura`

**Files:**
- Create: `supabase/functions/criar-assinatura/index.ts`
- Create: `supabase/config.toml` (se não existir — secção de functions)

- [ ] **Step 1: Escrever a função**

Create `supabase/functions/criar-assinatura/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const PRECOS = { basico: 59, completo: 99 } as const
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { plano } = await req.json()
    if (plano !== 'basico' && plano !== 'completo') {
      return new Response(JSON.stringify({ error: 'plano inválido' }), { status: 400, headers: cors })
    }

    // Identifica o usuário pelo JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData } = await supa.auth.getUser()
    const user = userData?.user
    if (!user) return new Response(JSON.stringify({ error: 'não autenticado' }), { status: 401, headers: cors })

    const appUrl = Deno.env.get('APP_URL') ?? 'https://doce-negocio.vercel.app'

    // Cria a assinatura recorrente no Mercado Pago
    const resp = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: `Doce Negócio — Plano ${plano === 'completo' ? 'Completo' : 'Básico'}`,
        external_reference: `${user.id}|${plano}`,
        payer_email: user.email,
        back_url: `${appUrl}/?assinatura=ok`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PRECOS[plano],
          currency_id: 'BRL',
        },
        status: 'pending',
      }),
    })
    const mp = await resp.json()
    if (!resp.ok) {
      console.error('MP erro', mp)
      return new Response(JSON.stringify({ error: 'falha no Mercado Pago' }), { status: 502, headers: cors })
    }
    return new Response(JSON.stringify({ init_point: mp.init_point }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'erro interno' }), { status: 500, headers: cors })
  }
})
```

- [ ] **Step 2: Garantir config de functions**

Create/append em `supabase/config.toml`:

```toml
[functions.criar-assinatura]
verify_jwt = true

[functions.mp-webhook]
verify_jwt = false
```

- [ ] **Step 3: Commit (deploy fica na Task 13)**

```bash
git add supabase/functions/criar-assinatura/index.ts supabase/config.toml
git commit -m "feat(fn): criar-assinatura (Mercado Pago preapproval)"
```

---

## Task 12: Edge Function `mp-webhook`

**Files:**
- Create: `supabase/functions/mp-webhook/index.ts`

- [ ] **Step 1: Escrever a função**

Create `supabase/functions/mp-webhook/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

function maisUmMes(): string {
  const d = new Date(); d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    let tipo = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? ''
    let id = url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? ''

    if (!tipo || !id) {
      const body = await req.json().catch(() => ({}))
      tipo = tipo || body.type || body.topic || ''
      id = id || body.data?.id || body.id || ''
    }

    // Só tratamos eventos de assinatura (preapproval)
    if (!tipo.includes('preapproval') || !id) {
      return new Response('ignored', { status: 200 })
    }

    // Consulta o recurso real no MP (não confiar no corpo recebido)
    const r = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      headers: { Authorization: `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` },
    })
    const pre = await r.json()
    if (!r.ok) { console.error('MP lookup falhou', pre); return new Response('mp error', { status: 200 }) }

    const ref: string = pre.external_reference ?? ''
    const [perfilId, plano] = ref.split('|')
    if (!perfilId) return new Response('sem ref', { status: 200 })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const status: string = pre.status // authorized | paused | cancelled | pending
    if (status === 'authorized') {
      await admin.from('perfis').update({
        status_assinatura: 'ativa',
        ativo: true,
        plano: plano === 'completo' ? 'completo' : 'basico',
        valor_plano: plano === 'completo' ? 99 : 59,
        data_venc: maisUmMes(),
        mp_subscription_id: id,
      }).eq('id', perfilId)
    } else if (status === 'cancelled' || status === 'paused') {
      await admin.from('perfis').update({
        status_assinatura: 'cancelada', ativo: false,
      }).eq('id', perfilId)
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 200 }) // 200 evita reenvio infinito do MP
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/mp-webhook/index.ts
git commit -m "feat(fn): webhook do Mercado Pago libera/cancela acesso"
```

---

## Task 13: Configurar segredos, deploy e webhook no Mercado Pago

> Requer: Access Token do MP, project ref do Supabase.

- [ ] **Step 1: Definir os segredos das functions**

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` já existem por padrão no ambiente das Edge Functions. Definir os adicionais:

Via dashboard Supabase (Edge Functions → Secrets) ou CLI:
```bash
supabase secrets set MP_ACCESS_TOKEN=<token_do_mercado_pago> APP_URL=https://doce-negocio.vercel.app
```

- [ ] **Step 2: Deploy das duas funções**

Via MCP `deploy_edge_function` (uma por vez) ou CLI:
```bash
supabase functions deploy criar-assinatura
supabase functions deploy mp-webhook
```
Expected: ambas "Deployed".

- [ ] **Step 3: Registrar o webhook no painel do Mercado Pago**

No painel do desenvolvedor MP → Webhooks/Notificações, cadastrar a URL:
`https://<project-ref>.supabase.co/functions/v1/mp-webhook`
Evento: **Assinaturas (preapproval)**.

- [ ] **Step 4: Teste real (valor baixo)**

Temporariamente, criar uma assinatura de teste (ou usar credenciais de TESTE do MP). No app, com perfil bloqueado, clicar **Assinar Completo** → pagar no checkout → confirmar que o webhook chega (ver logs via MCP `get_logs`) e que o perfil vira `status_assinatura='ativa'`.
Expected: ao recarregar o app, acesso liberado.

---

## Task 14: Verificação ponta-a-ponta e publicação

- [ ] **Step 1: Rodar testes e build**

Run: `npm test && npm run build`
Expected: testes PASS, build OK.

- [ ] **Step 2: Checklist manual (3 tamanhos: celular/tablet/notebook)**

- [ ] Cadastro novo → entra com banner "faltam 3 dias", todos os módulos abrem.
- [ ] Forçar trial vencido (via ADM: inativar, ou ajustar `data_venc` no banco) → app mostra tela de planos.
- [ ] Ativar Básico pelo ADM → MEI aparece com 🔒 e abre o upsell; demais módulos funcionam.
- [ ] Ativar Completo pelo ADM → MEI abre normal.
- [ ] Pagamento real/teste pelo MP libera automaticamente (Task 13 Step 4).

- [ ] **Step 3: Publicar**

```bash
git push origin main
```
Expected: Vercel republica. Confirmar deploy e testar no ar.

---

## Notas de execução

- A Task 5 fica intencionalmente sem commit próprio; ela é fechada junto com a Task 7 (dependências cruzadas de tipos/props).
- Tasks 1–9 (+ migração da Task 10) entregam a Fase 1 funcional (trial + paywall + ADM). Tasks 11–13 adicionam a automação do Mercado Pago.
- Pix dentro do checkout do MP funciona como pagamento, mas a renovação automática vale para cartão (decisão registrada no spec).
