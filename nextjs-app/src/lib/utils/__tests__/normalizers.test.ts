import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toTitleCase,
  normalizePreferredName,
  normalizeBicycleDescription,
  normalizeHousingStatus,
  computeIsGuestBanned,
  mapGuestRow,
} from '../normalizers';

describe('normalizers utilities', () => {
  describe('toTitleCase', () => {
    it('capitalizes first letter of each word', () => {
      expect(toTitleCase('john doe')).toBe('John Doe');
    });

    it('handles single word', () => {
      expect(toTitleCase('john')).toBe('John');
    });

    it('converts uppercase to title case', () => {
      expect(toTitleCase('JOHN DOE')).toBe('John Doe');
    });

    it('handles mixed case', () => {
      expect(toTitleCase('jOhN dOe')).toBe('John Doe');
    });

    it('returns empty string for empty input', () => {
      expect(toTitleCase('')).toBe('');
    });

    it('handles multiple spaces', () => {
      expect(toTitleCase('john  doe')).toBe('John  Doe');
    });
  });

  describe('normalizePreferredName', () => {
    it('title cases the name', () => {
      expect(normalizePreferredName('johnny')).toBe('Johnny');
    });

    it('trims whitespace', () => {
      expect(normalizePreferredName('  johnny  ')).toBe('Johnny');
    });

    it('returns empty string for null', () => {
      expect(normalizePreferredName(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(normalizePreferredName(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(normalizePreferredName('')).toBe('');
    });

    it('returns empty string for whitespace only', () => {
      expect(normalizePreferredName('   ')).toBe('');
    });
  });

  describe('normalizeBicycleDescription', () => {
    it('trims whitespace', () => {
      expect(normalizeBicycleDescription('  red bike  ')).toBe('red bike');
    });

    it('returns empty string for null', () => {
      expect(normalizeBicycleDescription(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(normalizeBicycleDescription(undefined)).toBe('');
    });

    it('preserves original casing', () => {
      expect(normalizeBicycleDescription('Red Mountain Bike')).toBe('Red Mountain Bike');
    });
  });

  describe('normalizeHousingStatus', () => {
    it('returns "Unhoused" for null', () => {
      expect(normalizeHousingStatus(null)).toBe('Unhoused');
    });

    it('returns "Unhoused" for undefined', () => {
      expect(normalizeHousingStatus(undefined)).toBe('Unhoused');
    });

    it('returns "Unhoused" for empty string', () => {
      expect(normalizeHousingStatus('')).toBe('Unhoused');
    });

    it('matches valid statuses case-insensitively', () => {
      expect(normalizeHousingStatus('unhoused')).toBe('Unhoused');
      expect(normalizeHousingStatus('HOUSED')).toBe('Housed');
      expect(normalizeHousingStatus('temp. shelter')).toBe('Temp. shelter');
      expect(normalizeHousingStatus('RV OR VEHICLE')).toBe('RV or vehicle');
    });

    it('returns "Unhoused" for invalid status', () => {
      expect(normalizeHousingStatus('invalid')).toBe('Unhoused');
      expect(normalizeHousingStatus('homeless')).toBe('Unhoused');
    });

    it('trims whitespace', () => {
      expect(normalizeHousingStatus('  housed  ')).toBe('Housed');
    });
  });

  describe('computeIsGuestBanned', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns false for null', () => {
      expect(computeIsGuestBanned(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(computeIsGuestBanned(undefined)).toBe(false);
    });

    it('returns true if ban is in the future', () => {
      expect(computeIsGuestBanned('2025-12-31')).toBe(true);
    });

    it('returns false if ban is in the past', () => {
      expect(computeIsGuestBanned('2025-01-01')).toBe(false);
    });

    it('returns false if ban is today but earlier time', () => {
      // Current time is 2025-06-15T12:00:00Z
      expect(computeIsGuestBanned('2025-06-15T00:00:00Z')).toBe(false);
    });

    it('returns true if ban is today but later time', () => {
      expect(computeIsGuestBanned('2025-06-15T23:59:59Z')).toBe(true);
    });
  });

  describe('mapGuestRow', () => {
    it('maps database row to Guest type', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G001',
        first_name: 'john',
        last_name: 'doe',
        full_name: 'john doe',
        preferred_name: 'johnny',
        housing_status: 'unhoused',
        age_group: 'Adult',
        gender: 'Male',
        location: 'San Jose',
        notes: 'Some notes',
        bicycle_description: 'Red bike',
        banned_at: null,
        banned_until: null,
        ban_reason: '',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      const guest = mapGuestRow(row);

      expect(guest.id).toBe('uuid-123');
      expect(guest.guestId).toBe('G001');
      expect(guest.firstName).toBe('John');
      expect(guest.lastName).toBe('Doe');
      expect(guest.name).toBe('John Doe');
      expect(guest.preferredName).toBe('Johnny');
      expect(guest.housingStatus).toBe('Unhoused');
      expect(guest.age).toBe('Adult');
      expect(guest.gender).toBe('Male');
      expect(guest.location).toBe('San Jose');
      expect(guest.notes).toBe('Some notes');
      expect(guest.bicycleDescription).toBe('Red bike');
      expect(guest.isBanned).toBe(false);
      expect(guest.createdAt).toBe('2025-01-01T00:00:00Z');
      expect(guest.updatedAt).toBe('2025-01-02T00:00:00Z');
    });

    it('uses default location when not provided', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G001',
        first_name: 'john',
        last_name: 'doe',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      const guest = mapGuestRow(row);

      expect(guest.location).toBe('Mountain View');
    });

    it('computes isBanned from bannedUntil', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

      const row = {
        id: 'uuid-123',
        external_id: 'G001',
        first_name: 'john',
        last_name: 'doe',
        banned_until: '2025-12-31',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      const guest = mapGuestRow(row);

      expect(guest.isBanned).toBe(true);

      vi.useRealTimers();
    });

    it('constructs name from first and last name when full_name is missing', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G001',
        first_name: 'john',
        last_name: 'doe',
        full_name: '',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      const guest = mapGuestRow(row);

      expect(guest.name).toBe('John Doe');
    });
  });
});
