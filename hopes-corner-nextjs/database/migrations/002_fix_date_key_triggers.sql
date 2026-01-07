-- Migration: Fix date_key trigger functions to not overwrite client-provided values
-- Run this on your existing Supabase database to update the trigger functions
-- This allows the client to send date_key explicitly, which is more reliable than
-- server-side timezone conversion

-- Step 1: Update donation date_key trigger function to preserve client-provided values
CREATE OR REPLACE FUNCTION public.set_donation_date_key()
RETURNS TRIGGER AS $$
BEGIN
  -- Only compute if date_key is not already set (allows client to send explicitly)
  IF NEW.date_key IS NULL THEN
    NEW.date_key := (NEW.donated_at AT TIME ZONE 'America/Los_Angeles')::date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update la_plaza_donation date_key trigger function to preserve client-provided values
CREATE OR REPLACE FUNCTION public.set_la_plaza_donation_date_key()
RETURNS TRIGGER AS $$
BEGIN
  -- Only compute if date_key is not already set (allows client to send explicitly)
  IF NEW.date_key IS NULL THEN
    NEW.date_key := (NEW.received_at AT TIME ZONE 'America/Los_Angeles')::date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The existing triggers don't need to be recreated since we're just updating
-- the functions they call. The triggers will automatically use the updated functions.
