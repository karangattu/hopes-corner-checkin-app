import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useServicesStore } from '../../stores/useServicesStore';

// Mock Supabase modules  
vi.mock('../../supabaseClient', () => ({
  supabase: null,
  isSupabaseEnabled: () => false,
}));

vi.mock('../../hooks/useRealtimeSubscription', () => ({
  getRealtimeClient: () => null,
  isRealtimeAvailable: () => false,
}));

describe('useServicesStore - syncFromMutation', () => {
  beforeEach(() => {
    // Reset store to clean state
    useServicesStore.setState({
      showerRecords: [],
      laundryRecords: [],
      bicycleRecords: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('syncShowerFromMutation', () => {
    it('should add a new shower record', () => {
      const record = { id: 'shower-1', guestId: 'g1', status: 'booked', time: '9:00 AM' };
      
      useServicesStore.getState().syncShowerFromMutation('add', record);
      
      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
      expect(showerRecords[0]).toEqual(record);
    });

    it('should not add duplicate shower record', () => {
      const record = { id: 'shower-1', guestId: 'g1', status: 'booked' };
      
      // Add the record once
      useServicesStore.setState({ showerRecords: [record] });
      
      // Try to add the same record again
      useServicesStore.getState().syncShowerFromMutation('add', record);
      
      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
    });

    it('should update an existing shower record', () => {
      const original = { id: 'shower-1', guestId: 'g1', status: 'booked', time: '9:00 AM' };
      useServicesStore.setState({ showerRecords: [original] });
      
      const updated = { ...original, status: 'done' };
      useServicesStore.getState().syncShowerFromMutation('update', updated);
      
      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
      expect(showerRecords[0].status).toBe('done');
    });

    it('should add record if update target does not exist', () => {
      const record = { id: 'shower-new', guestId: 'g1', status: 'booked' };
      
      useServicesStore.getState().syncShowerFromMutation('update', record);
      
      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
      expect(showerRecords[0].id).toBe('shower-new');
    });

    it('should remove a shower record', () => {
      const record = { id: 'shower-1', guestId: 'g1', status: 'booked' };
      useServicesStore.setState({ showerRecords: [record] });
      
      useServicesStore.getState().syncShowerFromMutation('remove', record);
      
      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(0);
    });

    it('should handle bulk remove', () => {
      const records = [
        { id: 'shower-1', guestId: 'g1', status: 'booked' },
        { id: 'shower-2', guestId: 'g2', status: 'booked' },
        { id: 'shower-3', guestId: 'g3', status: 'done' },
      ];
      useServicesStore.setState({ showerRecords: records });
      
      useServicesStore.getState().syncShowerFromMutation('bulkRemove', [
        { id: 'shower-1' },
        { id: 'shower-2' },
      ]);
      
      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
      expect(showerRecords[0].id).toBe('shower-3');
    });

    it('should not affect other records when adding', () => {
      const existing = { id: 'shower-1', guestId: 'g1', status: 'booked' };
      useServicesStore.setState({ showerRecords: [existing] });
      
      const newRecord = { id: 'shower-2', guestId: 'g2', status: 'booked' };
      useServicesStore.getState().syncShowerFromMutation('add', newRecord);
      
      const { showerRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(2);
      expect(showerRecords[0]).toEqual(existing);
      expect(showerRecords[1]).toEqual(newRecord);
    });
  });

  describe('syncLaundryFromMutation', () => {
    it('should add a new laundry record', () => {
      const record = { id: 'laundry-1', guestId: 'g1', status: 'waiting', laundryType: 'onsite' };
      
      useServicesStore.getState().syncLaundryFromMutation('add', record);
      
      const { laundryRecords } = useServicesStore.getState();
      expect(laundryRecords).toHaveLength(1);
      expect(laundryRecords[0]).toEqual(record);
    });

    it('should not add duplicate laundry record', () => {
      const record = { id: 'laundry-1', guestId: 'g1', status: 'waiting' };
      useServicesStore.setState({ laundryRecords: [record] });
      
      useServicesStore.getState().syncLaundryFromMutation('add', record);
      
      const { laundryRecords } = useServicesStore.getState();
      expect(laundryRecords).toHaveLength(1);
    });

    it('should update an existing laundry record', () => {
      const original = { id: 'laundry-1', guestId: 'g1', status: 'waiting', bagNumber: '' };
      useServicesStore.setState({ laundryRecords: [original] });
      
      const updated = { ...original, status: 'washing', bagNumber: 'B42' };
      useServicesStore.getState().syncLaundryFromMutation('update', updated);
      
      const { laundryRecords } = useServicesStore.getState();
      expect(laundryRecords).toHaveLength(1);
      expect(laundryRecords[0].status).toBe('washing');
      expect(laundryRecords[0].bagNumber).toBe('B42');
    });

    it('should remove a laundry record', () => {
      const record = { id: 'laundry-1', guestId: 'g1', status: 'waiting' };
      useServicesStore.setState({ laundryRecords: [record] });
      
      useServicesStore.getState().syncLaundryFromMutation('remove', record);
      
      const { laundryRecords } = useServicesStore.getState();
      expect(laundryRecords).toHaveLength(0);
    });

    it('should handle bulk remove for laundry', () => {
      const records = [
        { id: 'laundry-1', guestId: 'g1', status: 'waiting' },
        { id: 'laundry-2', guestId: 'g2', status: 'washing' },
        { id: 'laundry-3', guestId: 'g3', status: 'done' },
      ];
      useServicesStore.setState({ laundryRecords: records });
      
      useServicesStore.getState().syncLaundryFromMutation('bulkRemove', [
        { id: 'laundry-1' },
        { id: 'laundry-3' },
      ]);
      
      const { laundryRecords } = useServicesStore.getState();
      expect(laundryRecords).toHaveLength(1);
      expect(laundryRecords[0].id).toBe('laundry-2');
    });

    it('should add record if update target does not exist in laundry', () => {
      const record = { id: 'laundry-new', guestId: 'g1', status: 'waiting' };
      
      useServicesStore.getState().syncLaundryFromMutation('update', record);
      
      const { laundryRecords } = useServicesStore.getState();
      expect(laundryRecords).toHaveLength(1);
      expect(laundryRecords[0].id).toBe('laundry-new');
    });
  });

  describe('cross-store isolation', () => {
    it('should not affect laundry records when syncing showers', () => {
      const laundryRecord = { id: 'laundry-1', guestId: 'g1', status: 'waiting' };
      useServicesStore.setState({ laundryRecords: [laundryRecord] });
      
      const showerRecord = { id: 'shower-1', guestId: 'g1', status: 'booked' };
      useServicesStore.getState().syncShowerFromMutation('add', showerRecord);
      
      const { showerRecords, laundryRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
      expect(laundryRecords).toHaveLength(1);
      expect(laundryRecords[0]).toEqual(laundryRecord);
    });

    it('should not affect shower records when syncing laundry', () => {
      const showerRecord = { id: 'shower-1', guestId: 'g1', status: 'booked' };
      useServicesStore.setState({ showerRecords: [showerRecord] });
      
      const laundryRecord = { id: 'laundry-1', guestId: 'g1', status: 'waiting' };
      useServicesStore.getState().syncLaundryFromMutation('add', laundryRecord);
      
      const { showerRecords, laundryRecords } = useServicesStore.getState();
      expect(showerRecords).toHaveLength(1);
      expect(laundryRecords).toHaveLength(1);
      expect(showerRecords[0]).toEqual(showerRecord);
    });
  });
});
