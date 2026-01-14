# Database Schema & Migrations

This folder contains the complete Supabase database schema and migrations for Hope's Corner Check-In System.

## Files

### `schema.sql`
The complete database schema file. Run this on a fresh Supabase project to set up all tables, triggers, functions, views, and RLS policies.

### `migrations/`
Incremental migration files in chronological order. These should be applied after the initial schema if you're updating an existing database.

| Migration | Description |
|-----------|-------------|
| `001_add_date_key_columns.sql` | Adds date_key columns for efficient date-based queries |
| `002_fix_date_key_triggers.sql` | Fixes date_key trigger functions |
| `003_add_service_waivers.sql` | Adds waiver tracking for showers/laundry |
| `004_add_performance_indexes.sql` | Performance indexes for large tables |
| `005_sync_donation_type_enum.sql` | Syncs donation type enum values |
| `006_add_bicycle_waiver.sql` | Adds waiver support for bicycle repairs |
| `007_sync_meal_type_enum.sql` | Syncs meal type enum values |
| `008_guest_proxies.sql` | Guest proxy/linked accounts feature |
| `009_blocked_slots.sql` | Blocked slot management for services |
| `010_program_specific_bans.sql` | Program-specific ban support |
| `011_add_guest_warnings.sql` | Guest warning system |
| `012_program_specific_ban_guard.sql` | Ban guard triggers for program-specific bans |
| `013_fix_waiver_yearly_reset.sql` | Fixes waiver yearly reset logic |
| `014_meal_proxy_tracking.sql` | Tracks who picked up meals (proxy tracking) |
| `015_add_rls_policies.sql` | Adds Row Level Security policies to all tables |
| `016_create_haircut_and_holiday_tables.sql` | Creates haircut_visits and holiday_visits tables with RLS |
| `017_add_deduplication_key.sql` | Adds deduplication_key to meal_attendance for preventing duplicate auto entries |
| `018_create_items_distributed.sql` | Creates items_distributed table for tracking amenities (t-shirts, tents, etc.) |
| `019_create_blocked_slots.sql` | Creates blocked_slots table for managing service availability |
| `020_add_waitlisted_enum.sql` | Adds waitlisted, pending, transported, returned, offsite_picked_up to laundry_status_enum |

## Setup Instructions

### New Project
```sql
-- Run schema.sql in Supabase SQL Editor
-- This creates all tables, triggers, functions, and policies
```

### Existing Project
Apply migrations in order:
```sql
-- Run each migration file in sequence
-- 001, 002, 003, etc.
```

## Tables

| Table | Purpose |
|-------|---------|
| `guests` | Guest roster with demographics and ban status |
| `meal_attendance` | Meal service records |
| `shower_reservations` | Shower booking slots |
| `laundry_bookings` | Laundry service records |
| `bicycle_repairs` | Bicycle repair queue |
| `donations` | Donation tracking |
| `la_plaza_donations` | La Plaza Market partner donations |
| `service_waivers` | Yearly waiver acknowledgments |
| `app_settings` | App configuration (single row) |
| `holiday_visits` | Holiday meal records |
| `haircut_visits` | Haircut service records |
| `items_distributed` | Items given to guests |
| `sync_state` | Sync metadata for data replication |
