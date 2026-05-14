-- Add invite sharing columns to support burn-after-use per-phone logic
alter table public.guests
add column if not exists invite_share_limit integer default 1;

alter table public.guests
add column if not exists invite_allowed_phones text[] default '{}';

alter table public.guests
add column if not exists invite_used_phones text[] default '{}';
