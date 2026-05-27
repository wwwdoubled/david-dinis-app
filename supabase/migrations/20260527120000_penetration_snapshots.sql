-- ─────────────────────────────────────────────────────────────────────────
-- Migration: penetration_snapshots — taxa de penetração mensal (FNAC interno)
-- Data: 2026-05-27
-- v3.21.11
-- ─────────────────────────────────────────────────────────────────────────
--
-- Admin sobe ficheiro "TX_Penetração_<Mês>_<Ano>.xlsx" → parser lê sheet
-- RESUMO → guarda JSON compactado aqui. Visível só para admins.

CREATE TABLE IF NOT EXISTS public.penetration_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  month_key   text NOT NULL,            -- 'YYYY-MM' (do ficheiro)
  filename    text,
  imported_at timestamptz DEFAULT now(),
  imported_by uuid,
  payload     jsonb NOT NULL,           -- { storeRows: [...], total: {...}, month: 'Mai/26' }
  UNIQUE (store_id, month_key)
);

CREATE INDEX IF NOT EXISTS penetration_snapshots_month_idx ON public.penetration_snapshots(month_key DESC);

ALTER TABLE public.penetration_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "penetration_admin_all" ON public.penetration_snapshots;
CREATE POLICY "penetration_admin_all" ON public.penetration_snapshots FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
