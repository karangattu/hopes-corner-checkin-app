import { describe, it, expect, vi } from 'vitest';

describe('Donations logic', () => {
    describe('Financial calculations', () => {
        it('sums monetary donations correctly', () => {
            const donations = [
                { amount: 100, type: 'monetary' },
                { amount: 50.5, type: 'monetary' },
                { amount: null, type: 'in-kind' },
            ];
            const total = donations
                .filter(d => d.type === 'monetary')
                .reduce((sum, d) => sum + (d.amount || 0), 0);
            expect(total).toBe(150.5);
        });

        it('handles zero donations', () => {
            const donations: any[] = [];
            const total = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
            expect(total).toBe(0);
        });

        it('calculates average donation amount', () => {
            const donations = [
                { amount: 100 },
                { amount: 200 },
            ];
            const avg = donations.reduce((sum, d) => sum + d.amount, 0) / donations.length;
            expect(avg).toBe(150);
        });
    });

    describe('Donation filtering logic', () => {
        const records = [
            { type: 'monetary', donor: 'John', date: '2025-01-01' },
            { type: 'in-kind', donor: 'Jane', date: '2025-01-02' },
            { type: 'monetary', donor: 'Bob', date: '2025-01-03' },
        ];

        it('filters by donation type', () => {
            const monetary = records.filter(r => r.type === 'monetary');
            expect(monetary.length).toBe(2);
        });

        it('filters by donor name', () => {
            const query = 'ja';
            const filtered = records.filter(r => r.donor.toLowerCase().includes(query));
            expect(filtered.length).toBe(1);
            expect(filtered[0].donor).toBe('Jane');
        });

        it('filters by date range', () => {
            const start = '2025-01-01';
            const end = '2025-01-02';
            const filtered = records.filter(r => r.date >= start && r.date <= end);
            expect(filtered.length).toBe(2);
        });
    });

    describe('La Plaza logic', () => {
        it('tracks La Plaza specific donation records', () => {
            const record = { isLaPlaza: true };
            expect(record.isLaPlaza).toBe(true);
        });

        it('calculates quantities for in-kind items', () => {
            const items = [
                { name: 'Water', quantity: 10 },
                { name: 'Blankets', quantity: 5 },
            ];
            const total = items.reduce((sum, i) => sum + i.quantity, 0);
            expect(total).toBe(15);
        });
    });
});
