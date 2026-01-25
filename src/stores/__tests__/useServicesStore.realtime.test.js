import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';

// Mock the realtime subscription hook
const mockGetRealtimeClient = vi.fn();
const mockIsRealtimeAvailable = vi.fn(() => true);

vi.mock('../../hooks/useRealtimeSubscription', () => ({
  getRealtimeClient: () => mockGetRealtimeClient(),
  isRealtimeAvailable: () => mockIsRealtimeAvailable(),
}));

// Mock supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-1' }, error: null })),
        })),
      })),
    })),
  },
  isSupabaseEnabled: vi.fn(() => true),
}));

// Mock pagination utility
vi.mock('../../utils/supabasePagination', () => ({
  fetchAllPaginated: vi.fn(() => Promise.resolve([])),
}));

import { useServicesStore } from '../useServicesStore';

describe('useServicesStore realtime subscriptions', () => {
  let mockChannel;
  let mockClient;
  let subscribeCallbacks = {};

  beforeEach(() => {
    // Reset store state
    useServicesStore.setState({
      showerRecords: [],
      laundryRecords: [],
      bicycleRecords: [],
    });

    subscribeCallbacks = {};

    mockChannel = {
      on: vi.fn((event, config, callback) => {
        subscribeCallbacks[config.table] = callback;
        return mockChannel;
      }),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      }),
    };

    mockClient = {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
    };

    mockGetRealtimeClient.mockReturnValue(mockClient);
    mockIsRealtimeAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeToRealtime', () => {
    it('creates channels for all service tables', () => {
      const { subscribeToRealtime } = useServicesStore.getState();
      
      act(() => {
        subscribeToRealtime();
      });

      expect(mockClient.channel).toHaveBeenCalledWith('services-showers');
      expect(mockClient.channel).toHaveBeenCalledWith('services-laundry');
      expect(mockClient.channel).toHaveBeenCalledWith('services-bicycles');
    });

    it('returns a cleanup function', () => {
      const { subscribeToRealtime } = useServicesStore.getState();
      
      let cleanup;
      act(() => {
        cleanup = subscribeToRealtime();
      });

      expect(typeof cleanup).toBe('function');
    });

    it('does nothing when realtime is not available', () => {
      mockIsRealtimeAvailable.mockReturnValue(false);
      
      const { subscribeToRealtime } = useServicesStore.getState();
      
      act(() => {
        subscribeToRealtime();
      });

      expect(mockClient.channel).not.toHaveBeenCalled();
    });
  });

  describe('realtime event handling', () => {
    it('adds new shower record on INSERT event', () => {
      const { subscribeToRealtime } = useServicesStore.getState();
      
      act(() => {
        subscribeToRealtime();
      });

      // Simulate INSERT event
      const callback = subscribeCallbacks['shower_reservations'];
      expect(callback).toBeDefined();

      act(() => {
        callback({
          eventType: 'INSERT',
          new: {
            id: 'shower-1',
            guest_id: 'guest-1',
            scheduled_for: '2024-01-25',
            scheduled_time: '10:00',
            status: 'booked',
            created_at: new Date().toISOString(),
          },
          old: null,
        });
      });

      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
      expect(showerRecords[0].id).toBe('shower-1');
    });

    it('updates existing shower record on UPDATE event', () => {
      // Pre-populate with a record
      useServicesStore.setState({
        showerRecords: [{
          id: 'shower-1',
          guestId: 'guest-1',
          date: '2024-01-25',
          time: '10:00',
          status: 'booked',
        }],
      });

      const { subscribeToRealtime } = useServicesStore.getState();
      
      act(() => {
        subscribeToRealtime();
      });

      // Simulate UPDATE event
      const callback = subscribeCallbacks['shower_reservations'];
      
      act(() => {
        callback({
          eventType: 'UPDATE',
          new: {
            id: 'shower-1',
            guest_id: 'guest-1',
            scheduled_for: '2024-01-25',
            scheduled_time: '10:00',
            status: 'completed',
            created_at: new Date().toISOString(),
          },
          old: {
            id: 'shower-1',
            status: 'booked',
          },
        });
      });

      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
      expect(showerRecords[0].status).toBe('completed');
    });

    it('removes shower record on DELETE event', () => {
      // Pre-populate with a record
      useServicesStore.setState({
        showerRecords: [{
          id: 'shower-1',
          guestId: 'guest-1',
          date: '2024-01-25',
        }],
      });

      const { subscribeToRealtime } = useServicesStore.getState();
      
      act(() => {
        subscribeToRealtime();
      });

      // Simulate DELETE event
      const callback = subscribeCallbacks['shower_reservations'];
      
      act(() => {
        callback({
          eventType: 'DELETE',
          new: null,
          old: { id: 'shower-1' },
        });
      });

      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(0);
    });

    it('handles laundry INSERT events', () => {
      const { subscribeToRealtime } = useServicesStore.getState();
      
      act(() => {
        subscribeToRealtime();
      });

      const callback = subscribeCallbacks['laundry_bookings'];
      
      act(() => {
        callback({
          eventType: 'INSERT',
          new: {
            id: 'laundry-1',
            guest_id: 'guest-1',
            slot_label: 'A1',
            laundry_type: 'Onsite',
            bag_number: 1,
            scheduled_for: '2024-01-25',
            status: 'booked',
            created_at: new Date().toISOString(),
          },
          old: null,
        });
      });

      const { laundryRecords } = useServicesStore.getState();
      expect(laundryRecords).toHaveLength(1);
      expect(laundryRecords[0].id).toBe('laundry-1');
    });

    it('handles bicycle INSERT events', () => {
      const { subscribeToRealtime } = useServicesStore.getState();
      
      act(() => {
        subscribeToRealtime();
      });

      const callback = subscribeCallbacks['bicycle_repairs'];
      
      act(() => {
        callback({
          eventType: 'INSERT',
          new: {
            id: 'bicycle-1',
            guest_id: 'guest-1',
            requested_at: new Date().toISOString(),
            repair_type: 'Flat tire',
            repair_types: ['Flat tire'],
            notes: 'Front wheel',
            status: 'pending',
            priority: 1,
          },
          old: null,
        });
      });

      const { bicycleRecords } = useServicesStore.getState();
      expect(bicycleRecords).toHaveLength(1);
      expect(bicycleRecords[0].id).toBe('bicycle-1');
    });

    it('does not add duplicate records on INSERT', () => {
      // Pre-populate with a record
      useServicesStore.setState({
        showerRecords: [{
          id: 'shower-1',
          guestId: 'guest-1',
          date: '2024-01-25',
        }],
      });

      const { subscribeToRealtime } = useServicesStore.getState();
      
      act(() => {
        subscribeToRealtime();
      });

      const callback = subscribeCallbacks['shower_reservations'];
      
      // Try to insert a record with the same ID
      act(() => {
        callback({
          eventType: 'INSERT',
          new: {
            id: 'shower-1',
            guest_id: 'guest-1',
            scheduled_for: '2024-01-25',
            created_at: new Date().toISOString(),
          },
          old: null,
        });
      });

      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
    });
  });

  describe('unsubscribeFromRealtime', () => {
    it('removes all channels', () => {
      // First, ensure we start clean by unsubscribing any existing
      const { unsubscribeFromRealtime: cleanupPrevious } = useServicesStore.getState();
      act(() => {
        cleanupPrevious();
      });
      vi.clearAllMocks();

      const { subscribeToRealtime, unsubscribeFromRealtime } = useServicesStore.getState();
      
      act(() => {
        subscribeToRealtime();
      });

      act(() => {
        unsubscribeFromRealtime();
      });

      expect(mockClient.removeChannel).toHaveBeenCalledTimes(3);
    });
  });
});
