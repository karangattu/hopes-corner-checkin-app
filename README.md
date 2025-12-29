# Hope's Corner Guest Check‑In App

An app to manage guest check‑ins, services (meals, showers, laundry), donations, and admin reporting.

## 🎯 What This App Does

- **Guest Management**: Search, add, and import guests for service metrics
- **Service Tracking**: Track meals, book showers, schedule laundry
- **Donation Management**: Record, consolidate, and export donations
- **Admin Analytics**: Generate charts, metrics, and reports

## 🚀 Quick Start

### Run the App Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test -- --watch

# Check code quality
npm run lint

# Deploy to Firebase
firebase deploy
```

## 🔧 Production Setup

### 1. Create Firebase Project

1. Go to [Firebase console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore and Authentication (Email/Password)

### 2. Configure Environment

1. Copy `.env.example` to `.env.local`
2. Add your Firebase project values:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

3. Restart `npm run dev`

### 3. Set Up Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use --add <your-project-id>
```

### 4. Deploy

```bash
npm run firebase:deploy
```

## 🔒 Supabase Database Setup (Recommended for Production)

For production use, we recommend using Supabase as the database backend.

### Requirements

- Firebase Blaze plan
- Supabase project

### Quick Setup

1. **Create Supabase project** at [app.supabase.com](https://app.supabase.com/)
2. **Set up database schema**:
   - Go to Supabase SQL Editor
   - Copy and paste contents of [`docs/supabase/schema.sql`](./docs/supabase/schema.sql)
   - Run the script to create all tables
3. **Store credentials in Firebase**:
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

### Database Tables Used

The app works with these Supabase tables:
- `guests`, `meal_attendance`, `shower_reservations`, `laundry_bookings`
- `bicycle_repairs`, `holiday_visits`, `haircut_visits`, `items_distributed`
- `donations`, `la_plaza_donations`, `service_waivers`, `guest_proxies`
- `guest_warnings`, `blocked_slots`, `sync_state`, `app_settings`

## 🔄 Migrating to New Supabase Project

If you need to move your data to a new Supabase account, see [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md) for detailed instructions.

## 📖 More Information

- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Database Migration**: See [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md)
- **App Knowledge Base**: [deepwiki.com link](https://deepwiki.com/karangattu/hopes-corner-checkin-app/)
