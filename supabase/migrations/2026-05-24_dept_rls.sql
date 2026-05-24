-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Isolamento server-side por departamento (PTS / PES) via RLS
-- Data: 2026-05-24
-- v3.18.0
-- ─────────────────────────────────────────────────────────────────────────
--
-- Antes: filtro client-side apenas — qualquer user podia ver dados do outro
-- departamento via DevTools / SQL directo.
--
-- Agora: RLS server-side em todas as tabelas dept-aware.
--   • Não-admin: só vê/edita rows do seu próprio user_profiles.department
--   • Admin (presente em public.admins): vê/edita tudo
--
-- O "viewing as" do admin (PTS/PES toggle) continua no frontend — é só UX,
-- não segurança.
--
-- Como executar:
--   1. Confirmar que estás em public.admins (senão ficas bloqueado!)
--   2. Supabase Dashboard → SQL Editor → New Query
--   3. Cola este ficheiro
--   4. Run

-- ─── Backfill defensivo: garantir que ninguém fica sem dept ────────────
UPDATE public.user_profiles SET department='PTS' WHERE department IS NULL;
UPDATE public.campaigns      SET department='PTS' WHERE department IS NULL;
UPDATE public.periods        SET department='PTS' WHERE department IS NULL;
UPDATE public.stock_snapshots SET department='PTS' WHERE department IS NULL;
UPDATE public.novidades      SET department='PES' WHERE department IS NULL;
UPDATE public.devolucoes     SET department='PES' WHERE department IS NULL;

-- ─── Helpers (SECURITY DEFINER para não baterem em RLS recursivo) ──────
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.my_department() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT department FROM public.user_profiles WHERE user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.is_admin()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_department() TO authenticated;

-- ─── campaigns ──────────────────────────────────────────────────────────
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_insert" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_update" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_delete" ON public.campaigns;

CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT
  USING (public.is_admin() OR department = public.my_department());
CREATE POLICY "campaigns_insert" ON public.campaigns FOR INSERT
  WITH CHECK (public.is_admin() OR department = public.my_department());
CREATE POLICY "campaigns_update" ON public.campaigns FOR UPDATE
  USING      (public.is_admin() OR department = public.my_department())
  WITH CHECK (public.is_admin() OR department = public.my_department());
CREATE POLICY "campaigns_delete" ON public.campaigns FOR DELETE
  USING (public.is_admin() OR department = public.my_department());

-- ─── periods ───────────────────────────────────────────────────────────
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "periods_select" ON public.periods;
DROP POLICY IF EXISTS "periods_insert" ON public.periods;
DROP POLICY IF EXISTS "periods_update" ON public.periods;
DROP POLICY IF EXISTS "periods_delete" ON public.periods;

CREATE POLICY "periods_select" ON public.periods FOR SELECT
  USING (public.is_admin() OR department = public.my_department());
CREATE POLICY "periods_insert" ON public.periods FOR INSERT
  WITH CHECK (public.is_admin() OR department = public.my_department());
CREATE POLICY "periods_update" ON public.periods FOR UPDATE
  USING      (public.is_admin() OR department = public.my_department())
  WITH CHECK (public.is_admin() OR department = public.my_department());
CREATE POLICY "periods_delete" ON public.periods FOR DELETE
  USING (public.is_admin() OR department = public.my_department());

-- ─── stock_snapshots ───────────────────────────────────────────────────
ALTER TABLE public.stock_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_snapshots_select" ON public.stock_snapshots;
DROP POLICY IF EXISTS "stock_snapshots_insert" ON public.stock_snapshots;
DROP POLICY IF EXISTS "stock_snapshots_update" ON public.stock_snapshots;
DROP POLICY IF EXISTS "stock_snapshots_delete" ON public.stock_snapshots;

CREATE POLICY "stock_snapshots_select" ON public.stock_snapshots FOR SELECT
  USING (public.is_admin() OR department = public.my_department());
CREATE POLICY "stock_snapshots_insert" ON public.stock_snapshots FOR INSERT
  WITH CHECK (public.is_admin() OR department = public.my_department());
CREATE POLICY "stock_snapshots_update" ON public.stock_snapshots FOR UPDATE
  USING      (public.is_admin() OR department = public.my_department())
  WITH CHECK (public.is_admin() OR department = public.my_department());
CREATE POLICY "stock_snapshots_delete" ON public.stock_snapshots FOR DELETE
  USING (public.is_admin() OR department = public.my_department());

