import { describe, it, expect } from 'vitest';
import { isBicycleStatusCountable, getBicycleServiceCount } from '../bicycles';

describe('bicycles utilities', () => {
  describe('isBicycleStatusCountable', () => {
    it('returns true for done status', () => {
      expect(isBicycleStatusCountable('done')).toBe(true);
    });

    it('returns true for pending status', () => {
      expect(isBicycleStatusCountable('pending')).toBe(true);
    });

    it('returns true for in_progress status', () => {
      expect(isBicycleStatusCountable('in_progress')).toBe(true);
    });

    it('returns true for completed status', () => {
      expect(isBicycleStatusCountable('completed')).toBe(true);
    });

    it('returns true for ready status', () => {
      expect(isBicycleStatusCountable('ready')).toBe(true);
    });

    it('returns true for finished status', () => {
      expect(isBicycleStatusCountable('finished')).toBe(true);
    });

    it('returns true for empty string', () => {
      expect(isBicycleStatusCountable('')).toBe(true);
    });

    it('returns true for null', () => {
      expect(isBicycleStatusCountable(null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(isBicycleStatusCountable(undefined)).toBe(true);
    });

    it('returns false for cancelled status', () => {
      expect(isBicycleStatusCountable('cancelled')).toBe(false);
    });

    it('returns false for rejected status', () => {
      expect(isBicycleStatusCountable('rejected')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isBicycleStatusCountable('DONE')).toBe(true);
      expect(isBicycleStatusCountable('Done')).toBe(true);
      expect(isBicycleStatusCountable('PENDING')).toBe(true);
    });

    it('trims whitespace', () => {
      expect(isBicycleStatusCountable('  done  ')).toBe(true);
      expect(isBicycleStatusCountable('\tpending\n')).toBe(true);
    });
  });

  describe('getBicycleServiceCount', () => {
    it('returns 0 for null record', () => {
      expect(getBicycleServiceCount(null)).toBe(0);
    });

    it('returns 0 for undefined record', () => {
      expect(getBicycleServiceCount(undefined)).toBe(0);
    });

    it('returns 1 for record without repair types', () => {
      expect(getBicycleServiceCount({})).toBe(1);
    });

    it('returns 1 for record with empty repair types array', () => {
      expect(getBicycleServiceCount({ repairTypes: [] })).toBe(1);
    });

    it('returns count of repair types', () => {
      expect(getBicycleServiceCount({ repairTypes: ['Flat Tire'] })).toBe(1);
      expect(getBicycleServiceCount({ repairTypes: ['Flat Tire', 'Brakes'] })).toBe(2);
      expect(getBicycleServiceCount({ repairTypes: ['Flat Tire', 'Brakes', 'Chain'] })).toBe(3);
    });

    it('filters out null repair types', () => {
      expect(getBicycleServiceCount({ repairTypes: ['Flat Tire', null, 'Brakes'] })).toBe(2);
    });

    it('filters out undefined repair types', () => {
      expect(getBicycleServiceCount({ repairTypes: ['Flat Tire', undefined, 'Brakes'] })).toBe(2);
    });

    it('filters out empty string repair types', () => {
      expect(getBicycleServiceCount({ repairTypes: ['Flat Tire', '', 'Brakes'] })).toBe(2);
    });

    it('filters out whitespace-only repair types', () => {
      expect(getBicycleServiceCount({ repairTypes: ['Flat Tire', '  ', 'Brakes'] })).toBe(2);
    });

    it('returns 1 if all repair types are invalid', () => {
      expect(getBicycleServiceCount({ repairTypes: [null, undefined, ''] })).toBe(1);
    });
  });
});
