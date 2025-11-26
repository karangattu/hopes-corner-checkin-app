import { describe, it, expect } from 'vitest';
import { mapLaPlazaDonationRow } from '../mappers';

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
