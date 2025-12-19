import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGuestsStore } from '../useGuestsStore';
import { act } from '@testing-library/react';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => null),
  isSupabaseEnabled: vi.fn(() => false),
}));

// Test guest data helper
const createTestGuestInput = (overrides = {}) => ({
  firstName: 'John',
  lastName: 'Doe',
  age: 'Adult 18-59' as const,
  gender: 'Male' as const,
  housingStatus: 'Unhoused' as const,
  location: 'Mountain View',
  ...overrides,
});

describe('useGuestsStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGuestsStore.setState({
      guests: [],
      isLoading: false,
      error: null,
      lastFetched: null,
    });
  });

  describe('initial state', () => {
    it('should have empty guests array', () => {
      const { guests } = useGuestsStore.getState();
      expect(guests).toEqual([]);
    });

    it('should have isLoading false', () => {
      const { isLoading } = useGuestsStore.getState();
      expect(isLoading).toBe(false);
    });

    it('should have no error', () => {
      const { error } = useGuestsStore.getState();
      expect(error).toBe(null);
    });
  });

  describe('generateGuestId', () => {
    it('should generate a valid guest ID', () => {
      const { generateGuestId } = useGuestsStore.getState();
      const id = generateGuestId();
      expect(id).toMatch(/^G[A-Z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const { generateGuestId } = useGuestsStore.getState();
      const id1 = generateGuestId();
      const id2 = generateGuestId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('addGuest', () => {
    it('should add a guest to local state when Supabase is disabled', async () => {
      const { addGuest } = useGuestsStore.getState();
      
      await act(async () => {
        await addGuest(createTestGuestInput());
      });

      const { guests } = useGuestsStore.getState();
      expect(guests.length).toBe(1);
      expect(guests[0].firstName).toBe('John');
      expect(guests[0].lastName).toBe('Doe');
    });

    it('should generate full name correctly', async () => {
      const { addGuest } = useGuestsStore.getState();
      
      await act(async () => {
        await addGuest(createTestGuestInput({
          firstName: 'Jane',
          lastName: 'Smith',
        }));
      });

      const { guests } = useGuestsStore.getState();
      expect(guests[0].name).toBe('Jane Smith');
    });
  });

  describe('deleteGuest', () => {
    it('should remove a guest from local state', async () => {
      // First add a guest
      const { addGuest, deleteGuest } = useGuestsStore.getState();
      
      await act(async () => {
        await addGuest(createTestGuestInput());
      });

      const { guests: initialGuests } = useGuestsStore.getState();
      const guestId = initialGuests[0].id;

      await act(async () => {
        await deleteGuest(guestId);
      });

      const { guests: finalGuests } = useGuestsStore.getState();
      expect(finalGuests.length).toBe(0);
    });
  });

  describe('clearGuests', () => {
    it('should clear all guests from state', async () => {
      // Add some guests first
      const { addGuest, clearGuests } = useGuestsStore.getState();
      
      await act(async () => {
        await addGuest(createTestGuestInput());
        await addGuest(createTestGuestInput({
          firstName: 'Jane',
          lastName: 'Smith',
        }));
      });

      act(() => {
        clearGuests();
      });

      const { guests } = useGuestsStore.getState();
      expect(guests.length).toBe(0);
    });
  });

  describe('getGuestById', () => {
    it('should return correct guest by ID', async () => {
      const { addGuest, getGuestById } = useGuestsStore.getState();
      
      await act(async () => {
        await addGuest(createTestGuestInput());
      });

      const { guests } = useGuestsStore.getState();
      const guest = getGuestById(guests[0].id);
      expect(guest).not.toBeNull();
      expect(guest?.firstName).toBe('John');
    });

    it('should return undefined for non-existent ID', () => {
      const { getGuestById } = useGuestsStore.getState();
      const guest = getGuestById('non-existent-id');
      expect(guest).toBeUndefined();
    });
  });
});
