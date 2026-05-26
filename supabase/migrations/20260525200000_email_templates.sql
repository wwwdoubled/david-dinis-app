-- ─────────────────────────────────────────────────────────────────────────
-- Migration: email_templates — admin pode editar emails sem deploy
-- Data: 2026-05-25
-- v3.21.0
-- ─────────────────────────────────────────────────────────────────────────
--
-- Tabela para guardar templates de email (subject + body_md). Body é
-- Markdown leve — interpola variáveis como {{campaign_name}}, {{end_date}}.
-- Lista de variáveis disponíveis por template fica em `variables` (jsonb).
--
-- Admin edita em Admin → Configuração → Email Templates.
-- buildCampaignEndingEmail lê o template; fallback hardcoded se DB falhar.

CREATE TABLE IF NOT EXISTS public.email_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text UNIQUE NOT NULL,
  subject      text NOT NULL,
  body_md      text NOT NULL,
  variables    jsonb NOT NULL DEFAULT '[]'::jsonb,
  description  text,
  updated_by   uuid,
  updated_at   timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_templates_key_idx ON public.email_templates(key);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates_select" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_admin_all" ON public.email_templates;

-- Qualquer autenticado pode ler (precisa para enviar email pessoal)
CREATE POLICY "email_templates_select" ON public.email_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Só admin escreve
CREATE POLICY "email_templates_admin_insert" ON public.email_templates FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "email_templates_admin_update" ON public.email_templates FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "email_templates_admin_delete" ON public.email_templates FOR DELETE
  USING (public.is_admin());

-- Seed dos templates default
INSERT INTO public.email_templates (key, subject, body_md, variables, description) VALUES
  (
    'campaign_ending',
    'A campanha "{{campaign_name}}" termina em breve',
    E'Olá,\n\nA campanha **{{campaign_name}}** termina em **{{days_left}}** dia(s) — a {{end_date}}.\n\nLembrete: confirma que os cartazes estão actualizados na loja {{store}}.\n\n— Equipa',
    '["campaign_name","days_left","end_date","store"]'::jsonb,
    'Enviado quando uma campanha está perto do fim (configurado em warn_days_before_end).'
  ),
  (
    'welcome_user',
    'Bem-vindo ao sistema de Gestão de Campanhas',
    E'Olá {{user_name}},\n\nA tua conta foi criada com o email **{{user_email}}**.\n\nRecebes a tua password temporária separadamente. No primeiro login serás obrigado(a) a definir uma password definitiva.\n\n— Equipa',
    '["user_name","user_email"]'::jsonb,
    'Enviado quando admin cria um novo utilizador.'
  ),
  (
    'password_reset',
    'A tua password foi redefinida',
    E'Olá {{user_name}},\n\nA tua password foi redefinida pelo administrador. Recebes a temporária separadamente — no próximo login serás obrigado(a) a definir uma nova.\n\n— Equipa',
    '["user_name"]'::jsonb,
    'Enviado quando admin reset password de um utilizador.'
  )
ON CONFLICT (key) DO NOTHING;
