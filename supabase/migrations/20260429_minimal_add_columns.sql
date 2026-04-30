-- Add only missing columns if they don't exist, without dropping/re-adding constraints
alter table if exists public.guests
  add column if not exists invited_side text default 'groom';

alter table if exists public.guests
  add column if not exists accompanying_checked_in integer default 0;

-- Update the RLS policy to include new fields in allowed insert list
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
