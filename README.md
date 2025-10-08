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
