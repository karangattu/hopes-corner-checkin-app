import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create hoisted mock that will be available during mock factory execution
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}));

// Mock supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: mockSupabase,
  assertSupabase: vi.fn(),
}));

import {
  getMonthDateRange,
  getYTDDateRange,
  fetchMealCounts,
  fetchShowerCount,
  fetchLaundryCount,
  fetchBicycleCounts,
  fetchHaircutCount,
  fetchActiveGuestIds,
  fetchGuestDemographics,
} from '../monthlyReportQueries';

/**
 * Helper to create a chainable mock query builder
 * Simulates Supabase query builder pattern with pagination support
 */
const createMockQueryBuilder = (dataOrPages, options = {}) => {
  const { useCount = false, countValue = 0 } = options;
  
  // If dataOrPages is an array of arrays, treat as paginated data
  const isPaginated = Array.isArray(dataOrPages) && Array.isArray(dataOrPages[0]);
  let pageIndex = 0;
  let currentRangeStart = 0;
  
  const builder = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    range: vi.fn((start) => {
      currentRangeStart = start;
      return builder;
    }),
    then: vi.fn((resolve) => {
      if (useCount) {
        return Promise.resolve(resolve({ count: countValue, error: null }));
      }
      
      if (isPaginated) {
        // Calculate which page based on range
        const pageSize = 1000;
        pageIndex = Math.floor(currentRangeStart / pageSize);
        const pageData = dataOrPages[pageIndex] || [];
        return Promise.resolve(resolve({ data: pageData, error: null }));
      }
      
      return Promise.resolve(resolve({ data: dataOrPages, error: null }));
    }),
  };
  
  return builder;
};

