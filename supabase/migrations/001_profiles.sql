-- ============================================================
-- Migration 001: profiles table + RLS
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension (already enabled by default in Supabase)
create extension if not exists "uuid-ossp";

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  credits       bigint not null default 0,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- Auto-create profile row on first Google login
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update last_seen_at on each sign-in
create or replace function public.handle_user_login()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set last_seen_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_login on auth.users;
create trigger on_auth_user_login
  after update of last_sign_in_at on auth.users
  for each row execute procedure public.handle_user_login();

-- ── RLS ─────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Users can read their own row
create policy "profiles: self read"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update only display_name (NOT credits, NOT is_admin)
create policy "profiles: self update name"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can read all profiles
create policy "profiles: admin read all"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
