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
