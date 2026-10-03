-- Existing MUA portal after project-delivery.sql. Run this file, not schema.sql.
begin;
create table if not exists public.portal_commissions (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null unique references public.portal_projects(id),
 ambassador_id uuid not null references public.portal_profiles(id),
 client_name text not null,
 service_name text not null,
 fixed_amount numeric(12,2) not null check(fixed_amount>0 and fixed_amount<=999999999),
 approved boolean not null default false,
 eligible_amount numeric(12,2) not null default 0,
 paid_amount numeric(12,2) not null default 0,
 payment_stage text not null default 'waiting_deposit' check(payment_stage in ('waiting_deposit','deposit_received','fully_paid')),
 payment_notes text not null default '' check(length(payment_notes)<=2000),
 updated_at timestamptz not null default now(),
 constraint commission_payment_bounds check(eligible_amount>=0 and eligible_amount<=fixed_amount and paid_amount>=0 and paid_amount<=eligible_amount)
);
create index if not exists portal_commissions_owner_idx on public.portal_commissions(ambassador_id);
alter table public.portal_commissions enable row level security;
drop policy if exists commission_read on public.portal_commissions;
create policy commission_read on public.portal_commissions for select to authenticated
 using(portal_private.is_admin() or (portal_private.is_active() and ambassador_id=auth.uid() and approved));
revoke all on public.portal_commissions from public,anon,authenticated;
grant select on public.portal_commissions to authenticated;
grant all on public.portal_commissions to service_role;

create or replace function portal_private.commission_eligible(amount numeric,total numeric,received numeric) returns numeric
language sql immutable set search_path='' as $$
 select case when total<=0 then 0 when received>=total then amount when received>=round(total*0.60,2) then round(amount*0.50,2) else 0 end;
$$;
revoke all on function portal_private.commission_eligible(numeric,numeric,numeric) from public,anon,authenticated;

create or replace function public.portal_save_commission(p_project_id uuid,p_ambassador_id uuid,p_fixed_amount numeric,p_approved boolean,p_paid_amount numeric,p_payment_notes text,p_expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.portal_projects; c public.portal_commissions; v_eligible numeric; v_stage text; v_id uuid;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 select * into p from public.portal_projects where id=p_project_id for update;
 if not found then raise exception 'Project unavailable.'; end if;
 if not exists(select 1 from public.portal_profiles where id=p_ambassador_id and role='ambassador') then raise exception 'Choose an ambassador account.'; end if;
 if p_fixed_amount is null or p_fixed_amount<=0 or p_fixed_amount>999999999 or p_fixed_amount<>round(p_fixed_amount,2) then raise exception 'Enter a positive fixed commission amount.'; end if;
 select * into c from public.portal_commissions where project_id=p.id for update;
 if found then
  if p_expected_updated_at is null or c.updated_at<>p_expected_updated_at then raise exception 'Commission changed. Refresh and reopen before saving.'; end if;
  if c.paid_amount>0 and (c.ambassador_id<>p_ambassador_id or c.fixed_amount<>p_fixed_amount) then raise exception 'Paid commission terms cannot be reassigned or changed.'; end if;
  if p_paid_amount<c.paid_amount then raise exception 'Confirmed commission payments cannot be reduced.'; end if;
 elsif p_expected_updated_at is not null then raise exception 'Commission unavailable.';
 end if;
 v_eligible:=case when coalesce(p_approved,false) then portal_private.commission_eligible(p_fixed_amount,p.total_cost,p.amount_received) else 0 end;
 v_stage:=case when p.total_cost>0 and p.amount_received>=p.total_cost then 'fully_paid' when p.total_cost>0 and p.amount_received>=round(p.total_cost*0.60,2) then 'deposit_received' else 'waiting_deposit' end;
 if p_paid_amount is null or p_paid_amount<0 or p_paid_amount>v_eligible or p_paid_amount<>round(p_paid_amount,2) then raise exception 'Confirmed commission payments must be within the eligible amount.'; end if;
 if p_paid_amount>coalesce(c.paid_amount,0) and length(trim(coalesce(p_payment_notes,'')))=0 then raise exception 'Record the commission transfer date and reference.'; end if;
 insert into public.portal_commissions(project_id,ambassador_id,client_name,service_name,fixed_amount,approved,eligible_amount,paid_amount,payment_stage,payment_notes)
 values(p.id,p_ambassador_id,p.client_name,p.service_name,p_fixed_amount,coalesce(p_approved,false),v_eligible,p_paid_amount,v_stage,trim(coalesce(p_payment_notes,'')))
 on conflict(project_id) do update set ambassador_id=excluded.ambassador_id,client_name=excluded.client_name,service_name=excluded.service_name,fixed_amount=excluded.fixed_amount,approved=excluded.approved,eligible_amount=excluded.eligible_amount,paid_amount=excluded.paid_amount,payment_stage=excluded.payment_stage,payment_notes=excluded.payment_notes,updated_at=clock_timestamp() returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.portal_save_commission(uuid,uuid,numeric,boolean,numeric,text,timestamptz) from public,anon;
grant execute on function public.portal_save_commission(uuid,uuid,numeric,boolean,numeric,text,timestamptz) to authenticated;

create or replace function portal_private.refresh_project_commission() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.portal_commissions; eligible numeric;
begin
 select * into c from public.portal_commissions where project_id=new.id for update;
 if not found then return new; end if;
 eligible:=case when c.approved then portal_private.commission_eligible(c.fixed_amount,new.total_cost,new.amount_received) else 0 end;
 if eligible<c.paid_amount then raise exception 'Project payments cannot change in a way that invalidates paid commission.'; end if;
 update public.portal_commissions set client_name=new.client_name,service_name=new.service_name,eligible_amount=eligible,
 payment_stage=case when new.total_cost>0 and new.amount_received>=new.total_cost then 'fully_paid' when new.total_cost>0 and new.amount_received>=round(new.total_cost*0.60,2) then 'deposit_received' else 'waiting_deposit' end,
 updated_at=clock_timestamp() where id=c.id;
 return new;
end; $$;
revoke all on function portal_private.refresh_project_commission() from public,anon,authenticated;
drop trigger if exists refresh_project_commission on public.portal_projects;
create trigger refresh_project_commission after update of total_cost,amount_received,client_name,service_name on public.portal_projects for each row execute function portal_private.refresh_project_commission();
notify pgrst,'reload schema';
commit;
