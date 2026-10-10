-- Run AFTER ambassador-onboarding.sql. Existing notes and account links are preserved.
begin;
alter table public.mua_ambassador_onboarding add column if not exists followup_date date;
create or replace function public.mua_onboarding_list(p_offset integer default 0,p_search text default '',p_stage text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 if p_offset is null or p_offset<0 or p_search is null or length(p_search)>200 or p_stage is null or p_stage not in ('','letter','invite','signin','ready','paused','due','overdue') then raise exception 'Invalid onboarding filter.'; end if;
 with base as (
 select a.id,a.reference,a.full_name,a.email,a.state,a.created_at,l.reference as letter_reference,o.member_id,o.invitation_requested_at,o.followup_date,p.active,p.first_portal_sign_in_at,
 case when l.id is null then 'letter' when o.member_id is null then 'invite' when not coalesce(p.active,false) then 'paused' when p.first_portal_sign_in_at is null then 'signin' else 'ready' end as stage
 from public.mua_ambassador_applications a left join public.mua_appointment_letters l on l.application_id=a.id
 left join public.mua_ambassador_onboarding o on o.application_id=a.id left join public.portal_profiles p on p.id=o.member_id
 where a.status='accepted'
 ), tracked as (
 select base.*,case when stage='ready' or followup_date is null then null when followup_date<(current_timestamp at time zone 'Africa/Lagos')::date then 'overdue' when followup_date=(current_timestamp at time zone 'Africa/Lagos')::date then 'due' else 'scheduled' end as reminder from base
 ), visible as (
 select * from tracked where (p_stage='' or stage=p_stage or reminder=p_stage) and (p_search='' or strpos(lower(full_name||' '||email||' '||reference),lower(p_search))>0)
 order by followup_date asc nulls last,created_at desc,id desc limit 13 offset p_offset
 )
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(v) order by v.followup_date asc nulls last,v.created_at desc,v.id desc) from visible v),'[]'::jsonb),
 'accepted',(select count(*) from base),'letter',(select count(*) from base where stage='letter'),
 'invite',(select count(*) from base where stage='invite'),'signin',(select count(*) from base where stage='signin'),
 'ready',(select count(*) from base where stage='ready'),'paused',(select count(*) from base where stage='paused'),
 'due',(select count(*) from tracked where reminder='due'),'overdue',(select count(*) from tracked where reminder='overdue'),
 'today',(current_timestamp at time zone 'Africa/Lagos')::date) into result;
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
 'followup_date',o.followup_date,'today',(current_timestamp at time zone 'Africa/Lagos')::date,
 'member_id',o.member_id,'invitation_requested_at',o.invitation_requested_at,'notes',coalesce(o.notes,''),'revision',coalesce(o.revision,0),
 'member',(select jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'active',p.active,'first_portal_sign_in_at',p.first_portal_sign_in_at) from public.portal_profiles p where p.id=o.member_id),
 'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'active',p.active)) from public.portal_profiles p join auth.users u on u.id=p.id where p.role='ambassador' and lower(trim(p.email))=lower(trim(a.email)) and lower(trim(u.email))=lower(trim(a.email))),'[]'::jsonb)) into result;
 return result;
end; $$;
revoke all on function public.mua_onboarding_detail(uuid) from public,anon;
grant execute on function public.mua_onboarding_detail(uuid) to authenticated;


-- Existing clients keep their original save RPC, which does not alter follow-up dates.
-- New clients atomically save notes/account link and the follow-up under one revision check.
create or replace function public.mua_save_onboarding_followup(p_application_id uuid,p_member_id uuid,p_notes text,p_expected_revision integer,p_followup_date date)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.';end if;
 perform public.mua_save_onboarding(p_application_id,p_member_id,p_notes,p_expected_revision);
 update public.mua_ambassador_onboarding set followup_date=p_followup_date where application_id=p_application_id;
end; $$;
revoke all on function public.mua_save_onboarding_followup(uuid,uuid,text,integer,date) from public,anon;
grant execute on function public.mua_save_onboarding_followup(uuid,uuid,text,integer,date) to authenticated;
notify pgrst, 'reload schema';
commit;
