# Migration Plan: Firebase → Next.js + Supabase

## Current Architecture Summary

**Tech Stack:**

- Frontend: React 19 + Vite + TailwindCSS + PWA
- Backend: Firebase Cloud Functions (TypeScript, Node 20)
- Database: Supabase PostgreSQL (via Firebase Functions proxy)
- Auth: Firebase Authentication
- Hosting: Firebase Hosting
- State: Zustand stores with IndexedDB persistence

**Key Dependencies:**

- Firebase Authentication for user management
- Firebase Functions as secure proxy to Supabase
- Firebase Hosting for deployment
- Complex offline-first architecture with service workers

## Migration Goal

Simplify the stack to **Next.js + Supabase only** for easier setup and maintenance:

- Replace Firebase Auth → Supabase Auth
- Replace Firebase Functions proxy → Direct Supabase client or Next.js API routes
- Replace Firebase Hosting → Vercel/self-hosted Next.js
- Maintain offline capabilities and PWA features
- Preserve all existing functionality

## Migration Overview

**Current Stack:**

- Frontend: React 19 + Vite 7 + Tailwind CSS
- Backend: Firebase Cloud Functions (Node 20, TypeScript) - Supabase proxy only
- Database: Supabase PostgreSQL (13 tables, 100k+ guests)
- Auth: Firebase Authentication with custom role claims
- Hosting: Firebase Hosting
- State: Zustand stores (modern) + legacy AppContext (being phased out)
- Offline: Service worker + IndexedDB + background sync
- PWA: Full PWA with mobile installation

**Target Stack:**

- Frontend: Next.js 15 (App Router) + Tailwind CSS
- Backend: Next.js API Routes (minimal) OR direct Supabase client
- Database: Supabase PostgreSQL (same schema)
- Auth: Supabase Auth with user metadata for roles
- Hosting: Vercel (recommended) or self-hosted
- State: Keep Zustand stores (no changes needed)
- Offline: Keep service worker + IndexedDB (next-pwa)
- PWA: Maintain PWA capabilities

**Timeline:** 4-6 weeks
**Risk Level:** Medium
**Estimated Cost Savings:** Eliminate Firebase Blaze plan (~$25-50/month)

---

## Key Decisions & Recommendations

### 1. Next.js App Router (Not Pages Router)

**Rationale:**

- Already using React 19 - full compatibility
- Server Components reduce client bundle size
- Better middleware for authentication
- Streaming and suspense support
- Future-proof architecture
- Simpler data fetching patterns

### 2. Direct Supabase Client + Row Level Security (Not API Routes)

**Current:** Firebase Functions proxy all Supabase requests
**New:** Direct client → Supabase with RLS policies

**Benefits:**

- Eliminates middle layer (faster)
- No serverless function overhead
- Simpler architecture
- RLS provides same security as whitelist
- Lower costs (no Cloud Functions)

**When to use Next.js API routes:**

- Large CSV exports (server-side processing)
- Complex aggregations for reports
- Background jobs (if needed)

### 3. Keep Zustand State Management

**No migration needed!** Your Zustand stores are well-architected:

- Modern patterns (Immer, persist, devtools)
- Zundo for undo/redo
- Just move files and add TypeScript

### 4. Keep Offline-First Architecture

**Using next-pwa package:**

- Same IndexedDB persistence
- Same offline queue manager
- Same service worker patterns
- Just update routes for Next.js

### 5. Vercel Hosting

**Why Vercel:**

- Built by Next.js creators
- Zero-config deployment
- Free for non-profits/hobby
- Preview deployments for PRs
- Automatic HTTPS and edge caching
- Easy environment variables

---

## Critical Migration Tasks

### Phase 1: Setup & Authentication (Week 1) ✅ COMPLETED

#### 1.1 Create New Branch and Next.js Project ✅

```bash
# Create new branch
git checkout -b feature/nextjs-migration

# Create Next.js project in new directory
npx create-next-app@latest nextjs-app \
  --typescript --tailwind --app --src-dir

cd nextjs-app

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install zustand immer zundo
npm install next-pwa
npm install recharts lucide-react react-hot-toast react-window
npm install -D @types/react-window
```

#### 1.2 Setup Fresh Supabase Database ✅

```bash
# Apply schema to new Supabase project
# Run schema.sql in Supabase SQL Editor

# Create 4 test users (via Supabase dashboard or SQL)
# admin@hopes-corner.org (role: admin)
# board@hopes-corner.org (role: board)
# staff@hopes-corner.org (role: staff)
# checkin@hopes-corner.org (role: checkin)
```

