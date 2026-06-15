-- ============================================================
-- Migration 002: credit_ledger + config + atomic credit RPCs
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── credit_ledger (장부) ────────────────────────────────────
create table if not exists public.credit_ledger (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  delta         bigint not null,           -- +충전 / -차감
  balance_after bigint not null,
  type          text not null,             -- 'topup' | 'spend_text' | 'spend_image' | 'adjust' | 'refund'
  meta          jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on public.credit_ledger(user_id, created_at desc);

alter table public.credit_ledger enable row level security;

-- 본인 장부만 읽기 (기록은 서버 service role만)
drop policy if exists "ledger: self read" on public.credit_ledger;
create policy "ledger: self read"
  on public.credit_ledger for select
  using (auth.uid() = user_id);

-- ── config (운영 설정: 환율/배수/모델단가) ──────────────────
create table if not exists public.config (
  key   text primary key,
  value jsonb not null
);
-- RLS 켜고 정책 없음 → 클라이언트 접근 불가, service role만 사용
alter table public.config enable row level security;

-- 초기값 (백오피스에서 언제든 수정). 실제 Gemini 모델 ID는 발급 키가
-- 지원하는 값으로 맞춰야 함. 단가는 USD per 1M tokens / USD per image.
insert into public.config (key, value) values
  ('fx',     '1400'::jsonb),
  ('markup', '2'::jsonb),
  ('models', '{
     "standard": { "model": "gemini-2.5-flash",     "in_rate": 0.5, "out_rate": 3.0 },
     "pro":      { "model": "gemini-2.5-pro",        "in_rate": 1.5, "out_rate": 9.0 }
   }'::jsonb),
  ('image',  '{ "model": "gemini-2.5-flash-image", "usd": 0.067 }'::jsonb)
on conflict (key) do nothing;

-- ── 원자적 차감 ─────────────────────────────────────────────
create or replace function public.spend_credits(
  p_user   uuid,
  p_amount bigint,
  p_type   text,
  p_meta   jsonb
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_balance bigint;
begin
  -- 행 잠금으로 동시 차감 경쟁 방지
  select credits into v_balance from public.profiles where id = p_user for update;
  if v_balance is null then
    raise exception 'profile not found';
  end if;
  if v_balance < p_amount then
    raise exception 'insufficient credits';
  end if;

  update public.profiles set credits = credits - p_amount where id = p_user
    returning credits into v_balance;

  insert into public.credit_ledger (user_id, delta, balance_after, type, meta)
    values (p_user, -p_amount, v_balance, p_type, p_meta);

  return v_balance;
end;
$$;

-- ── 충전 / 수동 조정 (백오피스/관리자용) ────────────────────
create or replace function public.add_credits(
  p_user   uuid,
  p_amount bigint,
  p_type   text,
  p_meta   jsonb
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_balance bigint;
begin
  update public.profiles set credits = credits + p_amount where id = p_user
    returning credits into v_balance;
  if v_balance is null then
    raise exception 'profile not found';
  end if;

  insert into public.credit_ledger (user_id, delta, balance_after, type, meta)
    values (p_user, p_amount, v_balance, p_type, p_meta);

  return v_balance;
end;
$$;

-- 클라이언트(anon/authenticated)가 직접 호출하지 못하도록 권한 회수.
-- service role(Edge Function)만 사용한다.
revoke all on function public.spend_credits(uuid, bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.add_credits(uuid, bigint, text, jsonb)   from public, anon, authenticated;
