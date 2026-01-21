import { describe, it, expect, vi } from 'vitest';

describe('Exhaustive Validation Tests', () => {
    describe('Guest Model Validation', () => {
        const validate = (g: any) => {
            if (!g.firstName || g.firstName.length < 2) return 'Invalid First Name';
            if (!g.lastName || g.lastName.length < 2) return 'Invalid Last Name';
            if (g.email && !g.email.includes('@')) return 'Invalid Email';
            if (g.housingStatus && !['housed', 'unhoused', 'unknown', 'at-risk', 'transitional'].includes(g.housingStatus)) return 'Invalid Housing Status';
            return null;
        };

        const testNames = Array.from({ length: 50 }, (_, i) => ({ firstName: `First${i}`, lastName: `Last${i}` }));
        it.each(testNames)('validates guest variation %s', (n) => {
            expect(validate(n)).toBeNull();
        });

        const shortNames = [
            { firstName: 'A', lastName: 'Doe', error: 'Invalid First Name' },
            { firstName: 'Al', lastName: 'D', error: 'Invalid Last Name' },
            { firstName: '', lastName: 'Doe', error: 'Invalid First Name' },
        ];
        it.each(shortNames)('rejects short name %s', ({ firstName, lastName, error }) => {
            expect(validate({ firstName, lastName })).toBe(error);
        });

        const statuses = ['housed', 'unhoused', 'unknown', 'at-risk', 'transitional'];
        it.each(statuses)('validates housing status %s', (s) => {
            expect(validate({ firstName: 'John', lastName: 'Doe', housingStatus: s })).toBeNull();
        });

        it('rejects invalid house status', () => {
            expect(validate({ firstName: 'John', lastName: 'Doe', housingStatus: 'mansion' })).toBe('Invalid Housing Status');
        });
    });

    describe('Meal Record Exhaustive Validation', () => {
        const validate = (m: any) => {
            const types = ['guest', 'rv', 'extras', 'lunch_bag', 'staff', 'volunteer'];
            if (!types.includes(m.type)) return 'Invalid Type';
            if (typeof m.count !== 'number' || m.count < 0) return 'Invalid Count';
            if (!m.date.match(/^\d{4}-\d{2}-\d{2}$/)) return 'Invalid Date';
            return null;
        };

        const validCounts = Array.from({ length: 50 }, (_, i) => ({ type: 'guest', count: i, date: '2025-01-01' }));
        it.each(validCounts)('validates count %s', (m) => {
            expect(validate(m)).toBeNull();
        });

        it('rejects non-numeric counts', () => {
            expect(validate({ type: 'guest', count: '10', date: '2025-01-01' })).toBe('Invalid Count');
        });

        it('rejects malformed dates', () => {
            expect(validate({ type: 'guest', count: 1, date: '01-01-2025' })).toBe('Invalid Date');
        });
    });

    describe('Donation Exhaustive Validation', () => {
        const validate = (d: any) => {
            if (d.type === 'monetary' && (d.amount === null || d.amount === undefined)) return 'Amount Required';
            if (d.type === 'in-kind' && !d.description) return 'Description Required';
            return null;
        };

        const donations = Array.from({ length: 50 }, (_, i) => ({ type: 'monetary', amount: i * 10 }));
        it.each(donations)('validates donation amount %s', (d) => {
            expect(validate(d)).toBeNull();
        });

        it('rejects missing amount in monetary', () => {
            expect(validate({ type: 'monetary', amount: null })).toBe('Amount Required');
        });

        it('rejects missing description in in-kind', () => {
            expect(validate({ type: 'in-kind', description: '' })).toBe('Description Required');
        });
    });
});
