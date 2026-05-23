// ─────────────────────────────────────────────────────────────────────────
// Edge Function: admin-user-mgmt
// v3.16.0
// ─────────────────────────────────────────────────────────────────────────
//
// Permite ao admin (verificado via tabela public.admins) criar utilizadores
// e fazer reset de password. Ambas as operações requerem service_role do
// Supabase Auth Admin API, que NUNCA pode estar no browser — daí ser uma
// Edge Function.
//
// Actions:
//   { action: 'create', email: '...' }           → cria user com temp pw
//   { action: 'reset',  userId: 'uuid' }         → reset pw de user existente
//
// Devolve: { ok: true, tempPassword: '...' }
//
// Marca user_profiles.must_change_password = true (forçar mudança no próximo
// login via ForcePasswordChangeModal na app).
//
// ─── Deploy ──────────────────────────────────────────────────────────────
//   Dashboard Supabase → Edge Functions → New function
//   Nome: admin-user-mgmt
//   Cola este ficheiro inteiro → Deploy.
//   Os secrets SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   são injectados automaticamente pelo Supabase.
//
// ─── Segurança ───────────────────────────────────────────────────────────
//   • Caller TEM de enviar Authorization: Bearer <user_jwt>
//   • A função verifica o utilizador via JWT e confirma que é admin
//     consultando public.admins (sem service-role, com RLS)
//   • Só depois usa service_role para a operação admin
//
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

function generateTempPassword(): string {
  // 14 chars, alfanuméricos sem ambiguidades (sem 0/O/l/1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 14; i++) out += chars[arr[i] % chars.length];
  return out;
}

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

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return jsonResponse({ error: 'missing_env' }, 500);
  }

  try {
    // 1) Autenticar caller via JWT
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ error: 'missing_bearer_token' }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    // 2) Confirmar que é admin (via tabela public.admins, RLS-protegida)
    const { data: adminRow, error: adminErr } = await userClient
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (adminErr) {
      return jsonResponse({ error: 'admin_check_failed: ' + adminErr.message }, 500);
    }
    if (!adminRow) {
      return jsonResponse({ error: 'forbidden_not_admin' }, 403);
    }

    // 3) Cliente service-role para Admin API
    const adminClient = createClient(supabaseUrl, serviceKey);

    let body: { action?: string; email?: string; userId?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'invalid_json_body' }, 400);
    }
    const { action, email, userId } = body || {};
    const tempPassword = generateTempPassword();

    // ─── action: create ─────────────────────────────────────────────
    if (action === 'create') {
      if (!email || typeof email !== 'string') {
        return jsonResponse({ error: 'email_required' }, 400);
      }
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.includes('@')) {
        return jsonResponse({ error: 'invalid_email' }, 400);
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true, // sem email de confirmação
      });
      if (error || !data?.user) {
        return jsonResponse({ error: error?.message || 'create_failed' }, 400);
      }

      // upsert do profile com a flag
      await adminClient.from('user_profiles').upsert({
        user_id: data.user.id,
        email: cleanEmail,
        must_change_password: true,
      }, { onConflict: 'user_id' });

      return jsonResponse({
        ok: true,
        action: 'create',
        tempPassword,
        userId: data.user.id,
        email: cleanEmail,
      });
    }

    // ─── action: reset ──────────────────────────────────────────────
    if (action === 'reset') {
      if (!userId || typeof userId !== 'string') {
        return jsonResponse({ error: 'userId_required' }, 400);
      }

      const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });
      if (updErr) {
        return jsonResponse({ error: updErr.message }, 400);
      }

      // upsert da flag (não falha se não existir profile)
      const { error: profileErr } = await adminClient.from('user_profiles')
        .upsert({ user_id: userId, must_change_password: true }, { onConflict: 'user_id' });
      if (profileErr) {
        return jsonResponse({ ok: true, tempPassword, warning: 'profile_update_failed: ' + profileErr.message });
      }

      return jsonResponse({ ok: true, action: 'reset', tempPassword });
    }

    return jsonResponse({ error: 'unknown_action', allowed: ['create', 'reset'] }, 400);
  } catch (err) {
    return jsonResponse({ error: 'internal_error: ' + String(err) }, 500);
  }
});
