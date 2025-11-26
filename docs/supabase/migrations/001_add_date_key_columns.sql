-- Migration: Add date_key columns to donations tables
-- Run this on your existing Supabase database to add the date_key computed columns
-- and indexes for efficient date-based filtering
-- Note: Using trigger functions instead of GENERATED columns because AT TIME ZONE is not immutable

-- Step 1: Add date_key column to donations table
ALTER TABLE public.donations
ADD COLUMN date_key date;

-- Step 2: Create function to compute date_key for donations
CREATE OR REPLACE FUNCTION public.set_donation_date_key()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_key := (NEW.donated_at AT TIME ZONE 'America/Los_Angeles')::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger for donations before insert or update
DROP TRIGGER IF EXISTS trg_donations_set_date_key ON public.donations;
CREATE TRIGGER trg_donations_set_date_key
BEFORE INSERT OR UPDATE ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.set_donation_date_key();

-- Step 4: Backfill existing records with date_key
UPDATE public.donations
SET date_key = (donated_at AT TIME ZONE 'America/Los_Angeles')::date
WHERE date_key IS NULL;

-- Step 5: Create index on donations date_key for filtering performance
CREATE INDEX IF NOT EXISTS donations_date_key_idx
  ON public.donations (date_key DESC);

-- Step 6: Add date_key column to la_plaza_donations table
ALTER TABLE public.la_plaza_donations
ADD COLUMN date_key date;

-- Step 7: Create function to compute date_key for la_plaza_donations
CREATE OR REPLACE FUNCTION public.set_la_plaza_donation_date_key()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_key := (NEW.received_at AT TIME ZONE 'America/Los_Angeles')::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for la_plaza_donations before insert or update
DROP TRIGGER IF EXISTS trg_la_plaza_donations_set_date_key ON public.la_plaza_donations;
CREATE TRIGGER trg_la_plaza_donations_set_date_key
BEFORE INSERT OR UPDATE ON public.la_plaza_donations
FOR EACH ROW
EXECUTE FUNCTION public.set_la_plaza_donation_date_key();

-- Step 9: Backfill existing records with date_key
UPDATE public.la_plaza_donations
SET date_key = (received_at AT TIME ZONE 'America/Los_Angeles')::date
WHERE date_key IS NULL;

-- Step 10: Create index on la_plaza_donations date_key for filtering performance
CREATE INDEX IF NOT EXISTS la_plaza_donations_date_key_idx
  ON public.la_plaza_donations (date_key DESC);
