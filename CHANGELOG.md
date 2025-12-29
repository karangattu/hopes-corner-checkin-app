# CHANGELOG

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
