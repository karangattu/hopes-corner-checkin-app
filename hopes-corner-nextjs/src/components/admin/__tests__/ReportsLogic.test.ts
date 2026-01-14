import { describe, it, expect } from 'vitest';

describe('Reports logic', () => {
    describe('MonthlySummaryReport calculations', () => {
        const mockData = {
            meals: [
                { date: '2025-01-01', count: 50, guestId: 'g1' },
                { date: '2025-01-01', count: 60, guestId: 'g2' },
                { date: '2025-01-08', count: 45, guestId: 'g1' },
            ],
            showers: [
                { date: '2025-01-01', status: 'completed' },
                { date: '2025-01-01', status: 'no-show' },
            ],
            laundry: [
                { date: '2025-01-01', loadsQuantity: 2 },
            ]
        };

        it('calculates total meals per day', () => {
            const mealsOnJan1 = mockData.meals.filter(m => m.date === '2025-01-01');
            const total = mealsOnJan1.reduce((sum, m) => sum + m.count, 0);
            expect(total).toBe(110);
        });

        it('calculates unique guests per day', () => {
            const mealsOnJan1 = mockData.meals.filter(m => m.date === '2025-01-01');
            const uniqueGuests = new Set(mealsOnJan1.map(m => m.guestId));
            expect(uniqueGuests.size).toBe(2);
        });

        it('calculates total completed showers', () => {
            const completed = mockData.showers.filter(s => s.status === 'completed');
            expect(completed.length).toBe(1);
        });

        it('calculates total laundry loads', () => {
            const totalLoads = mockData.laundry.reduce((sum, l) => sum + l.loadsQuantity, 0);
            expect(totalLoads).toBe(2);
        });

        it('handles empty data', () => {
            const emptyData: any[] = [];
            const total = emptyData.reduce((sum, r) => sum + (r.count || 0), 0);
            expect(total).toBe(0);
        });
    });

    describe('MealReport logic', () => {
        const mealRecords = [
            { type: 'guest', count: 100, age: 'Adult 18-59' },
            { type: 'rv', count: 50, age: 'Senior 60+' },
            { type: 'guest', count: 30, age: 'Child 0-17' },
        ];

        it('groups by meal type', () => {
            const grouped: Record<string, number> = {};
            mealRecords.forEach(r => {
                grouped[r.type] = (grouped[r.type] || 0) + r.count;
            });
            expect(grouped.guest).toBe(130);
            expect(grouped.rv).toBe(50);
        });

        it('groups by age group', () => {
            const grouped: Record<string, number> = {};
            mealRecords.forEach(r => {
                grouped[r.age] = (grouped[r.age] || 0) + r.count;
            });
            expect(grouped['Adult 18-59']).toBe(100);
            expect(grouped['Senior 60+']).toBe(50);
            expect(grouped['Child 0-17']).toBe(30);
        });

        it('calculates percentages for charts', () => {
            const total = mealRecords.reduce((sum, r) => sum + r.count, 0);
            const guestPercent = (130 / total) * 100;
            expect(guestPercent).toBeCloseTo(72.22, 1);
        });
    });

    describe('CSV formatting for reports', () => {
        it('formats summary row', () => {
            const date = '2025-01-01';
            const meals = 110;
            const showers = 15;
            const csvRow = [date, meals, showers].join(',');
            expect(csvRow).toBe('2025-01-01,110,15');
        });

        it('handles null values in CSV export', () => {
            const row = { date: '2025-01-01', count: null };
            const csvRow = [row.date, row.count ?? 0].join(',');
            expect(csvRow).toBe('2025-01-01,0');
        });
    });
});
