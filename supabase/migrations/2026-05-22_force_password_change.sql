-- ─────────────────────────────────────────────────────────────────────────
-- Migration: must_change_password flag para forçar mudança de password
-- Data: 2026-05-22
-- v3.16.0
-- ─────────────────────────────────────────────────────────────────────────
--
-- Adiciona uma flag em user_profiles que indica se o utilizador tem de
-- mudar a password no próximo login. É posta a TRUE pela Edge Function
-- admin-user-mgmt sempre que o admin:
--   • Cria um utilizador novo (password gerada pela Function)
--   • Faz reset de password (nova password gerada)
--
-- O utilizador autenticado pode actualizar o próprio flag para FALSE
-- depois de mudar a password via supabase.auth.updateUser({ password }).
--
-- Como executar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cola este ficheiro
--   3. Run

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- RLS: o utilizador pode actualizar APENAS o seu próprio profile
-- (necessário para o ForcePasswordChangeModal limpar o flag após sucesso)
DROP POLICY IF EXISTS "user_profiles update own must_change" ON public.user_profiles;
CREATE POLICY "user_profiles update own must_change"
  ON public.user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
