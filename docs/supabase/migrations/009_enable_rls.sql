-- Enable Row Level Security (RLS) on all tables
-- This migration adds granular role-based access control for 4 user roles:
--   admin: Full access to all tables
--   board: Read-only access to all tables
--   staff: CRUD except delete on most tables
--   checkin: Limited access (insert/update only for attendance tracking)

-- ============================================================================
-- STEP 1: Enable RLS on all tables
-- ============================================================================

alter table public.guests enable row level security;
alter table public.meal_attendance enable row level security;
alter table public.shower_reservations enable row level security;
alter table public.laundry_bookings enable row level security;
alter table public.bicycle_repairs enable row level security;
alter table public.guest_proxies enable row level security;
alter table public.holiday_visits enable row level security;
alter table public.haircut_visits enable row level security;
alter table public.items_distributed enable row level security;
alter table public.donations enable row level security;
alter table public.la_plaza_donations enable row level security;
alter table public.app_settings enable row level security;
alter table public.service_waivers enable row level security;

-- ============================================================================
-- STEP 2: Helper function to get user role from JWT
-- ============================================================================

create or replace function public.get_user_role()
returns text as $$
begin
  return coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'checkin'  -- default to most restrictive role
  );
end;
$$ language plpgsql security definer;

-- ============================================================================
-- STEP 3: Guests table policies
-- ============================================================================

-- Admin: Full access
create policy "admin_guests_all"
  on public.guests for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- Board: Read-only
create policy "board_guests_select"
  on public.guests for select
  to authenticated
  using (public.get_user_role() = 'board');

-- Staff: Read, Insert, Update (no delete)
create policy "staff_guests_select"
  on public.guests for select
  to authenticated
  using (public.get_user_role() = 'staff');

create policy "staff_guests_insert"
  on public.guests for insert
  to authenticated
  with check (public.get_user_role() = 'staff');

create policy "staff_guests_update"
  on public.guests for update
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

-- Checkin: Read, Insert, Update (no delete)
create policy "checkin_guests_select"
  on public.guests for select
  to authenticated
  using (public.get_user_role() = 'checkin');

create policy "checkin_guests_insert"
  on public.guests for insert
  to authenticated
  with check (public.get_user_role() = 'checkin');

