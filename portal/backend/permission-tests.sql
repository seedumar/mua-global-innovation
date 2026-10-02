-- Run after schema.sql in Supabase's SQL Editor. No test accounts/records persist.
begin;
do $$
declare
 a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); adm uuid := gen_random_uuid();
 s uuid; p uuid; denied boolean; visible_count integer;
begin
 insert into auth.users(id,email) values(a,a::text||'@portal-test.invalid'),(b,b::text||'@portal-test.invalid'),(adm,adm::text||'@portal-test.invalid');
 update public.portal_profiles set active=true where id in(a,b,adm);
 update public.portal_profiles set role='admin' where id=adm;
 select id into s from public.portal_services where active limit 1;
 if s is null then raise exception 'At least one active service is required.'; end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 p:=public.portal_save_proposal(null,s,'Test Recipient','Test Address','','Test brief');
 perform public.portal_submit_proposal(p);

 perform set_config('request.jwt.claim.sub',b::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',b,'role','authenticated')::text,true);
 denied:=false;
 begin perform public.portal_save_proposal(p,s,'Hijack','Address','',''); exception when others then if sqlerrm='Proposal unavailable.' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'FAIL: other ambassador edited proposal.'; end if;
 denied:=false;
 begin perform public.portal_review_proposal(p,'approved','','Body',100,'Name','Title'); exception when others then if sqlerrm='Admin access required.' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'FAIL: ambassador approved proposal.'; end if;
 denied:=false;
 begin perform public.portal_set_member_active(a,false); exception when others then if sqlerrm='Admin access required.' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'FAIL: ambassador changed access.'; end if;
 execute 'set local role authenticated';
 select count(*) into visible_count from public.portal_proposals where id=p;
 execute 'reset role';
 if visible_count<>0 then raise exception 'FAIL: other ambassador read proposal.'; end if;

 perform set_config('request.jwt.claim.sub',adm::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',adm,'role','authenticated')::text,true);
 perform public.portal_review_proposal(p,'changes_requested','Clarify requirements','',null,'','');
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 perform public.portal_save_proposal(p,s,'Test Recipient','Test Address','','Updated requirements');
 perform public.portal_submit_proposal(p);
 perform set_config('request.jwt.claim.sub',adm::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',adm,'role','authenticated')::text,true);
 perform public.portal_review_proposal(p,'approved','Approved for test','Approved letter body',150000,'Umar Saeed Umar','Co-founder & Chief Executive Officer');
 perform public.portal_set_member_active(a,false);
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 denied:=false;
 begin perform public.portal_save_proposal(null,s,'Test','Address','',''); exception when others then if sqlerrm='Your account is not active.' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'FAIL: inactive member created proposal.'; end if;
 execute 'set local role authenticated';
 select count(*) into visible_count from public.portal_proposals where id=p;
 execute 'reset role';
 if visible_count<>0 then raise exception 'FAIL: inactive member read proposal.'; end if;
 update public.portal_profiles set active=true where id=a;
 denied:=false;
 begin perform public.portal_save_proposal(p,s,'Changed','Address','',''); exception when others then if sqlerrm='Only drafts or requested revisions can be edited.' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'FAIL: approved letter was changed.'; end if;
 if has_table_privilege('authenticated','public.portal_proposals','UPDATE') or has_table_privilege('authenticated','public.portal_profiles','UPDATE') then raise exception 'FAIL: direct client updates are allowed.'; end if;
 raise notice 'PASS: ownership, admin review, revision workflow, deactivation, approved immutability and restricted table grants.';
end $$;
rollback;
