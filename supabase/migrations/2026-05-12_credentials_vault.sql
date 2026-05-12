-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Cofre de Credenciais (Credentials Vault)
-- Data: 2026-05-12
-- v3.15.0
-- ─────────────────────────────────────────────────────────────────────────
--
-- Cria duas tabelas para guardar credenciais (passwords/códigos) de
-- equipamentos da loja: PCs, máquinas registadoras, alarmes, WiFi, ATMs,
-- impressoras, contas SaaS, etc. Substitui as "notas soltas".
--
--   • credentials           — entrada do cofre
--   • credentials_activity  — log de acessos (auditoria)
--
-- SEGURANÇA: passwords são guardadas em texto plano protegidas por RLS
-- strict (só admins ou o owner podem ler). NÃO usar para credenciais
-- bancárias críticas. Para v2 será adicionada encriptação pgcrypto.
--
-- Como executar:
--   1. Abre o Supabase Dashboard → SQL Editor → New Query
--   2. Cola este ficheiro inteiro
--   3. Run
--   4. Verifica que aparece "credentials" e "credentials_activity" em Tables

-- ─── Enum de tipos ───────────────────────────────────────────────────────
do $$ begin
  create type public.credential_type as enum (
    'pc', 'alarm', 'wifi', 'atm', 'printer', 'register', 'saas', 'other'
  );
exception when duplicate_object then null; end $$;

-- ─── Tabela principal ────────────────────────────────────────────────────
create table if not exists public.credentials (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,                         -- ex: "PC Caixa 2"
  type              public.credential_type not null default 'other',
  username          text,
  password          text,                                  -- texto plano, protegido por RLS
  url               text,
  notes             text,
  tags              text[] default '{}',
  last_accessed_by  uuid,
  last_accessed_at  timestamptz,
  created_by        uuid,
  updated_by        uuid,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists credentials_type_idx       on public.credentials (type);
create index if not exists credentials_created_at_idx on public.credentials (created_at);
create index if not exists credentials_name_idx       on public.credentials (lower(name));

-- ─── Log de actividade (auditoria) ───────────────────────────────────────
create table if not exists public.credentials_activity (
  id              uuid primary key default gen_random_uuid(),
  credential_id   uuid references public.credentials(id) on delete set null,
  credential_name text,                                    -- snapshot para sobreviver ao delete
  action          text not null,                           -- 'viewed' | 'copied' | 'created' | 'updated' | 'deleted'
  user_id         uuid,
  user_email      text,
  created_at      timestamptz default now()
);

create index if not exists creds_activity_credential_id_idx on public.credentials_activity (credential_id);
create index if not exists creds_activity_created_at_idx    on public.credentials_activity (created_at);

-- ─── RLS ─────────────────────────────────────────────────────────────────
alter table public.credentials          enable row level security;
alter table public.credentials_activity enable row level security;

-- credentials: leitura permitida a admins OU ao owner que a criou
drop policy if exists "credentials read"   on public.credentials;
drop policy if exists "credentials insert" on public.credentials;
drop policy if exists "credentials update" on public.credentials;
drop policy if exists "credentials delete" on public.credentials;

create policy "credentials read"
  on public.credentials for select
  using (
    auth.uid() is not null
    and (
      exists (select 1 from public.admins where user_id = auth.uid())
      or created_by = auth.uid()
    )
  );

-- Escrita: apenas admins
create policy "credentials insert"
  on public.credentials for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "credentials update"
  on public.credentials for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "credentials delete"
  on public.credentials for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

-- credentials_activity: insert livre (app regista best-effort), select admin
drop policy if exists "creds_activity insert" on public.credentials_activity;
drop policy if exists "creds_activity read"   on public.credentials_activity;

create policy "creds_activity insert"
  on public.credentials_activity for insert
  with check (auth.uid() is not null);

create policy "creds_activity read"
  on public.credentials_activity for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));

-- ─── Trigger: updated_at automático ─────────────────────────────────────
-- Usa a função tg_set_updated_at() já criada em 2026-05-12_store_layout.sql.
-- Se a função não existe, criamos aqui:
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists credentials_updated_at on public.credentials;
create trigger credentials_updated_at
  before update on public.credentials
  for each row execute function public.tg_set_updated_at();
