-- Update service waiver tracking for yearly requirement (not 30-day)
-- Waivers are required once per year (Jan 1 - Dec 31)
-- Staff dismisses after confirming external waiver is signed
-- Waiver resets automatically on Jan 1 of new year

begin;

-- Update the guests_needing_waivers view to check for bookings since Jan 1 of current year
-- and only show badge if not dismissed this year
drop view if exists public.guests_needing_waivers cascade;

create or replace view public.guests_needing_waivers as
select distinct g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  'shower' as service_type
from public.guests g
where 
  -- Guest has shower reservations since Jan 1 of current year
  exists (
    select 1 from public.shower_reservations sr
    where sr.guest_id = g.id 
      and sr.created_at >= date_trunc('year', now())::date
  ) 
  -- AND either:
  -- 1. No waiver record exists yet, OR
  -- 2. Waiver was dismissed in a previous year (dismissed_at exists but is before Jan 1)
  and (
    not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id 
        and sw.service_type = 'shower'
    )
    or
    exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id
        and sw.service_type = 'shower'
        and sw.dismissed_at < date_trunc('year', now())::date
    )
  )

union all

select distinct g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  'laundry' as service_type
from public.guests g
where 
  -- Guest has laundry bookings since Jan 1 of current year
  exists (
    select 1 from public.laundry_bookings lb
    where lb.guest_id = g.id
      and lb.created_at >= date_trunc('year', now())::date
  )
  -- AND either:
  -- 1. No waiver record exists yet, OR
  -- 2. Waiver was dismissed in a previous year (dismissed_at exists but is before Jan 1)
  and (
    not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id 
        and sw.service_type = 'laundry'
    )
    or
    exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id
        and sw.service_type = 'laundry'
        and sw.dismissed_at < date_trunc('year', now())::date
    )
  );

-- Update guest_needs_waiver_reminder function to check yearly basis
create or replace function public.guest_needs_waiver_reminder(
  p_guest_id uuid,
  p_service_type text
) returns boolean as $$
declare
  v_year_start timestamptz;
  v_waiver_dismissed_before_year boolean;
begin
  v_year_start := date_trunc('year', now())::date;
  
  -- Check if guest used the service since Jan 1 of this year
  case 
    when p_service_type = 'shower' then
      -- Has guest used shower since Jan 1?
      if not exists (
        select 1 from public.shower_reservations sr
        where sr.guest_id = p_guest_id
          and sr.created_at >= v_year_start
      ) then
        return false;
      end if;
    when p_service_type = 'laundry' then
      -- Has guest used laundry since Jan 1?
      if not exists (
        select 1 from public.laundry_bookings lb
        where lb.guest_id = p_guest_id
          and lb.created_at >= v_year_start
      ) then
        return false;
      end if;
    else
      return false;
  end case;
  
  -- Check if waiver exists and its dismissal status
  -- Need waiver reminder if:
  -- 1. No waiver record exists, OR
  -- 2. Waiver was dismissed in a previous year (before Jan 1 of current year)
  return (
    not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = p_guest_id
        and sw.service_type = p_service_type
    )
  )
  or
  (
    exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = p_guest_id
        and sw.service_type = p_service_type
        and sw.dismissed_at is not null
        and sw.dismissed_at < v_year_start
    )
  );
end;
$$ language plpgsql stable;

-- Create a stored procedure to auto-reset waivers on Jan 1
-- This can be called by a scheduled job or triggered on first access of new year
create or replace function public.reset_waivers_for_new_year()
returns table (reset_count integer) as $$
declare
  v_reset_count integer;
begin
  -- Delete all dismissed waivers from previous years
  -- This allows them to reappear when guests use services in the new year
  delete from public.service_waivers
  where dismissed_at is not null
    and dismissed_at < date_trunc('year', now())::date;
  
  get diagnostics v_reset_count = row_count;
  
  return query select v_reset_count;
end;
$$ language plpgsql;

-- Update the has_active_waiver function to check for current year only
create or replace function public.has_active_waiver(
  p_guest_id uuid,
  p_service_type text
) returns boolean as $$
declare
  v_year_start timestamptz;
begin
  v_year_start := date_trunc('year', now())::date;
  
  return exists (
    select 1
    from public.service_waivers sw
    where sw.guest_id = p_guest_id
      and sw.service_type = p_service_type
      and sw.dismissed_at is null
      -- Waiver was either created this year or dismissed this year (counts as active for the year)
      and sw.created_at >= v_year_start
  );
end;
$$ language plpgsql stable;

commit;
