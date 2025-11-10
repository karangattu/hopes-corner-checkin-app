-- Adds service waiver tracking for shower and laundry services
-- Allows tracking which guests have acknowledged required waivers for these services
begin;

-- Create waivers table to track signed waivers for each service
create table if not exists public.service_waivers (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  service_type text not null check (service_type in ('shower', 'laundry')),
  signed_at timestamptz not null default now(),
  dismissed_at timestamptz,
  dismissed_by_user_id uuid,
  dismissed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_service_waivers_updated_at
before update on public.service_waivers
for each row execute function public.touch_updated_at();

-- Create indexes for efficient queries
create index service_waivers_guest_idx
  on public.service_waivers (guest_id);

create index service_waivers_service_type_idx
  on public.service_waivers (service_type);

-- Ensure one active waiver per guest per service at a time using a partial unique index
create unique index service_waivers_unique_active_idx
  on public.service_waivers (guest_id, service_type)
  where dismissed_at is null;

-- Add helper view for guests needing waivers (have used services but no active waiver)
create or replace view public.guests_needing_waivers as
select distinct g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  case 
    when exists (
      select 1 from public.shower_reservations sr
      where sr.guest_id = g.id 
        and sr.created_at >= (now() - interval '30 days')
    ) 
    and not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id 
        and sw.service_type = 'shower'
        and sw.dismissed_at is null
    )
    then 'shower'
  end as service_needed,
  g.created_at,
  g.updated_at
from public.guests g
where true
  and (
    -- Guest has shower reservations but no active shower waiver
    (exists (
      select 1 from public.shower_reservations sr
      where sr.guest_id = g.id
        and sr.created_at >= (now() - interval '30 days')
    ) 
    and not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id
        and sw.service_type = 'shower'
        and sw.dismissed_at is null
    ))
    or
    -- Guest has laundry bookings but no active laundry waiver
    (exists (
      select 1 from public.laundry_bookings lb
      where lb.guest_id = g.id
        and lb.created_at >= (now() - interval '30 days')
    )
    and not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id
        and sw.service_type = 'laundry'
        and sw.dismissed_at is null
    ))
  );

-- Function to check if a guest has an active waiver for a service
create or replace function public.has_active_waiver(
  p_guest_id uuid,
  p_service_type text
) returns boolean as $$
begin
  return exists (
    select 1
    from public.service_waivers sw
    where sw.guest_id = p_guest_id
      and sw.service_type = p_service_type
      and sw.dismissed_at is null
  );
end;
$$ language plpgsql immutable;

-- Function to dismiss a waiver (mark as acknowledged/dismissed)
create or replace function public.dismiss_waiver(
  p_guest_id uuid,
  p_service_type text,
  p_dismissed_reason text default null
) returns uuid as $$
declare
  v_waiver_id uuid;
begin
  update public.service_waivers
  set 
    dismissed_at = now(),
    dismissed_reason = p_dismissed_reason
  where 
    guest_id = p_guest_id
    and service_type = p_service_type
    and dismissed_at is null
  returning id into v_waiver_id;
  
  if v_waiver_id is null then
    raise exception 'No active waiver found for guest % and service %', p_guest_id, p_service_type;
  end if;
  
  return v_waiver_id;
end;
$$ language plpgsql;

-- Function to check if a guest needs a waiver reminder for a service
create or replace function public.guest_needs_waiver_reminder(
  p_guest_id uuid,
  p_service_type text
) returns boolean as $$
begin
  return (
    -- Guest has used the service in the last 30 days
    case 
      when p_service_type = 'shower' then
        exists (
          select 1 from public.shower_reservations sr
          where sr.guest_id = p_guest_id
            and sr.created_at >= (now() - interval '30 days')
        )
      when p_service_type = 'laundry' then
        exists (
          select 1 from public.laundry_bookings lb
          where lb.guest_id = p_guest_id
            and lb.created_at >= (now() - interval '30 days')
        )
      else false
    end
  )
  and
  -- Guest does NOT have an active waiver for this service
  not public.has_active_waiver(p_guest_id, p_service_type);
end;
$$ language plpgsql;

commit;
