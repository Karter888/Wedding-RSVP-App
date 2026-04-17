create extension if not exists pgcrypto;

create table if not exists public.guests (
  guest_id uuid primary key default gen_random_uuid(),
  full_name text not null,
  attendance_status text not null check (attendance_status in ('Attending', 'Maybe', 'Not Attending')),
  guest_count integer not null default 0 check (guest_count >= 0),
  guest_names text[] not null default '{}',
  phone text,
  email text,
  token text not null,
  qr_code_data_url text not null,
  ticket_url text not null,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  message_status text not null default 'pending' check (message_status in ('sent', 'pending', 'failed')),
  message_channel text,
  message_error text,
  thank_you_sent boolean not null default false,
  thank_you_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guests_attendance_idx on public.guests (attendance_status);
create index if not exists guests_checked_in_idx on public.guests (checked_in);
create index if not exists guests_name_idx on public.guests (full_name);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guests_updated_at on public.guests;
create trigger guests_updated_at
before update on public.guests
for each row
execute function public.set_updated_at();

alter table public.guests enable row level security;

-- Production-safe policies.
-- Public users can submit RSVP records, but cannot read or update guest rows directly.
drop policy if exists guests_select_all on public.guests;
drop policy if exists guests_insert_all on public.guests;
drop policy if exists guests_update_all on public.guests;
drop policy if exists guests_public_insert on public.guests;
drop policy if exists guests_service_select on public.guests;
drop policy if exists guests_service_update on public.guests;

create policy guests_public_insert on public.guests
for insert
to anon, authenticated
with check (
  guest_count >= 0
  and checked_in = false
  and checked_in_at is null
  and message_status = 'pending'
  and message_channel is null
  and message_error is null
  and thank_you_sent = false
  and thank_you_sent_at is null
);

create policy guests_service_select on public.guests
for select
to service_role
using (true);

create policy guests_service_update on public.guests
for update
to service_role
using (true)
with check (true);
