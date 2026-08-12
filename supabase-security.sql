-- ═══════════════════════════════════════════════════════════════════════════
-- Workshop Pulse — security lockdown
-- Run this ONCE in the Supabase SQL Editor (works on the current project, and
-- can be re-run as-is on the kuruma project after a future migration).
--
-- What it does:
--   1. Every table is restricted to ACTIVE staff listed in user_roles
--      (plus the hardcoded super admin). Any other Google account that signs
--      in gets a session but can read/write NOTHING.
--   2. Only the super admin can manage user_roles (no self-promotion).
--   3. The job-photos bucket becomes PRIVATE; photos are readable/writable
--      only by active staff via signed URLs (the app already supports this).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tables (created if missing — store_data was never created in production,
--    which is why the Store/Cash Book never persisted anything) ─────────────
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

-- ── user_roles: read for staff, manage for super admin ONLY ────────────────
alter table public.user_roles enable row level security;

drop policy if exists "Users can read roles"     on public.user_roles;
drop policy if exists "Super admin can insert"   on public.user_roles;
drop policy if exists "Super admin can update"   on public.user_roles;
drop policy if exists "Super admin can delete"   on public.user_roles;
drop policy if exists "staff read roles"         on public.user_roles;
drop policy if exists "own row visible"          on public.user_roles;
drop policy if exists "super admin manages roles" on public.user_roles;

-- Staff can read the list; a signed-in user can also see their own row
-- (needed by the login gate to resolve their role before "staff" is proven)
create policy "staff read roles" on public.user_roles
  for select to authenticated
  using (public.wp_is_staff() or lower(email) = coalesce(lower(auth.jwt() ->> 'email'), ''));

create policy "super admin manages roles" on public.user_roles
  for all to authenticated
  using (public.wp_is_super_admin())
  with check (public.wp_is_super_admin());

-- ── jobs / store_data: active staff only ───────────────────────────────────
alter table public.jobs enable row level security;
alter table public.store_data enable row level security;

drop policy if exists "staff full access" on public.jobs;
drop policy if exists "staff full access" on public.store_data;

create policy "staff full access" on public.jobs
  for all to authenticated
  using (public.wp_is_staff())
  with check (public.wp_is_staff());

create policy "staff full access" on public.store_data
  for all to authenticated
  using (public.wp_is_staff())
  with check (public.wp_is_staff());

-- ── Storage: make job-photos private, staff-only ───────────────────────────
update storage.buckets set public = false where id = 'job-photos';

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
