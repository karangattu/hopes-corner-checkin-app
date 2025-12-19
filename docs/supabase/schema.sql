-- Run this once on a fresh database to create the correct schema with triggers, functions, views, and helpers.

-- 1. Extensions & helper updated-at trigger
create extension if not exists "pgcrypto";

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = greatest(now(), coalesce(new.updated_at, now()));
  return new;
end;
$$ language plpgsql;

create or replace function public.ensure_guest_not_banned()
returns trigger as $$
declare
  ban_until timestamptz;
  ban_reason text;
  guest_name text;
begin
  if new.guest_id is null then
    return new;
  end if;

  select g.banned_until, g.ban_reason, g.full_name
    into ban_until, ban_reason, guest_name
  from public.guests g
  where g.id = new.guest_id;

  if ban_until is null then
    return new;
  end if;

  if ban_until > now() then
    raise exception using
  message = format('Guest %s is banned from services until %s', coalesce(guest_name, new.guest_id::text), to_char(ban_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"')),
      detail = coalesce(ban_reason, ''),
      hint = 'Update the guest''s ban settings or wait until it expires.';
  end if;

  return new;
end;
$$ language plpgsql;

-- 2. Enumerations mirroring app constants (idempotent creation)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
    CREATE TYPE public.gender_enum AS enum ('Male','Female','Unknown','Non-binary');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'age_group_enum') THEN
    CREATE TYPE public.age_group_enum AS enum ('Adult 18-59','Senior 60+','Child 0-17');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'housing_status_enum') THEN
    CREATE TYPE public.housing_status_enum AS enum ('Unhoused','Housed','Temp. shelter','RV or vehicle');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'laundry_status_enum') THEN
    CREATE TYPE public.laundry_status_enum AS enum (
      'waiting','washer','dryer','done','picked_up','pending','transported','returned','offsite_picked_up'
    );
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bicycle_repair_status_enum') THEN
    CREATE TYPE public.bicycle_repair_status_enum AS enum ('pending','in_progress','done');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_type_enum') THEN
    CREATE TYPE public.donation_type_enum AS enum ('Protein','Carbs','Vegetables','Fruit','Veggie Protein','Deli Foods','Pastries','School lunch');
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'la_plaza_category_enum') THEN
    CREATE TYPE public.la_plaza_category_enum AS enum (
      'Bakery', 'Beverages', 'Dairy', 'Meat', 'Mix', 'Nonfood', 'Prepared/Perishable', 'Produce'
    );
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_type_enum') THEN
    CREATE TYPE public.meal_type_enum AS enum (
      'guest',
      'extra',
      'rv',
      'shelter',
      'united_effort',
      'day_worker',
      'lunch_bag'
    );
  END IF;
END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shower_status_enum') THEN
    CREATE TYPE public.shower_status_enum as enum ('booked','waitlisted','done','cancelled','no_show');
  END IF;
END$$;

-- 3. Core reference tables
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,           -- matches Firestore guestId or legacy ID (e.g. "GABC123" or "M80926591")
  first_name text not null,
  last_name text not null,
  full_name text not null,
  preferred_name text,
  housing_status public.housing_status_enum not null default 'Unhoused',
  age_group public.age_group_enum not null,
  gender public.gender_enum not null,
  location text not null default 'Mountain View',
  notes text,
  bicycle_description text,
  ban_reason text,
  banned_at timestamptz,
  banned_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_ban_window_valid check (
    banned_until is null
    or banned_at is null
    or banned_until > banned_at
  )
);

drop trigger if exists trg_guests_updated_at on public.guests;
create trigger trg_guests_updated_at
before update on public.guests
for each row execute function public.touch_updated_at();

create index if not exists guests_banned_until_idx
  on public.guests (banned_until)
  where banned_until is not null;

-- Performance indexes for large guest tables (100k+ records)
create index if not exists guests_created_at_idx
  on public.guests (created_at desc);

create index if not exists guests_full_name_idx
  on public.guests (full_name);

create index if not exists guests_external_id_idx
  on public.guests (external_id);

