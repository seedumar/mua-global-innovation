-- Run once in a NEW Supabase project. Existing corporate-site data is unaffected.
begin;
create schema if not exists portal_private;
revoke all on schema portal_private from public;
grant usage on schema portal_private to authenticated;
create table public.portal_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 full_name text not null default '' check (length(full_name)<=200),
 role text not null default 'ambassador' check (role in ('ambassador','admin')),
 active boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.portal_services (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check (length(trim(name)) between 1 and 200),
 body text not null check (length(trim(body)) between 1 and 8000),
 active boolean not null default true,
 updated_at timestamptz not null default now()
);
create sequence public.portal_reference_sequence;
create table public.portal_proposals (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique default ('MUA-' || lpad(nextval('public.portal_reference_sequence')::text,6,'0')),
 owner_id uuid not null references public.portal_profiles(id),
 service_id uuid not null references public.portal_services(id),
 service_name text not null,
 client_name text not null check(length(trim(client_name)) between 1 and 200),
 client_address text not null check(length(trim(client_address)) between 1 and 1000),
 client_contact text not null default '' check(length(client_contact)<=200),
 notes text not null default '' check(length(notes)<=5000),
 letter_text text not null check(length(trim(letter_text)) between 1 and 16000),
 status text not null default 'draft' check(status in ('draft','submitted','changes_requested','approved')),
 feedback text not null default '' check(length(feedback)<=2000),
 amount numeric(12,2) check(amount>=0 and amount<=999999999),
 signatory_name text check(length(signatory_name)<=200),
 signatory_title text check(length(signatory_title)<=200),
 approved_by uuid references public.portal_profiles(id),
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint approved_details check(status<>'approved' or (approved_at is not null and approved_by is not null and length(trim(signatory_name))>0 and length(trim(signatory_title))>0))
);
create table public.portal_events (
 id bigint generated always as identity primary key,
 proposal_id uuid references public.portal_proposals(id),
 actor_id uuid references public.portal_profiles(id),
 kind text not null,
 detail text not null default '',
 created_at timestamptz not null default now()
);
create index on public.portal_proposals(owner_id,updated_at desc);
create index on public.portal_proposals(status);
create index on public.portal_events(proposal_id,created_at);

create function portal_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_profiles where id=auth.uid() and active and role='admin');
$$;
create function portal_private.is_active() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_profiles where id=auth.uid() and active);
$$;
create function portal_private.can_read_proposal(proposal uuid) returns boolean language sql stable security definer set search_path='' as $$
 select portal_private.is_active() and exists(select 1 from public.portal_proposals where id=proposal and (owner_id=auth.uid() or portal_private.is_admin()));
$$;
revoke all on all functions in schema portal_private from public;
grant execute on all functions in schema portal_private to authenticated;

create function portal_private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.portal_profiles(id,email,full_name) values(new.id,coalesce(new.email,''),left(coalesce(new.raw_user_meta_data->>'full_name',''),200));
 return new;
end; $$;
revoke all on function portal_private.new_profile() from public;
create trigger portal_new_user after insert on auth.users for each row execute function portal_private.new_profile();
-- Create inactive profiles for Auth users created before this schema was installed.
insert into public.portal_profiles(id,email,full_name)
select id,coalesce(email,''),left(coalesce(raw_user_meta_data->>'full_name',''),200) from auth.users on conflict(id) do nothing;

alter table public.portal_profiles enable row level security;
alter table public.portal_services enable row level security;
alter table public.portal_proposals enable row level security;
alter table public.portal_events enable row level security;
create policy profile_read on public.portal_profiles for select to authenticated using(id=auth.uid() or portal_private.is_admin());
create policy service_read on public.portal_services for select to authenticated using(portal_private.is_active() and (active or portal_private.is_admin()));
create policy proposal_read on public.portal_proposals for select to authenticated using(portal_private.is_active() and (owner_id=auth.uid() or portal_private.is_admin()));
create policy event_read on public.portal_events for select to authenticated using(portal_private.is_admin() or portal_private.can_read_proposal(proposal_id));
-- No client INSERT/UPDATE/DELETE grants or policies. All writes go through guarded RPCs.
revoke all on public.portal_profiles,public.portal_services,public.portal_proposals,public.portal_events from anon,authenticated;
grant select on public.portal_profiles,public.portal_services,public.portal_proposals,public.portal_events to authenticated;
grant all on public.portal_profiles,public.portal_services,public.portal_proposals,public.portal_events to service_role;
grant usage,select on sequence public.portal_reference_sequence,public.portal_events_id_seq to service_role;

