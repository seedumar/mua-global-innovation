-- Additive: run after application-review.sql and appointment-letters.sql.
begin;
alter table public.portal_profiles add column if not exists first_portal_sign_in_at timestamptz;
create table if not exists public.mua_ambassador_onboarding (
 application_id uuid primary key references public.mua_ambassador_applications(id),
 member_id uuid unique references public.portal_profiles(id) on delete set null,
 invitation_requested_at timestamptz,
 linked_at timestamptz,
 notes text not null default '' check(length(notes)<=2000),
 revision integer not null default 0,
 updated_by uuid references public.portal_profiles(id),
 updated_at timestamptz not null default now()
);
alter table public.mua_ambassador_onboarding enable row level security;
revoke all on public.mua_ambassador_onboarding from public,anon,authenticated;
grant select on public.mua_ambassador_onboarding to authenticated;
grant all on public.mua_ambassador_onboarding to service_role;
drop policy if exists onboarding_admin_read on public.mua_ambassador_onboarding;
create policy onboarding_admin_read on public.mua_ambassador_onboarding for select to authenticated using ((select portal_private.is_admin()));

create or replace function public.mua_mark_portal_sign_in() returns void
language plpgsql security definer set search_path='' as $$
begin
 if not portal_private.is_active() then raise exception 'Active account required.'; end if;
 update public.portal_profiles set first_portal_sign_in_at=coalesce(first_portal_sign_in_at,now()) where id=auth.uid() and role='ambassador';
end; $$;
revoke all on function public.mua_mark_portal_sign_in() from public,anon;
grant execute on function public.mua_mark_portal_sign_in() to authenticated;

create or replace function public.mua_onboarding_list(p_offset integer default 0,p_search text default '',p_stage text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 if p_offset is null or p_offset<0 or p_search is null or length(p_search)>200 or p_stage is null or p_stage not in ('','letter','invite','signin','ready','paused') then raise exception 'Invalid onboarding filter.'; end if;
 with base as (
 select a.id,a.reference,a.full_name,a.email,a.state,a.created_at,l.reference as letter_reference,o.member_id,o.invitation_requested_at,p.active,p.first_portal_sign_in_at,
 case when l.id is null then 'letter' when o.member_id is null then 'invite' when not coalesce(p.active,false) then 'paused' when p.first_portal_sign_in_at is null then 'signin' else 'ready' end as stage
 from public.mua_ambassador_applications a left join public.mua_appointment_letters l on l.application_id=a.id
 left join public.mua_ambassador_onboarding o on o.application_id=a.id left join public.portal_profiles p on p.id=o.member_id
 where a.status='accepted'
 ), visible as (
 select * from base where (p_stage='' or stage=p_stage) and (p_search='' or strpos(lower(full_name||' '||email||' '||reference),lower(p_search))>0)
 order by created_at desc,id desc limit 13 offset p_offset
 )
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at desc,v.id desc) from visible v),'[]'::jsonb),
 'accepted',(select count(*) from base),'letter',(select count(*) from base where stage='letter'),
 'invite',(select count(*) from base where stage='invite'),'signin',(select count(*) from base where stage='signin'),
 'ready',(select count(*) from base where stage='ready'),'paused',(select count(*) from base where stage='paused')) into result;
 return result;
end; $$;
revoke all on function public.mua_onboarding_list(integer,text,text) from public,anon;
grant execute on function public.mua_onboarding_list(integer,text,text) to authenticated;

create or replace function public.mua_onboarding_detail(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.mua_ambassador_applications;o public.mua_ambassador_onboarding;result jsonb;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 select * into a from public.mua_ambassador_applications where id=p_application_id;
 if not found then raise exception 'Application unavailable.'; end if;
 select * into o from public.mua_ambassador_onboarding where application_id=a.id;
 select jsonb_build_object('application',jsonb_build_object('id',a.id,'full_name',a.full_name,'email',a.email,'status',a.status,'reference',a.reference),
 'letter_reference',(select reference from public.mua_appointment_letters where application_id=a.id),
 'member_id',o.member_id,'invitation_requested_at',o.invitation_requested_at,'notes',coalesce(o.notes,''),'revision',coalesce(o.revision,0),
 'member',(select jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'active',p.active,'first_portal_sign_in_at',p.first_portal_sign_in_at) from public.portal_profiles p where p.id=o.member_id),
 'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'active',p.active)) from public.portal_profiles p join auth.users u on u.id=p.id where p.role='ambassador' and lower(trim(p.email))=lower(trim(a.email)) and lower(trim(u.email))=lower(trim(a.email))),'[]'::jsonb)) into result;
 return result;
end; $$;
revoke all on function public.mua_onboarding_detail(uuid) from public,anon;
grant execute on function public.mua_onboarding_detail(uuid) to authenticated;

create or replace function public.mua_save_onboarding(p_application_id uuid,p_member_id uuid,p_notes text,p_expected_revision integer)
returns void language plpgsql security definer set search_path='' as $$
declare a public.mua_ambassador_applications;o public.mua_ambassador_onboarding;invited timestamptz;target uuid;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 if p_notes is null or length(p_notes)>2000 then raise exception 'Notes must be at most 2000 characters.'; end if;
 select * into a from public.mua_ambassador_applications where id=p_application_id for update;
 if not found or a.status<>'accepted' then raise exception 'Accepted application required.'; end if;
 select * into o from public.mua_ambassador_onboarding where application_id=a.id for update;
 if p_expected_revision is null or p_expected_revision<>coalesce(o.revision,0) then raise exception 'Onboarding changed. Refresh the checklist before saving.'; end if;
 target:=coalesce(p_member_id,o.member_id);
 if o.member_id is not null and p_member_id is not null and p_member_id<>o.member_id then raise exception 'This application is already linked to another account.'; end if;
 if target is not null then
  if not exists(select 1 from public.mua_appointment_letters where application_id=a.id) then raise exception 'Issue the appointment letter before linking portal access.'; end if;
  select u.invited_at into invited from public.portal_profiles p join auth.users u on u.id=p.id
   where p.id=target and p.role='ambassador' and lower(trim(p.email))=lower(trim(a.email)) and lower(trim(u.email))=lower(trim(a.email));
  if not found then raise exception 'Choose an ambassador account with the applicant email address.'; end if;
  if exists(select 1 from public.mua_ambassador_onboarding where member_id=target and application_id<>a.id) then raise exception 'This account is already linked to another application.'; end if;
 end if;
 insert into public.mua_ambassador_onboarding as existing(application_id,member_id,invitation_requested_at,linked_at,notes,revision,updated_by)
 values(a.id,target,invited,case when target is not null then now() end,trim(p_notes),1,auth.uid())
 on conflict(application_id) do update set member_id=excluded.member_id,invitation_requested_at=excluded.invitation_requested_at,
 linked_at=coalesce(existing.linked_at,excluded.linked_at),notes=excluded.notes,revision=existing.revision+1,updated_by=auth.uid(),updated_at=clock_timestamp();
end; $$;
revoke all on function public.mua_save_onboarding(uuid,uuid,text,integer) from public,anon;
grant execute on function public.mua_save_onboarding(uuid,uuid,text,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