-- 4. Program attendance & services
create table if not exists public.meal_attendance (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete set null,
  meal_type public.meal_type_enum not null default 'guest',
  quantity smallint not null check (quantity > 0),
  served_on date not null,
  recorded_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_meal_attendance_updated_at on public.meal_attendance;
create trigger trg_meal_attendance_updated_at
before update on public.meal_attendance
for each row execute function public.touch_updated_at();

drop trigger if exists trg_meal_attendance_ban_guard on public.meal_attendance;
create trigger trg_meal_attendance_ban_guard
before insert or update on public.meal_attendance
for each row execute function public.ensure_guest_not_banned();

-- Enforce one primary meal per guest per day
create unique index if not exists meal_attendance_guest_unique
  on public.meal_attendance (guest_id, served_on)
  where meal_type = 'guest';

-- Performance indexes for meal attendance queries
create index if not exists meal_attendance_served_on_idx
  on public.meal_attendance (served_on desc);

create index if not exists meal_attendance_guest_id_idx
  on public.meal_attendance (guest_id);

create index if not exists meal_attendance_created_at_idx
  on public.meal_attendance (created_at desc);

create table if not exists public.shower_reservations (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  scheduled_for date not null,
  scheduled_time text,  -- "07:30" etc; keep as text to match UI
  status public.shower_status_enum not null default 'booked',
  waitlist_position smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  note text
);

drop trigger if exists trg_shower_reservations_updated_at on public.shower_reservations;
create trigger trg_shower_reservations_updated_at
before update on public.shower_reservations
for each row execute function public.touch_updated_at();

drop trigger if exists trg_shower_reservations_ban_guard on public.shower_reservations;
create trigger trg_shower_reservations_ban_guard
before insert or update on public.shower_reservations
for each row execute function public.ensure_guest_not_banned();

create unique index if not exists shower_one_per_day
  on public.shower_reservations (guest_id, scheduled_for);

-- Helps enforce max 2 per slot via app logic (query count per slot); add a check trigger later if you prefer
create index if not exists shower_slot_idx
  on public.shower_reservations (scheduled_for, scheduled_time);

create table if not exists public.laundry_bookings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  scheduled_for date not null,
  slot_label text,
  laundry_type text not null check (laundry_type in ('onsite','offsite')),
  bag_number text,
  status public.laundry_status_enum not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  note text
);

drop trigger if exists trg_laundry_bookings_updated_at on public.laundry_bookings;
create trigger trg_laundry_bookings_updated_at
before update on public.laundry_bookings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_laundry_bookings_ban_guard on public.laundry_bookings;
create trigger trg_laundry_bookings_ban_guard
before insert or update on public.laundry_bookings
for each row execute function public.ensure_guest_not_banned();

create unique index if not exists laundry_one_per_day
  on public.laundry_bookings (guest_id, scheduled_for);

create table if not exists public.bicycle_repairs (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete set null,
  requested_at timestamptz not null default now(),
  repair_type text,
  repair_types text[] not null,
  completed_repairs text[] not null default array[]::text[],
  notes text,
  status public.bicycle_repair_status_enum not null default 'pending',
  priority integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint bicycle_repairs_requires_repair_types check (cardinality(repair_types) > 0)
);

drop trigger if exists trg_bicycle_repairs_updated_at on public.bicycle_repairs;
create trigger trg_bicycle_repairs_updated_at
before update on public.bicycle_repairs
for each row execute function public.touch_updated_at();

drop trigger if exists trg_bicycle_repairs_ban_guard on public.bicycle_repairs;
create trigger trg_bicycle_repairs_ban_guard
before insert or update on public.bicycle_repairs
for each row execute function public.ensure_guest_not_banned();

