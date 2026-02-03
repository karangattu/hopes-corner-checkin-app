import { describe, it, expect } from 'vitest';
import { mapLaPlazaDonationRow, mapLaundryRow } from '../mappers';

describe('mapLaPlazaDonationRow', () => {
  it('maps DB row fields to app shape using persisted date_key', () => {
    const row = {
      id: 'uuid-1',
      category: 'Produce',
      weight_lbs: '12.50',
      notes: 'Fresh produce',
      received_at: '2025-01-05T12:00:00.000Z',
      date_key: '2025-01-05',
      created_at: '2025-01-05T12:00:00.000Z',
    };

    const mapped = mapLaPlazaDonationRow(row);
    expect(mapped.id).toBe('uuid-1');
    expect(mapped.category).toBe('Produce');
    expect(mapped.weightLbs).toBeCloseTo(12.5);
    expect(mapped.notes).toBe('Fresh produce');
    expect(mapped.dateKey).toBe('2025-01-05');
    expect(mapped.receivedAt).toBe('2025-01-05T12:00:00.000Z');
  });

  it('handles missing date_key by returning null', () => {
    const row = {
      id: 'uuid-2',
      category: 'Bakery',
      weight_lbs: 5,
      notes: '',
      received_at: '2025-01-06T12:00:00.000Z',
      date_key: null,
      created_at: '2025-01-06T12:00:00.000Z',
    };

    const mapped = mapLaPlazaDonationRow(row);
    expect(mapped.dateKey).toBeNull();
    expect(mapped.receivedAt).toBe('2025-01-06T12:00:00.000Z');
  });
});

describe('mapLaundryRow', () => {
  it('uses scheduled_for date for offsite laundry regardless of updated_at', () => {
    // Scenario: Offsite laundry created on Monday (2025-01-27),
    // picked up on Wednesday (2025-01-29) which updates updated_at.
    // The date field should still be based on scheduled_for (Monday),
    // not updated_at (Wednesday).
    const row = {
      id: 'laundry-uuid-1',
      guest_id: 'guest-uuid-1',
      slot_label: null, // offsite laundry has no slot
      laundry_type: 'offsite',
      bag_number: 'BAG-42',
      scheduled_for: '2025-01-27', // Monday - drop-off date
      status: 'offsite_picked_up',
      created_at: '2025-01-27T10:00:00.000Z',
      updated_at: '2025-01-29T14:30:00.000Z', // Wednesday - pickup date
    };

    const mapped = mapLaundryRow(row);

    // Date should be based on scheduled_for, not updated_at
    expect(mapped.date).toContain('2025-01-27');
    expect(mapped.date).not.toContain('2025-01-29');
    expect(mapped.scheduledFor).toBe('2025-01-27');
    expect(mapped.laundryType).toBe('offsite');
    expect(mapped.status).toBe('offsite_picked_up');
  });

  it('uses slot time for onsite laundry date calculation', () => {
    const row = {
      id: 'laundry-uuid-2',
      guest_id: 'guest-uuid-2',
      slot_label: '09:00 - 10:00',
      laundry_type: 'onsite',
      bag_number: 'BAG-5',
      scheduled_for: '2025-01-29',
      status: 'done',
      created_at: '2025-01-29T09:00:00.000Z',
      updated_at: '2025-01-29T10:30:00.000Z',
    };

    const mapped = mapLaundryRow(row);

    // Date should be the scheduled_for date with slot start time
    expect(mapped.date).toContain('2025-01-29');
    expect(mapped.time).toBe('09:00 - 10:00');
    expect(mapped.laundryType).toBe('onsite');
  });

  it('allows guest to book new laundry even if old offsite laundry was picked up today', () => {
    // This tests the fix: Guest has offsite laundry from previous day,
    // picks it up today - they should NOT appear in "guestsWithLaundryToday"
    // because the laundry's date is the DROP-OFF date, not pickup date.
    const mondayDropoff = {
      id: 'old-laundry',
      guest_id: 'guest-1',
      slot_label: null,
      laundry_type: 'offsite',
      bag_number: 'BAG-OLD',
      scheduled_for: '2025-01-27', // Monday
      status: 'offsite_picked_up',
      created_at: '2025-01-27T08:00:00.000Z',
      updated_at: '2025-01-29T15:00:00.000Z', // Picked up Wednesday
    };

    const mapped = mapLaundryRow(mondayDropoff);

    // The date should be Monday (drop-off), NOT Wednesday (pickup)
    // This ensures the guest can book new laundry on Wednesday
    const dateStr = mapped.date.split('T')[0];
    expect(dateStr).toBe('2025-01-27');
  });
});
