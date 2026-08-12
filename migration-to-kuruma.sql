-- ═══════════════════════════════════════════════════════════════════════════
-- Workshop Pulse → kuruma Supabase project migration, STEP 1 of 3
-- Run this ONCE in the **KURUMA** project's SQL Editor.
-- Creates the workshop's three tables + photo bucket, locked down with the
-- same staff-only RLS as supabase-security.sql. Purely additive — touches
-- nothing that kuruma.lk uses.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tables ─────────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text default '',
  role text not null default 'staff'
    check (role in ('viewer','staff','admin','super_admin')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.jobs (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  stage text,
  on_hold boolean default false,
  vehicle_reg text,
  customer_name text,
  customer_phone text,
  job_type text
);

create table if not exists public.store_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- ── Helper functions (SECURITY DEFINER so policies don't recurse) ──────────
create or replace function public.wp_is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') = 'smgiroshana@gmail.com'
      or exists (
        select 1 from public.user_roles ur
        where lower(ur.email) = coalesce(lower(auth.jwt() ->> 'email'), '')
          and ur.is_active
      );
$$;

create or replace function public.wp_is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') = 'smgiroshana@gmail.com'
      or exists (
        select 1 from public.user_roles ur
        where lower(ur.email) = coalesce(lower(auth.jwt() ->> 'email'), '')
          and ur.is_active
          and ur.role = 'super_admin'
      );
$$;

revoke all on function public.wp_is_staff() from anon;
revoke all on function public.wp_is_super_admin() from anon;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.user_roles enable row level security;
alter table public.jobs enable row level security;
alter table public.store_data enable row level security;

drop policy if exists "staff read roles"          on public.user_roles;
drop policy if exists "super admin manages roles" on public.user_roles;
drop policy if exists "staff full access"         on public.jobs;
drop policy if exists "staff full access"         on public.store_data;

create policy "staff read roles" on public.user_roles
  for select to authenticated
  using (public.wp_is_staff() or lower(email) = coalesce(lower(auth.jwt() ->> 'email'), ''));

create policy "super admin manages roles" on public.user_roles
  for all to authenticated
  using (public.wp_is_super_admin())
  with check (public.wp_is_super_admin());

create policy "staff full access" on public.jobs
  for all to authenticated
  using (public.wp_is_staff())
  with check (public.wp_is_staff());

create policy "staff full access" on public.store_data
  for all to authenticated
  using (public.wp_is_staff())
  with check (public.wp_is_staff());

-- ── Photo bucket (private) ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "staff read job photos"   on storage.objects;
drop policy if exists "staff write job photos"  on storage.objects;
drop policy if exists "staff update job photos" on storage.objects;
drop policy if exists "staff delete job photos" on storage.objects;

create policy "staff read job photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'job-photos' and public.wp_is_staff());

create policy "staff write job photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'job-photos' and public.wp_is_staff());

create policy "staff update job photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'job-photos' and public.wp_is_staff());

create policy "staff delete job photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'job-photos' and public.wp_is_staff());

-- ── Verify ─────────────────────────────────────────────────────────────────
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('jobs','store_data','user_roles');
