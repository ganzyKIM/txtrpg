// Edge Function: generate-image
// Same flow as generate-text but charges a fixed credit cost per image
// (resolution-based, from config). Credits are deducted only on success.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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

interface ImageCfg {
  model: string;
  usd: number; // USD per image
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: '로그인이 필요합니다.' }, 401);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) return json({ error: '서버에 API 키가 설정되지 않았습니다.' }, 500);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: '인증에 실패했습니다.' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: cfgRows } = await admin.from('config').select('key, value');
    const cfg = Object.fromEntries((cfgRows ?? []).map((r) => [r.key, r.value]));
    const fx = Number(cfg.fx ?? 1400);
    const markup = Number(cfg.markup ?? 2);
    const img = (cfg.image ?? {}) as ImageCfg;
    if (!img.model) return json({ error: '이미지 모델 설정 오류입니다.' }, 500);

    const credits = Math.max(1, Math.ceil(img.usd * fx * markup));

    const { data: prof } = await admin
      .from('profiles').select('credits').eq('id', user.id).single();
    if (!prof || prof.credits < credits) {
      return json({ error: `크레딧이 부족합니다. (이미지 1장 = ${credits} 크레딧)` }, 402);
    }

    const { prompt } = await req.json();
    if (!prompt) return json({ error: '프롬프트가 비어 있습니다.' }, 400);

    const gRes = await fetch(
      `${GEMINI_BASE}/models/${img.model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    const gData = await gRes.json();
    if (gData.error) return json({ error: gData.error.message }, 502);

    const parts: Array<{ inlineData?: { data: string }; inline_data?: { data: string } }> =
      gData.candidates?.[0]?.content?.parts ?? [];
    let image = '';
    for (const part of parts) {
      const b64 = part.inlineData?.data ?? part.inline_data?.data;
      if (b64) { image = b64; break; }
    }
    if (!image) return json({ error: '이미지 데이터를 추출하지 못했습니다.' }, 502);

    // Deduct only after a successful image
    const { data: balance, error: spendErr } = await admin.rpc('spend_credits', {
      p_user: user.id,
      p_amount: credits,
      p_type: 'spend_image',
      p_meta: { model: img.model },
    });
    if (spendErr) return json({ error: '크레딧 차감 실패: ' + spendErr.message }, 500);

    return json({ image, balance, credits });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
