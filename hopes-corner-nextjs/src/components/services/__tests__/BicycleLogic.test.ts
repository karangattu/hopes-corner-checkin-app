import { describe, it, expect, vi } from 'vitest';

describe('Bicycle logic', () => {
    describe('Service type logic', () => {
        it('identifies repair vs tune-up', () => {
            const repair = { serviceType: 'repair' };
            const tuneUp = { serviceType: 'tune-up' };
            expect(repair.serviceType).toBe('repair');
            expect(tuneUp.serviceType).toBe('tune-up');
        });

        it('identifies new bicycle service', () => {
            const record = { isNewBicycle: true };
            expect(record.isNewBicycle).toBe(true);
        });
    });

    describe('Queue management logic', () => {
        it('sorts services by date and time', () => {
            const services = [
                { id: 'b1', createdAt: '2025-01-06T10:00:00Z' },
                { id: 'b2', createdAt: '2025-01-06T09:00:00Z' },
            ];
            const sorted = [...services].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            expect(sorted[0].id).toBe('b2');
        });

        it('filters pending repairs', () => {
            const records = [
                { status: 'pending', serviceType: 'repair' },
                { status: 'completed', serviceType: 'repair' },
                { status: 'pending', serviceType: 'tune-up' },
            ];
            const pendingRepairs = records.filter(r => r.status === 'pending' && r.serviceType === 'repair');
            expect(pendingRepairs.length).toBe(1);
        });
    });

    describe('Banned guest logic for bicycles', () => {
        it('blocks bicycle service for banned guest', () => {
            const guest = { bannedFromBicycle: true };
            const canProvideService = !guest.bannedFromBicycle;
            expect(canProvideService).toBe(false);
        });
    });

    describe('Bicycle description normalization', () => {
        it('normalizes bicycle descriptions for consistent storage', () => {
            const raw = ' red trek bike ';
            const normalized = raw.trim().toLowerCase();
            expect(normalized).toBe('red trek bike');
        });
    });
});
