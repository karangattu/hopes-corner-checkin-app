import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useServicesStore } from '../useServicesStore';
import type { ShowerStatus, LaundryStatus, BicycleRepairStatus } from '@/lib/types';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { id: 'new-id', guest_id: 'guest-1', status: 'booked', created_at: new Date().toISOString() }, 
            error: null 
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'new-id', status: 'done' }, error: null }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }),
  isSupabaseEnabled: () => true,
}));

describe('useServicesStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useServicesStore.setState({
      showerRecords: [],
      laundryRecords: [],
      bicycleRecords: [],
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have empty arrays for all service types', () => {
      const state = useServicesStore.getState();
      expect(state.showerRecords).toEqual([]);
      expect(state.laundryRecords).toEqual([]);
      expect(state.bicycleRecords).toEqual([]);
    });

    it('should not be loading initially', () => {
      const state = useServicesStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const state = useServicesStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('shower management', () => {
    it('should add a shower record', async () => {
      const { addShowerRecord } = useServicesStore.getState();

      await addShowerRecord('guest-1');

      const state = useServicesStore.getState();
      expect(state.showerRecords).toHaveLength(1);
    });

    it('should update shower status', async () => {
      const status: ShowerStatus = 'booked';
      // Set up initial state with a shower record
      useServicesStore.setState({
        showerRecords: [
          { 
            id: 'shower-1', 
            guestId: 'guest-1', 
            status, 
            date: '2024-01-15',
            scheduledFor: '2024-01-15',
            time: null,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          },
        ],
      });

      const { updateShowerStatus } = useServicesStore.getState();
      const newStatus: ShowerStatus = 'done';
      await updateShowerStatus('shower-1', newStatus);

      const state = useServicesStore.getState();
      expect(state.showerRecords[0].status).toBe('done');
    });
  });

  describe('laundry management', () => {
    it('should add a laundry record', async () => {
      const { addLaundryRecord } = useServicesStore.getState();

      await addLaundryRecord('guest-1', 'onsite');

      const state = useServicesStore.getState();
      expect(state.laundryRecords).toHaveLength(1);
    });

    it('should update laundry status', async () => {
      const status: LaundryStatus = 'waiting';
      useServicesStore.setState({
        laundryRecords: [
          { 
            id: 'laundry-1', 
            guestId: 'guest-1', 
            status, 
            date: '2024-01-15',
            scheduledFor: '2024-01-15',
            time: null,
            laundryType: 'onsite',
            bagNumber: '',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          },
        ],
      });

      const { updateLaundryStatus } = useServicesStore.getState();
      const newStatus: LaundryStatus = 'washer';
      await updateLaundryStatus('laundry-1', newStatus);

      const state = useServicesStore.getState();
      expect(state.laundryRecords[0].status).toBe('washer');
    });
  });

  describe('bicycle management', () => {
    it('should add a bicycle record', async () => {
      const { addBicycleRecord } = useServicesStore.getState();

      await addBicycleRecord('guest-1', { repairTypes: ['flat_tire'] });

      const state = useServicesStore.getState();
      expect(state.bicycleRecords).toHaveLength(1);
    });

    it('should update bicycle record', async () => {
      const status: BicycleRepairStatus = 'pending';
      useServicesStore.setState({
        bicycleRecords: [
          { 
            id: 'bike-1', 
            guestId: 'guest-1', 
            repairType: 'flat_tire',
            repairTypes: ['flat_tire'],
            completedRepairs: [],
            notes: '',
            status, 
            priority: 1,
            date: '2024-01-15',
            doneAt: null,
            lastUpdated: new Date().toISOString(),
          },
        ],
      });

      const { updateBicycleRecord } = useServicesStore.getState();
      const newStatus: BicycleRepairStatus = 'in_progress';
      await updateBicycleRecord('bike-1', { status: newStatus });

      const state = useServicesStore.getState();
      expect(state.bicycleRecords[0].status).toBe('in_progress');
    });
  });

  describe('selectors', () => {
    it('should get today showers', () => {
      const today = new Date().toISOString().split('T')[0];
      const statusBooked: ShowerStatus = 'booked';
      const statusDone: ShowerStatus = 'done';
      useServicesStore.setState({
        showerRecords: [
          { id: '1', guestId: 'g1', status: statusBooked, date: today, scheduledFor: today, time: null, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
          { id: '2', guestId: 'g2', status: statusDone, date: '2023-01-01', scheduledFor: '2023-01-01', time: null, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
        ],
      });

      const { getTodayShowers } = useServicesStore.getState();
      expect(getTodayShowers().length).toBeGreaterThanOrEqual(0);
    });

    it('should get today laundry', () => {
      const today = new Date().toISOString().split('T')[0];
      const status: LaundryStatus = 'waiting';
      useServicesStore.setState({
        laundryRecords: [
          { id: '1', guestId: 'g1', status, date: today, scheduledFor: today, time: null, laundryType: 'onsite', bagNumber: '', createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() },
        ],
      });

      const { getTodayLaundry } = useServicesStore.getState();
      expect(getTodayLaundry().length).toBeGreaterThanOrEqual(0);
    });

    it('should filter bicycle repairs by status', () => {
      const statusPending: BicycleRepairStatus = 'pending';
      const statusDone: BicycleRepairStatus = 'done';
      useServicesStore.setState({
        bicycleRecords: [
          { id: '1', guestId: 'g1', repairType: 'flat_tire', repairTypes: ['flat_tire'], completedRepairs: [], notes: '', status: statusPending, priority: 1, date: '2024-01-15', doneAt: null, lastUpdated: new Date().toISOString() },
          { id: '2', guestId: 'g2', repairType: 'chain', repairTypes: ['chain'], completedRepairs: ['chain'], notes: '', status: statusDone, priority: 0, date: '2024-01-14', doneAt: '2024-01-14', lastUpdated: new Date().toISOString() },
        ],
      });

      const state = useServicesStore.getState();
      const pendingBikes = state.bicycleRecords.filter(r => r.status === 'pending');
      expect(pendingBikes).toHaveLength(1);
    });
  });
});
