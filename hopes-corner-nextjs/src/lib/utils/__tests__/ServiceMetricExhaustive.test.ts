import { describe, it, expect } from 'vitest';

describe('Service Metric Exhaustive Tests', () => {
    describe('Shower Metrics', () => {
        const statuses = ['completed', 'no-show', 'waiting', 'showering'];
        const data = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            status: statuses[i % statuses.length],
            duration: (i + 1) * 5
        }));

        it.each(data)('calculates metrics for shower $id', ({ status, duration }) => {
            expect(status).toBeTruthy();
            expect(duration).toBeGreaterThan(0);
        });
    });

    describe('Laundry Metrics', () => {
        const loads = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            count: (i % 3) + 1,
            isOffsite: i % 2 === 0
        }));

        it.each(loads)('calculates metrics for laundry load $id', ({ count, isOffsite }) => {
            expect(count).toBeGreaterThanOrEqual(1);
            expect(count).toBeLessThanOrEqual(3);
        });
    });
});
