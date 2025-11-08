-- Migration: Add servings and temperature columns to donations table
-- Also update donation_type_enum to include new types

-- Step 1: Add new donation types to the enum
ALTER TYPE public.donation_type_enum ADD VALUE IF NOT EXISTS 'Veggie Protein';
ALTER TYPE public.donation_type_enum ADD VALUE IF NOT EXISTS 'Deli Foods';
ALTER TYPE public.donation_type_enum ADD VALUE IF NOT EXISTS 'Pastries';
ALTER TYPE public.donation_type_enum ADD VALUE IF NOT EXISTS 'School lunch';

-- Step 2: Add servings column (calculated field - stored for reporting purposes)
ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS servings numeric(8,2) DEFAULT 0;

-- Step 3: Add temperature column (optional text field)
ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS temperature text;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN public.donations.servings IS 'Calculated servings: Carbs x4, Protein/Veggie Protein x5, others use weight as servings';
COMMENT ON COLUMN public.donations.temperature IS 'Optional temperature reading for the donation (e.g., "Hot", "Cold", "Room temp", or specific degrees)';
