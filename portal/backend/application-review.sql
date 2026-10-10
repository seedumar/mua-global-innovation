-- Run after the original ambassador application schema and portal schema.
begin;
alter table public.mua_ambassador_applications
 add column if not exists review_notes text not null default '',
 add column if not exists reviewed_by uuid references public.portal_profiles(id),
 add column if not exists reviewed_at timestamptz,
 add column if not exists review_version integer not null default 0;
alter table public.mua_ambassador_applications enable row level security;
revoke all on public.mua_ambassador_applications from anon, authenticated;
grant select on public.mua_ambassador_applications to authenticated;
drop policy if exists application_admin_read on public.mua_ambassador_applications;
create policy application_admin_read on public.mua_ambassador_applications
 for select to authenticated using ((select portal_private.is_admin()));
create index if not exists application_review_queue on public.mua_ambassador_applications(status,created_at desc,id);
create table if not exists public.mua_application_reviews (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.mua_ambassador_applications(id) on delete cascade,
 actor_id uuid not null references public.portal_profiles(id),
 old_status text not null,
 new_status text not null,
 notes text not null,
 created_at timestamptz not null default now()
);
alter table public.mua_application_reviews enable row level security;
revoke all on public.mua_application_reviews from anon,authenticated;
grant select on public.mua_application_reviews to authenticated;
drop policy if exists review_admin_read on public.mua_application_reviews;
create policy review_admin_read on public.mua_application_reviews
 for select to authenticated using ((select portal_private.is_admin()));
create index if not exists application_review_history on public.mua_application_reviews(application_id,created_at desc,id);
create or replace function public.mua_review_application(p_id uuid,p_status text,p_notes text,p_expected_version integer)
returns void language plpgsql security definer set search_path='' as $$
declare v public.mua_ambassador_applications;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 if p_status is null or p_status not in ('new','shortlisted','accepted','declined') then raise exception 'Choose a valid status.'; end if;
 if p_notes is null or length(p_notes)>5000 then raise exception 'Notes must be at most 5000 characters.'; end if;
 select * into v from public.mua_ambassador_applications where id=p_id for update;
 if not found then raise exception 'Application unavailable.'; end if;
 if p_expected_version is null or v.review_version<>p_expected_version then raise exception 'Another admin updated this application. Close it, refresh, and review the latest details.'; end if;
 if v.status=p_status and v.review_notes=trim(p_notes) then return; end if;
 update public.mua_ambassador_applications set status=p_status,review_notes=trim(p_notes),reviewed_by=auth.uid(),reviewed_at=now(),review_version=review_version+1 where id=p_id;
 insert into public.mua_application_reviews(application_id,actor_id,old_status,new_status,notes) values(p_id,auth.uid(),v.status,p_status,trim(p_notes));
end; $$;
revoke all on function public.mua_review_application(uuid,text,text,integer) from public,anon;
grant execute on function public.mua_review_application(uuid,text,text,integer) to authenticated;
create or replace function public.mua_application_review_summary()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 return jsonb_build_object(
  'new',(select count(*) from public.mua_ambassador_applications where status='new'),
  'shortlisted',(select count(*) from public.mua_ambassador_applications where status='shortlisted'),
  'accepted',(select count(*) from public.mua_ambassador_applications where status='accepted'),
  'declined',(select count(*) from public.mua_ambassador_applications where status='declined'),
  'states',(select coalesce(jsonb_agg(state order by state),'[]'::jsonb) from (select distinct state from public.mua_ambassador_applications) s));
end; $$;
revoke all on function public.mua_application_review_summary() from public,anon;
grant execute on function public.mua_application_review_summary() to authenticated;
notify pgrst, 'reload schema';
commit;
