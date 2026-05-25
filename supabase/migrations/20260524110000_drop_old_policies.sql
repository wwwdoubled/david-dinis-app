-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Apagar policies antigas permissivas
-- Data: 2026-05-24
-- v3.18.0 (follow-up a 2026-05-24_dept_rls.sql)
-- ─────────────────────────────────────────────────────────────────────────
--
-- Postgres RLS faz OR entre policies. As policies antigas tipo "Authenticated
-- read campaigns" autorizavam QUALQUER user autenticado a ler tudo —
-- anulavam as novas dept_rls policies.
--
-- Esta migration remove-as. Ficam apenas as <table>_select/insert/update/delete
-- criadas em 2026-05-24_dept_rls.sql.

-- ─── campaigns ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated read campaigns"   ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated create campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated update campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Owner or admin delete campaigns" ON public.campaigns;

-- ─── periods ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated read periods"     ON public.periods;
DROP POLICY IF EXISTS "Authenticated create periods"   ON public.periods;
DROP POLICY IF EXISTS "Owner or admin update periods"  ON public.periods;
DROP POLICY IF EXISTS "Owner or admin delete periods"  ON public.periods;

-- ─── stock_snapshots ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated read stock"   ON public.stock_snapshots;
DROP POLICY IF EXISTS "Authenticated insert stock" ON public.stock_snapshots;
DROP POLICY IF EXISTS "Authenticated update stock" ON public.stock_snapshots;
DROP POLICY IF EXISTS "Admin delete stock"         ON public.stock_snapshots;

-- ─── user_profiles ─────────────────────────────────────────────────────
-- As nossas novas policies (user_profiles_select/insert/update) já cobrem
-- "user vê o seu" + "admin vê tudo" + "user actualiza o seu sem mudar dept"
DROP POLICY IF EXISTS "Users read own profile"          ON public.user_profiles;
DROP POLICY IF EXISTS "Admins read all profiles"        ON public.user_profiles;
DROP POLICY IF EXISTS "Users insert own profile"        ON public.user_profiles;
DROP POLICY IF EXISTS "Users update own profile"        ON public.user_profiles;
DROP POLICY IF EXISTS "Admins update all profiles"      ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles update own must_change" ON public.user_profiles;
