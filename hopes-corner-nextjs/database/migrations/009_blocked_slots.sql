-- Migration: Add blocked_slots table for staff scheduling
-- This table stores blocked time slots when no staff is available to cover them
-- Blocked slots prevent guests from being assigned to those slots

-- Create service_type enum if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_service_type_enum') THEN
    CREATE TYPE public.slot_service_type_enum AS enum ('shower', 'laundry');
  END IF;
END$$;

-- Create blocked_slots table
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type public.slot_service_type_enum NOT NULL,
  slot_time text NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by text, -- optional: track who blocked the slot
  
  -- Unique constraint to prevent duplicate blocks
  CONSTRAINT blocked_slots_unique UNIQUE (service_type, slot_time, date)
);

-- Add comment for documentation
COMMENT ON TABLE public.blocked_slots IS 'Stores blocked time slots when staff is unavailable';
COMMENT ON COLUMN public.blocked_slots.service_type IS 'The type of service: shower or laundry';
COMMENT ON COLUMN public.blocked_slots.slot_time IS 'The time slot (e.g., "08:00" for showers, "08:30 - 10:00" for laundry)';
COMMENT ON COLUMN public.blocked_slots.date IS 'The date this slot is blocked for';
COMMENT ON COLUMN public.blocked_slots.created_by IS 'Optional: email/username of staff who blocked the slot';

-- Create index for efficient lookups by date and service type
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date_service 
  ON public.blocked_slots (date, service_type);

-- Create index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date 
  ON public.blocked_slots (date);

-- Enable Row Level Security
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon users to read blocked slots (anon needed for Firebase proxy)
DROP POLICY IF EXISTS "Anyone can view blocked slots" ON public.blocked_slots;
CREATE POLICY "Anyone can view blocked slots"
  ON public.blocked_slots FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow authenticated and anon users to manage blocked slots
DROP POLICY IF EXISTS "Staff can manage blocked slots" ON public.blocked_slots;
CREATE POLICY "Staff can manage blocked slots"
  ON public.blocked_slots FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Function to clean up old blocked slots (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_blocked_slots()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.blocked_slots
  WHERE date < CURRENT_DATE - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.cleanup_old_blocked_slots() IS 'Removes blocked slots older than 7 days';
