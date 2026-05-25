-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Store Layout (pisos + zonas/móveis geríveis pelo admin)
-- Data: 2026-05-12
-- v3.14.0
-- ─────────────────────────────────────────────────────────────────────────
--
-- Cria duas tabelas para gerir o layout físico da loja a partir do admin:
--   • store_floors — pisos (PISO 0, PISO 1, DESTAQUES, novos definidos)
--   • store_zones  — móveis/locais dentro de cada piso (MLS SOM, etc.)
--
-- Estas tabelas NÃO interferem com:
--   • poster_zones (zonas físicas de afixação de cartazes) — fica como está
--   • campaign_posters — fica como está
--
-- Como executar:
--   1. Abre o Supabase Dashboard → SQL Editor → New Query
--   2. Cola este ficheiro inteiro
--   3. Run
--   4. Volta à app → Admin → Layout da loja → "Importar layout default"
--      para popular com os 3 pisos predefinidos.

-- ─── store_floors ────────────────────────────────────────────────────────
create table if not exists public.store_floors (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  color           text default '#5DA050',
  star            boolean default false,
  display_order   int default 0,
  created_by      uuid,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists store_floors_display_order_idx
  on public.store_floors (display_order);

-- ─── store_zones ─────────────────────────────────────────────────────────
create table if not exists public.store_zones (
  id              uuid primary key default gen_random_uuid(),
  floor_id        uuid not null references public.store_floors(id) on delete cascade,
  name            text not null,
  display_order   int default 0,
  created_by      uuid,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists store_zones_floor_id_idx
  on public.store_zones (floor_id);
create index if not exists store_zones_display_order_idx
  on public.store_zones (display_order);

-- ─── Row-level security ─────────────────────────────────────────────────
alter table public.store_floors enable row level security;
alter table public.store_zones  enable row level security;

-- Leitura: qualquer utilizador autenticado pode ver
drop policy if exists "store_floors read"  on public.store_floors;
drop policy if exists "store_zones read"   on public.store_zones;
create policy "store_floors read"
  on public.store_floors for select
  using (auth.uid() is not null);
create policy "store_zones read"
  on public.store_zones for select
  using (auth.uid() is not null);

-- Escrita: só admins (tabela 'admins' já existe no projecto)
drop policy if exists "store_floors admin insert" on public.store_floors;
drop policy if exists "store_floors admin update" on public.store_floors;
drop policy if exists "store_floors admin delete" on public.store_floors;
create policy "store_floors admin insert"
  on public.store_floors for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));
create policy "store_floors admin update"
  on public.store_floors for update
  using   (exists (select 1 from public.admins where user_id = auth.uid()));
create policy "store_floors admin delete"
  on public.store_floors for delete
  using   (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "store_zones admin insert" on public.store_zones;
drop policy if exists "store_zones admin update" on public.store_zones;
drop policy if exists "store_zones admin delete" on public.store_zones;
create policy "store_zones admin insert"
  on public.store_zones for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));
create policy "store_zones admin update"
  on public.store_zones for update
  using   (exists (select 1 from public.admins where user_id = auth.uid()));
create policy "store_zones admin delete"
  on public.store_zones for delete
  using   (exists (select 1 from public.admins where user_id = auth.uid()));

-- ─── Trigger: updated_at automático ─────────────────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists store_floors_updated_at on public.store_floors;
create trigger store_floors_updated_at
  before update on public.store_floors
  for each row execute function public.tg_set_updated_at();

drop trigger if exists store_zones_updated_at on public.store_zones;
create trigger store_zones_updated_at
  before update on public.store_zones
  for each row execute function public.tg_set_updated_at();
