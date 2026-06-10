# Design — Teste grátis de 3 dias, planos e assinatura via Mercado Pago

**Data:** 2026-06-09
**Projeto:** Doce Negócio (app de gestão para confeiteiras/MEI)
**Stack:** React + Vite + TypeScript + Supabase + Vercel

## Objetivo

Transformar o app de "acesso livre pra todo mundo" em um produto com:

1. **Teste grátis de 3 dias** com acesso total a partir do cadastro.
2. **Dois planos pagos** que liberam módulos diferentes.
3. **Assinatura recorrente via Mercado Pago** com liberação automática de acesso.
4. **Bloqueio** do app quando o teste acaba ou a assinatura vence.

## Planos

| Plano | Preço/mês | Módulos liberados |
|-------|-----------|-------------------|
| Básico | R$ 59,00 | Início, Agenda, Caixa, Clientes, Perfil |
| Completo | R$ 99,00 | Tudo (Básico + **MEI**) |

- **Início (Home)** e **Perfil** ficam sempre acessíveis (Perfil é necessário pra pagar/gerenciar).
- Durante o **teste de 3 dias**, o acesso é equivalente ao **Completo** (todos os módulos).

## Estados de acesso

Calculados a partir do perfil por uma função pura (`calcularAcesso(perfil)`), sem chamadas externas:

| Estado | Condição | Comportamento |
|--------|----------|---------------|
| `trial` | `status_assinatura = 'trial'` e hoje ≤ `data_inicio` + 3 dias | Acesso total (Completo) + banner "Teste grátis — faltam X dias" |
| `ativa` | `status_assinatura = 'ativa'` e hoje ≤ `data_venc` | Libera módulos conforme `plano` (Básico trava MEI) |
| `bloqueada` | teste expirado, `expirada`, `cancelada`, ou `data_venc` no passado | App bloqueado → tela de planos (paywall) |

- `is_adm = true` → vai pro Painel ADM (não passa por controle de acesso).
- No estado `bloqueada`, o app **não renderiza o Dashboard**: renderiza a tela `Planos` (com opção de sair da conta).
- No Básico, a aba **MEI** aparece com cadeado; ao tocar, abre um convite de upgrade pro Completo (não navega).

## Modelo de dados (Supabase, tabela `perfis`)

Campos novos/ajustados:

- `status_assinatura text not null default 'trial'` — valores: `trial` | `ativa` | `expirada` | `cancelada`.
- `plano text not null default 'completo'` — valores: `basico` | `completo`. (Durante o trial o valor é irrelevante para o acesso; a função trata trial como Completo.)
- `data_inicio date` — data do cadastro = início do teste. (já existe)
- `data_venc date` — até quando o acesso é válido. No cadastro = `data_inicio` + 3 dias. (já existe)
- `mp_subscription_id text` — id da assinatura (preapproval) no Mercado Pago.
- `valor_plano numeric` — preço do plano vigente. (já existe)
- `ativo boolean` — mantido por compatibilidade; espelha `status_assinatura = 'ativa'`. A fonte de verdade do acesso passa a ser `status_assinatura` + datas.

Migração: `ALTER TABLE` adicionando `status_assinatura` e `mp_subscription_id`; backfill dos perfis existentes (`status_assinatura = 'ativa'` para quem já está `ativo = true`, senão `expirada`).

## Arquitetura

### Frontend (React)

- **`src/lib/acesso.ts`** (novo): tipos + `calcularAcesso(perfil): Acesso`, onde
  `Acesso = { estado: 'trial' | 'ativa' | 'bloqueada', plano, diasRestantesTrial, modulos: Set<Aba> }`.
  Única fonte da lógica de acesso; testável isoladamente.
- **`src/App.tsx`**: após carregar o perfil e se `!is_adm`, calcula o acesso. Se `bloqueada` → renderiza `<Planos>`; senão → `<Dashboard acesso=... >`.
- **`src/pages/Planos.tsx`** (novo): paywall. Mostra os dois planos, botão **Assinar** que chama a função `criar-assinatura` e redireciona para o `init_point` do Mercado Pago. Inclui "Sair da conta".
- **`src/pages/Dashboard.tsx`**: recebe `acesso`; mostra banner de trial (dias restantes); trava a aba MEI quando não está em `acesso.modulos` (cadeado + upsell).
- **`src/components/PerfilPage.tsx`**: substitui o botão quebrado "Gerenciar assinatura" (que apontava para `mercadopago.com.br`). Passa a mostrar o plano/status atual e um botão que leva à tela de planos (para assinar/trocar de plano).
- **`src/pages/LoginPage.tsx`**: no cadastro, grava `status_assinatura = 'trial'`, `plano = 'completo'`, `data_inicio = hoje`, `data_venc = hoje + 3 dias`, `ativo = false`.
- **`src/pages/DashboardAdm.tsx`**: adiciona ação de **Ativar/Inativar** e **trocar plano** manualmente (fallback de suporte e para testes).

