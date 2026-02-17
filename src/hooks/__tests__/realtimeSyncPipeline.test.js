import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoreToContextSync } from '../useStoreToContextSync';
import { useServicesStore } from '../../stores/useServicesStore';
import { useMealsStore } from '../../stores/useMealsStore';
import { useDonationsStore } from '../../stores/useDonationsStore';
import { useGuestsStore } from '../../stores/useGuestsStore';

// Mock cross-tab sync
vi.mock('../../utils/crossTabSync', () => ({
  onCrossTabChange: vi.fn(() => vi.fn()),
  broadcastChange: vi.fn(),
}));

import { onCrossTabChange } from '../../utils/crossTabSync';

describe('Realtime sync pipeline', () => {
  let setters;

  beforeEach(() => {
    setters = {
      setShowerRecords: vi.fn(),
      setLaundryRecords: vi.fn(),
      setBicycleRecords: vi.fn(),
      setMealRecords: vi.fn(),
      setHolidayRecords: vi.fn(),
      setHaircutRecords: vi.fn(),
      setDonationRecords: vi.fn(),
      setItemGivenRecords: vi.fn(),
      setGuests: vi.fn(),
    };

    // Reset stores
    useServicesStore.setState({
      showerRecords: [],
      laundryRecords: [],
      bicycleRecords: [],
    });
    useMealsStore.setState({
      mealRecords: [],
      holidayRecords: [],
      haircutRecords: [],
    });
    useDonationsStore.setState({
      donationRecords: [],
      itemRecords: [],
    });
    useGuestsStore.setState({
      guests: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Store → AppContext bridge for showers', () => {
    it('should sync shower record additions from store to AppContext', () => {
      renderHook(() => useStoreToContextSync(setters));

      const newRecords = [
        { id: 'shower-1', guestId: 'g1', status: 'booked', time: '9:00 AM' },
      ];

      act(() => {
        useServicesStore.setState({ showerRecords: newRecords });
      });

      expect(setters.setShowerRecords).toHaveBeenCalledWith(newRecords);
    });

    it('should sync shower updates from syncFromMutation to AppContext', () => {
      renderHook(() => useStoreToContextSync(setters));

      // Simulate what happens when a mutation calls syncShowerFromMutation
      act(() => {
        useServicesStore.getState().syncShowerFromMutation('add', {
          id: 'shower-1',
          guestId: 'g1',
          status: 'booked',
          time: '10:00 AM',
        });
      });

      expect(setters.setShowerRecords).toHaveBeenCalled();
      const lastCall = setters.setShowerRecords.mock.calls[setters.setShowerRecords.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(1);
      expect(lastCall[0].id).toBe('shower-1');
    });

    it('should handle rapid consecutive shower updates', () => {
      renderHook(() => useStoreToContextSync(setters));

      act(() => {
        useServicesStore.getState().syncShowerFromMutation('add', {
          id: 'shower-1', guestId: 'g1', status: 'booked',
        });
      });

      act(() => {
        useServicesStore.getState().syncShowerFromMutation('add', {
          id: 'shower-2', guestId: 'g2', status: 'booked',
        });
      });

      act(() => {
        useServicesStore.getState().syncShowerFromMutation('update', {
          id: 'shower-1', guestId: 'g1', status: 'done',
        });
      });

      // AppContext should have been called with the final state
      const lastCallArgs = setters.setShowerRecords.mock.calls;
      const finalState = lastCallArgs[lastCallArgs.length - 1][0];
      expect(finalState).toHaveLength(2);
      expect(finalState.find((r) => r.id === 'shower-1').status).toBe('done');
      expect(finalState.find((r) => r.id === 'shower-2').status).toBe('booked');
    });
  });

  describe('Store → AppContext bridge for laundry', () => {
    it('should sync laundry record additions from store to AppContext', () => {
      renderHook(() => useStoreToContextSync(setters));

      const newRecords = [
        { id: 'laundry-1', guestId: 'g1', status: 'waiting', laundryType: 'onsite' },
      ];

      act(() => {
        useServicesStore.setState({ laundryRecords: newRecords });
      });

      expect(setters.setLaundryRecords).toHaveBeenCalledWith(newRecords);
    });

    it('should sync laundry status changes to AppContext', () => {
      renderHook(() => useStoreToContextSync(setters));

      act(() => {
        useServicesStore.getState().syncLaundryFromMutation('add', {
          id: 'laundry-1', guestId: 'g1', status: 'waiting',
        });
      });

      act(() => {
        useServicesStore.getState().syncLaundryFromMutation('update', {
          id: 'laundry-1', guestId: 'g1', status: 'done',
        });
      });

      const lastCallArgs = setters.setLaundryRecords.mock.calls;
      const finalState = lastCallArgs[lastCallArgs.length - 1][0];
      expect(finalState).toHaveLength(1);
      expect(finalState[0].status).toBe('done');
    });
  });

  describe('Store → AppContext bridge for meals', () => {
    it('should sync meal records from store to AppContext', () => {
      renderHook(() => useStoreToContextSync(setters));

      const newRecords = [
        { id: 'meal-1', guestId: 'g1', type: 'guest', date: '2026-02-14' },
      ];

      act(() => {
        useMealsStore.setState({ mealRecords: newRecords });
      });

      expect(setters.setMealRecords).toHaveBeenCalled();
    });

    it('should filter out non-guest meal records', () => {
      renderHook(() => useStoreToContextSync(setters));

      const mixedRecords = [
        { id: 'meal-1', guestId: 'g1', type: 'guest', date: '2026-02-14' },
        { id: 'meal-2', guestId: null, type: 'lunch_bag', date: '2026-02-14' },
        { id: 'meal-3', guestId: 'g3', type: 'guest', date: '2026-02-14' },
      ];

      act(() => {
        useMealsStore.setState({ mealRecords: mixedRecords });
      });

      // The sync should filter to only valid guest records
      const lastCallArgs = setters.setMealRecords.mock.calls;
      const finalState = lastCallArgs[lastCallArgs.length - 1][0];
      expect(finalState).toHaveLength(2);
      expect(finalState.every((r) => r.guestId)).toBe(true);
    });
  });

  describe('Cross-tab sync integration', () => {
    it('should register cross-tab listeners for showers and laundry on mount', () => {
      renderHook(() => useStoreToContextSync(setters));

      // onCrossTabChange should have been called for showers and laundry
      expect(onCrossTabChange).toHaveBeenCalledWith('showers', expect.any(Function));
      expect(onCrossTabChange).toHaveBeenCalledWith('laundry', expect.any(Function));
    });

    it('should unregister cross-tab listeners on unmount', () => {
      const mockUnsub = vi.fn();
      onCrossTabChange.mockReturnValue(mockUnsub);

      const { unmount } = renderHook(() => useStoreToContextSync(setters));
      unmount();

      // All unsubscribe functions should have been called
      expect(mockUnsub).toHaveBeenCalled();
    });

    it('should update store when cross-tab shower change arrives', () => {
      // Capture the callback registered with onCrossTabChange
      let showerCallback = null;
      onCrossTabChange.mockImplementation((store, cb) => {
        if (store === 'showers') showerCallback = cb;
        return vi.fn();
      });

      renderHook(() => useStoreToContextSync(setters));

      expect(showerCallback).not.toBeNull();

      // Simulate a cross-tab change
      const record = { id: 'shower-from-tab2', guestId: 'g5', status: 'booked' };
      act(() => {
        showerCallback('add', record);
      });

      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords.some((r) => r.id === 'shower-from-tab2')).toBe(true);
    });

    it('should update store when cross-tab laundry change arrives', () => {
      let laundryCallback = null;
      onCrossTabChange.mockImplementation((store, cb) => {
        if (store === 'laundry') laundryCallback = cb;
        return vi.fn();
      });

      renderHook(() => useStoreToContextSync(setters));

      expect(laundryCallback).not.toBeNull();

      const record = { id: 'laundry-from-tab2', guestId: 'g5', status: 'waiting' };
      act(() => {
        laundryCallback('add', record);
      });

      const { laundryRecords } = useServicesStore.getState();
      expect(laundryRecords.some((r) => r.id === 'laundry-from-tab2')).toBe(true);
    });

    it('should ignore cross-tab messages with null data', () => {
      let showerCallback = null;
      onCrossTabChange.mockImplementation((store, cb) => {
        if (store === 'showers') showerCallback = cb;
        return vi.fn();
      });

      renderHook(() => useStoreToContextSync(setters));

      act(() => {
        showerCallback('add', null);
      });

      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(0);
    });
  });

  describe('Full pipeline: mutation → store → AppContext', () => {
    it('should propagate a shower addition through the full pipeline', () => {
      renderHook(() => useStoreToContextSync(setters));

      const record = {
        id: 'shower-pipeline',
        guestId: 'g1',
        status: 'booked',
        time: '11:00 AM',
        scheduledFor: '2026-02-14',
      };

      // Step 1: Mutation syncs to store (simulating what showerMutations.js does)
      act(() => {
        useServicesStore.getState().syncShowerFromMutation('add', record);
      });

      // Step 2: Store → AppContext bridge should have fired
      expect(setters.setShowerRecords).toHaveBeenCalled();
      const syncedRecords = setters.setShowerRecords.mock.calls[
        setters.setShowerRecords.mock.calls.length - 1
      ][0];
      expect(syncedRecords).toContainEqual(record);
    });

    it('should propagate a laundry status change through the full pipeline', () => {
      renderHook(() => useStoreToContextSync(setters));

      const record = { id: 'laundry-1', guestId: 'g1', status: 'waiting' };

      // Add record
      act(() => {
        useServicesStore.getState().syncLaundryFromMutation('add', record);
      });

      // Update status (like a washing → done transition)
      act(() => {
        useServicesStore.getState().syncLaundryFromMutation('update', {
          ...record,
          status: 'done',
        });
      });

      const lastCallArgs = setters.setLaundryRecords.mock.calls;
      const finalState = lastCallArgs[lastCallArgs.length - 1][0];
      expect(finalState[0].status).toBe('done');
    });

    it('should handle deletion through the full pipeline', () => {
      renderHook(() => useStoreToContextSync(setters));

      const record = { id: 'shower-del', guestId: 'g1', status: 'booked' };

      act(() => {
        useServicesStore.getState().syncShowerFromMutation('add', record);
      });

      act(() => {
        useServicesStore.getState().syncShowerFromMutation('remove', record);
      });

      const lastCallArgs = setters.setShowerRecords.mock.calls;
      const finalState = lastCallArgs[lastCallArgs.length - 1][0];
      expect(finalState).toHaveLength(0);
    });
  });

  describe('Realtime deduplication', () => {
    it('should not create duplicates when mutation and realtime both fire', () => {
      renderHook(() => useStoreToContextSync(setters));

      const record = { id: 'shower-dedup', guestId: 'g1', status: 'booked' };

      // Mutation adds to store
      act(() => {
        useServicesStore.getState().syncShowerFromMutation('add', record);
      });

      // Realtime event arrives for same record (simulated by setting state directly)
      // The store should deduplicate
      act(() => {
        useServicesStore.getState().syncShowerFromMutation('add', record);
      });

      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
    });

    it('should properly update when realtime sends newer data for existing record', () => {
      renderHook(() => useStoreToContextSync(setters));

      const original = { id: 'shower-up', guestId: 'g1', status: 'booked', time: '9:00 AM' };
      act(() => {
        useServicesStore.getState().syncShowerFromMutation('add', original);
      });

      // Realtime sends an update (e.g., status changed by another device)
      const updated = { id: 'shower-up', guestId: 'g1', status: 'done', time: '9:00 AM' };
      act(() => {
        useServicesStore.getState().syncShowerFromMutation('update', updated);
      });

      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
      expect(showerRecords[0].status).toBe('done');
    });
  });
});