-- ─── novidades (substitui policies abertas anteriores) ─────────────────
DROP POLICY IF EXISTS "novidades read"   ON public.novidades;
DROP POLICY IF EXISTS "novidades insert" ON public.novidades;
DROP POLICY IF EXISTS "novidades update" ON public.novidades;
DROP POLICY IF EXISTS "novidades delete" ON public.novidades;
DROP POLICY IF EXISTS "novidades_select" ON public.novidades;
DROP POLICY IF EXISTS "novidades_insert" ON public.novidades;
DROP POLICY IF EXISTS "novidades_update" ON public.novidades;
DROP POLICY IF EXISTS "novidades_delete" ON public.novidades;

CREATE POLICY "novidades_select" ON public.novidades FOR SELECT
  USING (public.is_admin() OR department = public.my_department());
CREATE POLICY "novidades_insert" ON public.novidades FOR INSERT
  WITH CHECK (public.is_admin() OR department = public.my_department());
CREATE POLICY "novidades_update" ON public.novidades FOR UPDATE
  USING      (public.is_admin() OR department = public.my_department())
  WITH CHECK (public.is_admin() OR department = public.my_department());
CREATE POLICY "novidades_delete" ON public.novidades FOR DELETE
  USING (public.is_admin() OR department = public.my_department());

-- ─── devolucoes ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "devolucoes read"   ON public.devolucoes;
DROP POLICY IF EXISTS "devolucoes insert" ON public.devolucoes;
DROP POLICY IF EXISTS "devolucoes update" ON public.devolucoes;
DROP POLICY IF EXISTS "devolucoes delete" ON public.devolucoes;
DROP POLICY IF EXISTS "devolucoes_select" ON public.devolucoes;
DROP POLICY IF EXISTS "devolucoes_insert" ON public.devolucoes;
DROP POLICY IF EXISTS "devolucoes_update" ON public.devolucoes;
DROP POLICY IF EXISTS "devolucoes_delete" ON public.devolucoes;

CREATE POLICY "devolucoes_select" ON public.devolucoes FOR SELECT
  USING (public.is_admin() OR department = public.my_department());
CREATE POLICY "devolucoes_insert" ON public.devolucoes FOR INSERT
  WITH CHECK (public.is_admin() OR department = public.my_department());
CREATE POLICY "devolucoes_update" ON public.devolucoes FOR UPDATE
  USING      (public.is_admin() OR department = public.my_department())
  WITH CHECK (public.is_admin() OR department = public.my_department());
CREATE POLICY "devolucoes_delete" ON public.devolucoes FOR DELETE
  USING (public.is_admin() OR department = public.my_department());

-- ─── devolucao_items (herda via FK devolucao_id → devolucoes) ──────────
DROP POLICY IF EXISTS "devolucao_items read"   ON public.devolucao_items;
DROP POLICY IF EXISTS "devolucao_items insert" ON public.devolucao_items;
DROP POLICY IF EXISTS "devolucao_items update" ON public.devolucao_items;
DROP POLICY IF EXISTS "devolucao_items delete" ON public.devolucao_items;
DROP POLICY IF EXISTS "devolucao_items_select" ON public.devolucao_items;
DROP POLICY IF EXISTS "devolucao_items_insert" ON public.devolucao_items;
DROP POLICY IF EXISTS "devolucao_items_update" ON public.devolucao_items;
DROP POLICY IF EXISTS "devolucao_items_delete" ON public.devolucao_items;

CREATE POLICY "devolucao_items_select" ON public.devolucao_items FOR SELECT
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.devolucoes d
    WHERE d.id = devolucao_id AND d.department = public.my_department()
  ));
CREATE POLICY "devolucao_items_insert" ON public.devolucao_items FOR INSERT
  WITH CHECK (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.devolucoes d
    WHERE d.id = devolucao_id AND d.department = public.my_department()
  ));
CREATE POLICY "devolucao_items_update" ON public.devolucao_items FOR UPDATE
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.devolucoes d
    WHERE d.id = devolucao_id AND d.department = public.my_department()
  ))
  WITH CHECK (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.devolucoes d
    WHERE d.id = devolucao_id AND d.department = public.my_department()
  ));
CREATE POLICY "devolucao_items_delete" ON public.devolucao_items FOR DELETE
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.devolucoes d
    WHERE d.id = devolucao_id AND d.department = public.my_department()
  ));

-- ─── user_profiles (cada user vê só o seu; admin vê tudo) ──────────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;

CREATE POLICY "user_profiles_select" ON public.user_profiles FOR SELECT
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "user_profiles_insert" ON public.user_profiles FOR INSERT
  WITH CHECK (public.is_admin() OR user_id = auth.uid());
-- Update: user pode actualizar o próprio mas NÃO pode mudar department; admin pode tudo
CREATE POLICY "user_profiles_update" ON public.user_profiles FOR UPDATE
  USING      (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (
    public.is_admin()
    OR (user_id = auth.uid() AND department = public.my_department())
  );

-- ─── FIM ───────────────────────────────────────────────────────────────
