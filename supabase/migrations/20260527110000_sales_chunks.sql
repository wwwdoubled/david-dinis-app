-- ─────────────────────────────────────────────────────────────────────────
-- Migration: sales_chunks + counter_sales_chunks — análise de vendas em cloud
-- Data: 2026-05-27
-- v3.21.7
-- ─────────────────────────────────────────────────────────────────────────
--
-- Permite guardar a análise de vendas (FNAC detalhadas + vendas ao mostrador)
-- na cloud, particionada por mês, para que ao subir um novo ficheiro só os
-- meses presentes nesse ficheiro sejam substituídos (os outros mantêm-se).
--
-- Chave: (store_id, year_month). rows_compressed = gzip base64 do JSON.
-- Sales é admin-only — RLS reflicte.

CREATE TABLE IF NOT EXISTS public.sales_chunks (
  store_id          uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  year_month        text NOT NULL,                   -- 'YYYY-MM'
  rows_compressed   text NOT NULL,                   -- gzip(base64) do JSON dos rows
  rows_count        integer NOT NULL DEFAULT 0,
  date_from         date,
  date_to           date,
  filename          text,
  updated_by        uuid,
  updated_at        timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now(),
  PRIMARY KEY (store_id, year_month)
);

CREATE INDEX IF NOT EXISTS sales_chunks_store_idx ON public.sales_chunks(store_id);

ALTER TABLE public.sales_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_chunks_admin_all" ON public.sales_chunks;
CREATE POLICY "sales_chunks_admin_all" ON public.sales_chunks FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Counter sales (vendas ao mostrador → equipa)
CREATE TABLE IF NOT EXISTS public.counter_sales_chunks (
  store_id          uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  year_month        text NOT NULL,
  rows_compressed   text NOT NULL,
  rows_count        integer NOT NULL DEFAULT 0,
  date_from         date,
  date_to           date,
  filename          text,
  updated_by        uuid,
  updated_at        timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now(),
  PRIMARY KEY (store_id, year_month)
);

CREATE INDEX IF NOT EXISTS counter_sales_chunks_store_idx ON public.counter_sales_chunks(store_id);

ALTER TABLE public.counter_sales_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "counter_sales_chunks_admin_all" ON public.counter_sales_chunks;
CREATE POLICY "counter_sales_chunks_admin_all" ON public.counter_sales_chunks FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- v3.21.7: garante que admin pode mudar department + store_id de qualquer user
-- (as policies existentes já permitem via is_admin, esta migration é só
-- para drop de policies antigas potencialmente restritivas e re-criar limpas)
DROP POLICY IF EXISTS "user_profiles admin update store/dept" ON public.user_profiles;
CREATE POLICY "user_profiles admin update store/dept" ON public.user_profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
