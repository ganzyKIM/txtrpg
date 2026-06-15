// Edge Function: admin
// Single entry point for backoffice actions. Verifies the caller is an admin
// (profiles.is_admin) using the service role, then performs privileged
// operations: list users, top up / adjust credits, read ledgers, edit config.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: '로그인이 필요합니다.' }, 401);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: '인증에 실패했습니다.' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Admin gate
    const { data: me } = await admin
      .from('profiles').select('is_admin').eq('id', user.id).single();
    if (!me?.is_admin) return json({ error: '관리자 권한이 없습니다.' }, 403);

    const { action, ...p } = await req.json();

    switch (action) {
      case 'list_users': {
        const { data, error } = await admin
          .from('profiles')
          .select('id, email, display_name, credits, is_admin, created_at, last_seen_at')
          .order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ users: data });
      }

      case 'topup':
      case 'adjust': {
        const amount = Number(p.amount);
        if (!p.user_id || !Number.isFinite(amount) || amount === 0) {
          return json({ error: '대상과 0이 아닌 금액이 필요합니다.' }, 400);
        }
        const { data: balance, error } = await admin.rpc('add_credits', {
          p_user: p.user_id,
          p_amount: Math.trunc(amount),
          p_type: action === 'topup' ? 'topup' : 'adjust',
          p_meta: { by: user.id, note: p.note ?? null },
        });
        if (error) return json({ error: error.message }, 500);
        return json({ balance });
      }

      case 'list_ledger': {
        if (!p.user_id) return json({ error: 'user_id가 필요합니다.' }, 400);
        const { data, error } = await admin
          .from('credit_ledger')
          .select('id, delta, balance_after, type, meta, created_at')
          .eq('user_id', p.user_id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) return json({ error: error.message }, 500);
        return json({ ledger: data });
      }

      case 'set_admin': {
        if (!p.user_id) return json({ error: 'user_id가 필요합니다.' }, 400);
        const { error } = await admin
          .from('profiles')
          .update({ is_admin: !!p.is_admin })
          .eq('id', p.user_id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case 'get_config': {
        const { data, error } = await admin.from('config').select('key, value');
        if (error) return json({ error: error.message }, 500);
        return json({ config: data });
      }

      case 'set_config': {
        if (!p.key) return json({ error: 'key가 필요합니다.' }, 400);
        const { error } = await admin
          .from('config')
          .upsert({ key: p.key, value: p.value }, { onConflict: 'key' });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      default:
        return json({ error: '알 수 없는 action입니다.' }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
