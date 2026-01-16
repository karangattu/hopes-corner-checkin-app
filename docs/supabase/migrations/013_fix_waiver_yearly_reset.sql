-- Fix has_active_waiver to check for waivers acknowledged THIS year
CREATE OR REPLACE FUNCTION public.has_active_waiver(
  p_guest_id uuid,
  p_service_type text
) RETURNS boolean AS $$
DECLARE
  v_year_start timestamptz;
BEGIN
  -- Get the start of the current year
  v_year_start := date_trunc('year', now());
  
  -- A waiver is "active" if it was dismissed (acknowledged) this year
  -- When staff confirms a guest has signed the waiver, dismiss_waiver() sets dismissed_at = now()
  RETURN EXISTS (
    SELECT 1
    FROM public.service_waivers sw
    WHERE sw.guest_id = p_guest_id
      AND sw.service_type = p_service_type
      AND sw.dismissed_at IS NOT NULL
      AND sw.dismissed_at >= v_year_start
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.has_active_waiver(uuid, text) IS 
  'Checks if a guest has an active (acknowledged) waiver for the current calendar year. Returns true if the waiver was dismissed (acknowledged) this year.';
