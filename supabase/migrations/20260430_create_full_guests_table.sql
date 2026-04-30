-- Create guests table with all required columns if it doesn't exist
create table if not exists public.guests (
  guest_id uuid primary key default gen_random_uuid(),
  full_name text not null,
  invited_side text not null default 'groom' check (invited_side in ('groom', 'bride')),
  attendance_status text not null check (attendance_status in ('Attending', 'Maybe', 'Not Attending')),
  guest_count integer not null default 0 check (guest_count >= 0),
  accompanying_checked_in integer not null default 0 check (accompanying_checked_in >= 0 and accompanying_checked_in <= guest_count),
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

-- Add any missing columns that might not exist
alter table public.guests add column if not exists invited_side text default 'groom';
alter table public.guests add column if not exists accompanying_checked_in integer default 0;
alter table public.guests add column if not exists qr_code_data_url text;
alter table public.guests add column if not exists ticket_url text;

-- Add constraints if they don't exist
alter table public.guests drop constraint if exists guests_invited_side_check;
alter table public.guests add constraint guests_invited_side_check check (invited_side in ('groom', 'bride'));

alter table public.guests drop constraint if exists guests_accompanying_checked_in_check;
alter table public.guests add constraint guests_accompanying_checked_in_check check (
  accompanying_checked_in >= 0 and accompanying_checked_in <= guest_count
);

-- Create indexes for query performance
create index if not exists guests_name_idx on public.guests (full_name);
create index if not exists guests_checked_in_idx on public.guests (checked_in);
create index if not exists guests_attendance_idx on public.guests (attendance_status);

-- RLS Policies
drop policy if exists guests_public_insert on public.guests;
create policy guests_public_insert on public.guests
for insert
to anon, authenticated
with check (
  guest_count >= 0
  and guest_count <= 2
  and accompanying_checked_in >= 0
  and checked_in = false
  and checked_in_at is null
  and message_status = 'pending'
  and message_channel is null
  and message_error is null
  and thank_you_sent = false
  and thank_you_sent_at is null
);

drop policy if exists guests_admin_select on public.guests;
create policy guests_admin_select on public.guests
for select
to service_role
using (true);

drop policy if exists guests_admin_update on public.guests;
create policy guests_admin_update on public.guests
for update
to service_role
using (true)
with check (true);

drop policy if exists guests_admin_delete on public.guests;
create policy guests_admin_delete on public.guests
for delete
to service_role
using (true);

-- Allow public read of individual guest via token
drop policy if exists guests_public_select_by_token on public.guests;
create policy guests_public_select_by_token on public.guests
for select
to anon, authenticated
using (true);
