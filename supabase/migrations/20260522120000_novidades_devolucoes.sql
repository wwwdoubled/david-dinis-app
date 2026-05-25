-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Novidades + Devoluções (vistas PES-only)
-- Data: 2026-05-22
-- v3.17.0
-- ─────────────────────────────────────────────────────────────────────────
--
-- Cria as tabelas para 2 vistas novas exclusivas do departamento PES:
--   • novidades         — artigos com data de lançamento + alocação a piso/zona
--   • devolucoes        — sessões de devolução (1 ficheiro Excel cada)
--   • devolucao_items   — items de cada devolução (EAN + qty pedida/encontrada)
--
-- Como executar:
--   1. Corre PRIMEIRO 2026-05-22_departments.sql
--   2. Depois cola este ficheiro no SQL Editor
--   3. Run

-- ─── novidades ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.novidades (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department   text NOT NULL DEFAULT 'PES' CHECK (department IN ('PTS','PES')),
  ean          text NOT NULL,
  name         text NOT NULL,
  description  text,
  launch_date  date,
  floor_id     uuid REFERENCES public.store_floors(id) ON DELETE SET NULL,
  zone_id      uuid REFERENCES public.store_zones(id)  ON DELETE SET NULL,
  notes        text,
  created_by   uuid,
  updated_by   uuid,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS novidades_department_idx  ON public.novidades(department);
CREATE INDEX IF NOT EXISTS novidades_launch_date_idx ON public.novidades(launch_date);
CREATE INDEX IF NOT EXISTS novidades_ean_idx         ON public.novidades(ean);

ALTER TABLE public.novidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "novidades read"   ON public.novidades;
DROP POLICY IF EXISTS "novidades insert" ON public.novidades;
DROP POLICY IF EXISTS "novidades update" ON public.novidades;
DROP POLICY IF EXISTS "novidades delete" ON public.novidades;

CREATE POLICY "novidades read"   ON public.novidades FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "novidades insert" ON public.novidades FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "novidades update" ON public.novidades FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "novidades delete" ON public.novidades FOR DELETE
  USING (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS novidades_updated_at ON public.novidades;
CREATE TRIGGER novidades_updated_at BEFORE UPDATE ON public.novidades
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ─── devolucoes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.devolucoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department     text NOT NULL DEFAULT 'PES' CHECK (department IN ('PTS','PES')),
  name           text NOT NULL,
  source_file    text,
  status         text DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes          text,
  created_by     uuid,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  closed_at      timestamptz
);
CREATE INDEX IF NOT EXISTS devolucoes_department_idx ON public.devolucoes(department);
CREATE INDEX IF NOT EXISTS devolucoes_status_idx     ON public.devolucoes(status);

ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devolucoes read"   ON public.devolucoes;
DROP POLICY IF EXISTS "devolucoes insert" ON public.devolucoes;
DROP POLICY IF EXISTS "devolucoes update" ON public.devolucoes;
DROP POLICY IF EXISTS "devolucoes delete" ON public.devolucoes;

CREATE POLICY "devolucoes read"   ON public.devolucoes FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "devolucoes insert" ON public.devolucoes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "devolucoes update" ON public.devolucoes FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "devolucoes delete" ON public.devolucoes FOR DELETE
  USING (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS devolucoes_updated_at ON public.devolucoes;
CREATE TRIGGER devolucoes_updated_at BEFORE UPDATE ON public.devolucoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ─── devolucao_items ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.devolucao_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucao_id   uuid NOT NULL REFERENCES public.devolucoes(id) ON DELETE CASCADE,
  ean            text NOT NULL,
  description    text,
  family         text,
  qty_requested  int NOT NULL DEFAULT 0,
  qty_found      int NOT NULL DEFAULT 0,
  notes          text,
  updated_by     uuid,
  updated_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS devolucao_items_devolucao_idx ON public.devolucao_items(devolucao_id);
CREATE INDEX IF NOT EXISTS devolucao_items_ean_idx       ON public.devolucao_items(ean);

ALTER TABLE public.devolucao_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devolucao_items read"   ON public.devolucao_items;
DROP POLICY IF EXISTS "devolucao_items insert" ON public.devolucao_items;
DROP POLICY IF EXISTS "devolucao_items update" ON public.devolucao_items;
DROP POLICY IF EXISTS "devolucao_items delete" ON public.devolucao_items;

CREATE POLICY "devolucao_items read"   ON public.devolucao_items FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "devolucao_items insert" ON public.devolucao_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "devolucao_items update" ON public.devolucao_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "devolucao_items delete" ON public.devolucao_items FOR DELETE
  USING (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS devolucao_items_updated_at ON public.devolucao_items;
CREATE TRIGGER devolucao_items_updated_at BEFORE UPDATE ON public.devolucao_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
