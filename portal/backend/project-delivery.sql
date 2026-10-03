-- Run in the existing MUA Supabase project. Do not rerun schema.sql.
begin;
create table if not exists public.portal_projects (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null default auth.uid() references public.portal_profiles(id),
 client_name text not null check(length(trim(client_name)) between 1 and 200),
 service_name text not null check(length(trim(service_name)) between 1 and 200),
 assigned_to text not null default '' check(length(assigned_to)<=200),
 deadline date,
 status text not null default 'not_started' check(status in ('not_started','in_progress','client_review','completed')),
 total_cost numeric(12,2) not null check(total_cost>=0 and total_cost<=999999999),
 amount_received numeric(12,2) not null default 0 check(amount_received>=0 and amount_received<=total_cost),
 payment_notes text not null default '' check(length(payment_notes)<=2000),
 notes text not null default '' check(length(notes)<=5000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists portal_projects_deadline_idx on public.portal_projects(deadline) where status<>'completed';
alter table public.portal_projects enable row level security;
drop policy if exists project_read on public.portal_projects;
create policy project_read on public.portal_projects for select to authenticated using(portal_private.is_admin());
drop policy if exists project_insert on public.portal_projects;
create policy project_insert on public.portal_projects for insert to authenticated with check(portal_private.is_admin() and created_by=auth.uid());
drop policy if exists project_update on public.portal_projects;
create policy project_update on public.portal_projects for update to authenticated using(portal_private.is_admin()) with check(portal_private.is_admin());
revoke all on public.portal_projects from public,anon,authenticated;
grant select,insert on public.portal_projects to authenticated;
grant update(client_name,service_name,assigned_to,deadline,status,total_cost,amount_received,payment_notes,notes,updated_at) on public.portal_projects to authenticated;
grant all on public.portal_projects to service_role;
create or replace function public.portal_save_project(p_id uuid,p_expected_updated_at timestamptz,p_client_name text,p_service_name text,p_assigned_to text,p_deadline date,p_status text,p_total_cost numeric,p_amount_received numeric,p_payment_notes text,p_notes text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 if p_id is null then
  insert into public.portal_projects(client_name,service_name,assigned_to,deadline,status,total_cost,amount_received,payment_notes,notes)
  values(trim(p_client_name),trim(p_service_name),trim(coalesce(p_assigned_to,'')),p_deadline,p_status,p_total_cost,p_amount_received,trim(coalesce(p_payment_notes,'')),trim(coalesce(p_notes,''))) returning id into v_id;
 else
  update public.portal_projects set client_name=trim(p_client_name),service_name=trim(p_service_name),assigned_to=trim(coalesce(p_assigned_to,'')),deadline=p_deadline,status=p_status,total_cost=p_total_cost,amount_received=p_amount_received,payment_notes=trim(coalesce(p_payment_notes,'')),notes=trim(coalesce(p_notes,'')),updated_at=clock_timestamp()
  where id=p_id and updated_at=p_expected_updated_at returning id into v_id;
  if v_id is null then raise exception 'This project changed or is unavailable. Refresh the dashboard and reopen it before saving.'; end if;
 end if;
 return v_id;
end; $$;
revoke all on function public.portal_save_project(uuid,timestamptz,text,text,text,date,text,numeric,numeric,text,text) from public,anon;
grant execute on function public.portal_save_project(uuid,timestamptz,text,text,text,date,text,numeric,numeric,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
