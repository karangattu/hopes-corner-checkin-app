import { describe, it, expect } from 'vitest';
import { mapShowerRow, mapLaundryRow } from '../mappers';

const isValidIso = (value) => {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

describe('mappers date fallbacks', () => {
  it('mapShowerRow returns valid date even when scheduled fields missing', () => {
    const mapped = mapShowerRow({ id: 1, guest_id: 'g1', status: 'booked' });
    expect(mapped.date).toBeTruthy();
    expect(isValidIso(mapped.date)).toBe(true);
  });

  it('mapLaundryRow returns valid date even when slot and schedule missing', () => {
    const mapped = mapLaundryRow({ id: 2, guest_id: 'g2', status: 'waiting' });
    expect(mapped.date).toBeTruthy();
    expect(isValidIso(mapped.date)).toBe(true);
  });
});
