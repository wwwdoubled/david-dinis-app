-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Cofre — permitir leitura a utilizadores autenticados
-- Data: 2026-05-13
-- v3.15.3
-- ─────────────────────────────────────────────────────────────────────────
--
-- Update da policy de SELECT da tabela `credentials` para que QUALQUER
-- utilizador autenticado possa ler — o controlo de visibilidade fica
-- agora no app (Administração → Definições → Cofre de credenciais).
--
-- Mantém-se inalterado:
--   • INSERT / UPDATE / DELETE: apenas admins
--   • credentials_activity: insert livre / select admin
--
-- Justificação: o cofre serve para PARTILHAR credenciais operacionais com
-- a equipa (passwords de PCs, WiFi, alarmes, etc). Antes só admins ou o
-- owner (created_by) viam — o que tornava o cofre inútil para staff regular.
-- Agora o admin escolhe na app que roles vêem o menu; quando vêem, conseguem
-- ler a lista completa.
--
-- SEGURANÇA: continua a haver activity_log de cada `viewed`/`copied`.
-- As passwords continuam em texto plano — não usar para credenciais bancárias.
--
-- Como executar:
--   1. Supabase Dashboard → SQL Editor → New Query
--   2. Cola este ficheiro
--   3. Run

-- ─── Relaxar policy de leitura ──────────────────────────────────────────
drop policy if exists "credentials read" on public.credentials;

create policy "credentials read"
  on public.credentials for select
  using (auth.uid() is not null);

-- (INSERT/UPDATE/DELETE policies mantêm-se inalteradas — só admins escrevem.)
