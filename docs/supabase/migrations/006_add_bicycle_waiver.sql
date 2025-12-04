-- Migration: Add bicycle as a valid service type for waivers
-- Purpose: Support bicycle program waivers separate from shower/laundry waivers

-- 1. Alter the check constraint to allow 'bicycle' as a service type
ALTER TABLE public.service_waivers
  DROP CONSTRAINT IF EXISTS service_waivers_service_type_check;

ALTER TABLE public.service_waivers
  ADD CONSTRAINT service_waivers_service_type_check
  CHECK (service_type IN ('shower', 'laundry', 'bicycle'));

-- 2. Update the guests_needing_waivers view to include bicycle
DROP VIEW IF EXISTS public.guests_needing_waivers CASCADE;
CREATE OR REPLACE VIEW public.guests_needing_waivers AS
SELECT DISTINCT g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  'shower' AS service_type
FROM public.guests g
WHERE 
  EXISTS (
    SELECT 1 FROM public.shower_reservations sr
    WHERE sr.guest_id = g.id 
      AND sr.scheduled_for >= date_trunc('year', now())::date
  ) 
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.service_waivers sw
      WHERE sw.guest_id = g.id 
        AND sw.service_type = 'shower'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.service_waivers sw
      WHERE sw.guest_id = g.id
        AND sw.service_type = 'shower'
        AND sw.dismissed_at < date_trunc('year', now())::date
    )
  )
UNION ALL
SELECT DISTINCT g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  'laundry' AS service_type
FROM public.guests g
WHERE 
  EXISTS (
    SELECT 1 FROM public.laundry_bookings lb
    WHERE lb.guest_id = g.id
      AND lb.scheduled_for >= date_trunc('year', now())::date
  )
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.service_waivers sw
      WHERE sw.guest_id = g.id 
        AND sw.service_type = 'laundry'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.service_waivers sw
      WHERE sw.guest_id = g.id
        AND sw.service_type = 'laundry'
        AND sw.dismissed_at < date_trunc('year', now())::date
    )
  )
UNION ALL
SELECT DISTINCT g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  'bicycle' AS service_type
FROM public.guests g
WHERE 
  EXISTS (
    SELECT 1 FROM public.bicycle_repairs br
    WHERE br.guest_id = g.id
      AND br.requested_at >= date_trunc('year', now())
  )
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.service_waivers sw
      WHERE sw.guest_id = g.id 
        AND sw.service_type = 'bicycle'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.service_waivers sw
      WHERE sw.guest_id = g.id
        AND sw.service_type = 'bicycle'
        AND sw.dismissed_at < date_trunc('year', now())::date
    )
  );

-- 3. Update the guest_needs_waiver_reminder function to handle bicycle
CREATE OR REPLACE FUNCTION public.guest_needs_waiver_reminder(
  p_guest_id uuid,
  p_service_type text
) RETURNS boolean AS $$
DECLARE
  v_year_start date;
BEGIN
  v_year_start := date_trunc('year', now())::date;
  
  -- Check for bicycle service type
  IF p_service_type = 'bicycle' THEN
    -- Check if guest has any bicycle repair this year
    IF NOT EXISTS (
      SELECT 1 FROM public.bicycle_repairs br
      WHERE br.guest_id = p_guest_id
        AND br.requested_at >= v_year_start
    ) THEN
      RETURN false;
    END IF;
    
    -- Check for existing waiver this year
    IF EXISTS (
      SELECT 1 FROM public.service_waivers sw
      WHERE sw.guest_id = p_guest_id
        AND sw.service_type = 'bicycle'
        AND sw.dismissed_at >= v_year_start
    ) THEN
      RETURN false;
    END IF;
    
    RETURN true;
  END IF;
  
  -- Original logic for shower
  IF p_service_type = 'shower' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.shower_reservations sr
      WHERE sr.guest_id = p_guest_id
        AND sr.scheduled_for >= v_year_start
    ) THEN
      RETURN false;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM public.service_waivers sw
      WHERE sw.guest_id = p_guest_id
        AND sw.service_type = 'shower'
        AND sw.dismissed_at >= v_year_start
    ) THEN
      RETURN false;
    END IF;
    
    RETURN true;
  END IF;
  
  -- Original logic for laundry
  IF p_service_type = 'laundry' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.laundry_bookings lb
      WHERE lb.guest_id = p_guest_id
        AND lb.scheduled_for >= v_year_start
    ) THEN
      RETURN false;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM public.service_waivers sw
      WHERE sw.guest_id = p_guest_id
        AND sw.service_type = 'laundry'
        AND sw.dismissed_at >= v_year_start
    ) THEN
      RETURN false;
    END IF;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Ensure has_active_waiver function handles bicycle
CREATE OR REPLACE FUNCTION public.has_active_waiver(
  p_guest_id uuid,
  p_service_type text
) RETURNS boolean AS $$
DECLARE
  v_year_start timestamptz;
BEGIN
  v_year_start := date_trunc('year', now())::date;
  RETURN EXISTS (
    SELECT 1
    FROM public.service_waivers sw
    WHERE sw.guest_id = p_guest_id
      AND sw.service_type = p_service_type
      AND sw.dismissed_at IS NULL
      AND sw.created_at >= v_year_start
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE public.service_waivers IS 'Tracks service waivers for shower, laundry, and bicycle programs. Each waiver is valid for one calendar year.';
