-- ─────────────────────────────────────────────────────────────────────────
-- Migration: email_queue — fila de emails para envio via Resend
-- Data: 2026-05-28
-- v3.21.25
-- ─────────────────────────────────────────────────────────────────────────
--
-- Tabela usada por:
--   • queueEmail() em app/CampaignPlatform.jsx (~L2757) — análises, etc.
--   • buildCampaignEndingEmail (~L2879) — notificações fim de campanha
--   • Edge function send-emails — consome e envia via Resend API
--   • Cron Supabase diário 9h → invoca send-emails
--
-- Status flow:
--   pending → sent (sucesso Resend, provider_id preenchido)
--   pending → pending (falha, attempts++)
--   pending → error  (attempts >= 3)
--   pending → skipped (admin marca manualmente)

CREATE TABLE IF NOT EXISTS public.email_queue (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email            text NOT NULL,
  to_user_id          uuid,
  subject             text NOT NULL,
  body_html           text NOT NULL,
  body_text           text,
  category            text,            -- 'campaign_ending', 'campaign_sales_report', etc.
  related_period_id   uuid,
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','skipped','error')),
  attempts            integer NOT NULL DEFAULT 0,
  sent_at             timestamptz,
  error_message       text,
  provider_id         text,            -- ID do Resend (tracking, debug)
  created_at          timestamptz DEFAULT now(),
  created_by          uuid
);

CREATE INDEX IF NOT EXISTS email_queue_status_idx
  ON public.email_queue(status, created_at);
CREATE INDEX IF NOT EXISTS email_queue_category_idx
  ON public.email_queue(category);
CREATE INDEX IF NOT EXISTS email_queue_period_idx
  ON public.email_queue(related_period_id)
  WHERE related_period_id IS NOT NULL;

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Admin pode tudo (read/write/update/delete)
DROP POLICY IF EXISTS "email_queue_admin_all" ON public.email_queue;
CREATE POLICY "email_queue_admin_all" ON public.email_queue FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Qualquer autenticado pode inserir (para análises ad-hoc)
DROP POLICY IF EXISTS "email_queue_insert_authed" ON public.email_queue;
CREATE POLICY "email_queue_insert_authed" ON public.email_queue FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
