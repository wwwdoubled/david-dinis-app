-- ─────────────────────────────────────────────────────────────────────────
-- Migration: stores — suporte multi-loja
-- Data: 2026-05-25
-- v3.21.2
-- ─────────────────────────────────────────────────────────────────────────
--
-- Permite a app servir múltiplas lojas com estruturas diferentes (pisos,
-- zonas, departamentos). Cada user pertence a 1 loja (admin pode ver todas).
-- Toda a data (campaigns, periods, stock, novidades, devoluções, planos
-- de proteção, floors) ganha FK opcional para stores.
--
-- Backfill: tudo o que existe hoje fica na loja "Aveiro" (criada como seed).

-- ─── Tabela stores ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,           -- ex: AVR, PRT, LIS
  name        text NOT NULL,                  -- nome completo
  address     text,
  city        text,
  country     text DEFAULT 'PT',
  active      boolean DEFAULT true,
  notes       text,
  -- v3.21.2: settings opcionais por loja (overrides ao global)
  settings    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  created_by  uuid,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid
);

-- Seed loja Aveiro (existente)
INSERT INTO public.stores (code, name, city, country)
VALUES ('AVR', 'FNAC Aveiro', 'Aveiro', 'PT')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_select" ON public.stores;
DROP POLICY IF EXISTS "stores_admin_insert" ON public.stores;
DROP POLICY IF EXISTS "stores_admin_update" ON public.stores;
DROP POLICY IF EXISTS "stores_admin_delete" ON public.stores;

-- Qualquer autenticado lê (precisa para selector); só admin escreve
CREATE POLICY "stores_select" ON public.stores FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "stores_admin_insert" ON public.stores FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "stores_admin_update" ON public.stores FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "stores_admin_delete" ON public.stores FOR DELETE
  USING (public.is_admin());

-- ─── Adicionar store_id às tabelas relevantes (ANTES da função) ───────
ALTER TABLE public.user_profiles    ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.campaigns        ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.periods          ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.stock_snapshots  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.novidades        ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.devolucoes       ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.protection_plans ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.store_floors     ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- ─── Helper: my_store_id() (definido APÓS a coluna existir) ────────────
CREATE OR REPLACE FUNCTION public.my_store_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT store_id FROM public.user_profiles WHERE user_id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.my_store_id() TO authenticated;

-- ─── Backfill: tudo o que existe → Aveiro ──────────────────────────────
DO $$
DECLARE aveiro_id uuid;
BEGIN
  SELECT id INTO aveiro_id FROM public.stores WHERE code='AVR' LIMIT 1;
  IF aveiro_id IS NOT NULL THEN
    UPDATE public.user_profiles    SET store_id = aveiro_id WHERE store_id IS NULL;
    UPDATE public.campaigns        SET store_id = aveiro_id WHERE store_id IS NULL;
    UPDATE public.periods          SET store_id = aveiro_id WHERE store_id IS NULL;
    UPDATE public.stock_snapshots  SET store_id = aveiro_id WHERE store_id IS NULL;
    UPDATE public.novidades        SET store_id = aveiro_id WHERE store_id IS NULL;
    UPDATE public.devolucoes       SET store_id = aveiro_id WHERE store_id IS NULL;
    UPDATE public.protection_plans SET store_id = aveiro_id WHERE store_id IS NULL;
    UPDATE public.store_floors     SET store_id = aveiro_id WHERE store_id IS NULL;
  END IF;
END $$;

-- ─── Indexes para queries filtradas ────────────────────────────────────
CREATE INDEX IF NOT EXISTS user_profiles_store_idx    ON public.user_profiles(store_id);
CREATE INDEX IF NOT EXISTS campaigns_store_idx        ON public.campaigns(store_id);
CREATE INDEX IF NOT EXISTS periods_store_idx          ON public.periods(store_id);
CREATE INDEX IF NOT EXISTS stock_snapshots_store_idx  ON public.stock_snapshots(store_id);
CREATE INDEX IF NOT EXISTS novidades_store_idx        ON public.novidades(store_id);
CREATE INDEX IF NOT EXISTS devolucoes_store_idx       ON public.devolucoes(store_id);
CREATE INDEX IF NOT EXISTS protection_plans_store_idx ON public.protection_plans(store_id);
CREATE INDEX IF NOT EXISTS store_floors_store_idx     ON public.store_floors(store_id);

-- Nota: RLS server-side por store fica para v3.22 (precisa actualizar todas
-- as policies dept-aware existentes para incluir store). Por agora, filtro
-- é client-side (admin escolhe, non-admin fica fixo no seu store_id).
