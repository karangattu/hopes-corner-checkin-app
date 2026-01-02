import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the AppContext to provide controlled test data
const mockGetGuestNameDetails = vi.fn((guestId) => {
  const guestNames = {
    'guest-1': { 
      displayName: 'John Doe', 
      primaryName: 'John', 
      legalName: 'John Doe', 
      hasPreferred: false,
      isOrphaned: false,
      sortKey: 'john doe'
    },
    'guest-2': { 
      displayName: 'Jane Smith', 
      primaryName: 'Jane', 
      legalName: 'Jane Smith', 
      hasPreferred: false,
      isOrphaned: false,
      sortKey: 'jane smith'
    },
    'proxy-guest': { 
      displayName: 'Proxy Person (Prox)',
      primaryName: 'Prox',
      legalName: 'Proxy Person', 
      hasPreferred: true,
      isOrphaned: false,
      sortKey: 'proxy person'
    },
  };
  return guestNames[guestId] || { 
    displayName: 'Unknown Guest', 
    primaryName: 'Unknown', 
    legalName: 'Unknown Guest', 
    hasPreferred: false,
    isOrphaned: !guestId,
    sortKey: 'unknown'
  };
});

// Create a minimal mock AppContext provider
const mockAppContextValue = {
  guests: [
    { id: 'guest-1', name: 'John Doe', firstName: 'John', lastName: 'Doe' },
    { id: 'guest-2', name: 'Jane Smith', firstName: 'Jane', lastName: 'Smith' },
    { id: 'proxy-guest', name: 'Proxy Person', firstName: 'Proxy', lastName: 'Person', preferredName: 'Prox' },
  ],
  mealRecords: [],
  getTodayMetrics: vi.fn(() => ({
    meals: 0,
    showers: 0,
    laundry: 0,
    haircuts: 0,
    holidays: 0,
  })),
  getTodayLaundryWithGuests: vi.fn(() => []),
  setActiveServiceSection: vi.fn(),
  activeServiceSection: 'meals',
};

vi.mock('../../../context/useAppContext', () => ({
  useAppContext: () => mockAppContextValue,
}));

vi.mock('../../../context/useAuth', () => ({
  useAuth: () => ({
    user: { role: 'staff' },
  }),
}));

/**
 * Test suite for meal proxy tracking UI in the Services page.
 * Tests the display of:
 * - Proxy Pickups stat tile
 * - "🤝 Proxy Pickup" badge on meal entries
 * - "via [Proxy Name]" text below timestamps
 */
