import { describe, it, expect } from 'vitest';
import { todayPacificDateString, pacificDateStringFrom, formatDateString } from '../date';

describe('Date Utilities', () => {
  describe('todayPacificDateString', () => {
    it('returns a date string in YYYY-MM-DD format', () => {
      const result = todayPacificDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns consistent results within the same day', () => {
      const result1 = todayPacificDateString();
      const result2 = todayPacificDateString();
      expect(result1).toBe(result2);
    });
  });

  describe('formatDateString', () => {
    it('formats a date correctly', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const result = formatDateString(date);
      expect(result).toBe('2024-01-15');
    });

    it('pads single digit months and days', () => {
      const date = new Date(2024, 4, 5); // May 5, 2024
      const result = formatDateString(date);
      expect(result).toBe('2024-05-05');
    });

    it('handles December correctly', () => {
      const date = new Date(2024, 11, 31); // December 31, 2024
      const result = formatDateString(date);
      expect(result).toBe('2024-12-31');
    });
  });

  describe('pacificDateStringFrom', () => {
    it('converts ISO string to Pacific date string', () => {
      // Using a noon UTC time to avoid timezone edge cases
      const result = pacificDateStringFrom('2024-01-15T12:00:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('converts Date object to Pacific date string', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = pacificDateStringFrom(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles midnight UTC (may be previous day in Pacific)', () => {
      // Midnight UTC is 4pm/5pm previous day in Pacific
      const result = pacificDateStringFrom('2024-01-15T00:00:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
