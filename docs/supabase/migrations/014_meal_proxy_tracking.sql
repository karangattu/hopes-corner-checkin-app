-- Migration: Add picked_up_by_guest_id column to meal_attendance
-- Purpose: Track which guest physically picked up meals for linked/proxy guests
-- This allows metrics to be calculated for how many meals were given for linked guests

-- Add column to track who physically picked up the meal (for linked guests)
ALTER TABLE public.meal_attendance
ADD COLUMN IF NOT EXISTS picked_up_by_guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL;

-- Add index for querying by proxy pickup
CREATE INDEX IF NOT EXISTS meal_attendance_picked_up_by_idx
  ON public.meal_attendance (picked_up_by_guest_id)
  WHERE picked_up_by_guest_id IS NOT NULL;

-- Add a comment to document the column purpose
COMMENT ON COLUMN public.meal_attendance.picked_up_by_guest_id IS 'Tracks the guest who physically picked up the meal when it differs from guest_id (e.g., linked/proxy guests picking up for others)';