-- Campos de assinatura + proteção de acesso (aplicado no projeto DoceNegocioSF)
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
