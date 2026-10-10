-- Additive migration, after application-review.sql.
begin;
create sequence if not exists public.mua_appointment_reference_seq;
create table if not exists public.mua_appointment_letters (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null unique references public.mua_ambassador_applications(id),
 reference text not null unique,
 applicant_reference text not null,
 full_name text not null,
 email text not null,
 city text not null,
 state text not null,
 effective_date date not null,
 letter_text text not null check(length(trim(letter_text)) between 100 and 12000),
 signatory_name text not null default 'Umar Saeed Umar',
 signatory_title text not null default 'Co-founder & Chief Executive Officer',
 template_version text not null default '2026-10-10',
 issued_by uuid not null references public.portal_profiles(id),
 issued_at timestamptz not null default now()
);
alter table public.mua_appointment_letters enable row level security;
revoke all on public.mua_appointment_letters from anon,authenticated;
revoke all on sequence public.mua_appointment_reference_seq from public,anon,authenticated;
grant select on public.mua_appointment_letters to authenticated;
grant all on public.mua_appointment_letters to service_role;
grant usage,select on sequence public.mua_appointment_reference_seq to service_role;
drop policy if exists appointment_admin_read on public.mua_appointment_letters;
create policy appointment_admin_read on public.mua_appointment_letters for select to authenticated using ((select portal_private.is_admin()));
create or replace function public.mua_issue_appointment(p_application_id uuid,p_effective_date date,p_letter_text text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.mua_ambassador_applications; l public.mua_appointment_letters;
begin
 if not portal_private.is_admin() then raise exception 'Admin access required.'; end if;
 select * into a from public.mua_ambassador_applications where id=p_application_id for update;
 if not found then raise exception 'Application unavailable.'; end if;
 if a.status<>'accepted' then raise exception 'Accept the application before issuing an appointment letter.'; end if;
 -- Locking the application serializes simultaneous requests; retry returns the same letter.
 select * into l from public.mua_appointment_letters where application_id=a.id;
 if found then return to_jsonb(l); end if;
 if p_effective_date is null then raise exception 'Choose an appointment start date.'; end if;
 if p_letter_text is null or length(trim(p_letter_text)) not between 100 and 12000 then raise exception 'The letter must contain 100 to 12000 characters.'; end if;
 insert into public.mua_appointment_letters(application_id,reference,applicant_reference,full_name,email,city,state,effective_date,letter_text,issued_by)
 values(a.id,'MUA-APT-'||lpad(nextval('public.mua_appointment_reference_seq')::text,6,'0'),a.reference,a.full_name,a.email,a.city,a.state,p_effective_date,trim(p_letter_text),auth.uid()) returning * into l;
 return to_jsonb(l);
end; $$;
revoke all on function public.mua_issue_appointment(uuid,date,text) from public,anon;
grant execute on function public.mua_issue_appointment(uuid,date,text) to authenticated;
notify pgrst, 'reload schema';
commit;
