-- ─────────────────────────────────────────────────────────────────────────
-- Migration: price_history — log append-only do histórico de preços por artigo
-- Data: 2026-05-31
-- v3.24.1
-- ─────────────────────────────────────────────────────────────────────────
--
-- Cada linha = um preço de um artigo num momento (capturado quando o preço
-- MUDA, não a cada upload). Persiste mesmo que a campanha seja substituída ou
-- apagada. Consultado pelo Ctrl+K para mostrar a evolução do preço.
--
-- Escrita: changed-only (a app só insere quando o preço difere do último
-- conhecido), por isso a tabela mantém-se pequena.

create table if not exists public.price_history (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid references public.stores(id) on delete cascade,
  ean             text not null,
  ean_norm        text not null,            -- normalizado (sem zeros à esquerda) p/ lookup
  name            text,
  family          text,
  base_price      numeric,
  campaign_price  numeric,
  discount_pct    int,
  source          text default 'campaign_upload',  -- 'campaign_upload' | 'manual'
  period_id       uuid,
  campaign_name   text,
  captured_at     timestamptz default now(),
  created_by      uuid
);

create index if not exists price_history_lookup_idx
  on public.price_history (store_id, ean_norm, captured_at desc);
create index if not exists price_history_captured_idx
  on public.price_history (captured_at);

alter table public.price_history enable row level security;

-- Leitura: qualquer autenticado (do seu store via app; RLS simples aqui)
drop policy if exists "price_history read" on public.price_history;
create policy "price_history read"
  on public.price_history for select
  using (auth.uid() is not null);

-- Inserção: qualquer autenticado (a app regista no upload)
drop policy if exists "price_history insert" on public.price_history;
create policy "price_history insert"
  on public.price_history for insert
  with check (auth.uid() is not null);

-- Apagar: só admins (limpeza / retention)
drop policy if exists "price_history admin delete" on public.price_history;
create policy "price_history admin delete"
  on public.price_history for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

notify pgrst, 'reload schema';