create function public.portal_save_proposal(p_id uuid,p_service_id uuid,p_client_name text,p_client_address text,p_client_contact text,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v public.portal_proposals; s public.portal_services; body text;
begin
 if not portal_private.is_active() then raise exception 'Your account is not active.'; end if;
 select * into s from public.portal_services where id=p_service_id and active;
 if not found then raise exception 'Choose an available service.'; end if;
 body := 'We are pleased to introduce MUA Global Innovation Ltd and discuss our ' || s.name || ' service with your organisation.' || E'\n\n' || s.body ||
 case when length(trim(coalesce(p_notes,'')))>0 then E'\n\nProject requirements for discussion:\n' || trim(p_notes) else '' end ||
 E'\n\nWe would welcome an opportunity to discuss your requirements. The final scope, delivery plan, hosting or equipment needs and project terms will be confirmed in an agreed quotation.';
 if p_id is null then
  insert into public.portal_proposals(owner_id,service_id,service_name,client_name,client_address,client_contact,notes,letter_text)
  values(auth.uid(),s.id,s.name,trim(p_client_name),trim(p_client_address),trim(coalesce(p_client_contact,'')),trim(coalesce(p_notes,'')),body) returning * into v;
 else
  select * into v from public.portal_proposals where id=p_id for update;
  if not found or (v.owner_id<>auth.uid() and not portal_private.is_admin()) then raise exception 'Proposal unavailable.'; end if;
  if v.status not in ('draft','changes_requested') then raise exception 'Only drafts or requested revisions can be edited.'; end if;
  update public.portal_proposals set service_id=s.id,service_name=s.name,client_name=trim(p_client_name),client_address=trim(p_client_address),client_contact=trim(coalesce(p_client_contact,'')),notes=trim(coalesce(p_notes,'')),letter_text=body,status='draft',updated_at=now() where id=p_id returning * into v;
 end if;
 insert into public.portal_events(proposal_id,actor_id,kind) values(v.id,auth.uid(),'Draft saved');
 return v.id;
end; $$;
create function public.portal_submit_proposal(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v public.portal_proposals;
begin
 if not portal_private.is_active() then raise exception 'Your account is not active.'; end if;
 select * into v from public.portal_proposals where id=p_id for update;
 if not found or (v.owner_id<>auth.uid() and not portal_private.is_admin()) then raise exception 'Proposal unavailable.'; end if;
 if v.status not in ('draft','changes_requested') then raise exception 'This proposal cannot be submitted again.'; end if;
 update public.portal_proposals set status='submitted',updated_at=now() where id=p_id;
 insert into public.portal_events(proposal_id,actor_id,kind) values(p_id,auth.uid(),'Submitted for review');
end; $$;
create function public.portal_review_proposal(p_id uuid,p_decision text,p_feedback text,p_letter_text text,p_amount numeric,p_signatory_name text,p_signatory_title text)
returns void language plpgsql security definer set search_path='' as $$
declare v public.portal_proposals;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 if p_decision not in ('approved','changes_requested') or p_decision is null then raise exception 'Choose an approval or request changes.'; end if;
 select * into v from public.portal_proposals where id=p_id for update;
 if not found or v.status<>'submitted' then raise exception 'Only a submitted proposal can be reviewed.'; end if;
 if p_decision='changes_requested' then
  if length(trim(coalesce(p_feedback,'')))=0 then raise exception 'Explain the changes required.'; end if;
  update public.portal_proposals set status=p_decision,feedback=trim(p_feedback),updated_at=now() where id=p_id;
 else
  if length(trim(coalesce(p_signatory_name,'')))=0 or length(trim(coalesce(p_signatory_title,'')))=0 then raise exception 'An authorised signatory is required.'; end if;
  update public.portal_proposals set status='approved',letter_text=trim(p_letter_text),amount=p_amount,signatory_name=trim(p_signatory_name),signatory_title=trim(p_signatory_title),feedback=trim(coalesce(p_feedback,'')),approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=p_id;
 end if;
 insert into public.portal_events(proposal_id,actor_id,kind,detail) values(p_id,auth.uid(),case when p_decision='approved' then 'Approved' else 'Changes requested' end,coalesce(p_feedback,''));
end; $$;
create function public.portal_set_member_active(p_id uuid,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 if p_active is null then raise exception 'Choose an access state.'; end if;
 update public.portal_profiles set active=p_active where id=p_id and role='ambassador';
 if not found then raise exception 'Ambassador unavailable.'; end if;
 insert into public.portal_events(actor_id,kind,detail) values(auth.uid(),'Ambassador access updated',p_id::text || ' active=' || p_active::text);
end; $$;
create function public.portal_save_service(p_id uuid,p_name text,p_body text,p_active boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 if p_id is null then
  insert into public.portal_services(name,body,active) values(trim(p_name),trim(p_body),p_active) returning id into result;
 else
  update public.portal_services set name=trim(p_name),body=trim(p_body),active=p_active,updated_at=now() where id=p_id returning id into result;
  if not found then raise exception 'Service unavailable.'; end if;
 end if;
 insert into public.portal_events(actor_id,kind,detail) values(auth.uid(),'Service template updated',result::text);
 return result;
end; $$;
revoke all on function public.portal_save_proposal(uuid,uuid,text,text,text,text),public.portal_submit_proposal(uuid),public.portal_review_proposal(uuid,text,text,text,numeric,text,text),public.portal_set_member_active(uuid,boolean),public.portal_save_service(uuid,text,text,boolean) from public,anon;
grant execute on function public.portal_save_proposal(uuid,uuid,text,text,text,text),public.portal_submit_proposal(uuid),public.portal_review_proposal(uuid,text,text,text,numeric,text,text),public.portal_set_member_active(uuid,boolean),public.portal_save_service(uuid,text,text,boolean) to authenticated;
insert into public.portal_services(name,body) values
('Website Development','We plan and develop websites for schools, businesses and organisations, with clear content, responsive layouts and practical enquiry paths. Domain registration, hosting, handover and maintenance requirements are discussed as part of the agreed scope.'),
('Software Development','We discuss your workflows and develop software around the tasks, users and information your organisation needs to manage. Features, integrations, access controls and ongoing support are defined before development begins.'),
('Networking','We help organisations plan and improve their networks, including connectivity, Wi-Fi coverage, equipment configuration and troubleshooting. Recommendations follow a discussion of the premises, devices and required coverage.'),
('IT Training','We discuss practical IT training for staff, students and individuals, based on their current skills and learning goals. Topics, format, group size and training arrangements are confirmed with your organisation.'),
('CCTV Installation','We discuss CCTV coverage, recording requirements and installation for homes, schools and business premises. Site details or an assessment are needed before equipment, installation scope and cost can be confirmed.'),
('Solar Installation','We discuss solar power systems around your location, equipment and power requirements. System specifications, installation scope and costs follow an assessment and agreed quotation.');
commit;
