-- ============================================================
-- Migration 003: per-user saves (DB autosave) + image Storage
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── saves (유저별 저장 슬롯, 자동저장) ──────────────────────
create table if not exists public.saves (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text not null default '새 모험',
  fixed_memory          text not null default '',
  rolling_summary       text not null default '',
  summarized_turn_count integer not null default 0,
  turns                 jsonb not null default '[]'::jsonb,
  archive               text not null default '',
  turn_count            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists saves_user_idx on public.saves(user_id, updated_at desc);

alter table public.saves enable row level security;

-- 본인 세이브만 전체 CRUD
drop policy if exists "saves: self all" on public.saves;
create policy "saves: self all"
  on public.saves for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 이미지 Storage 버킷 (공개 읽기, 소유자만 업로드) ────────
insert into storage.buckets (id, name, public)
values ('game-images', 'game-images', true)
on conflict (id) do nothing;

-- 경로 규칙: {user_id}/{save_id}/{uuid}.png → 첫 폴더가 본인 uid일 때만 쓰기
drop policy if exists "game-images: owner insert" on storage.objects;
create policy "game-images: owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'game-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "game-images: owner delete" on storage.objects;
create policy "game-images: owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'game-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 공개 버킷이라 읽기는 누구나 가능 (URL을 아는 사람만 접근)
drop policy if exists "game-images: public read" on storage.objects;
create policy "game-images: public read"
  on storage.objects for select
  using (bucket_id = 'game-images');
