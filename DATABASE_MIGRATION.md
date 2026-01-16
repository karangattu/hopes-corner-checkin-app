# Database Migration Guide

This guide covers migrating your Hope's Corner app data from one Supabase project to another.

## Prerequisites

- Access to old Supabase project (Project URL and service role key)
- Access to new Supabase project (Project URL and anon/service role key)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (optional)
- PostgreSQL client tools (`psql`, `pg_dump`) installed

## Step 1: Export Data from Old Project

### Option A: Using Supabase Dashboard (Small datasets)

1. Go to old Supabase project → **Table Editor**
2. For each table, click table name → **Export** → **Download as CSV**
3. Export all tables:
   - `guests`
   - `meal_attendance`
   - `shower_reservations`
   - `laundry_bookings`
   - `bicycle_repairs`
   - `holiday_visits`
   - `haircut_visits`
   - `items_distributed`
   - `donations`
   - `la_plaza_donations`
   - `service_waivers`
   - `guest_proxies`
   - `guest_warnings`
   - `blocked_slots`
   - `sync_state`
   - `app_settings`

### Option B: Using pg_dump (Recommended for larger datasets)

1. Get connection string from Supabase Dashboard → **Settings** → **Database** → **Connection string** (URI format)

2. Export schema and data:

   ```bash
   # Export schema only
   pg_dump "postgres://postgres:[PASSWORD]@db.[OLD-PROJECT-REF].supabase.co:5432/postgres" \
     --schema=public --schema-only > old_schema.sql

   # Export data only
   pg_dump "postgres://postgres:[PASSWORD]@db.[OLD-PROJECT-REF].supabase.co:5432/postgres" \
     --schema=public --data-only --disable-triggers > old_data.sql
   ```

## Step 2: Set Up New Supabase Project

1. **Create new Supabase project** at [app.supabase.com](https://app.supabase.com/)

2. **Run schema setup** in new project's SQL Editor:
   - Go to **SQL Editor** → **New query**
   - Copy and paste contents of [`docs/supabase/schema.sql`](./docs/supabase/schema.sql)
   - Click **Run** to create all tables, functions, triggers, and views

3. **Apply migrations** from `docs/supabase/migrations/` in order (check filenames for sequence)

## Step 3: Import Data to New Project

### Option A: Using CSV Import (Small datasets)

1. Go to new Supabase project → **Table Editor**
2. For each table: click table name → **Import data** → Select CSV file

3. **Important**: Import tables in this order to respect foreign key constraints:
   1. `guests` (first, as other tables reference it)
   2. `meal_attendance`
   3. `shower_reservations`
   4. `laundry_bookings`
   5. `bicycle_repairs`
   6. `holiday_visits`
   7. `haircut_visits`
   8. `items_distributed`
   9. `donations`
   10. `la_plaza_donations`
   11. `service_waivers`
   12. `app_settings`

### Option B: Using psql (Recommended for larger datasets)

1. Get new database connection string from new Supabase Dashboard

2. Import the data:

   ```bash
   psql "postgres://postgres:[PASSWORD]@db.[NEW-PROJECT-REF].supabase.co:5432/postgres" \
     -f old_data.sql
   ```

3. If you encounter foreign key errors, temporarily disable triggers:

   ```bash
   psql "postgres://postgres:[PASSWORD]@db.[NEW-PROJECT-REF].supabase.co:5432/postgres" \
     -c "SET session_replication_role = 'replica';" \
     -f old_data.sql \
     -c "SET session_replication_role = 'origin';"
   ```

## Step 4: Update Firebase Secrets

Update Supabase credentials in Firebase Functions:

```bash
# Set new Supabase URL
firebase functions:secrets:set SUPABASE_URL
# Enter: https://[NEW-PROJECT-REF].supabase.co

# Set new Supabase anon key
firebase functions:secrets:set SUPABASE_ANON_KEY
# Enter new anon key from Project Settings → API
```

## Step 5: Redeploy Firebase Functions

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

## Step 6: Verify Migration

1. **Test the app**: Open deployed app and verify:
   - Guests appear in search
   - Historical meal/shower/laundry records are visible
   - Donations and reports show correct data

2. **Check row counts** in new Supabase Dashboard:

   ```sql
   SELECT 'guests' as table_name, count(*) FROM guests
   UNION ALL SELECT 'meal_attendance', count(*) FROM meal_attendance
   UNION ALL SELECT 'shower_reservations', count(*) FROM shower_reservations
   UNION ALL SELECT 'laundry_bookings', count(*) FROM laundry_bookings
   UNION ALL SELECT 'donations', count(*) FROM donations;
   ```

## Troubleshooting

| Issue                         | Solution                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Foreign key constraint errors | Import `guests` table first, or disable triggers during import                      |
| Enum type mismatches          | Ensure you ran the full `schema.sql` before importing data                          |
| Missing columns               | Check if migrations in `docs/supabase/migrations/` need to be applied               |
| UUID conflicts                | If IDs conflict, you may need to clear the new tables first                         |
| Connection refused            | Check that your IP is allowed in Supabase Dashboard → Settings → Database → Network |

## Rollback

If something goes wrong and you need to revert:

1. Update Firebase secrets back to old Supabase credentials
2. Redeploy Firebase Functions
3. The app will resume using the old database
