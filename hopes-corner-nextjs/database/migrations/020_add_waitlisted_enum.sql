-- Add additional laundry statuses
ALTER TYPE laundry_status_enum ADD VALUE IF NOT EXISTS 'waitlisted';
ALTER TYPE laundry_status_enum ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE laundry_status_enum ADD VALUE IF NOT EXISTS 'transported';
ALTER TYPE laundry_status_enum ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE laundry_status_enum ADD VALUE IF NOT EXISTS 'offsite_picked_up';
