-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Suporte multi-departamento (PTS / PES)
-- Data: 2026-05-22
-- v3.17.0
-- ─────────────────────────────────────────────────────────────────────────
--
-- Adiciona a coluna `department` (text, 'PTS' | 'PES', default 'PTS') a:
--   • user_profiles  — define que dados o utilizador vê
--   • campaigns      — stamping do uploader; non-admin só vê do seu dept
--   • periods        — idem
--   • stock_snapshots — idem
--
-- Backfill: tudo o que existe hoje fica 'PTS'.
-- Indexes adicionados para queries filtradas por dept.
--
-- Admins (via tabela public.admins) vêem tudo, independente do dept.
-- Filtro acontece client-side em MainApp (futuro: RLS server-side em v3.18.x).
--
-- Como executar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cola este ficheiro
--   3. Run

-- ─── user_profiles ─────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS department text DEFAULT 'PTS'
  CHECK (department IN ('PTS','PES'));
UPDATE public.user_profiles SET department='PTS' WHERE department IS NULL;

-- ─── campaigns ─────────────────────────────────────────────────────────
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS department text DEFAULT 'PTS'
  CHECK (department IN ('PTS','PES'));
UPDATE public.campaigns SET department='PTS' WHERE department IS NULL;
CREATE INDEX IF NOT EXISTS campaigns_department_idx ON public.campaigns(department);

-- ─── periods ───────────────────────────────────────────────────────────
ALTER TABLE public.periods
  ADD COLUMN IF NOT EXISTS department text DEFAULT 'PTS'
  CHECK (department IN ('PTS','PES'));
UPDATE public.periods SET department='PTS' WHERE department IS NULL;
CREATE INDEX IF NOT EXISTS periods_department_idx ON public.periods(department);

-- ─── stock_snapshots ───────────────────────────────────────────────────
ALTER TABLE public.stock_snapshots
  ADD COLUMN IF NOT EXISTS department text DEFAULT 'PTS'
  CHECK (department IN ('PTS','PES'));
UPDATE public.stock_snapshots SET department='PTS' WHERE department IS NULL;
CREATE INDEX IF NOT EXISTS stock_snapshots_department_idx ON public.stock_snapshots(department);