create table if not exists public.holiday_visits (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  served_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_holiday_visits_ban_guard on public.holiday_visits;
create trigger trg_holiday_visits_ban_guard
before insert or update on public.holiday_visits
for each row execute function public.ensure_guest_not_banned();

create table if not exists public.haircut_visits (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  served_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_haircut_visits_ban_guard on public.haircut_visits;
create trigger trg_haircut_visits_ban_guard
before insert or update on public.haircut_visits
for each row execute function public.ensure_guest_not_banned();

create table if not exists public.items_distributed (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  item_key text not null,          -- 'tshirt','sleeping_bag','backpack','tent','flip_flops', etc.
  distributed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_items_distributed_ban_guard on public.items_distributed;
create trigger trg_items_distributed_ban_guard
before insert or update on public.items_distributed
for each row execute function public.ensure_guest_not_banned();

create index if not exists items_distributed_lookup
  on public.items_distributed (guest_id, item_key, distributed_at desc);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donation_type public.donation_type_enum not null,
  item_name text not null,
  trays numeric(6,2) not null default 0,
  weight_lbs numeric(6,2) not null default 0,
  servings numeric(8,2) default 0,
  temperature text,
  donor text not null,
  donated_at timestamptz not null default now(),
  date_key date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_donations_updated_at on public.donations;
create trigger trg_donations_updated_at
before update on public.donations
for each row execute function public.touch_updated_at();

-- Function to compute date_key from donated_at timestamp in Pacific timezone
-- Only sets date_key if not already provided (client can send it explicitly)
create or replace function public.set_donation_date_key()
returns trigger as $$
begin
  -- Only compute if date_key is not already set
  if new.date_key is null then
    new.date_key := (new.donated_at at time zone 'America/Los_Angeles')::date;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_donations_set_date_key on public.donations;
create trigger trg_donations_set_date_key
before insert or update on public.donations
for each row execute function public.set_donation_date_key();

create index if not exists donations_date_key_idx
  on public.donations (date_key desc);

-- 5. Settings store (single row replacing Firestore doc appSettings/global)
create table if not exists public.app_settings (
  id text primary key default 'global',
  site_name text not null default 'Hope''s Corner',
  max_onsite_laundry_slots smallint not null default 5,
  enable_offsite_laundry boolean not null default true,
  ui_density text not null default 'comfortable',
  show_charts boolean not null default true,
  default_report_days smallint not null default 7,
  donation_autofill boolean not null default true,
  default_donation_type public.donation_type_enum not null default 'Protein',
  targets jsonb not null default jsonb_build_object(
    'monthlyMeals', 1500,
    'yearlyMeals', 18000,
    'monthlyShowers', 300,
    'yearlyShowers', 3600,
    'monthlyLaundry', 200,
    'yearlyLaundry', 2400,
    'monthlyBicycles', 50,
    'yearlyBicycles', 600,
    'monthlyHaircuts', 100,
    'yearlyHaircuts', 1200,
    'monthlyHolidays', 80,
    'yearlyHolidays', 960
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. La Plaza Market donation records (separate table for partner donations)
create table if not exists public.la_plaza_donations (
  id uuid primary key default gen_random_uuid(),
  category public.la_plaza_category_enum not null,
  weight_lbs numeric(8,3) not null,
  notes text,
  received_at timestamptz not null default now(),
  date_key date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_la_plaza_donations_updated_at on public.la_plaza_donations;
create trigger trg_la_plaza_donations_updated_at
before update on public.la_plaza_donations
for each row execute function public.touch_updated_at();

-- Function to compute date_key from received_at timestamp in Pacific timezone
-- Only sets date_key if not already provided (client can send it explicitly)
create or replace function public.set_la_plaza_donation_date_key()
returns trigger as $$
begin
  -- Only compute if date_key is not already set
  if new.date_key is null then
    new.date_key := (new.received_at at time zone 'America/Los_Angeles')::date;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_la_plaza_donations_set_date_key on public.la_plaza_donations;
create trigger trg_la_plaza_donations_set_date_key
before insert or update on public.la_plaza_donations
for each row execute function public.set_la_plaza_donation_date_key();

create index if not exists la_plaza_donations_date_key_idx
  on public.la_plaza_donations (date_key desc);

create index if not exists la_plaza_donations_received_at_idx
  on public.la_plaza_donations (received_at desc);

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.touch_updated_at();

-- Seed the single settings row (safe upsert)
insert into public.app_settings (id) values ('global')
on conflict (id) do nothing;

-- 6. Optional sync metadata table (handy if you persist SupabaseSync state)
create table if not exists public.sync_state (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  last_synced_at timestamptz not null default now(),
  last_error text,
  payload jsonb,
  constraint sync_state_unique_table unique (table_name)
);

-- 7. Service waivers (from migrations)
-- Track if a guest has an active waiver for shower, laundry, or bicycle
create table if not exists public.service_waivers (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  service_type text not null check (service_type in ('shower', 'laundry', 'bicycle')),
  signed_at timestamptz not null default now(),
  dismissed_at timestamptz,
  dismissed_by_user_id uuid,
  dismissed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_service_waivers_updated_at on public.service_waivers;
create trigger trg_service_waivers_updated_at
before update on public.service_waivers
for each row execute function public.touch_updated_at();

-- Indexes to speed up waiver queries
create index if not exists service_waivers_guest_idx
  on public.service_waivers (guest_id);

create index if not exists service_waivers_service_type_idx
  on public.service_waivers (service_type);

-- Enforce a single active waiver (no dismissed_at) per guest, per service
create unique index if not exists service_waivers_unique_active_idx
  on public.service_waivers (guest_id, service_type)
  where dismissed_at is null;

-- View for guests needing waivers (yearly logic applied below)
drop view if exists public.guests_needing_waivers cascade;
create or replace view public.guests_needing_waivers as
select distinct g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  'shower' as service_type
from public.guests g
where 
  exists (
    select 1 from public.shower_reservations sr
    where sr.guest_id = g.id 
      and sr.scheduled_for >= date_trunc('year', now())::date
  ) 
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
  exists (
    select 1 from public.laundry_bookings lb
    where lb.guest_id = g.id
      and lb.scheduled_for >= date_trunc('year', now())::date
  )
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
  )
union all
select distinct g.id,
  g.external_id,
  g.full_name,
  g.preferred_name,
  'bicycle' as service_type
from public.guests g
where 
  exists (
    select 1 from public.bicycle_repairs br
    where br.guest_id = g.id
      and br.requested_at >= date_trunc('year', now())
  )
  and (
    not exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id 
        and sw.service_type = 'bicycle'
    )
    or
    exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = g.id
        and sw.service_type = 'bicycle'
        and sw.dismissed_at < date_trunc('year', now())::date
    )
  );

-- Helper functions for waivers
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
      and sw.created_at >= v_year_start
  );
end;
$$ language plpgsql stable;

-- Drop existing function first (may have different return type from migrations)
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

-- Check if a guest needs a waiver reminder for a service
-- Uses scheduled_for date (when service is scheduled) rather than created_at
create or replace function public.guest_needs_waiver_reminder(
  p_guest_id uuid,
  p_service_type text
) returns boolean as $$
declare
  v_year_start date;
begin
  v_year_start := date_trunc('year', now())::date;
  
  -- Check for bicycle service type
  if p_service_type = 'bicycle' then
    -- Check if guest has any bicycle repair this year
    if not exists (
      select 1 from public.bicycle_repairs br
      where br.guest_id = p_guest_id
        and br.requested_at >= v_year_start
    ) then
      return false;
    end if;
    
    -- Check for existing waiver this year
    if exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = p_guest_id
        and sw.service_type = 'bicycle'
        and sw.dismissed_at >= v_year_start
    ) then
      return false;
    end if;
    
    return true;
  end if;
  
  -- Check for shower
  if p_service_type = 'shower' then
    if not exists (
      select 1 from public.shower_reservations sr
      where sr.guest_id = p_guest_id
        and sr.scheduled_for >= v_year_start
    ) then
      return false;
    end if;
    
    if exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = p_guest_id
        and sw.service_type = 'shower'
        and sw.dismissed_at >= v_year_start
    ) then
      return false;
    end if;
    
    return true;
  end if;
  
  -- Check for laundry
  if p_service_type = 'laundry' then
    if not exists (
      select 1 from public.laundry_bookings lb
      where lb.guest_id = p_guest_id
        and lb.scheduled_for >= v_year_start
    ) then
      return false;
    end if;
    
    if exists (
      select 1 from public.service_waivers sw
      where sw.guest_id = p_guest_id
        and sw.service_type = 'laundry'
        and sw.dismissed_at >= v_year_start
    ) then
      return false;
    end if;
    
    return true;
  end if;
  
  return false;
end;
$$ language plpgsql stable;

create or replace function public.reset_waivers_for_new_year()
returns table (reset_count integer) as $$
declare
  v_reset_count integer;
begin
  delete from public.service_waivers
  where dismissed_at is not null
    and dismissed_at < date_trunc('year', now())::date;
  get diagnostics v_reset_count = row_count;
  return query select v_reset_count;
end;
$$ language plpgsql;

-- RLS policies for service_waivers
alter table public.service_waivers enable row level security;

-- Allow authenticated and anon users to read waivers (anon needed for Firebase proxy)
drop policy if exists "Authenticated users can view waivers" on public.service_waivers;
create policy "Authenticated users can view waivers"
  on public.service_waivers for select
  to authenticated, anon
  using (true);

-- Allow authenticated and anon users to manage waivers
drop policy if exists "Authenticated users can manage waivers" on public.service_waivers;
create policy "Authenticated users can manage waivers"
  on public.service_waivers for all
  to authenticated, anon
  using (true)
  with check (true);

-- ============================================================================
-- 8. Guest Proxies (from 008_guest_proxies.sql)
-- Symmetric relationship for linking guests (family members, etc.)
-- ============================================================================

create table if not exists public.guest_proxies (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  proxy_id uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  
  -- Prevent self-linking
  constraint guest_proxies_no_self_link check (guest_id <> proxy_id),
  -- Prevent duplicate links (regardless of order)
  constraint guest_proxies_unique_link unique (guest_id, proxy_id)
);

-- Index for fast lookup by either guest
create index if not exists guest_proxies_guest_id_idx 
  on public.guest_proxies (guest_id);
create index if not exists guest_proxies_proxy_id_idx 
  on public.guest_proxies (proxy_id);

-- Enable RLS
alter table public.guest_proxies enable row level security;

-- Policies for guest proxies
drop policy if exists "Authenticated users can view guest proxies" on public.guest_proxies;
create policy "Authenticated users can view guest proxies"
  on public.guest_proxies for select
  to authenticated, anon
  using (true);

drop policy if exists "Authenticated users can manage guest proxies" on public.guest_proxies;
create policy "Authenticated users can manage guest proxies"
  on public.guest_proxies for all
  to authenticated, anon
  using (true)
  with check (true);

-- Trigger to maintain symmetry: if A -> B, then B -> A
create or replace function public.maintain_guest_proxy_symmetry()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.guest_proxies (guest_id, proxy_id)
    values (new.proxy_id, new.guest_id)
    on conflict (guest_id, proxy_id) do nothing;
  elsif (tg_op = 'DELETE') then
    delete from public.guest_proxies
    where guest_id = old.proxy_id and proxy_id = old.guest_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_maintain_guest_proxy_symmetry on public.guest_proxies;
create trigger trg_maintain_guest_proxy_symmetry
after insert or delete on public.guest_proxies
for each row execute function public.maintain_guest_proxy_symmetry();

-- Function to check limit of 3 proxies per guest
create or replace function public.check_guest_proxy_limit()
returns trigger as $$
begin
  if (select count(*) from public.guest_proxies where guest_id = new.guest_id) >= 3 then
    raise exception 'A guest can have at most 3 linked accounts.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_check_guest_proxy_limit on public.guest_proxies;
create trigger trg_check_guest_proxy_limit
before insert on public.guest_proxies
for each row execute function public.check_guest_proxy_limit();

-- ============================================================================
-- 9. Additional Performance Indexes (from 004_add_performance_indexes.sql)
-- ============================================================================

-- Shower reservations indexes
create index if not exists shower_scheduled_for_idx
  on public.shower_reservations (scheduled_for desc);
create index if not exists shower_created_at_idx
  on public.shower_reservations (created_at desc);
create index if not exists shower_guest_id_idx
  on public.shower_reservations (guest_id);

-- Laundry bookings indexes
create index if not exists laundry_scheduled_for_idx
  on public.laundry_bookings (scheduled_for desc);
create index if not exists laundry_created_at_idx
  on public.laundry_bookings (created_at desc);
create index if not exists laundry_guest_id_idx
  on public.laundry_bookings (guest_id);

-- Bicycle repairs indexes
create index if not exists bicycle_requested_at_idx
  on public.bicycle_repairs (requested_at desc);
create index if not exists bicycle_guest_id_idx
  on public.bicycle_repairs (guest_id);
create index if not exists bicycle_status_idx
  on public.bicycle_repairs (status);

-- Haircut visits indexes
create index if not exists haircut_served_at_idx
  on public.haircut_visits (served_at desc);
create index if not exists haircut_created_at_idx
  on public.haircut_visits (created_at desc);
create index if not exists haircut_guest_id_idx
  on public.haircut_visits (guest_id);

-- Holiday visits indexes
create index if not exists holiday_served_at_idx
  on public.holiday_visits (served_at desc);
create index if not exists holiday_created_at_idx
  on public.holiday_visits (created_at desc);
create index if not exists holiday_guest_id_idx
  on public.holiday_visits (guest_id);

-- La Plaza donations indexes
create index if not exists la_plaza_donations_received_at_idx
  on public.la_plaza_donations (received_at desc);

comment on table public.service_waivers is 'Tracks service waivers for shower, laundry, and bicycle programs. Each waiver is valid for one calendar year.';
comment on table public.guest_proxies is 'Symmetric relationship table for linking guests (family members, etc.). Max 3 proxies per guest.';
