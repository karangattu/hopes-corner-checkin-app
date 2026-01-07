-- Migration: Add service_waivers table and related functions
-- This enables tracking of yearly waivers for shower and laundry services

-- 1. Create service_waivers table
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

-- 2. Add trigger for updated_at
drop trigger if exists trg_service_waivers_updated_at on public.service_waivers;
create trigger trg_service_waivers_updated_at
before update on public.service_waivers
for each row execute function public.touch_updated_at();

-- 3. Add indexes
create index if not exists service_waivers_guest_idx
  on public.service_waivers (guest_id);

create index if not exists service_waivers_service_type_idx
  on public.service_waivers (service_type);

-- Enforce a single active waiver (no dismissed_at) per guest, per service
create unique index if not exists service_waivers_unique_active_idx
  on public.service_waivers (guest_id, service_type)
  where dismissed_at is null;

-- 4. Create function to check if guest needs waiver reminder
-- Uses scheduled_for date (when service is scheduled) rather than created_at
create or replace function public.guest_needs_waiver_reminder(
  p_guest_id uuid,
  p_service_type text
) returns boolean as $$
declare
  v_year_start date;
begin
  v_year_start := date_trunc('year', now())::date;
  case 
    when p_service_type = 'shower' then
      -- Check if guest has any shower scheduled this year
      if not exists (
        select 1 from public.shower_reservations sr
        where sr.guest_id = p_guest_id
          and sr.scheduled_for >= v_year_start
      ) then
        return false;
      end if;
    when p_service_type = 'laundry' then
      -- Check if guest has any laundry booked this year
      if not exists (
        select 1 from public.laundry_bookings lb
        where lb.guest_id = p_guest_id
          and lb.scheduled_for >= v_year_start
      ) then
        return false;
      end if;
    else
      return false;
  end case;
  -- Guest has a service this year, check if they need a waiver
  return (
    -- No waiver record exists at all
    not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = p_guest_id
        and sw.service_type = p_service_type
    )
  )
  or
  (
    -- Waiver was dismissed before this year (needs renewal)
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

-- 5. Create function to dismiss waiver
-- Drop existing function first (may have different return type)
drop function if exists public.dismiss_waiver(uuid, text, text);
create or replace function public.dismiss_waiver(
  p_guest_id uuid,
  p_service_type text,
  p_dismissed_reason text default 'signed_by_staff'
) returns void as $$
begin
  insert into public.service_waivers (
    guest_id,
    service_type,
    signed_at,
    dismissed_at,
    dismissed_reason
  ) values (
    p_guest_id,
    p_service_type,
    now(),
    now(),
    p_dismissed_reason
  )
  on conflict (guest_id, service_type) where dismissed_at is null
  do update set
    dismissed_at = now(),
    dismissed_reason = p_dismissed_reason;
end;
$$ language plpgsql;

-- 6. Enable RLS on service_waivers
alter table public.service_waivers enable row level security;

-- Allow authenticated users to read waivers
drop policy if exists "Authenticated users can view waivers" on public.service_waivers;
create policy "Authenticated users can view waivers"
  on public.service_waivers for select
  to authenticated, anon
  using (true);

-- Allow authenticated users to insert/update waivers
drop policy if exists "Authenticated users can manage waivers" on public.service_waivers;
create policy "Authenticated users can manage waivers"
  on public.service_waivers for all
  to authenticated, anon
  using (true)
  with check (true);
