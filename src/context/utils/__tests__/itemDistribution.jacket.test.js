/**
 * Jacket Item Distribution Tests
 * 
 * Tests for the jacket distribution feature with 15-day validity period.
 * Ensures guests can receive jackets and must wait 15 days before receiving another.
 */

import { describe, it, expect } from 'vitest';

// Helper functions to replace date-fns
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const subDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

/**
 * Mock implementation of the logic from AppContext
 * getNextAvailabilityDate determines when a guest can receive an item again
 */
const getNextAvailabilityDate = (item, lastDateString) => {
  if (!lastDateString) return null;

  const lastDate = new Date(lastDateString);
  const next = new Date(lastDate);

  if (item === 'tshirt') {
    // Monday to Monday
    const daysUntilMonday = (1 - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntilMonday);
  } else if (item === 'jacket') {
    // 15-day validity period
    next.setDate(next.getDate() + 15);
  } else if (['sleeping_bag', 'backpack', 'tent', 'flip_flops'].includes(item)) {
    // 30-day validity period
    next.setDate(next.getDate() + 30);
  }

  return next;
};

/**
 * Mock implementation of canGiveItem logic
 * Determines if a guest can receive an item based on their last distribution
 */
const canGiveItemLogic = (item, lastDateString) => {
  if (!lastDateString) return true; // Never received, can give

  const nextAvailable = getNextAvailabilityDate(item, lastDateString);
  const today = new Date();

  // Normalize times to midnight for comparison
  nextAvailable.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return today >= nextAvailable;
};

describe('Jacket Item Distribution - 15 Day Validity', () => {
  describe('getNextAvailabilityDate', () => {
    it('returns jacket availability 15 days after distribution', () => {
      const distributedDate = '2026-01-10';
      const nextAvailable = getNextAvailabilityDate('jacket', distributedDate);

      const expected = addDays(new Date(distributedDate), 15);
      expected.setHours(0, 0, 0, 0);
      nextAvailable.setHours(0, 0, 0, 0);

      expect(nextAvailable.toDateString()).toBe(expected.toDateString());
    });

    it('jacket has 15-day validity period vs sleeping bag 30-day period', () => {
      const baseDate = '2026-01-10';
      const jacketNext = getNextAvailabilityDate('jacket', baseDate);
      const sleepingBagNext = getNextAvailabilityDate('sleeping_bag', baseDate);

      // Both should be Date objects
      expect(jacketNext instanceof Date).toBe(true);
      expect(sleepingBagNext instanceof Date).toBe(true);

      // Jacket should be available before sleeping bag
      expect(jacketNext.getTime() < sleepingBagNext.getTime()).toBe(true);

      // Verify the difference is 15 days (sleeping bag is 15 days after jacket)
      const diffMs = sleepingBagNext.getTime() - jacketNext.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(15, 0);
    });
  });

  describe('canGiveItem - Jacket eligibility', () => {
    it('allows giving jacket when guest has never received one', () => {
      const canGive = canGiveItemLogic('jacket', null);
      expect(canGive).toBe(true);
    });

    it('prevents giving jacket within 15 days of last distribution', () => {
      const distributedToday = new Date().toISOString().split('T')[0];
      const canGive = canGiveItemLogic('jacket', distributedToday);
      expect(canGive).toBe(false);
    });

    it('prevents giving jacket 7 days after distribution', () => {
      const distributedDate = subDays(new Date(), 7).toISOString().split('T')[0];
      const canGive = canGiveItemLogic('jacket', distributedDate);
      expect(canGive).toBe(false);
    });

    it('prevents giving jacket less than 15 days after distribution', () => {
      const distributedDate = subDays(new Date(), 10).toISOString().split('T')[0];
      const canGive = canGiveItemLogic('jacket', distributedDate);
      expect(canGive).toBe(false);
    });

    it('allows giving jacket at or after 15 days of distribution', () => {
      const distributedDate = subDays(new Date(), 15).toISOString().split('T')[0];
      const canGive = canGiveItemLogic('jacket', distributedDate);
      expect(canGive).toBe(true);
    });

    it('allows giving jacket more than 15 days after distribution', () => {
      const distributedDate = subDays(new Date(), 20).toISOString().split('T')[0];
      const canGive = canGiveItemLogic('jacket', distributedDate);
      expect(canGive).toBe(true);
    });

    it('allows giving jacket 30 days after distribution', () => {
      const distributedDate = subDays(new Date(), 30).toISOString().split('T')[0];
      const canGive = canGiveItemLogic('jacket', distributedDate);
      expect(canGive).toBe(true);
    });
  });

  describe('Jacket vs other items comparison', () => {
    it('jacket has different validity period than other items', () => {
      const baseDate = '2026-01-10';

      const jacketNext = getNextAvailabilityDate('jacket', baseDate);
      const sleepingBagNext = getNextAvailabilityDate('sleeping_bag', baseDate);
      const tshirtNext = getNextAvailabilityDate('tshirt', baseDate);

      // All should be valid Date objects
      expect(jacketNext instanceof Date).toBe(true);
      expect(sleepingBagNext instanceof Date).toBe(true);
      expect(tshirtNext instanceof Date).toBe(true);

      // Jacket should be before sleeping bag (15 days vs 30 days)
      expect(jacketNext < sleepingBagNext).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('handles leap year dates correctly for jacket', () => {
      const distributedDate = '2024-02-20'; // Before leap day
      const nextAvailable = getNextAvailabilityDate('jacket', distributedDate);

      const expected = addDays(new Date(distributedDate), 15);
      expected.setHours(0, 0, 0, 0);
      nextAvailable.setHours(0, 0, 0, 0);

      // Just verify the date was calculated correctly (15 days later)
      expect(nextAvailable.toDateString()).toBe(expected.toDateString());
    });

    it('handles undefined/null distribution date gracefully', () => {
      expect(getNextAvailabilityDate('jacket', null)).toBeNull();
      expect(getNextAvailabilityDate('jacket', undefined)).toBeNull();
    });
  });
});
