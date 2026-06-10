# Design — Painel ADM com gráficos, ajustes de clientes e novidades

**Data:** 2026-06-10
**Projeto:** Doce Negócio (gestão para confeiteiras/MEI)
**Stack:** React + Vite + TS + Supabase (Postgres + Edge Functions) + Vercel

## Objetivo

Transformar o `DashboardAdm` (hoje só uma lista com 2 números) em um painel de controle completo, com:

1. **Visão geral** com cartões de indicadores e gráfico de crescimento de cadastros.
2. **Gestão de clientes**: ativar/inativar, trocar plano, dar dias grátis, editar dados, bloquear.
3. **Novidades**: criar avisos que aparecem dentro do app das confeiteiras.

## Estrutura — 3 abas

O painel passa a ter 3 abas no topo: **Visão Geral**, **Clientes**, **Novidades**.

### Aba 1 — Visão Geral

Cartões de números (calculados a partir de todos os perfis não-admin):
- **Total de clientes** — contagem de perfis.
- **Assinantes ativos** — `status_assinatura = 'ativa'` e `data_venc >= hoje`.
- **Em teste** — `status_assinatura = 'trial'` e `data_venc >= hoje`.
- **Prestes a vencer (7 dias)** — `data_venc` entre hoje e hoje+7, status `ativa` ou `trial`.
- **Receita mensal** — soma de `valor_plano` dos ativos.

Gráfico de crescimento (novos cadastros, a partir de `created_at`):
- Barras simples em HTML/CSS (sem biblioteca).
- Botão alterna entre **mensal (últimos 6 meses)** e **diário (últimos 30 dias)**.
- Cálculo das faixas (buckets) é feito no cliente, a partir da lista de perfis.

### Aba 2 — Clientes

Lista de confeiteiras com busca por nome/e-mail. Cada linha mostra status (Ativo/Teste/Vencido) e tem um botão **Gerenciar** que abre um modal com:
- **Plano e acesso:** ativar Básico / ativar Completo / inativar.
- **Dar dias grátis:** botões +7 / +15 / +30 (estende `data_venc` e marca `status_assinatura='ativa'`).
- **Editar dados:** nome, nome_negocio, telefone, cidade.
- **Bloquear:** `status_assinatura='cancelada'`, `ativo=false`.

Todas as ações que mexem no perfil de outra cliente passam pela **Edge Function `admin-perfil`** (ver Segurança).

### Aba 3 — Novidades

- Formulário: **título**, **mensagem**, **tipo** (`info` | `promo` | `alerta` — define cor/ícone do cartão).
- Botão **Publicar** cria um registro em `avisos` com `ativo = true`.
- Lista de avisos existentes com alternar **ativo/inativo** e **excluir**.
- No **app das clientes**, os avisos `ativo = true` aparecem como **cartão no topo da Home**, com botão de **fechar** (dispensar localmente).

## Modelo de dados

Nova tabela `public.avisos`:

| coluna | tipo | nota |
|--------|------|------|
| id | uuid pk default gen_random_uuid() | |
| titulo | text not null | |
| mensagem | text not null | |
| tipo | text not null default 'info' | info / promo / alerta |
| ativo | boolean not null default true | |
| created_at | timestamptz default now() | |

RLS em `avisos`:
- **SELECT:** qualquer usuário autenticado pode ler avisos com `ativo = true`.
- **INSERT/UPDATE/DELETE:** apenas quando o usuário é admin — política `exists (select 1 from perfis where id = auth.uid() and is_adm = true)`.

A tabela `perfis` não muda de schema.

## Segurança — ajustes de perfil via Edge Function

Na fase anterior, revogamos `UPDATE` das colunas de acesso de `authenticated` (só `service_role` altera). Isso **inclui o admin**. Além disso, a política de linha de `perfis` permite o usuário editar só a própria linha (`id = auth.uid()`). Portanto, o admin **não consegue** alterar o perfil de outra cliente direto do cliente.

Solução: **Edge Function `admin-perfil`** (`verify_jwt = false`, autenticação feita no código):
1. Lê o JWT do chamador e identifica o usuário.
2. Confere, via `service_role`, que `perfis.is_adm = true` para o chamador. Se não for admin → 403.
3. Recebe `{ acao, alvoId, dados }` e executa com `service_role`:
   - `definir_plano` → `status_assinatura='ativa'`, `plano`, `valor_plano`, `data_venc = hoje + 1 mês`.
   - `dar_dias` → `data_venc = max(hoje, data_venc) + N`, `status_assinatura='ativa'`, `ativo=true`.
   - `bloquear` → `status_assinatura='cancelada'`, `ativo=false`.
   - `editar_dados` → atualiza `nome`, `nome_negocio`, `telefone`, `cidade`.
4. CORS liberado para o app (mesmos headers da `criar-assinatura`: `authorization, x-client-info, apikey, content-type`).

Isso também **substitui** os botões de admin da fase anterior (Task 9), que escreviam direto e na prática falhavam por causa da proteção de colunas.

## Arquitetura (arquivos)

Frontend:
- `src/pages/DashboardAdm.tsx` — vira o shell com as 3 abas. Deixar enxuto, delegando para subcomponentes.
- `src/components/adm/AdmVisaoGeral.tsx` — cartões + gráfico (recebe a lista de perfis por prop).
- `src/components/adm/AdmClientes.tsx` — lista + modal "Gerenciar" (chama `admService`).
- `src/components/adm/AdmNovidades.tsx` — formulário + lista de avisos (usa `avisoService`).
- `src/lib/admMetrics.ts` — funções puras: `calcularIndicadores(perfis, hoje)` e `agruparCadastros(perfis, 'mes'|'dia', hoje)`. **Testáveis (Vitest).**
- `src/components/AvisosBanner.tsx` — cartão de avisos exibido na Home das clientes.
- `src/components/Home.tsx` — passa a renderizar `<AvisosBanner />` no topo.
- `src/services/supabaseService.ts` — novos `avisoService` (listar ativos / listar todos / criar / alternar / excluir) e `admService` (chama a Edge Function `admin-perfil`).

Backend:
- `supabase/migrations/<ts>_avisos.sql` — tabela `avisos` + RLS.
- `supabase/functions/admin-perfil/index.ts` — Edge Function de ajustes (service_role + checagem is_adm).

## Critérios de sucesso

- Admin vê os 5 indicadores corretos e o gráfico alternando mensal/diário.
- Admin consegue ativar plano, dar dias grátis, editar dados e bloquear — e a mudança **persiste no banco** (via função segura) e reflete no acesso da cliente.
- Admin publica um aviso; a confeiteira vê o cartão na Home e consegue fechá-lo.
- Cliente comum **não** consegue criar/alterar avisos nem alterar perfis de terceiros (bloqueado por RLS / função).
- Funções puras de métricas cobertas por testes.

## Fora de escopo (YAGNI)

- Envio por e-mail/WhatsApp das novidades (só aviso in-app).
- Agendamento de avisos / segmentação por cliente (aviso é global).
- Exportação de relatórios.