describe('monthlyReportQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMonthDateRange', () => {
    it('returns correct date range for January', () => {
      const result = getMonthDateRange(2025, 1);
      expect(result.startDate).toBe('2025-01-01');
      expect(result.endDate).toBe('2025-01-31');
    });

    it('returns correct date range for February (non-leap year)', () => {
      const result = getMonthDateRange(2025, 2);
      expect(result.startDate).toBe('2025-02-01');
      expect(result.endDate).toBe('2025-02-28');
    });

    it('returns correct date range for February (leap year)', () => {
      const result = getMonthDateRange(2024, 2);
      expect(result.startDate).toBe('2024-02-01');
      expect(result.endDate).toBe('2024-02-29');
    });

    it('returns correct date range for December', () => {
      const result = getMonthDateRange(2025, 12);
      expect(result.startDate).toBe('2025-12-01');
      expect(result.endDate).toBe('2025-12-31');
    });
  });

  describe('getYTDDateRange', () => {
    it('returns YTD range from Jan 1 to end of selected month', () => {
      const result = getYTDDateRange(2025, 6);
      expect(result.startDate).toBe('2025-01-01');
      expect(result.endDate).toBe('2025-06-30');
    });

    it('handles January correctly', () => {
      const result = getYTDDateRange(2025, 1);
      expect(result.startDate).toBe('2025-01-01');
      expect(result.endDate).toBe('2025-01-31');
    });
  });

  describe('fetchMealCounts', () => {
    it('correctly sums meal counts by type', async () => {
      const mockData = [
        { meal_type: 'guest', quantity: 10 },
        { meal_type: 'guest', quantity: 5 },
        { meal_type: 'rv', quantity: 20 },
        { meal_type: 'day_worker', quantity: 50 },
        { meal_type: 'lunch_bag', quantity: 30 },
        { meal_type: 'extra', quantity: 8 },
        { meal_type: 'shelter', quantity: 12 },
        { meal_type: 'united_effort', quantity: 7 },
      ];

      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockData));

      const result = await fetchMealCounts('2025-01-01', '2025-01-31');

      expect(result.guest).toBe(10 + 5 + 8 + 12 + 7); // guest + extra + shelter + united_effort
      expect(result.rv).toBe(20);
      expect(result.dayWorker).toBe(50);
      expect(result.lunchBag).toBe(30);
      expect(result.total).toBe(10 + 5 + 20 + 50 + 30 + 8 + 12 + 7);
    });

    it('handles pagination when more than 1000 records exist', async () => {
      // Create 2500 records split across 3 pages
      const page1 = Array.from({ length: 1000 }, () => ({ meal_type: 'guest', quantity: 1 }));
      const page2 = Array.from({ length: 1000 }, () => ({ meal_type: 'rv', quantity: 1 }));
      const page3 = Array.from({ length: 500 }, () => ({ meal_type: 'day_worker', quantity: 1 }));

      let callCount = 0;
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          callCount++;
          if (callCount === 1) return Promise.resolve(resolve({ data: page1, error: null }));
          if (callCount === 2) return Promise.resolve(resolve({ data: page2, error: null }));
          return Promise.resolve(resolve({ data: page3, error: null }));
        }),
      };

      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await fetchMealCounts('2025-01-01', '2025-01-31');

      expect(callCount).toBe(3); // Should make 3 paginated calls
      expect(result.guest).toBe(1000);
      expect(result.rv).toBe(1000);
      expect(result.dayWorker).toBe(500);
      expect(result.total).toBe(2500);
    });

    it('handles empty result set', async () => {
      mockSupabase.from.mockReturnValue(createMockQueryBuilder([]));

      const result = await fetchMealCounts('2025-01-01', '2025-01-31');

      expect(result.guest).toBe(0);
      expect(result.rv).toBe(0);
      expect(result.dayWorker).toBe(0);
      expect(result.lunchBag).toBe(0);
      expect(result.total).toBe(0);
    });

    it('defaults to quantity of 1 when quantity is missing', async () => {
      const mockData = [
        { meal_type: 'guest', quantity: null },
        { meal_type: 'guest' }, // no quantity field
      ];

      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockData));

      const result = await fetchMealCounts('2025-01-01', '2025-01-31');

      expect(result.guest).toBe(2);
      expect(result.total).toBe(2);
    });

    it('groups unknown meal types into guest', async () => {
      const mockData = [
        { meal_type: 'unknown_type', quantity: 5 },
        { meal_type: null, quantity: 3 },
      ];

      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockData));

      const result = await fetchMealCounts('2025-01-01', '2025-01-31');

      expect(result.guest).toBe(8);
    });
  });

  describe('fetchShowerCount', () => {
    it('queries with done status for completed showers', async () => {
      const mockBuilder = createMockQueryBuilder(null, { useCount: true, countValue: 42 });
      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await fetchShowerCount('2025-01-01', '2025-01-31');

      expect(result).toBe(42);
      expect(mockBuilder.eq).toHaveBeenCalledWith('status', 'done');
    });

    it('returns 0 when no showers found', async () => {
      mockSupabase.from.mockReturnValue(
        createMockQueryBuilder(null, { useCount: true, countValue: 0 })
      );

      const result = await fetchShowerCount('2025-01-01', '2025-01-31');

      expect(result).toBe(0);
    });

    it('uses correct date filters', async () => {
      const mockBuilder = createMockQueryBuilder(null, { useCount: true, countValue: 10 });
      mockSupabase.from.mockReturnValue(mockBuilder);

      await fetchShowerCount('2025-06-01', '2025-06-30');

      expect(mockBuilder.gte).toHaveBeenCalledWith('scheduled_for', '2025-06-01');
      expect(mockBuilder.lte).toHaveBeenCalledWith('scheduled_for', '2025-06-30');
    });
  });

  describe('fetchLaundryCount', () => {
    it('counts completed laundry statuses from records', async () => {
      const mockData = [
        { status: 'done' },
        { status: 'picked_up' },
        { status: 'returned' },
        { status: 'offsite_picked_up' },
        { status: 'waiting' },
        { status: null },
      ];
      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockData));

      const result = await fetchLaundryCount('2025-01-01', '2025-01-31');

      expect(result).toBe(4);
    });

    it('returns 0 when no laundry found', async () => {
      mockSupabase.from.mockReturnValue(createMockQueryBuilder([]));

      const result = await fetchLaundryCount('2025-01-01', '2025-01-31');

      expect(result).toBe(0);
    });
  });

  describe('fetchBicycleCounts', () => {
    it('separates new bicycles from service repairs', async () => {
      const mockData = [
        { repair_types: ['Flat Tire', 'Brakes'], status: 'done' },
        { repair_types: ['New Bicycle'], status: 'done' },
        { repair_types: ['Chain', 'Gears'], status: 'in_progress' },
        { repair_types: ['New Bicycle'], status: 'done' },
      ];

      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockData));

      const result = await fetchBicycleCounts('2025-01-01', '2025-01-31');

      expect(result.service).toBe(2);
      expect(result.gifted).toBe(2);
    });

    it('returns zeros when no bicycle records', async () => {
      mockSupabase.from.mockReturnValue(createMockQueryBuilder([]));

      const result = await fetchBicycleCounts('2025-01-01', '2025-01-31');

      expect(result.service).toBe(0);
      expect(result.gifted).toBe(0);
    });
  });

  describe('fetchHaircutCount', () => {
    it('returns count of haircuts', async () => {
      mockSupabase.from.mockReturnValue(
        createMockQueryBuilder(null, { useCount: true, countValue: 25 })
      );

      const result = await fetchHaircutCount('2025-01-01', '2025-01-31');

      expect(result).toBe(25);
    });

    it('uses timestamp range for served_at column', async () => {
      const mockBuilder = createMockQueryBuilder(null, { useCount: true, countValue: 10 });
      mockSupabase.from.mockReturnValue(mockBuilder);

      await fetchHaircutCount('2025-01-01', '2025-01-31');

      expect(mockBuilder.gte).toHaveBeenCalledWith('served_at', '2025-01-01T00:00:00');
      expect(mockBuilder.lte).toHaveBeenCalledWith('served_at', '2025-01-31T23:59:59');
    });
  });

  describe('fetchActiveGuestIds', () => {
    it('returns unique guest IDs', async () => {
      const mockData = [
        { guest_id: 'guest-1' },
        { guest_id: 'guest-2' },
        { guest_id: 'guest-1' }, // duplicate
        { guest_id: 'guest-3' },
      ];

      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockData));

      const result = await fetchActiveGuestIds('2025-01-01', '2025-01-31');

      expect(result).toHaveLength(3);
      expect(result).toContain('guest-1');
      expect(result).toContain('guest-2');
      expect(result).toContain('guest-3');
    });

    it('filters out null guest IDs', async () => {
      const mockData = [
        { guest_id: 'guest-1' },
        { guest_id: null },
        { guest_id: 'guest-2' },
        { guest_id: null },
      ];

      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockData));

      const result = await fetchActiveGuestIds('2025-01-01', '2025-01-31');

      expect(result).toHaveLength(2);
      expect(result).not.toContain(null);
    });

    it('handles pagination for more than 1000 meal records', async () => {
      // Create 1500 unique guest IDs across 2 pages
      const page1 = Array.from({ length: 1000 }, (_, i) => ({ guest_id: `guest-${i}` }));
      const page2 = Array.from({ length: 500 }, (_, i) => ({ guest_id: `guest-${1000 + i}` }));

      let callCount = 0;
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          callCount++;
          if (callCount === 1) return Promise.resolve(resolve({ data: page1, error: null }));
          return Promise.resolve(resolve({ data: page2, error: null }));
        }),
      };

      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await fetchActiveGuestIds('2025-01-01', '2025-01-31');

      expect(callCount).toBe(2); // Should make 2 paginated calls
      expect(result).toHaveLength(1500);
    });

    it('deduplicates guest IDs across pages', async () => {
      // Same guest appears in both pages
      const page1 = [{ guest_id: 'guest-1' }, { guest_id: 'guest-2' }];
      const page2 = [{ guest_id: 'guest-1' }, { guest_id: 'guest-3' }]; // guest-1 is duplicate

      let callCount = 0;
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          callCount++;
          if (callCount === 1) return Promise.resolve(resolve({ data: page1, error: null }));
          if (callCount === 2) return Promise.resolve(resolve({ data: page2, error: null }));
          return Promise.resolve(resolve({ data: [], error: null })); // Empty page stops pagination
        }),
      };

      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await fetchActiveGuestIds('2025-01-01', '2025-01-31');

      // guest-1 should only appear once
      const uniqueIds = new Set(result);
      expect(uniqueIds.size).toBe(result.length);
    });
  });

  describe('fetchGuestDemographics', () => {
    it('aggregates demographics correctly', async () => {
      const mockData = [
        { housing_status: 'Unhoused', location: 'Mountain View', age_group: 'Adult 18-59' },
        { housing_status: 'Unhoused', location: 'Mountain View', age_group: 'Senior 60+' },
        { housing_status: 'Housed', location: 'Palo Alto', age_group: 'Adult 18-59' },
      ];

      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockData));

      const result = await fetchGuestDemographics(['guest-1', 'guest-2', 'guest-3']);

      expect(result.totalGuests).toBe(3);
      expect(result.housingStatus['Unhoused']).toBe(2);
      expect(result.housingStatus['Housed']).toBe(1);
      expect(result.locations['Mountain View']).toBe(2);
      expect(result.locations['Palo Alto']).toBe(1);
      expect(result.ageGroups['Adult 18-59']).toBe(2);
      expect(result.ageGroups['Senior 60+']).toBe(1);
    });

    it('returns empty result for empty guest list', async () => {
      const result = await fetchGuestDemographics([]);

      expect(result.totalGuests).toBe(0);
      expect(result.housingStatus).toEqual({});
      expect(result.locations).toEqual({});
      expect(result.ageGroups).toEqual({});
    });

    it('handles null values as Unknown', async () => {
      const mockData = [
        { housing_status: null, location: null, age_group: null },
      ];

      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockData));

      const result = await fetchGuestDemographics(['guest-1']);

      expect(result.housingStatus['Unknown']).toBe(1);
      expect(result.locations['Unknown']).toBe(1);
      expect(result.ageGroups['Unknown']).toBe(1);
    });

    it('batches large guest ID lists to avoid IN clause limits', async () => {
      // Create 1200 guest IDs (should require 3 batches of 500)
      const guestIds = Array.from({ length: 1200 }, (_, i) => `guest-${i}`);
      
      let callCount = 0;
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          callCount++;
          // Return a subset of guests for each batch
          const batchData = Array.from({ length: Math.min(500, 1200 - (callCount - 1) * 500) }, () => ({
            housing_status: 'Unhoused',
            location: 'Mountain View',
            age_group: 'Adult 18-59',
          }));
          return Promise.resolve(resolve({ data: batchData, error: null }));
        }),
      };

      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await fetchGuestDemographics(guestIds);

      expect(callCount).toBe(3); // 1200 / 500 = 3 batches (500, 500, 200)
      expect(result.totalGuests).toBe(1200);
    });

    it('accumulates demographics across batches', async () => {
      const guestIds = Array.from({ length: 600 }, (_, i) => `guest-${i}`);
      
      let callCount = 0;
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          callCount++;
          if (callCount === 1) {
            // First batch: all Unhoused in Mountain View
            return Promise.resolve(resolve({
              data: Array.from({ length: 500 }, () => ({
                housing_status: 'Unhoused',
                location: 'Mountain View',
                age_group: 'Adult 18-59',
              })),
              error: null,
            }));
          }
          // Second batch: all Housed in Palo Alto
          return Promise.resolve(resolve({
            data: Array.from({ length: 100 }, () => ({
              housing_status: 'Housed',
              location: 'Palo Alto',
              age_group: 'Senior 60+',
            })),
            error: null,
          }));
        }),
      };

      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await fetchGuestDemographics(guestIds);

      expect(result.totalGuests).toBe(600);
      expect(result.housingStatus['Unhoused']).toBe(500);
      expect(result.housingStatus['Housed']).toBe(100);
      expect(result.locations['Mountain View']).toBe(500);
      expect(result.locations['Palo Alto']).toBe(100);
    });
  });

  describe('Error handling', () => {
    it('fetchMealCounts throws on Supabase error', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => 
          Promise.resolve(resolve({ data: null, error: new Error('Database error') }))
        ),
      };
      mockSupabase.from.mockReturnValue(mockBuilder);

      await expect(fetchMealCounts('2025-01-01', '2025-01-31')).rejects.toThrow();
    });

    it('fetchShowerCount throws on Supabase error', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => 
          Promise.resolve(resolve({ count: null, error: new Error('Database error') }))
        ),
      };
      mockSupabase.from.mockReturnValue(mockBuilder);

      await expect(fetchShowerCount('2025-01-01', '2025-01-31')).rejects.toThrow();
    });

    it('fetchLaundryCount throws on Supabase error', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => 
          Promise.resolve(resolve({ data: null, error: new Error('Database error') }))
        ),
      };
      mockSupabase.from.mockReturnValue(mockBuilder);

      await expect(fetchLaundryCount('2025-01-01', '2025-01-31')).rejects.toThrow();
    });
  });
});
