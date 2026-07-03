-- Schema do módulo de Descarbonização (Climoo) para Supabase — MULTI-EMPRESA.
-- Rode este SQL no Supabase: Dashboard → SQL Editor → New query → Run.
-- (É idempotente: pode rodar de novo sem quebrar o que já existe.)
--
-- Modelo de acesso:
--   • Autenticação real via Supabase Auth (e-mail + senha).
--   • `companies`  — empresas cadastradas pelo administrador.
--   • `profiles`   — 1 linha por usuário do Auth, com papel (admin/user) e a
--                    empresa à qual o usuário pertence.
--   • RLS garante NO SERVIDOR que cada usuário só enxerga/grava os dados do
--     CNPJ da própria empresa; o administrador (mac@climoo.com.br) vê tudo.
--
-- Depois de rodar este SQL:
--   1. Authentication → Users → "Add user" → crie mac@climoo.com.br com a sua
--      senha (marque "Auto Confirm User"). O trigger abaixo cria o perfil e o
--      bloco de seed garante o papel de administrador.
--   2. Project Settings → API: copie a `service_role` key e defina a variável
--      SUPABASE_SERVICE_ROLE_KEY na Vercel (e no seu .env.local para dev).
--      Ela é usada só no servidor (função /api/admin/users) para o admin criar,
--      editar e excluir usuários — nunca vai para o navegador.

-- ──────────────────────────────────────────────────────────────────────
-- Empresas
-- ──────────────────────────────────────────────────────────────────────
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  cnpj        text not null unique,          -- somente dígitos (14)
  created_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────
-- Perfis (1 por usuário do Supabase Auth)
-- ──────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text,
  role        text not null default 'user' check (role in ('admin', 'user')),
  company_id  uuid references public.companies (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um usuário é criado no Auth.
-- mac@climoo.com.br entra como administrador.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    case when lower(new.email) = 'mac@climoo.com.br' then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────────────────────────────────
-- Helpers de autorização (security definer para não recair na RLS)
-- ──────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_company_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select company_id from profiles where id = auth.uid();
$$;

create or replace function public.my_company_cnpj()
returns text
language sql stable security definer
set search_path = public
as $$
  select c.cnpj
  from profiles p
  join companies c on c.id = p.company_id
  where p.id = auth.uid();
$$;

-- ──────────────────────────────────────────────────────────────────────
-- RLS: companies e profiles
-- ──────────────────────────────────────────────────────────────────────
alter table public.companies enable row level security;

drop policy if exists "companies select" on public.companies;
create policy "companies select"
  on public.companies for select to authenticated
  using (public.is_admin() or id = public.my_company_id());

drop policy if exists "companies admin insert" on public.companies;
create policy "companies admin insert"
  on public.companies for insert to authenticated
  with check (public.is_admin());

drop policy if exists "companies admin update" on public.companies;
create policy "companies admin update"
  on public.companies for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "companies admin delete" on public.companies;
create policy "companies admin delete"
  on public.companies for delete to authenticated
  using (public.is_admin());

alter table public.profiles enable row level security;

drop policy if exists "profiles select" on public.profiles;
create policy "profiles select"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Escritas em profiles acontecem só pela API de administração (service role,
-- que ignora RLS) e pelo trigger acima — nenhuma policy de escrita necessária.

-- ──────────────────────────────────────────────────────────────────────
-- Dados do plano por empresa (uma linha por CNPJ, estado completo em `data`)
-- ──────────────────────────────────────────────────────────────────────
create table if not exists public.decarbonization_companies (
  cnpj        text primary key,
  empresa     text,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.decarbonization_companies enable row level security;

-- Remove as policies antigas (acesso aberto pela anon key).
drop policy if exists "decarb anon select" on public.decarbonization_companies;
drop policy if exists "decarb anon insert" on public.decarbonization_companies;
drop policy if exists "decarb anon update" on public.decarbonization_companies;

-- Agora só usuários AUTENTICADOS, e cada um restrito ao CNPJ da sua empresa.
drop policy if exists "decarb select" on public.decarbonization_companies;
create policy "decarb select"
  on public.decarbonization_companies for select to authenticated
  using (public.is_admin() or cnpj = public.my_company_cnpj());

drop policy if exists "decarb insert" on public.decarbonization_companies;
create policy "decarb insert"
  on public.decarbonization_companies for insert to authenticated
  with check (public.is_admin() or cnpj = public.my_company_cnpj());

drop policy if exists "decarb update" on public.decarbonization_companies;
create policy "decarb update"
  on public.decarbonization_companies for update to authenticated
  using (public.is_admin() or cnpj = public.my_company_cnpj())
  with check (public.is_admin() or cnpj = public.my_company_cnpj());

drop policy if exists "decarb admin delete" on public.decarbonization_companies;
create policy "decarb admin delete"
  on public.decarbonization_companies for delete to authenticated
  using (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- Log de alterações (auditoria) — quem salvou qual empresa e quando.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists public.decarbonization_audit (
  id          bigint generated always as identity primary key,
  cnpj        text,
  empresa     text,
  user_email  text,
  action      text default 'save',
  changes     jsonb default '[]'::jsonb,   -- lista de alterações (o que mudou)
  created_at  timestamptz not null default now()
);

alter table public.decarbonization_audit
  add column if not exists changes jsonb default '[]'::jsonb;

create index if not exists decarbonization_audit_created_at_idx
  on public.decarbonization_audit (created_at desc);

alter table public.decarbonization_audit enable row level security;

drop policy if exists "audit anon insert" on public.decarbonization_audit;
drop policy if exists "audit anon select" on public.decarbonization_audit;

-- Usuário autenticado registra alterações da própria empresa; só o admin lê.
drop policy if exists "audit insert" on public.decarbonization_audit;
create policy "audit insert"
  on public.decarbonization_audit for insert to authenticated
  with check (public.is_admin() or cnpj = public.my_company_cnpj());

drop policy if exists "audit admin select" on public.decarbonization_audit;
create policy "audit admin select"
  on public.decarbonization_audit for select to authenticated
  using (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- Seeds / migração de dados já existentes
-- ──────────────────────────────────────────────────────────────────────

-- Empresas: cria um registro em `companies` para cada CNPJ que já tem dados
-- salvos (assim os dados antigos ficam acessíveis assim que você vincular
-- usuários a essas empresas no painel de administração).
insert into public.companies (name, cnpj)
select coalesce(nullif(d.empresa, ''), d.cnpj), d.cnpj
from public.decarbonization_companies d
on conflict (cnpj) do nothing;

-- Admin: se o usuário mac@climoo.com.br já existia no Auth antes deste SQL,
-- garante o perfil com papel de administrador.
insert into public.profiles (id, email, role)
select u.id, lower(u.email), 'admin'
from auth.users u
where lower(u.email) = 'mac@climoo.com.br'
on conflict (id) do update set role = 'admin';
