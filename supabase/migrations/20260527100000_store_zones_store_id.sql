-- ─────────────────────────────────────────────────────────────────────────
-- Migration: store_zones.store_id — multi-loja para zonas
-- Data: 2026-05-27
-- v3.21.6
-- ─────────────────────────────────────────────────────────────────────────
--
-- Regra de scoping multi-loja (final):
--   • store_floors → por loja, partilhado entre PTS/PES (já tem store_id)
--   • store_zones  → por loja + por departamento (já tem department; ESTA
--                    migration adiciona store_id)
--   • cartazes     → propriedade slot.cartaz dentro de periods.products
--                    (segue campaign, que já tem store_id+department)
--
-- A migration stores (20260525220000) esqueceu-se desta tabela. Corrigir
-- agora antes de criar novas lojas com zonas erradamente partilhadas.

ALTER TABLE public.store_zones
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Backfill: tudo o que existe hoje → Aveiro
DO $$
DECLARE aveiro_id uuid;
BEGIN
  SELECT id INTO aveiro_id FROM public.stores WHERE code='AVR' LIMIT 1;
  IF aveiro_id IS NOT NULL THEN
    UPDATE public.store_zones SET store_id = aveiro_id WHERE store_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS store_zones_store_idx ON public.store_zones(store_id);
