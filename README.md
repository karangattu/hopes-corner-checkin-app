# Hope's Corner Guest Check‑In App

An app to manage guest check‑ins, services (meals, showers, laundry), donations, and admin reporting.

## Features

- **Guests**: Search, add, CSV import, housing statuses, demographics
- **Services**: Meals tracking, showers booking, laundry scheduling
- **Donations**: Record, consolidate, export
- **Admin Dashboard**: Charts, metrics, exports

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

## Using Supabase for cloud sync

The app automatically syncs to Supabase when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present. Otherwise it falls back to local storage.

1. **Create a Supabase project**: In the [Supabase dashboard](https://app.supabase.com/), create a new project (any region works) and note your project URL and anon API key from _Project settings → API_.
2. **Provision the tables**: In the SQL editor or Table Editor, create the following tables with `uuid` primary keys (`default uuid_generate_v4()`) and UTC timestamp columns (`created_at`, `updated_at` where applicable):
   - `guests` → guest profile fields (`external_id`, `first_name`, `last_name`, `full_name`, `preferred_name`, `housing_status`, `age_group`, `gender`, `location`, `notes`, `bicycle_description`).
   - `meal_attendance` → meal logs (`guest_id` FK, `quantity`, `meal_type`, `recorded_at`, `served_on`, `created_at`).
   - `shower_reservations` → shower bookings (`guest_id`, `scheduled_time`, `scheduled_for`, `status`, `created_at`, `updated_at`).
   - `laundry_bookings` → laundry bookings (`guest_id`, `slot_label`, `laundry_type`, `bag_number`, `scheduled_for`, `status`, `updated_at`).
   - `bicycle_repairs` → bicycle queue (`guest_id`, `requested_at`, `repair_type`, `notes`, `status`, `priority`, `completed_at`, `updated_at`).
   - `holiday_visits`, `haircut_visits`, `items_distributed` → one row per service delivered (`guest_id`, service-specific timestamp columns).
   - `donations` → donation intake (`donation_type`, `item_name`, `trays`, `weight_lbs`, `donor`, `donated_at`, `created_at`).
   - `app_settings` → single row with `id = 'global'` storing JSON `targets` plus site preferences (`site_name`, `max_onsite_laundry_slots`, `enable_offsite_laundry`, `ui_density`, `show_charts`, `default_report_days`, `donation_autofill`, `default_donation_type`).
3. **Set environment variables**: Add the Supabase URL and anon key to your `.env.local` (or deployment environment):

   ```bash
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Restart the app**: Restart `npm run dev` (or rebuild for production) so Vite picks up the new variables. The admin dashboard will reflect cloud-only actions (like clearing Supabase data) once the credentials are detected.

   The command runs `vite build` and then calls `firebase deploy` with the configuration in `firebase.json` and `firestore.rules`.

## Changelog

### 0.0.1 · 2025-09-28

- Surfaced booked shower slot times and fresh laundry activity in the Services dashboard.
- Ensured donation logs honor the selected date, showing every recorded item before export.
