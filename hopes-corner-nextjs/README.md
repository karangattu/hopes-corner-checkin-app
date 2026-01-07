# Hope's Corner Check-in App

A modern, high-performance check-in and service management system for Hope's Corner, built with Next.js 15, Supabase, and Zustand.

## Core Features
- **Guest Management**: Comprehensive guest profiles, search, and service tracking.
- **Service Logging**: Real-time logging for Meals, Showers, Laundry, and Bicycle services.
- **Admin Dashboard**: Advanced analytics, monthly summary reports, and service metrics.
- **Role-Based Access**: Specialized views for Admins, Staff, Board members, and Check-in volunteers.
- **PWA Ready**: Offline support and home screen installation.
- **Keyboard Optimization**: Extensive keyboard shortcuts for high-speed operation.

## Tech Stack
- **Framework**: Next.js 15 (App Router, TypeScript)
- **State Management**: Zustand (with selective persistence)
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security)
- **Styling**: Tailwind CSS + Framer Motion for premium UI/UX
- **Testing**: Vitest + React Testing Library (2,000+ tests)
- **Deployment**: Optimized for Vercel

## Infrastructure & Maintenance

### Comprehensive Test Suite
The app features a robust test suite of over **2,000 tests** covering:
- **Utility Logic**: 100% coverage on core date, math, and string utilities.
- **Store Transitions**: Exhaustive testing of state management logic.
- **Integration Flows**: Complex multi-step workflow verification.
- **Edge Cases**: Hundreds of data boundary condition tests.

Run tests:
```bash
npm test
```

Generate coverage report:
```bash
npm run test:coverage
```

### Locally Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env.local` (see `example.env`)
3. Run development server:
   ```bash
   npm run dev
   ```

### Code Quality
Ensure code quality and standards before every push:
```bash
npm run lint
```

## Documentation
- [Implementation Plan](.gemini/antigravity/brain/ef4687b9-146a-4890-aa90-6187f478d7fa/implementation_plan.md)
- [Test Scaling Walkthrough](.gemini/antigravity/brain/ef4687b9-146a-4890-aa90-6187f478d7fa/walkthrough.md)
- [Database Schema](database/README.md)

---
*Developed for Hope's Corner - Built for Speed, Resilience, and Compassion.*
