# Hope's Corner Check-in App - Setup Guide

This guide walks you through setting up the Hope's Corner check-in application from scratch.

## Prerequisites

- Node.js 20+ installed
- npm or pnpm package manager
- Git
- A Supabase account (free tier works)
- A Vercel account (optional, for deployment)

## 1. Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Enter a project name (e.g., "hopes-corner")
4. Set a secure database password (save this!)
5. Select the region closest to your users
6. Click "Create new project"

### 1.2 Get Your API Keys

1. In your Supabase dashboard, go to **Settings > API**
2. Copy these values (you'll need them later):
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (for admin operations only)

### 1.3 Run the Schema SQL

1. In Supabase, go to **SQL Editor**
2. Create a new query
3. Copy the contents of `docs/supabase/schema.sql`
4. Paste into the SQL editor and click "Run"
5. Verify tables were created by checking **Table Editor**

### 1.4 Enable Row Level Security (RLS)

1. In SQL Editor, create another new query
2. Copy the contents of `docs/supabase/migrations/009_enable_rls.sql`
3. Paste and run to enable RLS policies

### 1.5 Create Auth Users

For each user who needs access:

1. Go to **Authentication > Users**
2. Click "Add user" > "Create new user"
3. Enter email and password
4. After creating, click on the user
5. In the **user_metadata** section, add their role:
   ```json
   {
     "role": "admin"
   }
   ```
   
   Valid roles are:
   - `admin` - Full access, can modify settings
   - `board` - Full access to data, read-only settings  
   - `staff` - Can manage guests and services
   - `checkin` - Can only check in guests and view data

## 2. Local Development Setup

### 2.1 Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/hopes-corner-checkin-app.git
cd hopes-corner-checkin-app/nextjs-app

# Install dependencies
npm install
```

### 2.2 Configure Environment Variables

Create a `.env.local` file from the example:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2.3 Run Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### 2.4 Run Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## 3. Production Deployment (Vercel)

### 3.1 Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New" > "Project"
3. Import your Git repository
4. Select the `nextjs-app` directory as the root

### 3.2 Configure Environment Variables

In Vercel project settings, add these environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

### 3.3 Deploy

Click "Deploy" and Vercel will build and deploy your app.

## 4. PWA Installation

The app works as a Progressive Web App (PWA):

### Desktop (Chrome)
1. Visit the deployed URL
2. Click the install icon in the address bar
3. Click "Install"

### Mobile (iOS)
1. Open Safari and visit the app URL
2. Tap the share button
3. Tap "Add to Home Screen"

### Mobile (Android)
1. Open Chrome and visit the app URL
2. Tap the menu (three dots)
3. Tap "Add to Home Screen"

## 5. Data Migration (Optional)

If migrating from Firebase:

1. Export your Firebase data as JSON
2. Use the `scripts/migrate-firebase.ts` script (if available)
3. Or manually import using Supabase's data import feature

## 6. Troubleshooting

### "Invalid API key" error
- Double-check your `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Make sure there are no extra spaces or quotes

### "User not found" after login
- Verify the user exists in Supabase Authentication
- Check that user_metadata has a valid role

### RLS policy errors
- Run the `009_enable_rls.sql` migration
- Verify the user's role in user_metadata matches one of: admin, board, staff, checkin

### Build fails on Vercel
- Check the build logs for specific errors
- Ensure all environment variables are set
- Verify Node.js version is 20+

## 7. User Role Permissions

| Feature | Admin | Board | Staff | Check-in |
|---------|-------|-------|-------|----------|
| Check in guests | ✅ | ✅ | ✅ | ✅ |
| View services | ✅ | ✅ | ✅ | ✅ |
| Add/edit guests | ✅ | ✅ | ✅ | ✅ (add only) |
| Delete records | ✅ | ✅ | ✅ | ❌ |
| View admin panel | ✅ | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | ❌ | ❌ |
| Modify settings | ✅ | ❌ | ❌ | ❌ |

## 8. Support

For issues or questions:
1. Check the [GitHub Issues](https://github.com/your-org/hopes-corner-checkin-app/issues)
2. Create a new issue with details about your problem
3. Include any error messages and steps to reproduce