### Backend (Supabase Edge Functions — Deno)

Segredo de ambiente: `MP_ACCESS_TOKEN` (Access Token do Mercado Pago, só no servidor). A função de webhook usa a `service_role key` para atualizar `perfis` ignorando RLS.

- **`criar-assinatura`** (POST, autenticada via JWT do Supabase):
  - Body: `{ plano: 'basico' | 'completo' }`. O `perfilId` e o e-mail vêm do JWT/perfil (não confiar no client).
  - Cria um **preapproval** no MP (`POST https://api.mercadopago.com/preapproval`) com:
    - `reason`: "Doce Negócio — Plano <X>"
    - `auto_recurring`: `{ frequency: 1, frequency_type: 'months', transaction_amount: 59 | 99, currency_id: 'BRL' }`
    - `payer_email`: e-mail do perfil
    - `back_url`: URL do app (retorno pós-pagamento)
    - `external_reference`: `"<perfilId>|<plano>"`
  - Retorna `{ init_point }`. O frontend redireciona.
- **`mp-webhook`** (POST, pública):
  - Recebe notificações do MP (`type=preapproval` / pagamentos autorizados).
  - Busca o recurso na API do MP para obter `status` e `external_reference`.
  - Faz parse de `external_reference` → `perfilId` + `plano`.
  - Em pagamento **aprovado/autorizado**: atualiza o perfil → `status_assinatura='ativa'`, `plano`, `ativo=true`, `valor_plano`, `data_venc = hoje + 1 mês`, `mp_subscription_id`.
  - Em **cancelamento/expiração**: `status_assinatura='cancelada'`/`'expirada'`, `ativo=false`.

### Segurança (RLS)

- Política de `UPDATE` em `perfis` para usuários autenticados restrita às colunas de perfil (`nome`, `telefone`, `nome_negocio`, `cnpj_mei`, `cidade`, `foto_url`).
- As colunas de acesso (`ativo`, `status_assinatura`, `plano`, `data_venc`, `mp_subscription_id`, `valor_plano`) **não** podem ser alteradas pelo cliente — apenas pelas Edge Functions com `service_role`.
- O webhook valida que a notificação corresponde a um recurso real consultando a API do MP (não confia apenas no corpo recebido).

## Fluxo de pagamento (resumo)

1. App bloqueado → `Planos.tsx` → usuária clica **Assinar (Completo)**.
2. Frontend chama `criar-assinatura` → recebe `init_point` → redireciona ao checkout do MP.
3. Usuária paga (Pix ou cartão dentro do MP).
4. MP chama `mp-webhook` → função valida e atualiza `perfis` (libera o plano).
5. Usuária volta ao app (via `back_url`); ao recarregar o perfil, o acesso já está liberado.

## Observações / decisões

- **Recorrência = cartão.** A renovação automática do MP vale para cartão. Pix não renova automaticamente; quem pagar por Pix renovaria manualmente. O foco da Fase de cobrança é cartão recorrente; Pix funciona como pagamento dentro do checkout, mas sem auto-renovação garantida.
- **Construção:** apesar de conceitualmente dividido em "controle de acesso" e "integração MP", a usuária optou por entregar **tudo de uma vez** (um único ciclo spec → plano → implementação).
- **YAGNI:** sem cupons, sem múltiplas moedas, sem planos anuais nesta entrega.

## Critérios de sucesso

- Novo cadastro entra com 3 dias de acesso total e banner de contagem.
- Após 3 dias sem assinar, o app bloqueia e mostra a tela de planos.
- Assinar pelo MP (cartão) libera o plano automaticamente via webhook.
- Plano Básico trava o MEI; Completo libera tudo.
- Usuário comum não consegue alterar os campos de acesso direto no banco (RLS).
- Painel ADM consegue ativar/inativar e trocar plano manualmente.
