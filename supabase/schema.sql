-- Additive migration: does not change existing portal tables.
create table if not exists public.mua_ambassador_applications (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique,
 full_name text not null,
 email text not null,
 phone text not null,
 state text not null,
 city text not null,
 occupation text not null,
 qualification text not null,
 profile_url text not null default '',
 motivation text not null,
 experience text not null,
 outreach_plan text not null,
 availability text not null,
 audiences text[] not null,
 consent_version text not null default '2026-10-05',
 status text not null default 'new' check(status in ('new','shortlisted','accepted','declined')),
 created_at timestamptz not null default now()
);
alter table public.mua_ambassador_applications enable row level security;
revoke all on public.mua_ambassador_applications from anon, authenticated;
grant all on public.mua_ambassador_applications to service_role;
-- Review records in the private Supabase Table Editor. No public read access.
