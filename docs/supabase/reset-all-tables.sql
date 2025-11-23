-- Reset all tables except app_settings
-- This script truncates all data while preserving table structure and triggers
-- Run this in the Supabase SQL Editor with caution

-- Disable foreign key constraints temporarily
ALTER TABLE public.meal_attendance DISABLE TRIGGER ALL;
ALTER TABLE public.shower_reservations DISABLE TRIGGER ALL;
ALTER TABLE public.laundry_bookings DISABLE TRIGGER ALL;
ALTER TABLE public.bicycle_repairs DISABLE TRIGGER ALL;
ALTER TABLE public.holiday_visits DISABLE TRIGGER ALL;
ALTER TABLE public.haircut_visits DISABLE TRIGGER ALL;
ALTER TABLE public.items_distributed DISABLE TRIGGER ALL;
ALTER TABLE public.donations DISABLE TRIGGER ALL;
ALTER TABLE public.service_waivers DISABLE TRIGGER ALL;
ALTER TABLE public.sync_state DISABLE TRIGGER ALL;
ALTER TABLE public.guests DISABLE TRIGGER ALL;

-- Truncate all tables (cascade handles dependent tables)
TRUNCATE TABLE public.meal_attendance CASCADE;
TRUNCATE TABLE public.shower_reservations CASCADE;
TRUNCATE TABLE public.laundry_bookings CASCADE;
TRUNCATE TABLE public.bicycle_repairs CASCADE;
TRUNCATE TABLE public.holiday_visits CASCADE;
TRUNCATE TABLE public.haircut_visits CASCADE;
TRUNCATE TABLE public.items_distributed CASCADE;
TRUNCATE TABLE public.donations CASCADE;
TRUNCATE TABLE public.service_waivers CASCADE;
TRUNCATE TABLE public.sync_state CASCADE;
TRUNCATE TABLE public.guests CASCADE;

-- Re-enable triggers
ALTER TABLE public.guests ENABLE TRIGGER ALL;
ALTER TABLE public.sync_state ENABLE TRIGGER ALL;
ALTER TABLE public.service_waivers ENABLE TRIGGER ALL;
ALTER TABLE public.donations ENABLE TRIGGER ALL;
ALTER TABLE public.items_distributed ENABLE TRIGGER ALL;
ALTER TABLE public.haircut_visits ENABLE TRIGGER ALL;
ALTER TABLE public.holiday_visits ENABLE TRIGGER ALL;
ALTER TABLE public.bicycle_repairs ENABLE TRIGGER ALL;
ALTER TABLE public.laundry_bookings ENABLE TRIGGER ALL;
ALTER TABLE public.shower_reservations ENABLE TRIGGER ALL;
ALTER TABLE public.meal_attendance ENABLE TRIGGER ALL;

-- Verify reset
SELECT 'Guests' as table_name, COUNT(*) as row_count FROM public.guests
UNION ALL
SELECT 'Meal Attendance', COUNT(*) FROM public.meal_attendance
UNION ALL
SELECT 'Shower Reservations', COUNT(*) FROM public.shower_reservations
UNION ALL
SELECT 'Laundry Bookings', COUNT(*) FROM public.laundry_bookings
UNION ALL
SELECT 'Bicycle Repairs', COUNT(*) FROM public.bicycle_repairs
UNION ALL
SELECT 'Holiday Visits', COUNT(*) FROM public.holiday_visits
UNION ALL
SELECT 'Haircut Visits', COUNT(*) FROM public.haircut_visits
UNION ALL
SELECT 'Items Distributed', COUNT(*) FROM public.items_distributed
UNION ALL
SELECT 'Donations', COUNT(*) FROM public.donations
UNION ALL
SELECT 'Service Waivers', COUNT(*) FROM public.service_waivers
UNION ALL
SELECT 'Sync State', COUNT(*) FROM public.sync_state
UNION ALL
SELECT 'App Settings', COUNT(*) FROM public.app_settings
ORDER BY table_name;
