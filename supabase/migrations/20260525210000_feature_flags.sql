-- ─────────────────────────────────────────────────────────────────────────
-- Migration: feature_flags — admin liga/desliga módulos sem deploy
-- Data: 2026-05-25
-- v3.21.1
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key         text PRIMARY KEY,
  enabled     boolean NOT NULL DEFAULT true,
  description text,
  updated_by  uuid,
  updated_at  timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_select" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_admin_insert" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_admin_update" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_admin_delete" ON public.feature_flags;

CREATE POLICY "feature_flags_select" ON public.feature_flags FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "feature_flags_admin_insert" ON public.feature_flags FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "feature_flags_admin_update" ON public.feature_flags FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "feature_flags_admin_delete" ON public.feature_flags FOR DELETE
  USING (public.is_admin());

-- Seed default flags (todos enabled, admin pode desligar)
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('flyer_editor',  true, 'Editor de folhetos SVG'),
  ('pdf_editor',    true, 'Ferramentas de PDF (merge, split)'),
  ('inventory',     true, 'Vista de inventário com scan EAN'),
  ('credentials',   true, 'Cofre de credenciais'),
  ('pps',           true, 'Planos de proteção (admin-only)'),
  ('sales',         true, 'Análise de vendas (admin-only)'),
  ('notes',         true, 'Bloco de notas pessoal'),
  ('calendar',      true, 'Vista de calendário das campanhas')
ON CONFLICT (key) DO NOTHING;
