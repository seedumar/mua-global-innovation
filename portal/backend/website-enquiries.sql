-- Run once AFTER the existing schema.sql. Do not rerun the original schema.
begin;
create table if not exists public.portal_enquiries (
 id uuid primary key, full_name text not null check(length(full_name) between 1 and 200),
 contact_details text not null check(length(contact_details) between 1 and 254),
 organisation text not null default '' check(length(organisation)<=200),
 service_name text not null check(length(service_name) between 1 and 200),
 details text not null check(length(details) between 1 and 5000),
 preferred_timing text not null default '' check(length(preferred_timing)<=100),
 status text not null default 'new' check(status in ('new','contacted','quoted','won','closed')),
 assigned_to text not null default '' check(length(assigned_to)<=200),
 follow_up_date date, notes text not null default '' check(length(notes)<=5000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists portal_enquiries_created on public.portal_enquiries(created_at desc,id);
alter table public.portal_enquiries enable row level security;
revoke all on public.portal_enquiries from anon, authenticated;
grant select on public.portal_enquiries to authenticated;
grant all on public.portal_enquiries to service_role;
drop policy if exists enquiry_admin_read on public.portal_enquiries;
create policy enquiry_admin_read on public.portal_enquiries for select to authenticated using(portal_private.is_admin());
-- Temporary rate-limit hashes stay outside the public API schema.
create table if not exists portal_private.enquiry_intake_log(id uuid primary key, rate_key text not null, created_at timestamptz not null default now());
revoke all on portal_private.enquiry_intake_log from public,anon,authenticated;
create index if not exists enquiry_intake_created on portal_private.enquiry_intake_log(created_at);
create or replace function public.portal_receive_enquiry(p_id uuid,p_name text,p_contact text,p_service text,p_details text,p_organisation text,p_timing text,p_rate_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.portal_enquiries%rowtype;
begin
 -- Execution privileges below allow only the server service role.
 perform pg_catalog.pg_advisory_xact_lock(64041004);
 select * into previous from public.portal_enquiries where id=p_id;
 if found then
  if previous.full_name=p_name and previous.contact_details=p_contact and previous.service_name=p_service and previous.details=p_details and previous.organisation=p_organisation and previous.preferred_timing=p_timing then return p_id; end if;
  raise exception 'enquiry_request_conflict';
 end if;
 if p_id is null or p_rate_key is null or p_rate_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid intake'; end if;
 delete from portal_private.enquiry_intake_log where created_at<now()-interval '1 hour';
 if (select count(*) from portal_private.enquiry_intake_log where rate_key=p_rate_key)>=5 or (select count(*) from portal_private.enquiry_intake_log)>=100 then raise exception 'enquiry_rate_limit'; end if;
 insert into public.portal_enquiries(id,full_name,contact_details,organisation,service_name,details,preferred_timing) values(p_id,p_name,p_contact,p_organisation,p_service,p_details,p_timing);
 insert into portal_private.enquiry_intake_log(id,rate_key) values(p_id,p_rate_key);
 return p_id;
end $$;
revoke all on function public.portal_receive_enquiry(uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.portal_receive_enquiry(uuid,text,text,text,text,text,text,text) to service_role;
create or replace function public.portal_update_enquiry(p_id uuid,p_expected_updated_at timestamptz,p_status text,p_assigned_to text,p_follow_up_date date,p_notes text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not portal_private.is_admin() then raise exception 'Admin access required'; end if;
 if p_status is null or p_status not in ('new','contacted','quoted','won','closed') or p_assigned_to is null or length(p_assigned_to)>200 or p_notes is null or length(p_notes)>5000 then raise exception 'Check the progress, assignment and notes'; end if;
 update public.portal_enquiries set status=p_status,assigned_to=trim(p_assigned_to),follow_up_date=p_follow_up_date,notes=trim(p_notes),updated_at=clock_timestamp() where id=p_id and updated_at=p_expected_updated_at;
 if not found then raise exception 'This enquiry changed. Close the editor, refresh and reopen it before saving.'; end if;
end $$;
revoke all on function public.portal_update_enquiry(uuid,timestamptz,text,text,date,text) from public,anon;
grant execute on function public.portal_update_enquiry(uuid,timestamptz,text,text,date,text) to authenticated;
commit;
