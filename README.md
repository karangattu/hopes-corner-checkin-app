# Hope's Corner Guest Check‑In App

An app to manage guest check‑ins, services (meals, showers, laundry), donations, and admin reporting.

## Features

- **Guests**: Search, add, CSV import, housing statuses, demographics
- **Services**: Meals tracking, showers booking, laundry scheduling
- **Donations**: Record, consolidate, export
- **Admin Dashboard**: Charts, metrics, exports
- **Progressive Web App**: Install on smartphones and tablets for native app-like experience with offline support

## Getting Started

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build

# Tests
npm run test -- --watch

# Lint
npm run lint

# Deploy to Firebase
npm run firebase:deploy
```

## Continuous Integration

This repository includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that installs dependencies, runs the ESLint suite, and executes the Vitest unit tests on every push to `main` and on every pull request. No additional configuration is required—push your branch or open a PR and the checks will run automatically.

## Deploying to your own Firebase project

1. **Create a Firebase project**: In the [Firebase console](https://console.firebase.google.com/), create a new project and enable Firestore and Authentication (Email/Password) services if you plan to use them.
2. **Configure environment variables**: Duplicate the provided `.env.example` (or create a new `.env.local`) and populate the following keys with values from your Firebase project settings:

   ```bash
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   VITE_FIREBASE_MEASUREMENT_ID=
   ```

   Restart `npm run dev` after changing environment variables.

3. **Connect the Firebase CLI**:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add <your-project-id>
   ```

   This updates `.firebaserc` to point at your project.

4. **Deploy**: Build and deploy using the provided script.

   ```bash
   npm run firebase:deploy
   ```

### 🔒 Proxy Mode (Recommended for Production)

Supabase credentials are stored securely in Firebase Functions and never exposed to the client.

**Requirements:**

- Firebase Blaze plan (for Cloud Functions with outbound network requests)
- Firebase Functions deployed

**Setup:**

1. **Create a Supabase project**: In the [Supabase dashboard](https://app.supabase.com/), create a new project and note your project URL and anon API key from _Project settings → API_.

2. **Provision the tables**: See [Supabase schema documentation](./docs/supabase/schema.sql) or create these tables:
   - `guests`, `meal_attendance`, `shower_reservations`, `laundry_bookings`, `bicycle_repairs`
   - `holiday_visits`, `haircut_visits`, `items_distributed`, `donations`, `app_settings`

3. **Store credentials in Firebase secrets**:

   ```bash
   firebase functions:secrets:set SUPABASE_URL
   firebase functions:secrets:set SUPABASE_ANON_KEY
   ```

4. **Deploy Firebase Functions**:

   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```

5. **Enable proxy mode** in `.env.local`:
   ```bash
   VITE_USE_SUPABASE_PROXY=true
   ```

## Installing as a Mobile App (PWA)

This app can be installed on smartphones and tablets as a Progressive Web App (PWA). Once deployed to Firebase:

- **Android/Chrome**: Visit the app URL → tap the "Install" banner or menu (⋮) → "Add to Home screen"
- **iOS/Safari**: Visit the app URL → tap Share (□↑) → "Add to Home Screen"
- **Desktop**: Visit the app URL → click the install icon in the address bar

## Migrating to a New Supabase Account

If you need to migrate your data from an existing Supabase project to a new one, follow these steps:

### Prerequisites

- Access to your **old** Supabase project (Project URL and service role key)
- Access to your **new** Supabase project (Project URL and anon/service role key)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (optional but recommended)
- PostgreSQL client tools (`psql`, `pg_dump`) installed

### Step 1: Export Data from Old Supabase Project

#### Option A: Using Supabase Dashboard (Small datasets)

1. Go to your **old** Supabase project → **Table Editor**
2. For each table, click the table name → **Export** → **Download as CSV**
3. Repeat for all tables:
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
   - `guest_waivers`
   - `app_settings`

#### Option B: Using pg_dump (Recommended for larger datasets)

1. Get your old database connection string from Supabase Dashboard → **Settings** → **Database** → **Connection string** (URI format)

2. Export the schema and data:

   ```bash
   # Export schema only (optional, you'll use the new schema.sql)
   pg_dump "postgres://postgres:[PASSWORD]@db.[OLD-PROJECT-REF].supabase.co:5432/postgres" \
     --schema=public --schema-only > old_schema.sql

   # Export data only (recommended)
   pg_dump "postgres://postgres:[PASSWORD]@db.[OLD-PROJECT-REF].supabase.co:5432/postgres" \
     --schema=public --data-only --disable-triggers > old_data.sql
   ```

### Step 2: Set Up the New Supabase Project

1. **Create a new Supabase project** at [app.supabase.com](https://app.supabase.com/)

2. **Run the schema setup** in the new project's SQL Editor:
   - Go to **SQL Editor** → **New query**
   - Copy and paste the contents of [`docs/supabase/schema.sql`](./docs/supabase/schema.sql)
   - Click **Run** to create all tables, functions, triggers, and views

3. **Apply any pending migrations** from `docs/supabase/migrations/` in order (check filenames for sequence)

### Step 3: Import Data to New Supabase Project

#### Option A: Using CSV Import (Small datasets)

1. Go to your **new** Supabase project → **Table Editor**
2. For each table, click the table name → **Import data** → Select your CSV file
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
   11. `guest_waivers`
   12. `app_settings`

#### Option B: Using psql (Recommended for larger datasets)

1. Get your new database connection string from the new Supabase Dashboard

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

### Step 4: Update Firebase Secrets

Update the Supabase credentials stored in Firebase Functions:

```bash
# Set the new Supabase URL
firebase functions:secrets:set SUPABASE_URL
# Enter your new project URL: https://[NEW-PROJECT-REF].supabase.co

# Set the new Supabase anon key
firebase functions:secrets:set SUPABASE_ANON_KEY
# Enter your new anon key from Project Settings → API
```

### Step 5: Redeploy Firebase Functions

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

### Step 6: Verify the Migration

1. **Test the app**: Open your deployed app and verify:
   - Guests appear in search
   - Historical meal/shower/laundry records are visible
   - Donations and reports show correct data

2. **Check row counts** in the new Supabase Dashboard:

   ```sql
   SELECT 'guests' as table_name, count(*) FROM guests
   UNION ALL SELECT 'meal_attendance', count(*) FROM meal_attendance
   UNION ALL SELECT 'shower_reservations', count(*) FROM shower_reservations
   UNION ALL SELECT 'laundry_bookings', count(*) FROM laundry_bookings
   UNION ALL SELECT 'donations', count(*) FROM donations;
   ```

### Troubleshooting

| Issue                         | Solution                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Foreign key constraint errors | Import `guests` table first, or disable triggers during import                      |
| Enum type mismatches          | Ensure you ran the full `schema.sql` before importing data                          |
| Missing columns               | Check if migrations in `docs/supabase/migrations/` need to be applied               |
| UUID conflicts                | If IDs conflict, you may need to clear the new tables first                         |
| Connection refused            | Check that your IP is allowed in Supabase Dashboard → Settings → Database → Network |

### Rollback

If something goes wrong and you need to revert:

1. Update Firebase secrets back to the old Supabase credentials
2. Redeploy Firebase Functions
3. The app will resume using the old database