#### 1.3 Setup Supabase Authentication ✅

**Files created:**

- ✅ `lib/supabase/client.ts` - Browser client
- ✅ `lib/supabase/server.ts` - Server client with cookies
- ✅ `lib/supabase/roles.ts` - Role definitions and permissions
- ✅ `middleware.ts` - Route protection + role checks (4 roles)
- ✅ `app/(auth)/login/page.tsx` - Login page

**User metadata structure:**

```typescript
{
  email: "admin@hopes-corner.org",
  user_metadata: { role: "admin" }
}
```

#### 1.4 Implement Role-Based RLS Policies ✅

**Created:** `docs/supabase/migrations/009_enable_rls.sql`

```sql
-- Enable RLS on all tables
alter table guests enable row level security;
-- ... (all 13 tables)

-- Role-based policies
-- Admin: Full access
create policy "Admins have full access to guests"
  on guests for all
  to authenticated
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Board: Read-only access
create policy "Board can view guests"
  on guests for select
  to authenticated
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'board'
  );

-- Staff: CRUD except delete
create policy "Staff can modify guests"
  on guests for insert, update
  to authenticated
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'checkin')
  );

-- Checkin: Limited access (insert, update)
-- Similar pattern for all 13 tables
```

#### 1.5 Deploy Hello World to Vercel ⏳ PENDING

```bash
# Connect GitHub repo to Vercel
vercel login
vercel link

# Configure environment variables in Vercel
# Deploy
vercel --prod
```

**Deliverable:** Login works, 4 test users, role-based access enforced, deployed to Vercel

---

### Phase 2: Core Guest Management (Week 2-3) ✅ COMPLETED

#### 2.1 Migrate Zustand Stores ✅

**Files created:**

- ✅ `lib/stores/useGuestsStore.ts`
- ✅ `lib/stores/useMealsStore.ts`
- ✅ `lib/stores/useServicesStore.ts`
- ✅ `lib/stores/useDonationsStore.ts`
- ✅ `lib/stores/useSettingsStore.ts`
- ✅ `lib/stores/index.ts` (re-exports)

#### 2.2 Migrate Guest Components ⏳ IN PROGRESS

**Add `'use client'` directive + update imports**

**Critical components to migrate:**

- ⏳ `components/guest/GuestList.tsx` (180KB, virtual scrolling)
- ⏳ `components/guest/GuestForm.tsx`
- ⏳ `components/guest/GuestCard.tsx`

**Page created:**

- ✅ `app/(protected)/check-in/page.tsx`

#### 2.3 Setup Row Level Security (RLS) ✅

**RLS enabled via:** `docs/supabase/migrations/009_enable_rls.sql`

```sql
-- Enable RLS on all 14 tables including new guest_proxies
alter table guests enable row level security;
alter table meal_attendance enable row level security;
-- ... (repeat for all tables)

-- Create policies for 4 roles (admin, board, staff, checkin)
```

#### 2.4 Test Check-In Functionality

- Search guests (virtual scrolling works with small dataset initially)
- Add/edit/delete guests
- CSV import (batch operations)
- Test with different roles (admin can delete, staff cannot)
- Offline queue

**Deliverable:** Full guest management works with direct Supabase connection, RLS enforced

---

### Phase 3: Services & Admin (Week 3-4)

#### 3.1 Migrate Service Components

**Files to migrate:**

- `components/services/ShowerBooking.tsx`
- `components/services/LaundryBooking.tsx`
- `components/services/BicycleRepairBooking.tsx`
- `components/services/LaundryKanban.tsx`

**Create page:**

- `app/(protected)/services/page.tsx`

#### 3.2 Migrate Admin page

**Files to migrate:**

- `components/admin/Dashboard.tsx`
- `components/admin/OverviewDashboard.tsx`
- `components/admin/MealReport.tsx`
- `components/admin/Analytics.tsx`
- `components/charts/*` (17 chart components - add `'use client'`)

**Create page:**

- `app/(protected)/admin/page.tsx`

#### 3.3 Migrate Donations

**Files:**

- `components/donations/DonationsTracker.tsx`
- `components/donations/LaPlazaDonations.tsx`

#### 3.4 Handle CSV Exports

**Option A:** Client-side (keep current implementation)
**Option B:** Server-side API route for large exports

```typescript
// app/api/export/guests/route.ts (optional)
export async function GET(request: Request) {
  const supabase = createClient();
  // Server-side CSV generation
  // Stream large datasets
}
```

