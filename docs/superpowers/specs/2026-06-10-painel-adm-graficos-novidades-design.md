# Design — Painel ADM: gráficos, gestão de clientes, novidades, e-mail, WhatsApp, agendamento e relatórios

**Data:** 2026-06-10
**Projeto:** Doce Negócio (gestão para confeiteiras/MEI)
**Stack:** React + Vite + TS + Supabase (Postgres + Edge Functions) + Vercel + Resend (e-mail)

## Objetivo

Transformar o `DashboardAdm` num painel de controle completo:

1. **Visão geral** com indicadores e gráfico de crescimento.
2. **Gestão de clientes**: ativar/inativar, trocar plano, dar dias grátis, editar dados, bloquear.
3. **Novidades**: avisos que aparecem no app das confeiteiras, podendo também ser **enviados por e-mail** (automático) e por **WhatsApp** (link manual), com **agendamento** de exibição.
4. **Relatórios**: exportar clientes/indicadores em planilha (CSV).

## Estrutura — 3 abas

`DashboardAdm` vira um shell com abas: **Visão Geral**, **Clientes**, **Novidades**.

### Aba 1 — Visão Geral

Cartões (calculados de todos os perfis não-admin):
- **Total de clientes**
- **Assinantes ativos** — `status_assinatura='ativa'` e `data_venc >= hoje`
- **Em teste** — `status_assinatura='trial'` e `data_venc >= hoje`
- **Prestes a vencer (7 dias)** — `data_venc` entre hoje e hoje+7 (status ativa/trial)
- **Receita mensal** — soma de `valor_plano` dos ativos

Gráfico de crescimento (a partir de `created_at`), barras em HTML/CSS (sem biblioteca), com botão alternando **mensal (6 meses)** / **diário (30 dias)**. Buckets calculados no cliente.

Botão **Exportar planilha (CSV)**: baixa a lista de clientes (nome, e-mail, telefone, plano, status, data_venc) — ver Relatórios.

### Aba 2 — Clientes

Lista com busca (nome/e-mail). Cada linha: status (Ativo/Teste/Vencido) + botão **Gerenciar** → modal com:
- **Plano e acesso:** ativar Básico / ativar Completo / inativar.
- **Dar dias grátis:** +7 / +15 / +30 (estende `data_venc`, marca ativa).
- **Editar dados:** nome, nome_negocio, telefone, cidade.
- **Bloquear:** cancelada + inativo.
- **WhatsApp:** botão que abre `wa.me/55<telefone>` com uma mensagem pronta (envio manual, grátis).

Ações que mexem em perfil de outra cliente passam pela Edge Function `admin-perfil` (ver Segurança).

### Aba 3 — Novidades

Formulário de aviso:
- **título**, **mensagem**, **tipo** (`info` | `promo` | `alerta` → cor/ícone)
- **agendar para** (opcional): data/hora em que o aviso passa a aparecer; vazio = imediato
- **canais**: sempre aparece no app; caixas opcionais **"Enviar por e-mail"** e **"Preparar WhatsApp"**

Ao **Publicar**:
- Cria registro em `avisos`.
- Se **e-mail** marcado: chama a Edge Function `enviar-email` (Resend) para todas as clientes (assunto = título, corpo = mensagem). Resultado (enviados/erros) é mostrado.
- Se **WhatsApp** marcado: abre a sub-tela de **envio manual** — lista de clientes com telefone, cada uma com botão **"Abrir WhatsApp"** (`wa.me` com a mensagem pronta). A admin clica uma a uma.

Lista de avisos existentes: alternar **ativo/inativo**, ver **agendamento**, **excluir**, e **reenviar e-mail / reabrir WhatsApp**.

**Regra de exibição no app** (sem necessidade de cron): um aviso aparece para a cliente quando `ativo = true` **e** (`agendado_para` é nulo **ou** `agendado_para <= agora`).

## Modelo de dados

Nova tabela `public.avisos`:

| coluna | tipo | nota |
|--------|------|------|
| id | uuid pk default gen_random_uuid() | |
| titulo | text not null | |
| mensagem | text not null | |
| tipo | text not null default 'info' | info / promo / alerta |
| ativo | boolean not null default true | |
| agendado_para | timestamptz null | quando começa a aparecer |
| created_at | timestamptz default now() | |

RLS em `avisos`:
- **SELECT:** autenticado pode ler onde `ativo = true` (o filtro de `agendado_para` é aplicado na query/no app).
- **INSERT/UPDATE/DELETE:** apenas admin — `exists (select 1 from perfis where id = auth.uid() and is_adm = true)`.

`perfis` não muda de schema.

## Segurança

