-- ============================================================
-- Migration 004: profiles admin 정책 무한 재귀 수정
--
--   001_profiles.sql의 "profiles: admin read all" 정책이 자기 자신
--   (public.profiles)을 서브쿼리로 재귀 조회해서 무한 재귀를 유발함.
--   RLS를 우회하는 security definer 함수(is_admin)로 교체.
--
--   (이 스크립트는 Supabase SQL Editor에 "Recreate Admin Read Policy
--   with is_admin Function"이라는 이름으로 이미 저장·실행되어 있었으나
--   git에는 반영이 안 되어 있어 뒤늦게 커밋함 — 프로덕션엔 이미 적용됨)
-- ============================================================

drop policy if exists "profiles: admin read all" on public.profiles;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create policy "profiles: admin read all"
  on public.profiles for select
  using (public.is_admin());
