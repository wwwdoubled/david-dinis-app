// ─────────────────────────────────────────────────────────────────────────
// Edge Function: send-emails
// v3.21.25
// ─────────────────────────────────────────────────────────────────────────
//
// Consome a fila `email_queue` (status='pending', attempts<3) e envia via
// Resend API. Actualiza o status para 'sent' (sucesso) ou 'error' (3 falhas).
//
// Caller permitido:
//   • Admin logado (JWT do user; verifica tabela public.admins)
//   • Cron interno (header `Authorization: Bearer <SERVICE_ROLE_KEY>`)
//
// Body opcional (POST):
//   { "limit": 50, "ids": ["uuid", "uuid"] }
//
// Resposta:
//   { ok: true, sent: N, failed: M, total: T, errors: [...] }
//
// ─── Secrets necessários (Supabase Dashboard → Edge Functions → Manage secrets) ──
//   RESEND_API_KEY        — gerado em resend.com
//   EMAIL_FROM_ADDRESS    — ex: relatorios@dominioverificado.com
//   EMAIL_FROM_NAME       — ex: "David Dinis · FNAC Aveiro" (opcional)
//
// ─── Deploy ──────────────────────────────────────────────────────────────
//   Dashboard Supabase → Edge Functions → New function
//   Nome: send-emails  →  cola este ficheiro inteiro  →  Deploy
//
// ─── Cron (Dashboard → Database → Cron Jobs → New) ──────────────────────
//   Schedule: 0 9 * * *    (9h UTC = 10h Lisboa verão)
//   Type: HTTP request
//   URL: https://<ref>.supabase.co/functions/v1/send-emails
//   Headers: Authorization=Bearer <SERVICE_ROLE_KEY>
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type EmailRow = {
  id: string;
  to_email: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  category: string | null;
  attempts: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('EMAIL_FROM_ADDRESS') || 'onboarding@resend.dev';
  const fromName  = Deno.env.get('EMAIL_FROM_NAME')    || 'David Dinis';

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return jsonResponse({ error: 'missing_supabase_env' }, 500);
  }
  if (!resendKey) {
    return jsonResponse({ error: 'missing_resend_api_key' }, 500);
  }

  try {
    // 1) Auth — admin user OU cron com service_role
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim() : '';
    const isCron = token === serviceKey;

    if (!isCron) {
      if (!token) return jsonResponse({ error: 'missing_bearer_token' }, 401);
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await userClient.auth.getUser();
      if (authErr || !user) return jsonResponse({ error: 'unauthorized' }, 401);
      const { data: adm, error: admErr } = await userClient
        .from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
      if (admErr) return jsonResponse({ error: 'admin_check_failed: ' + admErr.message }, 500);
      if (!adm) return jsonResponse({ error: 'forbidden_not_admin' }, 403);
    }

    // 2) Service client
    const adminClient = createClient(supabaseUrl, serviceKey);

    // 3) Parse body (optional)
    let body: { limit?: number; ids?: string[] } = {};
    try { body = await req.json(); } catch { /* empty body OK */ }
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);

    // 4) Fetch pending
    let q = adminClient.from('email_queue')
      .select('id, to_email, subject, body_html, body_text, category, attempts')
      .eq('status', 'pending').lt('attempts', 3)
      .order('created_at', { ascending: true }).limit(limit);
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      q = adminClient.from('email_queue')
        .select('id, to_email, subject, body_html, body_text, category, attempts')
        .in('id', body.ids).limit(limit);
    }
    const { data: pending, error: fetchErr } = await q;
    if (fetchErr) return jsonResponse({ error: 'fetch_failed: ' + fetchErr.message }, 500);
    const emails: EmailRow[] = pending || [];
    if (emails.length === 0) {
      return jsonResponse({ ok: true, sent: 0, failed: 0, total: 0, message: 'no_pending' });
    }

    // 5) Send each via Resend
    const fromHeader = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    let sent = 0, failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const m of emails) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromHeader,
            to: m.to_email,
            subject: m.subject,
            html: m.body_html,
            text: m.body_text || undefined,
            tags: [{ name: 'category', value: m.category || 'other' }],
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.message || data?.name || `http_${r.status}`);

        await adminClient.from('email_queue').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_id: data?.id || null,
          attempts: m.attempts + 1,
          error_message: null,
        }).eq('id', m.id);
        sent++;
      } catch (err) {
        const next = m.attempts + 1;
        const msg = String((err as Error)?.message || err).slice(0, 500);
        await adminClient.from('email_queue').update({
          attempts: next,
          error_message: msg,
          status: next >= 3 ? 'error' : 'pending',
        }).eq('id', m.id);
        failed++;
        errors.push({ id: m.id, error: msg });
      }
    }

    return jsonResponse({
      ok: true,
      sent, failed, total: emails.length,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    return jsonResponse({ error: 'internal_error: ' + String(err) }, 500);
  }
});
