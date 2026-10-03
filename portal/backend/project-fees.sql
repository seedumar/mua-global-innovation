-- Run after project-delivery.sql in the existing project. Do not rerun schema.sql.
begin;
alter table public.portal_projects add column if not exists domain_fee numeric(12,2);
alter table public.portal_projects add column if not exists hosting_fee numeric(12,2);
alter table public.portal_projects drop constraint if exists portal_project_fee_bounds;
alter table public.portal_projects add constraint portal_project_fee_bounds check (
 (domain_fee is null and hosting_fee is null) or
 (domain_fee is not null and hosting_fee is not null and domain_fee>=0 and hosting_fee>=0 and domain_fee+hosting_fee<=total_cost)
);
grant update(domain_fee,hosting_fee) on public.portal_projects to authenticated;
create or replace function public.portal_save_project_with_fees(p_id uuid,p_expected_updated_at timestamptz,p_client_name text,p_service_name text,p_assigned_to text,p_deadline date,p_status text,p_total_cost numeric,p_domain_fee numeric,p_hosting_fee numeric,p_amount_received numeric,p_payment_notes text,p_notes text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 if p_id is null then
  insert into public.portal_projects(client_name,service_name,assigned_to,deadline,status,total_cost,domain_fee,hosting_fee,amount_received,payment_notes,notes)
  values(trim(p_client_name),trim(p_service_name),trim(coalesce(p_assigned_to,'')),p_deadline,p_status,p_total_cost,p_domain_fee,p_hosting_fee,p_amount_received,trim(coalesce(p_payment_notes,'')),trim(coalesce(p_notes,''))) returning id into v_id;
 else
  update public.portal_projects set client_name=trim(p_client_name),service_name=trim(p_service_name),assigned_to=trim(coalesce(p_assigned_to,'')),deadline=p_deadline,status=p_status,total_cost=p_total_cost,domain_fee=p_domain_fee,hosting_fee=p_hosting_fee,amount_received=p_amount_received,payment_notes=trim(coalesce(p_payment_notes,'')),notes=trim(coalesce(p_notes,'')),updated_at=clock_timestamp()
  where id=p_id and updated_at=p_expected_updated_at returning id into v_id;
  if v_id is null then raise exception 'This project changed or is unavailable. Refresh the dashboard and reopen it before saving.'; end if;
 end if;
 return v_id;
end; $$;
revoke all on function public.portal_save_project_with_fees(uuid,timestamptz,text,text,text,date,text,numeric,numeric,numeric,numeric,text,text) from public,anon;
grant execute on function public.portal_save_project_with_fees(uuid,timestamptz,text,text,text,date,text,numeric,numeric,numeric,numeric,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
