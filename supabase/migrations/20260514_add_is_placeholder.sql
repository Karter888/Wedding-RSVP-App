-- Add is_placeholder flag for temporary invite-created guest rows
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS is_placeholder boolean DEFAULT false NOT NULL;

-- Optionally, mark any known placeholder rows that still have full_name = 'Invited Guest'
UPDATE public.guests
SET is_placeholder = true
WHERE lower(full_name) LIKE 'invited guest%';