**Deliverable:** All features functional, reports work, exports generate

---

### Phase 4: Offline & PWA (Week 4-5)

#### 4.1 Migrate Offline Utilities

**Just move files + add TypeScript:**

```bash
src/utils/offlineQueueManager.js → lib/utils/offlineQueueManager.ts
src/utils/indexedDB.js → lib/utils/indexedDB.ts
src/context/SyncContext.jsx → components/providers/SyncProvider.tsx
```

**No logic changes needed!**

#### 4.2 Configure next-pwa

```javascript
// next.config.js
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  customWorkerDir: "worker",
});

module.exports = withPWA({
  reactStrictMode: true,
});
```

#### 4.3 Update Service Worker

**Update for Next.js routes:**

```javascript
// worker/sw.js (from public/sw.js)
const OFFLINE_URLS = ["/", "/check-in", "/services", "/admin", "/offline.html"];

// Handle Next.js patterns
if (url.pathname.startsWith("/_next/static/")) {
  // Cache-first for immutable static assets
}
```

#### 4.4 Test Offline Functionality

- Go offline
- Add guest, record meal, book shower
- Verify operations queued in IndexedDB
- Go online
- Verify automatic sync
- Test background sync registration

**Deliverable:** Full offline support works in Next.js

---

### Phase 5: Testing & Merge (Week 5-6)

#### 5.1 Comprehensive Testing

**Unit tests:**

- Migrate existing Vitest tests to new structure
- Test all Zustand stores
- Test utility functions
- Test RLS policies with different user roles

**E2E tests (add Playwright):**

```bash
npm install -D @playwright/test
```

```typescript
// e2e/guest-checkin.spec.ts
test("admin can delete guests", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@example.com");
  // ... verify admin can delete
});

test("staff cannot delete guests", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "staff@example.com");
  // ... verify delete button hidden or fails
});
```

**Performance testing:**

- Lighthouse audit (PWA score)
- Virtual scrolling with test data
- Bundle size analysis (should be smaller than current Vite build)
- Time to Interactive < 3s

**Security audit:**

- RLS policies verification (login as each role, test CRUD)
- Test with different roles
- Check for data leaks
- Verify middleware blocks unauthorized routes

#### 5.2 Internal Testing

- Test on Vercel preview deployment
- Test on mobile devices (PWA installation)
- Test offline functionality
- Test all 4 user roles thoroughly

#### 5.3 Final Review & Merge

```bash
# Ensure all tests pass
npm run test
npm run lint
npm run type-check

# Merge to main
git checkout main
git merge feature/nextjs-migration
git push origin main

# Vercel auto-deploys from main branch
```

#### 5.4 Post-Merge Tasks

- Update README with new setup instructions
- Archive old Firebase project (keep for reference)
- Add production data via CSV import or manual entry
- Monitor Vercel logs for errors
- Set up error tracking (Vercel Analytics or Sentry)

**Deliverable:** Next.js app live on main branch, deployed to Vercel, ready for data entry

---

## Project Structure (Final)

```
hopes-corner-nextjs/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (protected)/
│   │   ├── layout.tsx              # Auth check + role-based access
│   │   ├── check-in/
│   │   │   └── page.tsx            # GuestList component
│   │   ├── services/
│   │   │   └── page.tsx            # Services operations
│   │   └── admin/
│   │       └── page.tsx            # Dashboard + reports
│   ├── api/                         # Optional: CSV exports only
│   │   └── export/
│   │       └── [table]/route.ts
│   ├── layout.tsx                   # Root layout + providers
│   ├── page.tsx                     # Home → redirect to check-in
│   └── error.tsx
├── components/
│   ├── guest/                       # Guest components (from src/components)
│   ├── services/                    # Service booking components
│   ├── admin/                       # Admin components
│   ├── charts/                      # Chart components (Recharts)
│   ├── ui/                          # Shared UI components
│   └── providers/                   # Client-side providers
│       ├── SupabaseProvider.tsx
│       ├── StoreProvider.tsx        # Zustand provider
│       └── SyncProvider.tsx         # Offline sync
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   ├── server.ts                # Server Supabase client
│   │   └── queries.ts               # Type-safe queries
│   ├── stores/                      # Zustand stores (from src/stores)
│   │   ├── useGuestsStore.ts
│   │   ├── useMealsStore.ts
│   │   ├── useServicesStore.ts
│   │   └── useDonationsStore.ts
│   ├── utils/                       # Utilities (from src/utils)
│   │   ├── offlineQueueManager.ts
│   │   ├── indexedDB.ts
│   │   └── supabasePagination.ts
│   └── hooks/                       # Custom hooks (from src/hooks)
├── worker/
│   └── sw.js                        # Service worker (from public/sw.js)
├── public/
│   ├── manifest.json                # PWA manifest
│   ├── offline.html                 # Offline fallback
│   └── icons/                       # PWA icons
├── docs/
│   └── supabase/
│       ├── schema.sql                # Database schema (existing)
│       └── migrations/               # Migration files (existing + new)
│           ├── 001-007_*.sql         # Existing migrations
│           └── 008_enable_rls.sql    # New: RLS policies
├── scripts/
│   └── migrate-users.ts              # User migration script
├── middleware.ts                     # Auth middleware
├── next.config.js                    # Next.js + PWA config
├── .env.local                        # Local environment variables
└── package.json
```

