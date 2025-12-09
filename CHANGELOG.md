# CHANGELOG

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
