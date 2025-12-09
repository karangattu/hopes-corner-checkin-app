-- Migration: Sync meal_type_enum with all values from schema
-- This ensures all enum values exist, adding any that are missing

DO $$
DECLARE
  enum_values text[] := ARRAY[
    'guest',
    'extra',
    'rv',
    'shelter',
    'united_effort',
    'day_worker',
    'lunch_bag'
  ];
  val text;
BEGIN
  FOREACH val IN ARRAY enum_values
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = val
      AND enumtypid = 'public.meal_type_enum'::regtype
    ) THEN
      EXECUTE format('ALTER TYPE public.meal_type_enum ADD VALUE %L', val);
      RAISE NOTICE 'Added "%s" to meal_type_enum', val;
    ELSE
      RAISE NOTICE '"%s" already exists in meal_type_enum', val;
    END IF;
  END LOOP;
END $$;