---

## Environment Variables

**`.env.local` (development):**

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Service Role (Optional - admin scripts only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# App
NEXT_PUBLIC_APP_NAME="Hope's Corner"
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Vercel (production):**

- Add same variables in Vercel dashboard
- Automatic HTTPS
- Preview deployments get same env vars

---

## Database Changes

### New Migration: RLS Policies

**File:** `docs/supabase/migrations/008_enable_rls.sql`

```sql
-- Enable RLS on all tables
do $$
declare
  t text;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    and table_type = 'BASE TABLE'
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Default policy: Authenticated users have full access
-- Customize based on security requirements
do $$
declare
  t text;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    and table_type = 'BASE TABLE'
  loop
    execute format('
      create policy "Authenticated users can access %I"
      on %I for all
      to authenticated
      using (true)
      with check (true)
    ', t, t);
  end loop;
end $$;

-- Optional: Granular policies
-- Example: Only admins can delete guests
create policy "Only admins can delete guests"
  on guests for delete
  to authenticated
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
```

### Existing Schema

**No changes needed!** Your 13 tables are well-designed:

- guests (with ban enforcement trigger)
- meal_attendance
- shower_reservations
- laundry_bookings
- bicycle_repairs
- holiday_visits
- haircut_visits
- items_distributed
- donations
- la_plaza_donations
- app_settings
- service_waivers
- sync_state

---

## Risk Assessment & Mitigation

| Risk                       | Likelihood | Impact   | Mitigation                                                                          |
| -------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------- |
| **User migration fails**   | Medium     | High     | Test with subset, keep Firebase Auth active temporarily, have rollback plan         |
| **RLS too permissive**     | Medium     | High     | Security audit, test with different roles, start restrictive then loosen            |
| **Performance regression** | Low        | Medium   | Performance testing with 100k+ records, monitor bundle size, keep virtual scrolling |
| **Offline queue breaks**   | Medium     | High     | Extensive offline testing, keep same IndexedDB structure, verify background sync    |
| **Data loss**              | Low        | Critical | Backup all tables before migration, verify row counts, dry-run first                |
| **PWA doesn't work**       | Low        | Medium   | Test on multiple devices/browsers, validate manifest, check service worker          |

**Backup Strategy:**

```sql
-- Before migration
pg_dump "supabase-connection-string" \
  --schema=public --data-only > backup-$(date +%Y%m%d).sql
```

**Rollback Plan:**

1. Revert Vercel deployment (one-click)
2. Restore database from backup (if needed)
3. Reactivate Firebase app (if needed)
4. Communicate to users

---

## Developer Experience Improvements

### Before (Current)

```bash
# Complex setup
npm install
npm install -g firebase-tools
firebase login
firebase use --add hopes-corner-checkin-app
cd functions && npm install && cd ..
# Setup .env.local (9 Firebase variables + Supabase)
firebase functions:secrets:set SUPABASE_URL
firebase functions:secrets:set SUPABASE_ANON_KEY
firebase deploy --only functions
npm run dev
```

### After (Next.js)

```bash
# Simple setup
npm install
# Setup .env.local (2 Supabase variables)
npm run dev
```

**Deployment:**

- Before: Manual `firebase deploy`
- After: Git push → auto-deploy (Vercel)

**Architecture:**

- Before: React → Vite → Firebase Functions → Supabase
- After: Next.js → Supabase (direct)

**Cost:**

- Before: Firebase Blaze plan (~$25-50/month)
- After: Vercel free tier (for non-profits)

---

## Testing Strategy

### Unit Tests (Keep existing)

- Vitest + Testing Library
- Migrate existing tests
- Test Zustand stores
- Test utility functions

### E2E Tests (Add new)

```bash
npm install -D @playwright/test
```

**Critical flows to test:**

1. Login/logout
2. Add/search guest
3. Record meal
4. Book shower/laundry
5. CSV import
6. Offline operations
7. Role-based access

### Performance Tests

- Lighthouse audit (target: 90+ PWA score)
- Bundle size analysis
- 100k+ guest list scrolling
- Time to Interactive < 3s

### Security Tests

- RLS policy verification
- Role-based access testing
- SQL injection protection (Supabase client handles)
- XSS protection (React handles)

---

## Success Metrics

**Before launch:**

- ✓ All features work in staging
- ✓ Performance equal or better
- ✓ PWA score 90+
- ✓ All tests pass
- ✓ Security audit complete
- ✓ Staff training complete

**After launch:**

- ✓ 100% users can login
- ✓ Zero critical bugs in first week
- ✓ Performance monitoring green
- ✓ Positive user feedback
- ✓ Offline functionality works

---

## Questions Before Implementation

Before starting the migration, I'd like to clarify a few key decisions:

### 1. **Migration Approach: Big Bang vs Gradual**

- **Option A (Big Bang):** Build new Next.js app in parallel, migrate all at once, switch over
  - Pros: Clean break, simpler, faster
  - Cons: Higher risk, all-or-nothing cutover

- **Option B (Gradual):** Keep both systems running, migrate users gradually
  - Pros: Lower risk, can rollback easily, get feedback
  - Cons: More complex, maintain two systems temporarily

**Question:** Which approach do you prefer?

### 2. **User Migration Strategy**

- **Option A:** Migrate all Firebase users to Supabase upfront, require password resets
- **Option B:** Keep Firebase Auth temporarily, let users migrate when they login
- **Option C:** Set temporary passwords for all users, force reset on first login

**Question:** What's your preference for user migration? How many active users do you have?

### 3. **TypeScript Migration**

- The current codebase is JavaScript (`.jsx` files)
- Next.js works best with TypeScript (`.tsx`)
- **Option A:** Migrate to TypeScript during this process (recommended)
- **Option B:** Keep JavaScript, migrate to TypeScript later

**Question:** Should we migrate to TypeScript now or keep JavaScript?

### 4. **RLS Security Policies**

- Current: Firebase Functions whitelist (permissive)
- Proposed: Supabase RLS policies
- **Option A:** Start permissive (all authenticated users can do anything), tighten later
- **Option B:** Start with granular role-based policies from day 1

**Question:** What's your security requirement? Do different roles need different access levels?

### 5. **Hosting Preference**

- **Option A (Recommended):** Vercel (free for non-profits, zero-config, auto-deploy)
- **Option B:** Self-hosted (Docker + Node.js, more control, requires maintenance)
- **Option C:** Other (Netlify, Railway, Render, etc.)

**Question:** Do you have a hosting preference or constraint?

### 6. **CSV Export Strategy**

- Current: Client-side CSV generation
- **Option A:** Keep client-side (simpler)
- **Option B:** Move to server-side API routes (better for large datasets)

**Question:** How large are your CSV exports? Any performance issues currently?

### 7. **Real-time vs Polling**

- Current: Polling with smart intervals
- **Option A:** Keep polling (simpler, works well now)
- **Option B:** Add Supabase Real-time subscriptions (live updates)

**Question:** Is real-time collaboration needed or is polling sufficient?

### 8. **Testing During Migration**

- **Question:** Do you have QA/staging environment? Can staff test before production?
- **Question:** What's your typical usage pattern? When is downtime least impactful?

### 9. **Data Backup & Rollback**

- **Question:** Do you have a recent backup of your Supabase database?
- **Question:** Is there a maintenance window where we can do the cutover?

### 10. **Budget & Timeline**

- **Question:** Is there a deadline for this migration?
- **Question:** Is Vercel free tier acceptable or do you need other hosting options?

---

## Your Decisions

✅ **Final decisions confirmed:**

1. **Migration Approach:** Big Bang on new branch (fresh start)
2. **User Migration:** Fresh users in Supabase (4 users: 1 per role)
3. **TypeScript:** Full TypeScript migration
4. **RLS:** Granular role-based policies from day 1 (admin/board/staff/checkin)
5. **Hosting:** Vercel free tier
6. **CSV Exports:** Keep client-side
7. **Sync:** Keep polling (no real-time)
8. **Testing:** No downtime concerns (app not live)
9. **Data Backup:** Fresh database, add data after migration
10. **Timeline:** 4-6 weeks, Vercel free tier

**MAJOR SIMPLIFICATION:** Since the app isn't live yet, we can:

- Skip user migration completely (create fresh)
- Start with empty database (add data later)
- No rollback planning needed
- No downtime concerns
- More aggressive refactoring possible

---

## Implementation Checklist

### Week 1: Foundation

- [x] Create `feature/nextjs-migration` branch
- [x] Initialize Next.js project with TypeScript
- [x] Install dependencies (Supabase, Zustand, next-pwa, etc.)
- [ ] Create fresh Supabase project
- [ ] Apply schema.sql to Supabase
- [ ] Create 4 test users in Supabase (admin, board, staff, checkin)
- [x] Create RLS policies SQL file (009_enable_rls.sql)
- [x] Implement Supabase client utilities (client.ts, server.ts)
- [x] Implement middleware for auth and role checks
- [x] Create login page
- [ ] Deploy to Vercel (hello world)
- [x] Migrate Zustand stores to `lib/stores/` (TypeScript)
- [ ] Create StoreProvider wrapper
- [ ] Migrate GuestList component (add 'use client', TypeScript)
- [ ] Migrate GuestForm and related components
- [x] Create check-in page (`app/(protected)/check-in/page.tsx`)
- [ ] Test guest CRUD operations
- [ ] Test role-based access (admin can delete, staff cannot)
- [ ] Migrate service components (showers, laundry, bicycles)
- [x] Create services page (`app/(protected)/services/page.tsx`)
- [ ] Migrate admin page and reports
- [ ] Migrate all chart components (add 'use client')
- [x] Create admin page (`app/(protected)/admin/page.tsx`)
- [ ] Migrate offline utilities (offlineQueueManager, indexedDB)
- [ ] Create SyncProvider
- [x] Configure next-pwa in next.config.js
- [ ] Update service worker for Next.js routes
- [ ] Test offline functionality (add guest while offline)
- [ ] Test PWA installation on mobile
- [ ] Test background sync

### Week 2: Testing & Merge

- [ ] Migrate Vitest tests to new structure
- [ ] Add Playwright E2E tests
- [ ] Test all 4 user roles thoroughly
- [ ] Run Lighthouse audit (target: 90+ PWA score)
- [ ] Performance testing with test data
- [ ] Security audit (RLS policies)
- [ ] Merge to main branch
- [ ] Vercel auto-deploys
- [ ] Update README
- [ ] Archive old Firebase project

---

## Key Files to Create

### Authentication & Routing

1. `lib/supabase/client.ts` - Browser Supabase client
2. `lib/supabase/server.ts` - Server Supabase client with cookies
3. `middleware.ts` - Auth + role-based route protection
4. `app/(auth)/login/page.tsx` - Login page
5. `app/(protected)/layout.tsx` - Protected route wrapper

### State Management

6. `components/providers/StoreProvider.tsx` - Zustand provider wrapper
7. `lib/stores/useGuestsStore.ts` - Guest store (TypeScript)
8. `lib/stores/useMealsStore.ts` - Meals store (TypeScript)
9. `lib/stores/useServicesStore.ts` - Services store (TypeScript)
10. `lib/stores/useDonationsStore.ts` - Donations store (TypeScript)

### Pages

11. `app/(protected)/check-in/page.tsx` - Check-in page
12. `app/(protected)/services/page.tsx` - Services page
13. `app/(protected)/admin/page.tsx` - Admin page

### Database

14. `docs/supabase/migrations/008_enable_rls.sql` - RLS policies

### Configuration

15. `next.config.js` - Next.js + PWA config
16. `.env.local` - Environment variables

---

## Summary

This is a **comprehensive but straightforward migration** because:

✅ **No user migration needed** - Fresh start with 4 test users
✅ **No data migration needed** - Empty database, add data later
✅ **No downtime concerns** - App not live yet
✅ **Simpler architecture** - Direct Supabase (no Firebase Functions)
✅ **Better DX** - `npm install && npm run dev` (vs complex Firebase setup)
✅ **Lower costs** - Vercel free tier (vs Firebase Blaze)
✅ **Modern stack** - Next.js 15 + TypeScript + App Router
✅ **Same features** - Offline, PWA, virtual scrolling, etc.

**Estimated timeline:** 4-6 weeks
**Next step:** Create branch and start Phase 1
