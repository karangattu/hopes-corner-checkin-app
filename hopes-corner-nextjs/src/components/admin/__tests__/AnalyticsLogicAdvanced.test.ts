import { describe, it, expect } from 'vitest';

describe('Analytics Logic Advanced Tests', () => {
    describe('Percentage Change Calculations', () => {
        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        it('calculates increase', () => {
            expect(calculateChange(150, 100)).toBe(50);
        });

        it('calculates decrease', () => {
            expect(calculateChange(80, 100)).toBe(-20);
        });

        it('handles zero previous value', () => {
            expect(calculateChange(100, 0)).toBe(100);
        });

        it('handles double zeros', () => {
            expect(calculateChange(0, 0)).toBe(0);
        });
    });

    describe('Demographic Aggregations', () => {
        const guests = [
            { gender: 'Male', age: 'Adult 18-59', housingStatus: 'unhoused' },
            { gender: 'Female', age: 'Senior 60+', housingStatus: 'housed' },
            { gender: 'Male', age: 'Adult 18-59', housingStatus: 'housed' },
            { gender: 'Male', age: 'Senior 60+', housingStatus: 'unhoused' },
        ];

        it('breaks down by gender', () => {
            const result = guests.reduce((acc: any, g) => {
                acc[g.gender] = (acc[g.gender] || 0) + 1;
                return acc;
            }, {});
            expect(result.Male).toBe(3);
            expect(result.Female).toBe(1);
        });

        it('breaks down by age group', () => {
            const result = guests.reduce((acc: any, g) => {
                acc[g.age] = (acc[g.age] || 0) + 1;
                return acc;
            }, {});
            expect(result['Adult 18-59']).toBe(2);
            expect(result['Senior 60+']).toBe(2);
        });

        it('calculates housing stability index', () => {
            const housedCount = guests.filter(g => g.housingStatus === 'housed').length;
            const index = (housedCount / guests.length) * 100;
            expect(index).toBe(50);
        });
    });

    describe('Trend Data Generation', () => {
        it('identifies growth trends', () => {
            const counts = [10, 12, 15, 14, 18, 20];
            const isGrowing = counts[counts.length - 1] > counts[0];
            expect(isGrowing).toBe(true);
        });

        it('calculates 7-day moving average', () => {
            const counts = [10, 20, 30, 40, 50, 60, 70, 80];
            const last7 = counts.slice(-7);
            const avg = last7.reduce((a, b) => a + b, 0) / 7;
            expect(avg).toBe(50);
        });
    });
});
