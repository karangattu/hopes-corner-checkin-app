-- Migration: Sync donation_type_enum with all values from schema
-- This ensures all enum values exist, adding any that are missing

DO $$
DECLARE
  enum_values text[] := ARRAY[
    'Protein',
    'Carbs',
    'Vegetables',
    'Fruit',
    'Veggie Protein',
    'Deli Foods',
    'Pastries',
    'School lunch'
  ];
  val text;
BEGIN
  -- Loop through each value and add it if it doesn't exist
  FOREACH val IN ARRAY enum_values
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = val
      AND enumtypid = 'public.donation_type_enum'::regtype
    ) THEN
      EXECUTE format('ALTER TYPE public.donation_type_enum ADD VALUE %L', val);
      RAISE NOTICE 'Added "%s" to donation_type_enum', val;
    ELSE
      RAISE NOTICE '"%s" already exists in donation_type_enum', val;
    END IF;
  END LOOP;
END $$;