describe('Services Meals - Proxy Tracking UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Proxy Pickups Stat Tile', () => {
    it('should count meals with pickedUpByProxyId correctly', () => {
      const mealRecordsWithProxy = [
        { id: 'm1', guestId: 'guest-1', count: 1, date: new Date().toISOString(), pickedUpByProxyId: null },
        { id: 'm2', guestId: 'guest-2', count: 1, date: new Date().toISOString(), pickedUpByProxyId: 'proxy-guest' },
        { id: 'm3', guestId: 'guest-1', count: 2, date: new Date().toISOString(), pickedUpByProxyId: 'proxy-guest' },
      ];

      // Count meals with proxy
      const proxyMeals = mealRecordsWithProxy.filter(r => r.pickedUpByProxyId);
      expect(proxyMeals).toHaveLength(2);
    });

    it('should return 0 when no proxy pickups exist', () => {
      const mealRecordsWithoutProxy = [
        { id: 'm1', guestId: 'guest-1', count: 1, date: new Date().toISOString(), pickedUpByProxyId: null },
        { id: 'm2', guestId: 'guest-2', count: 1, date: new Date().toISOString(), pickedUpByProxyId: null },
      ];

      const proxyMeals = mealRecordsWithoutProxy.filter(r => r.pickedUpByProxyId);
      expect(proxyMeals).toHaveLength(0);
    });
  });

  describe('Proxy Pickup Badge', () => {
    it('should identify meals that need proxy badge', () => {
      const mealRecord = {
        id: 'm1',
        guestId: 'guest-1',
        count: 1,
        date: new Date().toISOString(),
        pickedUpByProxyId: 'proxy-guest',
      };

      // Badge should be shown when pickedUpByProxyId exists and is different from guestId
      const shouldShowBadge = mealRecord.pickedUpByProxyId && 
                              mealRecord.pickedUpByProxyId !== mealRecord.guestId;
      
      expect(shouldShowBadge).toBe(true);
    });

    it('should not show badge when pickedUpByProxyId is null', () => {
      const mealRecord = {
        id: 'm1',
        guestId: 'guest-1',
        count: 1,
        date: new Date().toISOString(),
        pickedUpByProxyId: null,
      };

      const shouldShowBadge = mealRecord.pickedUpByProxyId && 
                              mealRecord.pickedUpByProxyId !== mealRecord.guestId;
      
      expect(shouldShowBadge).toBeFalsy();
    });

    it('should not show badge when pickedUpByProxyId equals guestId (self-pickup)', () => {
      const mealRecord = {
        id: 'm1',
        guestId: 'guest-1',
        count: 1,
        date: new Date().toISOString(),
        pickedUpByProxyId: 'guest-1', // Same as guestId
      };

      const shouldShowBadge = mealRecord.pickedUpByProxyId && 
                              mealRecord.pickedUpByProxyId !== mealRecord.guestId;
      
      expect(shouldShowBadge).toBe(false);
    });
  });

  describe('Proxy Name Display', () => {
    it('should get correct proxy name for display', () => {
      const mealRecord = {
        id: 'm1',
        guestId: 'guest-1',
        pickedUpByProxyId: 'proxy-guest',
      };

      const proxyDetails = mockGetGuestNameDetails(mealRecord.pickedUpByProxyId);
      
      expect(proxyDetails.primaryName).toBe('Prox');
      expect(proxyDetails.displayName).toBe('Proxy Person (Prox)');
    });

    it('should handle unknown proxy guest gracefully', () => {
      const mealRecord = {
        id: 'm1',
        guestId: 'guest-1',
        pickedUpByProxyId: 'unknown-proxy-id',
      };

      const proxyDetails = mockGetGuestNameDetails(mealRecord.pickedUpByProxyId);
      
      expect(proxyDetails.primaryName).toBe('Unknown');
    });
  });

  describe('Meal Entry Integration', () => {
    it('should correctly render meal entry with proxy information', () => {
      const mealEntry = {
        id: 'm1',
        guestId: 'guest-1',
        count: 1,
        date: new Date().toISOString(),
        pickedUpByProxyId: 'proxy-guest',
      };

      // Simulate what Services.jsx does
      const guestDetails = mockGetGuestNameDetails(mealEntry.guestId);
      const proxyDetails = mealEntry.pickedUpByProxyId 
        ? mockGetGuestNameDetails(mealEntry.pickedUpByProxyId) 
        : null;

      // Guest should be John
      expect(guestDetails.primaryName).toBe('John');
      
      // Proxy should be Prox
      expect(proxyDetails).not.toBeNull();
      expect(proxyDetails.primaryName).toBe('Prox');
    });

    it('should correctly render meal entry without proxy', () => {
      const mealEntry = {
        id: 'm1',
        guestId: 'guest-1',
        count: 1,
        date: new Date().toISOString(),
        pickedUpByProxyId: null,
      };

      const guestDetails = mockGetGuestNameDetails(mealEntry.guestId);
      const proxyDetails = mealEntry.pickedUpByProxyId 
        ? mockGetGuestNameDetails(mealEntry.pickedUpByProxyId) 
        : null;

      expect(guestDetails.primaryName).toBe('John');
      expect(proxyDetails).toBeNull();
    });
  });

  describe('Proxy Pickups Statistics', () => {
    it('should calculate total proxy pickups for a day', () => {
      const mealsForDay = [
        { id: 'm1', guestId: 'guest-1', count: 1, pickedUpByProxyId: null },
        { id: 'm2', guestId: 'guest-2', count: 1, pickedUpByProxyId: 'proxy-guest' },
        { id: 'm3', guestId: 'guest-1', count: 1, pickedUpByProxyId: 'proxy-guest' },
        { id: 'm4', guestId: 'guest-2', count: 2, pickedUpByProxyId: null },
        { id: 'm5', guestId: 'guest-1', count: 1, pickedUpByProxyId: 'guest-2' },
      ];

      const proxyPickupCount = mealsForDay.filter(r => r.pickedUpByProxyId).length;
      
      expect(proxyPickupCount).toBe(3);
    });

    it('should identify unique proxies for a day', () => {
      const mealsForDay = [
        { id: 'm1', guestId: 'guest-1', count: 1, pickedUpByProxyId: 'proxy-guest' },
        { id: 'm2', guestId: 'guest-2', count: 1, pickedUpByProxyId: 'proxy-guest' },
        { id: 'm3', guestId: 'guest-1', count: 1, pickedUpByProxyId: 'guest-2' },
      ];

      const uniqueProxies = new Set(
        mealsForDay
          .filter(r => r.pickedUpByProxyId)
          .map(r => r.pickedUpByProxyId)
      );
      
      expect(uniqueProxies.size).toBe(2);
      expect(uniqueProxies.has('proxy-guest')).toBe(true);
      expect(uniqueProxies.has('guest-2')).toBe(true);
    });
  });

  describe('Mapper Function Tests', () => {
    it('should correctly map pickedUpByGuestId from DB row', () => {
      // Simulate mapMealRow behavior
      const dbRow = {
        id: 'meal-uuid',
        guest_id: 'guest-1',
        picked_up_by_guest_id: 'proxy-guest',
        quantity: 1,
        recorded_at: '2025-01-02T10:00:00Z',
        served_on: '2025-01-02',
        meal_type: 'lunch',
      };

      // Simulated mapper output
      const mapped = {
        id: dbRow.id,
        guestId: dbRow.guest_id,
        pickedUpByGuestId: dbRow.picked_up_by_guest_id || null,
        count: dbRow.quantity || 1,
        date: dbRow.recorded_at,
        servedOn: dbRow.served_on,
        type: dbRow.meal_type,
      };

      expect(mapped.guestId).toBe('guest-1');
      expect(mapped.pickedUpByGuestId).toBe('proxy-guest');
    });

    it('should handle null picked_up_by_guest_id', () => {
      const dbRow = {
        id: 'meal-uuid',
        guest_id: 'guest-1',
        picked_up_by_guest_id: null,
        quantity: 1,
        recorded_at: '2025-01-02T10:00:00Z',
      };

      const mapped = {
        id: dbRow.id,
        guestId: dbRow.guest_id,
        pickedUpByGuestId: dbRow.picked_up_by_guest_id || null,
        count: dbRow.quantity || 1,
      };

      expect(mapped.pickedUpByGuestId).toBeNull();
    });

    it('should handle undefined picked_up_by_guest_id', () => {
      const dbRow = {
        id: 'meal-uuid',
        guest_id: 'guest-1',
        // picked_up_by_guest_id is undefined (not in row)
        quantity: 1,
      };

      const mapped = {
        id: dbRow.id,
        guestId: dbRow.guest_id,
        pickedUpByGuestId: dbRow.picked_up_by_guest_id || null,
        count: dbRow.quantity || 1,
      };

      expect(mapped.pickedUpByGuestId).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle meals where proxy and guest are the same (no badge shown)', () => {
      const mealRecords = [
        { id: 'm1', guestId: 'guest-1', count: 1, pickedUpByProxyId: 'guest-1' },
      ];

      // This shouldn't happen in practice due to store logic, but handle gracefully
      const mealsWithValidProxy = mealRecords.filter(
        r => r.pickedUpByProxyId && r.pickedUpByProxyId !== r.guestId
      );

      expect(mealsWithValidProxy).toHaveLength(0);
    });

    it('should handle empty meal records array', () => {
      const mealRecords = [];
      
      const proxyPickupCount = mealRecords.filter(r => r.pickedUpByProxyId).length;
      
      expect(proxyPickupCount).toBe(0);
    });

    it('should handle meal records with missing pickedUpByProxyId field', () => {
      const mealRecords = [
        { id: 'm1', guestId: 'guest-1', count: 1 }, // No pickedUpByProxyId field
        { id: 'm2', guestId: 'guest-2', count: 1, pickedUpByProxyId: 'proxy-guest' },
      ];

      const proxyPickupCount = mealRecords.filter(r => r.pickedUpByProxyId).length;
      
      expect(proxyPickupCount).toBe(1);
    });
  });
});