### Ajustes de perfil — Edge Function `admin-perfil`
Como as colunas de acesso de `perfis` são protegidas (só `service_role` altera) e a política de linha limita o usuário à própria linha, o admin não pode alterar perfis de terceiros pelo cliente. A função (`verify_jwt = false`, auth no código):
1. Identifica o chamador pelo JWT.
2. Confere via `service_role` que `perfis.is_adm = true` (senão 403).
3. Executa com `service_role` conforme `{ acao, alvoId, dados }`:
   - `definir_plano` → ativa + plano + valor_plano + `data_venc = hoje + 1 mês`.
   - `dar_dias` → `data_venc = max(hoje, data_venc) + N`, ativa, ativo=true.
   - `bloquear` → cancelada + ativo=false.
   - `editar_dados` → nome, nome_negocio, telefone, cidade.
4. CORS: `authorization, x-client-info, apikey, content-type`.

Substitui os botões de admin da fase anterior (Task 9), que falhavam por causa da proteção de colunas.

### E-mail — Edge Function `enviar-email`
- `verify_jwt = false`; confere `is_adm` do chamador (igual acima).
- Body: `{ assunto, corpo, destinatarios? }`. Sem `destinatarios`, busca e-mails de todos os perfis não-admin via `service_role`.
- Envia via **Resend** (`POST https://api.resend.com/emails`) usando o secret `RESEND_API_KEY` e um remetente verificado (`EMAIL_FROM`).
- Envia em lote, com tratamento de erro por destinatário; retorna `{ enviados, falhas }`.
- CORS igual às outras.

## WhatsApp (link manual)

Sem API/custo: o painel monta links `https://wa.me/55<telefone-só-dígitos>?text=<mensagem-encodada>`. A admin clica e o WhatsApp Web/app abre com a mensagem pronta para enviar. Aplicável tanto em "Clientes" (mensagem individual) quanto em "Novidades" (lista para disparo um a um). Telefones sem número válido são ignorados/avisados.

## Relatórios (CSV)

Geração **no cliente** (sem backend): a partir da lista de perfis já carregada, monta um CSV (nome, e-mail, telefone, cidade, plano, status, data_venc) e dispara o download via `Blob`. Botão na Visão Geral.

## Arquitetura (arquivos)

Frontend:
- `src/pages/DashboardAdm.tsx` — shell com 3 abas (enxuto; delega aos subcomponentes).
- `src/components/adm/AdmVisaoGeral.tsx` — cartões + gráfico + botão exportar CSV.
- `src/components/adm/AdmClientes.tsx` — lista + modal Gerenciar (usa `admService`) + botão WhatsApp.
- `src/components/adm/AdmNovidades.tsx` — formulário (título/mensagem/tipo/agendar/canais) + lista de avisos + sub-tela WhatsApp.
- `src/lib/admMetrics.ts` — puro/testável: `calcularIndicadores(perfis, hoje)`, `agruparCadastros(perfis, 'mes'|'dia', hoje)`.
- `src/lib/csv.ts` — puro/testável: `gerarCsvClientes(perfis)`.
- `src/lib/whatsapp.ts` — puro/testável: `linkWhatsApp(telefone, mensagem)`.
- `src/components/AvisosBanner.tsx` — cartão de avisos na Home (aplica a regra de exibição).
- `src/components/Home.tsx` — renderiza `<AvisosBanner />` no topo.
- `src/services/supabaseService.ts` — `avisoService` (listar visíveis/listar todos/criar/alternar/excluir), `admService` (chama `admin-perfil`), `emailService` (chama `enviar-email`).

Backend:
- `supabase/migrations/<ts>_avisos.sql` — tabela `avisos` + RLS.
- `supabase/functions/admin-perfil/index.ts` — ajustes de perfil (service_role + is_adm).
- `supabase/functions/enviar-email/index.ts` — envio via Resend (service_role + is_adm).
- Secrets novos: `RESEND_API_KEY`, `EMAIL_FROM`.

## Critérios de sucesso

- Indicadores e gráfico (mensal/diário) corretos.
- Ajustes de cliente persistem no banco (via função) e refletem no acesso.
- Aviso publicado aparece na Home; agendado só aparece após a data; cliente pode fechar.
- "Enviar por e-mail" entrega via Resend e mostra enviados/falhas.
- "WhatsApp" abre o wa.me com a mensagem pronta.
- Exportar CSV baixa a planilha de clientes.
- Cliente comum não cria/edita avisos nem altera perfis de terceiros (RLS/função).
- Funções puras (métricas, csv, whatsapp) cobertas por testes.

## Fora de escopo (próximas evoluções)

- WhatsApp **automático** (Meta Cloud API / BSP) — quando houver volume; a base manual já fica pronta.
- Agendamento de **envio** de e-mail/WhatsApp (hoje o agendamento é da **exibição** in-app; envios são disparados pela admin). Auto-envio agendado exigiria `pg_cron`.
- Segmentação de avisos por grupo de clientes.
