-- Migration: Add deduplication_key column to meal_attendance
-- Purpose: Prevent duplicate automatic meal entries (RV, Day Worker) from being added multiple times for the same day due to race conditions or rapid page reloads

-- Add column to track unique key for automatic entries (e.g., 'rv_2026-01-06')
ALTER TABLE public.meal_attendance
ADD COLUMN IF NOT EXISTS deduplication_key text DEFAULT NULL;

-- Add unique constraint to prevent duplicate automatic entries
-- NULL values in deduplication_key (manual entries) will not conflict
ALTER TABLE public.meal_attendance
ADD CONSTRAINT meal_attendance_deduplication_key_key UNIQUE (deduplication_key);

-- Add index for quicker lookups if needed (though UNIQUE constraint creates one automatically)
-- No need for manual index creation on deduplication_key due to UNIQUE constraint
