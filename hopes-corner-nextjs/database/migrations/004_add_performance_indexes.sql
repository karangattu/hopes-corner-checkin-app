-- Migration: Add performance indexes for large datasets (100k+ records)
-- Run this on existing databases to improve query performance

-- Indexes for guests table
create index if not exists guests_created_at_idx
  on public.guests (created_at desc);

create index if not exists guests_full_name_idx
  on public.guests (full_name);

create index if not exists guests_external_id_idx
  on public.guests (external_id);

-- Indexes for meal_attendance table
create index if not exists meal_attendance_served_on_idx
  on public.meal_attendance (served_on desc);

create index if not exists meal_attendance_guest_id_idx
  on public.meal_attendance (guest_id);

create index if not exists meal_attendance_created_at_idx
  on public.meal_attendance (created_at desc);

-- Indexes for shower_reservations table
create index if not exists shower_scheduled_for_idx
  on public.shower_reservations (scheduled_for desc);

create index if not exists shower_created_at_idx
  on public.shower_reservations (created_at desc);

create index if not exists shower_guest_id_idx
  on public.shower_reservations (guest_id);

-- Indexes for laundry_bookings table
create index if not exists laundry_scheduled_for_idx
  on public.laundry_bookings (scheduled_for desc);

create index if not exists laundry_created_at_idx
  on public.laundry_bookings (created_at desc);

create index if not exists laundry_guest_id_idx
  on public.laundry_bookings (guest_id);

-- Indexes for bicycle_repairs table
create index if not exists bicycle_requested_at_idx
  on public.bicycle_repairs (requested_at desc);

create index if not exists bicycle_guest_id_idx
  on public.bicycle_repairs (guest_id);

create index if not exists bicycle_status_idx
  on public.bicycle_repairs (status);

-- Indexes for haircut_visits table
create index if not exists haircut_served_at_idx
  on public.haircut_visits (served_at desc);

create index if not exists haircut_created_at_idx
  on public.haircut_visits (created_at desc);

create index if not exists haircut_guest_id_idx
  on public.haircut_visits (guest_id);

-- Indexes for holiday_visits table
create index if not exists holiday_served_at_idx
  on public.holiday_visits (served_at desc);

create index if not exists holiday_created_at_idx
  on public.holiday_visits (created_at desc);

create index if not exists holiday_guest_id_idx
  on public.holiday_visits (guest_id);
