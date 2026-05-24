-- ─────────────────────────────────────────────────────────────────────────
-- Migration: store_zones por departamento (store_floors continuam shared)
-- Data: 2026-05-24
-- v3.18.1
-- ─────────────────────────────────────────────────────────────────────────
--
-- Os pisos da loja são partilhados entre PTS e PES (mesma estrutura física).
-- Mas as zonas/móveis dentro de cada piso são geridos separadamente por
-- cada departamento.
--
-- Adiciona `department` a store_zones e RLS:
--   • Non-admin: vê/edita só zonas do seu dept
--   • Admin: vê/edita todas (admin write é regulado por policies admin-only existentes)
--
-- Como executar:
--   1. Supabase Dashboard → SQL Editor → New Query
--   2. Cola este ficheiro
--   3. Run

-- ─── store_zones: adicionar coluna department ──────────────────────────
ALTER TABLE public.store_zones
  ADD COLUMN IF NOT EXISTS department text DEFAULT 'PTS'
  CHECK (department IN ('PTS','PES'));

-- Backfill: tudo o que já existe fica PTS
UPDATE public.store_zones SET department='PTS' WHERE department IS NULL;

CREATE INDEX IF NOT EXISTS store_zones_department_idx ON public.store_zones(department);

-- ─── Substituir SELECT policy aberta por dept-aware ────────────────────
-- (INSERT/UPDATE/DELETE continuam admin-only — mantém-se inalteradas)
DROP POLICY IF EXISTS "store_zones read"   ON public.store_zones;
DROP POLICY IF EXISTS "store_zones_select" ON public.store_zones;

CREATE POLICY "store_zones_select" ON public.store_zones FOR SELECT
  USING (public.is_admin() OR department = public.my_department());
