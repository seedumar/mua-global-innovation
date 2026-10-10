-- Optional SQL Editor test AFTER ambassador-onboarding.sql.
-- Requires an active admin and an active, unlinked TEST ambassador.
-- No emails are sent. All data changes are rolled back; letter sequences may advance.
begin;
create temporary table onboarding_test_ids(admin_id uuid,member_id uuid,application_id uuid);
insert into onboarding_test_ids select
 (select id from public.portal_profiles where role='admin' and active limit 1),
 (select p.id from public.portal_profiles p join auth.users u on u.id=p.id where p.role='ambassador' and p.active and lower(trim(p.email))=lower(trim(u.email)) and not exists(select 1 from public.mua_ambassador_onboarding o where o.member_id=p.id) limit 1),gen_random_uuid();
do $$ begin if exists(select 1 from onboarding_test_ids where admin_id is null or member_id is null) then raise exception 'An active admin and an active unlinked test ambassador are required.';end if;end $$;
grant select on onboarding_test_ids to authenticated,anon;
insert into public.mua_ambassador_applications(id,reference,full_name,email,phone,state,city,occupation,qualification,motivation,experience,outreach_plan,availability,audiences)
select t.application_id,'TEST-'||t.application_id,p.full_name,p.email,'08000000000','Kano','Kano','Student','Bachelor’s degree','Test motivation','Test experience','Test outreach','Under 3 hours',array['Schools'] from onboarding_test_ids t join public.portal_profiles p on p.id=t.member_id;
set local role anon;
do $$ begin
 begin perform public.mua_onboarding_list();raise exception 'FAIL: anonymous list allowed';exception when insufficient_privilege then null;end;
 begin perform public.mua_mark_portal_sign_in();raise exception 'FAIL: anonymous marker allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select member_id::text from onboarding_test_ids),true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.mua_ambassador_onboarding) then raise exception 'FAIL: ambassador onboarding read';end if;
 begin perform public.mua_onboarding_list();raise exception 'FAIL: ambassador list allowed';exception when raise_exception then if sqlerrm<>'Admin access required.' then raise;end if;end;
 begin perform public.mua_save_onboarding((select application_id from onboarding_test_ids),null,'',0);raise exception 'FAIL: ambassador write allowed';exception when raise_exception then if sqlerrm<>'Admin access required.' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from onboarding_test_ids),true);
set local role authenticated;
do $$ declare app uuid:=(select application_id from onboarding_test_ids);member uuid:=(select member_id from onboarding_test_ids);d jsonb;begin
 begin perform public.mua_save_onboarding(app,null,'',0);raise exception 'FAIL: unaccepted onboarding allowed';exception when raise_exception then if sqlerrm<>'Accepted application required.' then raise;end if;end;
 perform public.mua_review_application(app,'accepted','Test',0);
 begin perform public.mua_save_onboarding(app,member,'',0);raise exception 'FAIL: link without letter allowed';exception when raise_exception then if sqlerrm<>'Issue the appointment letter before linking portal access.' then raise;end if;end;
 perform public.mua_issue_appointment(app,current_date,repeat('test ',30));
 begin perform public.mua_save_onboarding(app,(select admin_id from onboarding_test_ids),'',0);raise exception 'FAIL: mismatched account allowed';exception when raise_exception then if sqlerrm<>'Choose an ambassador account with the applicant email address.' then raise;end if;end;
 perform public.mua_save_onboarding(app,member,'Internal test',0);
 d:=public.mua_onboarding_detail(app);
 if d->>'member_id'<>member::text or (d->>'revision')::integer<>1 then raise exception 'FAIL: link missing';end if;
 begin perform public.mua_save_onboarding(app,member,'Stale notes',0);raise exception 'FAIL: stale revision allowed';exception when raise_exception then if sqlerrm<>'Onboarding changed. Refresh the checklist before saving.' then raise;end if;end;
 begin update public.mua_ambassador_onboarding set notes='Direct write' where application_id=app;raise exception 'FAIL: direct write allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Verify only the signed-in ambassador can receive a first-access marker.
create temporary table onboarding_other_markers as select id,first_portal_sign_in_at from public.portal_profiles where id<>(select member_id from onboarding_test_ids);
update public.portal_profiles set first_portal_sign_in_at=null where id=(select member_id from onboarding_test_ids);
select set_config('request.jwt.claim.sub',(select member_id::text from onboarding_test_ids),true);
set local role authenticated;
select public.mua_mark_portal_sign_in();
select public.mua_mark_portal_sign_in();
reset role;
do $$ begin
 if not exists(select 1 from public.portal_profiles where id=(select member_id from onboarding_test_ids) and first_portal_sign_in_at is not null) then raise exception 'FAIL: self marker missing';end if;
 if exists(select 1 from public.portal_profiles p join onboarding_other_markers t on t.id=p.id where p.first_portal_sign_in_at is distinct from t.first_portal_sign_in_at) then raise exception 'FAIL: another account marker changed';end if;
end $$;
rollback;
