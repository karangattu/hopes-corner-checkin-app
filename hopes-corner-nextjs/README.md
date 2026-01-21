# Hope's Corner Check-in App

A check-in and service management system for Hope's Corner, built with Next.js 15, Supabase, and Zustand.

## Features

- Guest management and service tracking
- Real-time logging for Meals, Showers, Laundry, and Bicycle services
- Admin dashboard with analytics and reports
- Role-based access control
- PWA with offline support

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **State**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + Framer Motion
- **Testing**: Vitest (2,500+ tests)

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## Environment

Copy `example.env` to `.env.local` and configure your Supabase credentials.
