-- ─────────────────────────────────────────────────────────────────────────
-- Migration: store_floor_plans — planta interactiva da loja (planograma)
-- Data: 2026-05-30
-- v3.22.0
-- ─────────────────────────────────────────────────────────────────────────
--
-- Guarda a geometria de cada piso parseada do Excel planograma
-- (AVEIRO_PLANTA 2023.xlsx). Cada linha = 1 piso de 1 loja.
--
-- grid_json estrutura:
--   {
--     cols, rows,
--     palette: ["00B0F0","FFC000",...],   -- hex sem #
--     cells:   [[r,c,rs,cs,paletteIdx], ...],   -- fundo colorido (visual)
--     fixtures:[{ r,c,rs,cs, label, fill, num, dept, produit, mobilier, zoneId? }, ...]
--   }
--
-- Parseado por parsePlantaExcel() em app/CampaignPlatform.jsx.
-- Mapeamento de pisos Excel→app: "PISO 1"→"PISO 0", "PISO 2"→"PISO 1".

create table if not exists public.store_floor_plans (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid references public.stores(id) on delete cascade,
  floor_name      text not null,
  grid_json       jsonb not null,
  cols            int,
  rows            int,
  source_filename text,
  created_by      uuid,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (store_id, floor_name)
);

create index if not exists store_floor_plans_store_idx
  on public.store_floor_plans (store_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────
alter table public.store_floor_plans enable row level security;

-- Leitura: qualquer autenticado
drop policy if exists "store_floor_plans read" on public.store_floor_plans;
create policy "store_floor_plans read"
  on public.store_floor_plans for select
  using (auth.uid() is not null);

-- Escrita: só admins
drop policy if exists "store_floor_plans admin insert" on public.store_floor_plans;
drop policy if exists "store_floor_plans admin update" on public.store_floor_plans;
drop policy if exists "store_floor_plans admin delete" on public.store_floor_plans;
create policy "store_floor_plans admin insert"
  on public.store_floor_plans for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));
create policy "store_floor_plans admin update"
  on public.store_floor_plans for update
  using   (exists (select 1 from public.admins where user_id = auth.uid()));
create policy "store_floor_plans admin delete"
  on public.store_floor_plans for delete
  using   (exists (select 1 from public.admins where user_id = auth.uid()));

-- ─── Trigger updated_at (função já existe do store_layout) ───────────────
drop trigger if exists store_floor_plans_updated_at on public.store_floor_plans;
create trigger store_floor_plans_updated_at
  before update on public.store_floor_plans
  for each row execute function public.tg_set_updated_at();

notify pgrst, 'reload schema';
