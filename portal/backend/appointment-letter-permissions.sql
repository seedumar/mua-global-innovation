-- Optional SQL Editor check; requires an active admin and a test ambassador.
-- All generated letters and status changes are rolled back. A sequence gap is normal.
begin;
create temporary table appointment_test_ids(admin_id uuid,ambassador_id uuid,application_id uuid);
insert into appointment_test_ids select
 (select id from public.portal_profiles where role='admin' and active limit 1),
 (select id from public.portal_profiles where role='ambassador' limit 1),gen_random_uuid();
do $$ begin if exists(select 1 from appointment_test_ids where admin_id is null or ambassador_id is null) then raise exception 'Create an active admin and a test ambassador first.'; end if; end $$;
grant select on appointment_test_ids to authenticated,anon;
insert into public.mua_ambassador_applications(id,reference,full_name,email,phone,state,city,occupation,qualification,motivation,experience,outreach_plan,availability,audiences)
select application_id,'TEST-'||application_id,'Appointment Test','test@example.com','08000000000','Kano','Kano','Student','Bachelor’s degree','Test motivation','Test experience','Test outreach','Under 3 hours',array['Schools'] from appointment_test_ids;
set local role anon;
do $$ begin
 begin perform * from public.mua_appointment_letters;raise exception 'FAIL: anonymous read allowed';exception when insufficient_privilege then null;end;
 begin perform public.mua_issue_appointment((select application_id from appointment_test_ids),current_date,repeat('test ',30));raise exception 'FAIL: anonymous issue allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select ambassador_id::text from appointment_test_ids),true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.mua_appointment_letters) then raise exception 'FAIL: ambassador can read letters';end if;
 begin perform public.mua_issue_appointment((select application_id from appointment_test_ids),current_date,repeat('test ',30));raise exception 'FAIL: ambassador issue allowed';exception when raise_exception then if sqlerrm<>'Admin access required.' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from appointment_test_ids),true);
set local role authenticated;
do $$ declare app uuid := (select application_id from appointment_test_ids);a jsonb;b jsonb; begin
 begin perform public.mua_issue_appointment(app,current_date,repeat('test ',30));raise exception 'FAIL: unaccepted letter allowed';exception when raise_exception then if sqlerrm<>'Accept the application before issuing an appointment letter.' then raise;end if;end;
 perform public.mua_review_application(app,'accepted','Test',0);
 a:=public.mua_issue_appointment(app,current_date,repeat('original ',30));
 b:=public.mua_issue_appointment(app,current_date+1,repeat('different ',30));
 if a<>b then raise exception 'FAIL: retry changed original letter';end if;
 if not exists(select 1 from public.mua_appointment_letters where application_id=app and signatory_name='Umar Saeed Umar') then raise exception 'FAIL: issued record missing';end if;
 begin update public.mua_appointment_letters set full_name='Edited' where application_id=app;raise exception 'FAIL: direct edit allowed';exception when insufficient_privilege then null;end;
 begin delete from public.mua_appointment_letters where application_id=app;raise exception 'FAIL: direct delete allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
