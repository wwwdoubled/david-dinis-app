-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Planos de Proteção (PPs) — PTS-only, admin-only
-- Data: 2026-05-24
-- v3.19.0
-- ─────────────────────────────────────────────────────────────────────────
--
-- Tracking diário de vendas de Planos de Proteção (extensões de garantia)
-- por colaborador. Cada linha representa um dia para um colaborador:
--   • equipment_count: quantos artigos elegíveis vendeu
--   • pp_count:        em quantos desses fez plano de proteção
-- Taxa de conversão = pp_count / equipment_count.
--
-- Acesso restrito a admins (RLS). Frontend esconde para PES.
--
-- Como executar:
--   1. Supabase Dashboard → SQL Editor → New Query
--   2. Cola este ficheiro
--   3. Run

CREATE TABLE IF NOT EXISTS public.protection_plans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date          date NOT NULL,
  collaborator_id    uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  collaborator_email text,                       -- denormalizado para histórico
  collaborator_name  text,                       -- denormalizado para histórico
  equipment_count    int NOT NULL DEFAULT 0 CHECK (equipment_count >= 0),
  pp_count           int NOT NULL DEFAULT 0 CHECK (pp_count >= 0),
  value              numeric(10,2),
  category           text,
  notes              text,
  created_by         uuid,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS protection_plans_sale_date_idx     ON public.protection_plans(sale_date DESC);
CREATE INDEX IF NOT EXISTS protection_plans_collaborator_idx  ON public.protection_plans(collaborator_id);

ALTER TABLE public.protection_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "protection_plans_select" ON public.protection_plans;
DROP POLICY IF EXISTS "protection_plans_insert" ON public.protection_plans;
DROP POLICY IF EXISTS "protection_plans_update" ON public.protection_plans;
DROP POLICY IF EXISTS "protection_plans_delete" ON public.protection_plans;

-- Admin-only: tudo
CREATE POLICY "protection_plans_select" ON public.protection_plans FOR SELECT
  USING (public.is_admin());
CREATE POLICY "protection_plans_insert" ON public.protection_plans FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "protection_plans_update" ON public.protection_plans FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "protection_plans_delete" ON public.protection_plans FOR DELETE
  USING (public.is_admin());

DROP TRIGGER IF EXISTS protection_plans_updated_at ON public.protection_plans;
CREATE TRIGGER protection_plans_updated_at BEFORE UPDATE ON public.protection_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
