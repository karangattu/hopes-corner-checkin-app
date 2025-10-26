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

-- 2. Enumerations mirroring app constants
create type public.gender_enum as enum ('Male','Female','Unknown','Non-binary');
create type public.age_group_enum as enum ('Adult 18-59','Senior 60+','Child 0-17');
create type public.housing_status_enum as enum ('Unhoused','Housed','Temp. shelter','RV or vehicle');

create type public.laundry_status_enum as enum (
  'waiting','washer','dryer','done','picked_up','pending','transported','returned','offsite_picked_up'
);

create type public.bicycle_repair_status_enum as enum ('pending','in_progress','done');
create type public.donation_type_enum as enum ('Protein','Carbs','Vegetables','Fruit');

create type public.meal_type_enum as enum (
  'guest',          -- primary meal tied to a guest
  'extra',          -- extra meal with optional guest
  'rv',
  'shelter',
  'united_effort',
  'day_worker',
  'lunch_bag'
);

create type public.shower_status_enum as enum ('booked','waitlisted','done','cancelled','no_show');

-- 3. Core reference tables
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,           -- matches Firestore guestId (e.g. "GABC123")
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
  constraint guests_external_id_format check (external_id ~ '^G[A-Z0-9]{3,}$'),
  constraint guests_ban_window_valid check (
    banned_until is null
    or banned_at is null
    or banned_until > banned_at
  )
);

create trigger trg_guests_updated_at
before update on public.guests
for each row execute function public.touch_updated_at();

create index guests_banned_until_idx
  on public.guests (banned_until)
  where banned_until is not null;

-- 4. Program attendance & services
create table public.meal_attendance (
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

create trigger trg_meal_attendance_updated_at
before update on public.meal_attendance
for each row execute function public.touch_updated_at();

create trigger trg_meal_attendance_ban_guard
before insert or update on public.meal_attendance
for each row execute function public.ensure_guest_not_banned();

-- Enforce one primary meal per guest per day
create unique index meal_attendance_guest_unique
  on public.meal_attendance (guest_id, served_on)
  where meal_type = 'guest';

create table public.shower_reservations (
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

create trigger trg_shower_reservations_updated_at
before update on public.shower_reservations
for each row execute function public.touch_updated_at();

create trigger trg_shower_reservations_ban_guard
before insert or update on public.shower_reservations
for each row execute function public.ensure_guest_not_banned();

create unique index shower_one_per_day
  on public.shower_reservations (guest_id, scheduled_for);

-- Helps enforce max 2 per slot via app logic (query count per slot); add a check trigger later if you prefer
create index shower_slot_idx
  on public.shower_reservations (scheduled_for, scheduled_time);

create table public.laundry_bookings (
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

create trigger trg_laundry_bookings_updated_at
before update on public.laundry_bookings
for each row execute function public.touch_updated_at();

create trigger trg_laundry_bookings_ban_guard
before insert or update on public.laundry_bookings
for each row execute function public.ensure_guest_not_banned();

create unique index laundry_one_per_day
  on public.laundry_bookings (guest_id, scheduled_for);

create table public.bicycle_repairs (
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

create trigger trg_bicycle_repairs_updated_at
before update on public.bicycle_repairs
for each row execute function public.touch_updated_at();

create trigger trg_bicycle_repairs_ban_guard
before insert or update on public.bicycle_repairs
for each row execute function public.ensure_guest_not_banned();

create table public.holiday_visits (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  served_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create trigger trg_holiday_visits_ban_guard
before insert or update on public.holiday_visits
for each row execute function public.ensure_guest_not_banned();

create table public.haircut_visits (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  served_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create trigger trg_haircut_visits_ban_guard
before insert or update on public.haircut_visits
for each row execute function public.ensure_guest_not_banned();

create table public.items_distributed (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  item_key text not null,          -- 'tshirt','sleeping_bag','backpack','tent','flip_flops', etc.
  distributed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create trigger trg_items_distributed_ban_guard
before insert or update on public.items_distributed
for each row execute function public.ensure_guest_not_banned();

create index items_distributed_lookup
  on public.items_distributed (guest_id, item_key, distributed_at desc);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  donation_type public.donation_type_enum not null,
  item_name text not null,
  trays numeric(6,2) not null default 0,
  weight_lbs numeric(6,2) not null default 0,
  donor text not null,
  donated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_donations_updated_at
before update on public.donations
for each row execute function public.touch_updated_at();

-- 5. Settings store (single row replacing Firestore doc appSettings/global)
create table public.app_settings (
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

create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.touch_updated_at();

-- Seed the single settings row (safe upsert)
insert into public.app_settings (id) values ('global')
on conflict (id) do nothing;

-- 6. Optional sync metadata table (handy if you persist SupabaseSync state)
create table public.sync_state (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  last_synced_at timestamptz not null default now(),
  last_error text,
  payload jsonb,
  constraint sync_state_unique_table unique (table_name)
);
