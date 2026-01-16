import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMealsStore } from '../useMealsStore';
import { act } from '@testing-library/react';

// Mock Supabase
vi.mock('../../supabaseClient', () => ({
  supabase: null,
  isSupabaseEnabled: () => false,
}));

// Mock date utils
vi.mock('../../utils/date', () => ({
  todayPacificDateString: () => '2025-01-02',
  pacificDateStringFrom: (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },
}));

describe('useMealsStore - Proxy Tracking', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useMealsStore.getState();
    store.clearMealRecords();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addMealRecord with pickedUpByGuestId', () => {
    it('should add a meal record without proxy tracking when pickedUpByGuestId is not provided', async () => {
      const store = useMealsStore.getState();
      
      let result;
      await act(async () => {
        result = await store.addMealRecord('guest-123', 1);
      });

      expect(result).toBeDefined();
      expect(result.guestId).toBe('guest-123');
      expect(result.quantity).toBe(1);
      expect(result.pickedUpByGuestId).toBeNull();
    });

    it('should add a meal record with proxy tracking when pickedUpByGuestId is provided', async () => {
      const store = useMealsStore.getState();
      
      let result;
      await act(async () => {
        // guest-123 is the linked guest receiving the meal
        // proxy-456 is the primary guest who physically picked it up
        result = await store.addMealRecord('guest-123', 1, 'proxy-456');
      });

      expect(result).toBeDefined();
      expect(result.guestId).toBe('guest-123');
      expect(result.quantity).toBe(1);
      expect(result.pickedUpByGuestId).toBe('proxy-456');
    });

    it('should not set pickedUpByGuestId when it equals guestId (self-pickup)', async () => {
      const store = useMealsStore.getState();
      
      let result;
      await act(async () => {
        // Same guest ID for both - should not track proxy
        result = await store.addMealRecord('guest-123', 1, 'guest-123');
      });

      expect(result).toBeDefined();
      expect(result.guestId).toBe('guest-123');
      expect(result.pickedUpByGuestId).toBeNull();
    });

    it('should correctly handle multiple meals with proxy tracking', async () => {
      const store = useMealsStore.getState();
      
      // Primary guest picks up meals for themselves and two linked guests
      await act(async () => {
        // Primary guest's own meal
        await store.addMealRecord('primary-guest', 1);
        
        // Linked guest 1's meal picked up by primary
        await store.addMealRecord('linked-guest-1', 1, 'primary-guest');
        
        // Linked guest 2's meal picked up by primary
        await store.addMealRecord('linked-guest-2', 2, 'primary-guest');
      });

      const updatedStore = useMealsStore.getState();
      const records = updatedStore.mealRecords;

      expect(records).toHaveLength(3);

      // Primary guest's own meal - no proxy
      const primaryRecord = records.find(r => r.guestId === 'primary-guest');
      expect(primaryRecord.pickedUpByGuestId).toBeNull();

      // Linked guest 1's meal - picked up by primary
      const linked1Record = records.find(r => r.guestId === 'linked-guest-1');
      expect(linked1Record.pickedUpByGuestId).toBe('primary-guest');

      // Linked guest 2's meal - picked up by primary
      const linked2Record = records.find(r => r.guestId === 'linked-guest-2');
      expect(linked2Record.pickedUpByGuestId).toBe('primary-guest');
      expect(linked2Record.quantity).toBe(2);
    });

    it('should require guestId to be provided', async () => {
      const store = useMealsStore.getState();
      
      await expect(
        act(async () => {
          await store.addMealRecord(null, 1);
        })
      ).rejects.toThrow('Guest ID is required');
    });

    it('should generate local ID when Supabase is disabled', async () => {
      const store = useMealsStore.getState();
      
      let result;
      await act(async () => {
        result = await store.addMealRecord('guest-123', 1, 'proxy-456');
      });

      expect(result.id).toMatch(/^local-meal-\d+$/);
    });

    it('should include createdAt timestamp', async () => {
      const store = useMealsStore.getState();
      
      let result;
      await act(async () => {
        result = await store.addMealRecord('guest-123', 1, 'proxy-456');
      });

      expect(result.createdAt).toBeDefined();
      expect(new Date(result.createdAt).getTime()).not.toBeNaN();
    });

    it('should include the correct date (today)', async () => {
      const store = useMealsStore.getState();
      
      let result;
      await act(async () => {
        result = await store.addMealRecord('guest-123', 1, 'proxy-456');
      });

      expect(result.date).toBe('2025-01-02');
    });
  });

  describe('getTodayMeals with proxy tracking', () => {
    it('should return all meals for today including those with proxy tracking', async () => {
      const store = useMealsStore.getState();
      
      await act(async () => {
        await store.addMealRecord('guest-1', 1);
        await store.addMealRecord('guest-2', 1, 'proxy-guest');
        await store.addMealRecord('guest-3', 2, 'proxy-guest');
      });

      const todayMeals = useMealsStore.getState().getTodayMeals();

      expect(todayMeals).toHaveLength(3);
      
      const proxyMeals = todayMeals.filter(m => m.pickedUpByGuestId);
      expect(proxyMeals).toHaveLength(2);
      
      const regularMeals = todayMeals.filter(m => !m.pickedUpByGuestId);
      expect(regularMeals).toHaveLength(1);
    });
  });

  describe('deleteMealRecord with proxy tracking', () => {
    it('should delete a meal record regardless of proxy tracking status', async () => {
      const store = useMealsStore.getState();
      
      let record;
      await act(async () => {
        record = await store.addMealRecord('guest-123', 1, 'proxy-456');
      });

      expect(useMealsStore.getState().mealRecords).toHaveLength(1);

      await act(async () => {
        await store.deleteMealRecord(record.id);
      });

      expect(useMealsStore.getState().mealRecords).toHaveLength(0);
    });
  });

  describe('clearMealRecords', () => {
    it('should clear all meal records including those with proxy tracking', async () => {
      const store = useMealsStore.getState();
      
      await act(async () => {
        await store.addMealRecord('guest-1', 1);
        await store.addMealRecord('guest-2', 1, 'proxy-guest');
      });

      expect(useMealsStore.getState().mealRecords).toHaveLength(2);

      act(() => {
        useMealsStore.getState().clearMealRecords();
      });

      expect(useMealsStore.getState().mealRecords).toHaveLength(0);
    });
  });
});