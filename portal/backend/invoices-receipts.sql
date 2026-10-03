-- Existing portal with project-delivery.sql installed. Run this file; not schema.sql.
begin;
create sequence if not exists public.portal_document_sequence;
create table if not exists public.portal_documents (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.portal_projects(id),
 reference text not null unique,
 kind text not null check(kind in ('invoice','receipt')),
 client_name text not null,
 service_name text not null,
 total_cost numeric(12,2) not null,
 confirmed_received numeric(12,2) not null,
 amount numeric(12,2),
 paid_on date,
 payment_reference text,
 payment_method text,
 bank_name text not null default 'Moniepoint',
 account_name text not null default 'Mua Global Innovation Ltd',
 account_number text not null default '6520592152',
 deposit_percent integer not null default 60,
 issued_by uuid not null references public.portal_profiles(id),
 issuer_name text not null,
 issued_at timestamptz not null default now(),
 constraint document_amounts check(total_cost>=0 and confirmed_received>=0 and confirmed_received<=total_cost),
 constraint receipt_details check(kind<>'receipt' or (amount>0 and amount<=confirmed_received and paid_on is not null and length(trim(payment_reference)) between 1 and 200 and payment_method in ('Bank transfer','Cash','POS')))
);
create index if not exists portal_documents_project_idx on public.portal_documents(project_id,issued_at desc);
create unique index if not exists portal_receipt_reference_idx on public.portal_documents(project_id,lower(trim(payment_reference))) where kind='receipt';
alter table public.portal_documents enable row level security;
drop policy if exists document_read on public.portal_documents;
create policy document_read on public.portal_documents for select to authenticated using(portal_private.is_admin());
revoke all on public.portal_documents from public,anon,authenticated;
grant select on public.portal_documents to authenticated;
grant all on public.portal_documents to service_role;
revoke all on sequence public.portal_document_sequence from public,anon,authenticated;
grant usage,select on sequence public.portal_document_sequence to service_role;

create or replace function public.portal_issue_document(p_project_id uuid,p_kind text,p_amount numeric,p_paid_on date,p_payment_reference text,p_payment_method text,p_expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.portal_projects; v_id uuid; receipted numeric; v_name text;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 if p_kind is null or p_kind not in ('invoice','receipt') then raise exception 'Choose an invoice or receipt.'; end if;
 select * into p from public.portal_projects where id=p_project_id for update;
 if not found then raise exception 'Project unavailable.'; end if;
 if p_expected_updated_at is null or p.updated_at<>p_expected_updated_at then raise exception 'Project changed. Refresh and review its payment details before issuing.'; end if;
 if p_kind='receipt' then
  if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) then raise exception 'Enter a positive payment amount with up to two decimal places.'; end if;
  if p_paid_on is null or p_paid_on>(now() at time zone 'Africa/Lagos')::date then raise exception 'Enter the actual payment date, not a future date.'; end if;
  if p_payment_reference is null or length(trim(p_payment_reference)) not between 1 and 200 or p_payment_method is null or p_payment_method not in ('Bank transfer','Cash','POS') then raise exception 'Enter the payment method and reference.'; end if;
  select coalesce(sum(amount),0) into receipted from public.portal_documents where project_id=p.id and kind='receipt';
  if receipted+p_amount>p.amount_received then raise exception 'Receipt exceeds confirmed payments not yet receipted. Verify and update the project payments first.'; end if;
  if exists(select 1 from public.portal_documents where project_id=p.id and kind='receipt' and lower(trim(payment_reference))=lower(trim(p_payment_reference))) then raise exception 'A receipt for this payment reference already exists.'; end if;
 end if;
 select coalesce(nullif(full_name,''),email) into v_name from public.portal_profiles where id=auth.uid();
 insert into public.portal_documents(project_id,reference,kind,client_name,service_name,total_cost,confirmed_received,amount,paid_on,payment_reference,payment_method,issued_by,issuer_name)
 values(p.id,case when p_kind='invoice' then 'MUA-INV-' else 'MUA-RCT-' end||lpad(nextval('public.portal_document_sequence')::text,8,'0'),p_kind,p.client_name,p.service_name,p.total_cost,p.amount_received,case when p_kind='receipt' then p_amount end,case when p_kind='receipt' then p_paid_on end,case when p_kind='receipt' then trim(p_payment_reference) end,case when p_kind='receipt' then p_payment_method end,auth.uid(),v_name) returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.portal_issue_document(uuid,text,numeric,date,text,text,timestamptz) from public,anon;
grant execute on function public.portal_issue_document(uuid,text,numeric,date,text,text,timestamptz) to authenticated;

create or replace function portal_private.protect_receipted_payments() returns trigger language plpgsql security definer set search_path='' as $$
declare receipted numeric;
begin
 select coalesce(sum(amount),0) into receipted from public.portal_documents where project_id=new.id and kind='receipt';
 if new.amount_received<receipted then raise exception 'Confirmed payments cannot be reduced below issued receipts.'; end if;
 return new;
end; $$;
revoke all on function portal_private.protect_receipted_payments() from public,anon,authenticated;
drop trigger if exists protect_receipted_payments on public.portal_projects;
create trigger protect_receipted_payments before update of amount_received on public.portal_projects for each row execute function portal_private.protect_receipted_payments();
notify pgrst,'reload schema';
commit;
