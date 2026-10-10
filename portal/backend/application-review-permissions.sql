-- Optional verification in Supabase SQL Editor AFTER application-review.sql.
-- Requires one active admin and one ambassador profile. All test changes roll back.
begin;
create temporary table review_test_ids(admin_id uuid,ambassador_id uuid,application_id uuid);
insert into review_test_ids
select (select id from public.portal_profiles where role='admin' and active limit 1),
       (select id from public.portal_profiles where role='ambassador' limit 1),gen_random_uuid();
do $$ begin
 if exists(select 1 from review_test_ids where admin_id is null or ambassador_id is null) then
 raise exception 'Create an active admin and a test ambassador account first.'; end if;
end $$;
grant select on review_test_ids to authenticated,anon;
insert into public.mua_ambassador_applications(id,reference,full_name,email,phone,state,city,occupation,qualification,motivation,experience,outreach_plan,availability,audiences)
select application_id,'TEST-'||application_id,'Permission Test','test@example.com','08000000000','Kano','Kano','Student','Bachelor’s degree','Test motivation','Test experience','Test outreach','Under 3 hours',array['Schools'] from review_test_ids;
set local role anon;
do $$ begin
 begin perform * from public.mua_ambassador_applications; raise exception 'FAIL: anonymous read allowed'; exception when insufficient_privilege then null; end;
 begin perform public.mua_application_review_summary(); raise exception 'FAIL: anonymous summary allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select ambassador_id::text from review_test_ids),true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.mua_ambassador_applications) then raise exception 'FAIL: ambassador can read applications'; end if;
 if exists(select 1 from public.mua_application_reviews) then raise exception 'FAIL: ambassador can read history'; end if;
 begin perform public.mua_review_application((select application_id from review_test_ids),'accepted','test',0); raise exception 'FAIL: ambassador review allowed'; exception when raise_exception then if sqlerrm<>'Admin access required.' then raise; end if; end;
 begin perform public.mua_application_review_summary(); raise exception 'FAIL: ambassador summary allowed'; exception when raise_exception then if sqlerrm<>'Admin access required.' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from review_test_ids),true);
set local role authenticated;
do $$ declare app uuid := (select application_id from review_test_ids); begin
 if not exists(select 1 from public.mua_ambassador_applications where id=app) then raise exception 'FAIL: admin cannot read'; end if;
 begin update public.mua_ambassador_applications set status='accepted' where id=app; raise exception 'FAIL: direct update allowed'; exception when insufficient_privilege then null; end;
 perform public.mua_review_application(app,'shortlisted','Interview next',0);
 if not exists(select 1 from public.mua_ambassador_applications where id=app and status='shortlisted' and review_version=1) then raise exception 'FAIL: review not saved'; end if;
 if not exists(select 1 from public.mua_application_reviews where application_id=app and new_status='shortlisted') then raise exception 'FAIL: history missing'; end if;
 begin perform public.mua_review_application(app,'accepted','stale',0); raise exception 'FAIL: stale review allowed'; exception when raise_exception then if sqlerrm not like 'Another admin updated%' then raise; end if; end;
 perform public.mua_application_review_summary();
end $$;
reset role;
rollback;
-- If all statements succeed, the tested permissions and conflict protection passed.
