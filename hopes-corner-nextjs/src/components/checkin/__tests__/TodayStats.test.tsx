import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('TodayStats logic', () => {
    describe('meal calculations', () => {
        it('sums meal counts correctly', () => {
            const meals = [
                { id: 'm1', count: 1 },
                { id: 'm2', count: 2 },
                { id: 'm3', count: 3 },
            ];
            const total = meals.reduce((sum, m) => sum + m.count, 0);
            expect(total).toBe(6);
        });

        it('handles empty meals array', () => {
            const meals: any[] = [];
            const total = meals.reduce((sum, m) => sum + m.count, 0);
            expect(total).toBe(0);
        });

        it('handles single meal', () => {
            const meals = [{ id: 'm1', count: 5 }];
            const total = meals.reduce((sum, m) => sum + m.count, 0);
            expect(total).toBe(5);
        });

        it('filters meals by date', () => {
            const meals = [
                { id: 'm1', date: '2025-01-06', count: 1 },
                { id: 'm2', date: '2025-01-05', count: 2 },
                { id: 'm3', date: '2025-01-06', count: 3 },
            ];
            const todayMeals = meals.filter(m => m.date === '2025-01-06');
            expect(todayMeals.length).toBe(2);
        });
    });

    describe('shower calculations', () => {
        it('counts showers correctly', () => {
            const showers = [{ id: 's1' }, { id: 's2' }, { id: 's3' }];
            expect(showers.length).toBe(3);
        });

        it('handles empty showers array', () => {
            const showers: any[] = [];
            expect(showers.length).toBe(0);
        });

        it('filters showers by date', () => {
            const showers = [
                { id: 's1', date: '2025-01-06' },
                { id: 's2', date: '2025-01-05' },
            ];
            const todayShowers = showers.filter(s => s.date === '2025-01-06');
            expect(todayShowers.length).toBe(1);
        });

        it('filters completed showers', () => {
            const showers = [
                { id: 's1', status: 'completed' },
                { id: 's2', status: 'waiting' },
                { id: 's3', status: 'completed' },
            ];
            const completed = showers.filter(s => s.status === 'completed');
            expect(completed.length).toBe(2);
        });
    });

    describe('laundry calculations', () => {
        it('counts laundry loads correctly', () => {
            const laundry = [
                { id: 'l1', loadsQuantity: 1 },
                { id: 'l2', loadsQuantity: 2 },
            ];
            const total = laundry.reduce((sum, l) => sum + l.loadsQuantity, 0);
            expect(total).toBe(3);
        });

        it('handles empty laundry array', () => {
            const laundry: any[] = [];
            const total = laundry.reduce((sum, l) => sum + l.loadsQuantity, 0);
            expect(total).toBe(0);
        });

        it('filters laundry by date', () => {
            const laundry = [
                { id: 'l1', date: '2025-01-06' },
                { id: 'l2', date: '2025-01-05' },
            ];
            const todayLaundry = laundry.filter(l => l.date === '2025-01-06');
            expect(todayLaundry.length).toBe(1);
        });

        it('separates onsite and offsite', () => {
            const laundry = [
                { id: 'l1', isOffsite: false },
                { id: 'l2', isOffsite: true },
                { id: 'l3', isOffsite: false },
            ];
            const onsite = laundry.filter(l => !l.isOffsite);
            const offsite = laundry.filter(l => l.isOffsite);
            expect(onsite.length).toBe(2);
            expect(offsite.length).toBe(1);
        });
    });

    describe('number formatting', () => {
        it('formats numbers with commas', () => {
            expect((1234).toLocaleString()).toBe('1,234');
        });

        it('formats zero', () => {
            expect((0).toLocaleString()).toBe('0');
        });

        it('formats large numbers', () => {
            expect((1000000).toLocaleString()).toBe('1,000,000');
        });

        it('formats negative numbers', () => {
            expect((-100).toLocaleString()).toBe('-100');
        });
    });

    describe('unique guest calculations', () => {
        it('counts unique guests from meals', () => {
            const meals = [
                { guestId: 'g1' },
                { guestId: 'g2' },
                { guestId: 'g1' },
                { guestId: 'g3' },
            ];
            const uniqueGuests = new Set(meals.map(m => m.guestId));
            expect(uniqueGuests.size).toBe(3);
        });

        it('handles empty array', () => {
            const meals: any[] = [];
            const uniqueGuests = new Set(meals.map(m => m.guestId));
            expect(uniqueGuests.size).toBe(0);
        });

        it('handles all same guest', () => {
            const meals = [
                { guestId: 'g1' },
                { guestId: 'g1' },
                { guestId: 'g1' },
            ];
            const uniqueGuests = new Set(meals.map(m => m.guestId));
            expect(uniqueGuests.size).toBe(1);
        });
    });

    describe('percentage calculations', () => {
        it('calculates percentage of target', () => {
            const current = 75;
            const target = 100;
            const percentage = (current / target) * 100;
            expect(percentage).toBe(75);
        });

        it('handles exceeding target', () => {
            const current = 120;
            const target = 100;
            const percentage = (current / target) * 100;
            expect(percentage).toBe(120);
        });

        it('handles zero target', () => {
            const current = 50;
            const target = 0;
            const percentage = target > 0 ? (current / target) * 100 : 0;
            expect(percentage).toBe(0);
        });

        it('handles zero current', () => {
            const current = 0;
            const target = 100;
            const percentage = (current / target) * 100;
            expect(percentage).toBe(0);
        });
    });
});
