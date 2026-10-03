-- Existing MUA portal: run this file once in Supabase SQL Editor.
-- Safe to run again. Do not rerun schema.sql in an existing project.
begin;
create table if not exists public.portal_leads (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references public.portal_profiles(id),
 company_name text not null check(length(trim(company_name)) between 1 and 200),
 contact_name text not null default '' check(length(contact_name)<=200),
 contact_details text not null default '' check(length(contact_details)<=500),
 client_address text not null default '' check(length(client_address)<=1000),
 stage text not null default 'new' check(stage in ('new','contacted','proposal_sent','interested','won','lost')),
 follow_up_date date,
 notes text not null default '' check(length(notes)<=5000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists portal_leads_owner_idx on public.portal_leads(owner_id,updated_at desc);
create index if not exists portal_leads_follow_up_idx on public.portal_leads(follow_up_date) where stage not in ('won','lost');
alter table public.portal_leads enable row level security;
drop policy if exists lead_read on public.portal_leads;
create policy lead_read on public.portal_leads for select to authenticated
 using(portal_private.is_active() and (owner_id=auth.uid() or portal_private.is_admin()));
drop policy if exists lead_insert on public.portal_leads;
create policy lead_insert on public.portal_leads for insert to authenticated
 with check(portal_private.is_active() and owner_id=auth.uid());
drop policy if exists lead_update on public.portal_leads;
create policy lead_update on public.portal_leads for update to authenticated
 using(portal_private.is_active() and (owner_id=auth.uid() or portal_private.is_admin()))
 with check(portal_private.is_active() and (owner_id=auth.uid() or portal_private.is_admin()));
revoke all on public.portal_leads from public,anon,authenticated;
grant select,insert on public.portal_leads to authenticated;
-- Neither clients nor the RPC can change the owner or creation timestamp.
grant update(company_name,contact_name,contact_details,client_address,stage,follow_up_date,notes,updated_at) on public.portal_leads to authenticated;
grant all on public.portal_leads to service_role;

create or replace function public.portal_save_lead(p_id uuid,p_company_name text,p_contact_name text,p_contact_details text,p_client_address text,p_stage text,p_follow_up_date date,p_notes text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if not portal_private.is_active() then raise exception 'Your account is not active.'; end if;
 if p_id is null then
  insert into public.portal_leads(company_name,contact_name,contact_details,client_address,stage,follow_up_date,notes)
  values(trim(p_company_name),trim(coalesce(p_contact_name,'')),trim(coalesce(p_contact_details,'')),trim(coalesce(p_client_address,'')),p_stage,p_follow_up_date,trim(coalesce(p_notes,''))) returning id into v_id;
 else
  update public.portal_leads set company_name=trim(p_company_name),contact_name=trim(coalesce(p_contact_name,'')),contact_details=trim(coalesce(p_contact_details,'')),client_address=trim(coalesce(p_client_address,'')),stage=p_stage,follow_up_date=p_follow_up_date,notes=trim(coalesce(p_notes,'')),updated_at=now()
  where id=p_id returning id into v_id;
  if v_id is null then raise exception 'Lead unavailable.'; end if;
 end if;
 return v_id;
end; $$;
revoke all on function public.portal_save_lead(uuid,text,text,text,text,text,date,text) from public,anon;
grant execute on function public.portal_save_lead(uuid,text,text,text,text,text,date,text) to authenticated;
notify pgrst,'reload schema';
commit;
