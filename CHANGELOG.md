# CHANGELOG

## 0.0.7 · 2026-01-04

### ✨ New Features

- **Automatic Meal Entries**: Meals for RVs and lunch bags will automatically be added after meal service ends. Preset quantities are configured by day:
  - **Monday**: 120 Lunch Bags, 100 RV Meals
  - **Wednesday**: 120 Lunch Bags, 35 RV Meals  
  - **Thursday**: 100 RV Meals
  - **Saturday**: 110 + 220 Lunch Bags (2 entries), 100 RV Meals, 50 Day Worker Center Meals
- Auto-added entries appear in the meals section where staff can modify or delete them as needed.

## 0.0.6 · 2026-01-01

### Bug Fixes

- **Waiver Annual Reset**: Fixed waivers not resetting at the start of a new year. Guests who signed waivers last year will now correctly show as needing new waivers for 2026.

## 0.0.5 · 2025-12-28

### Performance Improvements

- **Faster Guest Searching**: Made searching for guests much quicker, especially when there are many guests in the system. The app now finds people faster without slowing down.
- **Better Search Memory**: The app remembers search information to avoid having to look everything up again each time.
- **Smarter Fuzzy Matching**: Improved the way the app finds guests even when names aren't spelled exactly right, using less computer memory in the process.

### ✨ New Features

- **Search by Initials**: You can now search using just the first letters of names. For example, typing "JS" will find "John Smith", or "JMS" will find "John Michael Smith".
- **Better Name Matching**: The search now works better with middle names, multiple words in names, and finds people even if you type their name parts in a different order.

## 0.0.4 · 2025-12-22

### ✨ New Features

- **Linked Guests**: Link up to 3 guests together for families or groups who pick up meals together. When searching for one guest, quickly access their linked guests to assign meals without separate searches.
- **Guest Warnings**: Staff can now add warnings to guest profiles that display prominently during check-in.
- **Ban guests for specific services**: Staff can now ban guests from specific services (showers, laundry, bicycles, meals) without a full ban. Service-specific bans are indicated during guest search and check-in.

## 0.0.3 · 2025-11-28

### ✨ New Features

- **Refresh Button**: Added a refresh button at the top of every page to manually pull the latest data from Supabase with animated feedback.
- **Last Refreshed Status**: Display shows when data was last synced, with visual indicators for freshness (green = fresh, amber = aging, orange = stale).
- **What's New Modal**: Users can now see recent app updates and new features via a "What's New" button in the footer.
- **Version Display**: App version number is now shown at the bottom of every page for easy reference.

### Bug Fixes

- Fixed "Last Refreshed" indicator always showing "Never" by correcting localStorage table name keys.

## 0.0.2 · 2025-11-19

### Bug Fixes

- Donor items now allow to record temperature and servings for each donation item.

### Performance Improvements

- Batch import attendance records now handles very large CSV files (45,000+ rows) without crashing or freezing the application.

## 0.0.1 · 2025-09-28

### ✨ New Features

- Surfaced booked shower slot times and fresh laundry activity in the Services dashboard.

### Bug Fixes

- Ensured donation logs honor the selected date, showing every recorded item before export.
