-- Migration: Add program-specific ban columns
-- Date: 2024-12-22
-- Description: Allow banning guests from specific programs instead of a blanket ban

-- Add program-specific ban columns to the guests table
-- These are boolean flags that indicate if a guest is banned from specific programs
-- When banned_until is set and any of these flags are true, the guest is banned from those programs
-- If all flags are false/null but banned_until is set, it's a blanket ban from all services

ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS banned_from_bicycle boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_from_meals boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_from_shower boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_from_laundry boolean DEFAULT false;

-- Add comment to clarify the ban logic
COMMENT ON COLUMN public.guests.banned_from_bicycle IS 'If true, guest is banned from bicycle repair services when banned_until is in the future';
COMMENT ON COLUMN public.guests.banned_from_meals IS 'If true, guest is banned from meal services when banned_until is in the future';
COMMENT ON COLUMN public.guests.banned_from_shower IS 'If true, guest is banned from shower services when banned_until is in the future';
COMMENT ON COLUMN public.guests.banned_from_laundry IS 'If true, guest is banned from laundry services when banned_until is in the future';

-- Index for efficient querying of banned guests by program
CREATE INDEX IF NOT EXISTS guests_program_bans_idx ON public.guests (banned_until)
WHERE banned_from_bicycle = true OR banned_from_meals = true OR banned_from_shower = true OR banned_from_laundry = true;