create policy "checkin_guests_update"
  on public.guests for update
  to authenticated
  using (public.get_user_role() = 'checkin')
  with check (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 4: Meal attendance policies
-- ============================================================================

create policy "admin_meals_all"
  on public.meal_attendance for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_meals_select"
  on public.meal_attendance for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_meals_select"
  on public.meal_attendance for select
  to authenticated
  using (public.get_user_role() = 'staff');

create policy "staff_meals_insert"
  on public.meal_attendance for insert
  to authenticated
  with check (public.get_user_role() = 'staff');

create policy "staff_meals_update"
  on public.meal_attendance for update
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

create policy "checkin_meals_select"
  on public.meal_attendance for select
  to authenticated
  using (public.get_user_role() = 'checkin');

create policy "checkin_meals_insert"
  on public.meal_attendance for insert
  to authenticated
  with check (public.get_user_role() = 'checkin');

create policy "checkin_meals_update"
  on public.meal_attendance for update
  to authenticated
  using (public.get_user_role() = 'checkin')
  with check (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 5: Shower reservations policies
-- ============================================================================

create policy "admin_showers_all"
  on public.shower_reservations for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_showers_select"
  on public.shower_reservations for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_showers_all"
  on public.shower_reservations for all
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

create policy "checkin_showers_select"
  on public.shower_reservations for select
  to authenticated
  using (public.get_user_role() = 'checkin');

create policy "checkin_showers_insert"
  on public.shower_reservations for insert
  to authenticated
  with check (public.get_user_role() = 'checkin');

create policy "checkin_showers_update"
  on public.shower_reservations for update
  to authenticated
  using (public.get_user_role() = 'checkin')
  with check (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 6: Laundry bookings policies
-- ============================================================================

create policy "admin_laundry_all"
  on public.laundry_bookings for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_laundry_select"
  on public.laundry_bookings for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_laundry_all"
  on public.laundry_bookings for all
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

create policy "checkin_laundry_select"
  on public.laundry_bookings for select
  to authenticated
  using (public.get_user_role() = 'checkin');

create policy "checkin_laundry_insert"
  on public.laundry_bookings for insert
  to authenticated
  with check (public.get_user_role() = 'checkin');

create policy "checkin_laundry_update"
  on public.laundry_bookings for update
  to authenticated
  using (public.get_user_role() = 'checkin')
  with check (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 7: Bicycle repairs policies
-- ============================================================================

create policy "admin_bicycle_all"
  on public.bicycle_repairs for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_bicycle_select"
  on public.bicycle_repairs for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_bicycle_all"
  on public.bicycle_repairs for all
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

create policy "checkin_bicycle_select"
  on public.bicycle_repairs for select
  to authenticated
  using (public.get_user_role() = 'checkin');

create policy "checkin_bicycle_insert"
  on public.bicycle_repairs for insert
  to authenticated
  with check (public.get_user_role() = 'checkin');

create policy "checkin_bicycle_update"
  on public.bicycle_repairs for update
  to authenticated
  using (public.get_user_role() = 'checkin')
  with check (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 8: Holiday visits policies
-- ============================================================================

create policy "admin_holiday_all"
  on public.holiday_visits for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_holiday_select"
  on public.holiday_visits for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_holiday_all"
  on public.holiday_visits for all
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

create policy "checkin_holiday_select"
  on public.holiday_visits for select
  to authenticated
  using (public.get_user_role() = 'checkin');

create policy "checkin_holiday_insert"
  on public.holiday_visits for insert
  to authenticated
  with check (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 9: Haircut visits policies
-- ============================================================================

create policy "admin_haircut_all"
  on public.haircut_visits for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_haircut_select"
  on public.haircut_visits for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_haircut_all"
  on public.haircut_visits for all
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

create policy "checkin_haircut_select"
  on public.haircut_visits for select
  to authenticated
  using (public.get_user_role() = 'checkin');

create policy "checkin_haircut_insert"
  on public.haircut_visits for insert
  to authenticated
  with check (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 10: Items distributed policies
-- ============================================================================

create policy "admin_items_all"
  on public.items_distributed for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_items_select"
  on public.items_distributed for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_items_all"
  on public.items_distributed for all
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

create policy "checkin_items_select"
  on public.items_distributed for select
  to authenticated
  using (public.get_user_role() = 'checkin');

create policy "checkin_items_insert"
  on public.items_distributed for insert
  to authenticated
  with check (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 11: Donations policies
-- ============================================================================

create policy "admin_donations_all"
  on public.donations for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_donations_select"
  on public.donations for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_donations_all"
  on public.donations for all
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

create policy "checkin_donations_select"
  on public.donations for select
  to authenticated
  using (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 12: La Plaza donations policies
-- ============================================================================

create policy "admin_la_plaza_all"
  on public.la_plaza_donations for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_la_plaza_select"
  on public.la_plaza_donations for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_la_plaza_all"
  on public.la_plaza_donations for all
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

create policy "checkin_la_plaza_select"
  on public.la_plaza_donations for select
  to authenticated
  using (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 13: App settings policies (admin only for writes)
-- ============================================================================

create policy "admin_settings_all"
  on public.app_settings for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_settings_select"
  on public.app_settings for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_settings_select"
  on public.app_settings for select
  to authenticated
  using (public.get_user_role() = 'staff');

create policy "checkin_settings_select"
  on public.app_settings for select
  to authenticated
  using (public.get_user_role() = 'checkin');

-- ============================================================================
-- STEP 14: Service waivers policies
-- ============================================================================

create policy "admin_waivers_all"
  on public.service_waivers for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "board_waivers_select"
  on public.service_waivers for select
  to authenticated
  using (public.get_user_role() = 'board');

create policy "staff_waivers_all"
  on public.service_waivers for all
  to authenticated
  using (public.get_user_role() = 'staff')
  with check (public.get_user_role() = 'staff');

create policy "checkin_waivers_select"
  on public.service_waivers for select
  to authenticated
  using (public.get_user_role() = 'checkin');

create policy "checkin_waivers_insert"
  on public.service_waivers for insert
  to authenticated
  with check (public.get_user_role() = 'checkin');

-- ============================================================================
-- SUMMARY OF PERMISSIONS BY ROLE:
-- ============================================================================
-- 
-- ADMIN:   Full CRUD on all tables
-- BOARD:   Read-only on all tables  
-- STAFF:   Full CRUD on most tables (no delete on guests/meals)
-- CHECKIN: Read + Insert + Update on attendance tables, Read-only on others
--
-- To create users with roles, use Supabase dashboard or SQL:
-- 
-- INSERT INTO auth.users (email, encrypted_password, ...)
-- VALUES ('admin@hopes-corner.org', crypt('password', gen_salt('bf')), ...);
-- 
-- UPDATE auth.users 
-- SET raw_user_meta_data = '{"role": "admin"}'
-- WHERE email = 'admin@hopes-corner.org';
-- ============================================================================
