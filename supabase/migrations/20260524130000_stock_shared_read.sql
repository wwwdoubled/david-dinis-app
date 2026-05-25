-- ─────────────────────────────────────────────────────────────────────────
-- Migration: stock_snapshots — leitura partilhada PTS+PES
-- Data: 2026-05-24
-- v3.18.2
-- ─────────────────────────────────────────────────────────────────────────
--
-- Stock vem do mesmo ficheiro Excel para ambos os departamentos. O PES
-- precisa de aceder aos mesmos EANs/produtos para a vista Novidades.
--
-- Solução: SELECT passa a partilhado (qualquer autenticado lê todo o stock);
-- INSERT/UPDATE/DELETE continuam dept-aware (não pode PES apagar/editar
-- um snapshot carregado por PTS, e vice-versa).
--
-- Quando (no futuro) o PES tiver o seu próprio ficheiro de stock, basta
-- reverter para dept-aware SELECT.

DROP POLICY IF EXISTS "stock_snapshots_select" ON public.stock_snapshots;

CREATE POLICY "stock_snapshots_select" ON public.stock_snapshots FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE mantêm-se dept-aware (de 2026-05-24_dept_rls.sql)
