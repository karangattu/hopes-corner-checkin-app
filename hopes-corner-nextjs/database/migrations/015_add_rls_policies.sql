-- ============================================================================
-- Migration 015: Add Row Level Security (RLS) Policies to All Tables
-- ============================================================================
-- This migration enables RLS and creates policies for all main tables
-- allowing authenticated and anon users to access data (for staff app access)
-- ============================================================================

-- ============================================================================
-- 1. GUESTS TABLE
-- ============================================================================
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view guests" ON public.guests;
CREATE POLICY "Authenticated users can view guests"
  ON public.guests FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage guests" ON public.guests;
CREATE POLICY "Authenticated users can manage guests"
  ON public.guests FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. MEAL ATTENDANCE TABLE
-- ============================================================================
ALTER TABLE public.meal_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view meal attendance" ON public.meal_attendance;
CREATE POLICY "Authenticated users can view meal attendance"
  ON public.meal_attendance FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage meal attendance" ON public.meal_attendance;
CREATE POLICY "Authenticated users can manage meal attendance"
  ON public.meal_attendance FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. SHOWER RESERVATIONS TABLE
-- ============================================================================
ALTER TABLE public.shower_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view shower reservations" ON public.shower_reservations;
CREATE POLICY "Authenticated users can view shower reservations"
  ON public.shower_reservations FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage shower reservations" ON public.shower_reservations;
CREATE POLICY "Authenticated users can manage shower reservations"
  ON public.shower_reservations FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. LAUNDRY BOOKINGS TABLE
-- ============================================================================
ALTER TABLE public.laundry_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view laundry bookings" ON public.laundry_bookings;
CREATE POLICY "Authenticated users can view laundry bookings"
  ON public.laundry_bookings FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage laundry bookings" ON public.laundry_bookings;
CREATE POLICY "Authenticated users can manage laundry bookings"
  ON public.laundry_bookings FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. BICYCLE REPAIRS TABLE
-- ============================================================================
ALTER TABLE public.bicycle_repairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view bicycle repairs" ON public.bicycle_repairs;
CREATE POLICY "Authenticated users can view bicycle repairs"
  ON public.bicycle_repairs FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage bicycle repairs" ON public.bicycle_repairs;
CREATE POLICY "Authenticated users can manage bicycle repairs"
  ON public.bicycle_repairs FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. DONATIONS TABLE
-- ============================================================================
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view donations" ON public.donations;
CREATE POLICY "Authenticated users can view donations"
  ON public.donations FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage donations" ON public.donations;
CREATE POLICY "Authenticated users can manage donations"
  ON public.donations FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. LA PLAZA DONATIONS TABLE
-- ============================================================================
ALTER TABLE public.la_plaza_donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view la plaza donations" ON public.la_plaza_donations;
CREATE POLICY "Authenticated users can view la plaza donations"
  ON public.la_plaza_donations FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage la plaza donations" ON public.la_plaza_donations;
CREATE POLICY "Authenticated users can manage la plaza donations"
  ON public.la_plaza_donations FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8. HOLIDAY VISITS TABLE
-- ============================================================================
ALTER TABLE public.holiday_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view holiday visits" ON public.holiday_visits;
CREATE POLICY "Authenticated users can view holiday visits"
  ON public.holiday_visits FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage holiday visits" ON public.holiday_visits;
CREATE POLICY "Authenticated users can manage holiday visits"
  ON public.holiday_visits FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 9. HAIRCUT VISITS TABLE
-- ============================================================================
ALTER TABLE public.haircut_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view haircut visits" ON public.haircut_visits;
CREATE POLICY "Authenticated users can view haircut visits"
  ON public.haircut_visits FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage haircut visits" ON public.haircut_visits;
CREATE POLICY "Authenticated users can manage haircut visits"
  ON public.haircut_visits FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 10. ITEMS DISTRIBUTED TABLE
-- ============================================================================
ALTER TABLE public.items_distributed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view items distributed" ON public.items_distributed;
CREATE POLICY "Authenticated users can view items distributed"
  ON public.items_distributed FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage items distributed" ON public.items_distributed;
CREATE POLICY "Authenticated users can manage items distributed"
  ON public.items_distributed FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 11. APP SETTINGS TABLE
-- ============================================================================
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view app settings" ON public.app_settings;
CREATE POLICY "Authenticated users can view app settings"
  ON public.app_settings FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage app settings" ON public.app_settings;
CREATE POLICY "Authenticated users can manage app settings"
  ON public.app_settings FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 12. SYNC STATE TABLE
-- ============================================================================
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view sync state" ON public.sync_state;
CREATE POLICY "Authenticated users can view sync state"
  ON public.sync_state FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage sync state" ON public.sync_state;
CREATE POLICY "Authenticated users can manage sync state"
  ON public.sync_state FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 13. GUEST WARNINGS TABLE (if exists from migration 011)
-- ============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_warnings') THEN
    ALTER TABLE public.guest_warnings ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Authenticated users can view guest warnings" ON public.guest_warnings;
    DROP POLICY IF EXISTS "Authenticated users can manage guest warnings" ON public.guest_warnings;
    
    CREATE POLICY "Authenticated users can view guest warnings"
      ON public.guest_warnings FOR SELECT
      TO authenticated, anon
      USING (true);

    CREATE POLICY "Authenticated users can manage guest warnings"
      ON public.guest_warnings FOR ALL
      TO authenticated, anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
