import { describe, it, expect, vi } from 'vitest';

describe('CSV Export Flow Logic Tests', () => {
    describe('Header Generation', () => {
        const getHeaders = (type: string) => {
            switch (type) {
                case 'guest': return ['ID', 'First Name', 'Last Name', 'Preferred Name', 'Housing Status', 'Age Group'];
                case 'meal': return ['Date', 'Type', 'Count', 'Guest ID', 'Proxy ID'];
                case 'shower': return ['Date', 'Time', 'Guest ID', 'Status'];
                case 'laundry': return ['Date', 'Loads', 'Guest ID', 'Status', 'Offsite'];
                default: return [];
            }
        };

        it('generates correct headers for guest export', () => {
            expect(getHeaders('guest')).toContain('Housing Status');
        });

        it('generates correct headers for meal export', () => {
            expect(getHeaders('meal')).toContain('Proxy ID');
        });

        it('generates correct headers for laundry export', () => {
            expect(getHeaders('laundry')).toContain('Offsite');
        });
    });

    describe('Data Row Formatting', () => {
        const formatRow = (data: any, type: string) => {
            if (type === 'guest') {
                return [data.id, data.firstName, data.lastName, data.preferredName || '', data.housingStatus, data.age].join(',');
            }
            return '';
        };

        it('formats guest row with preferred name', () => {
            const guest = { id: 'g1', firstName: 'John', lastName: 'Doe', preferredName: 'Johnny', housingStatus: 'unhoused', age: 'Adult' };
            expect(formatRow(guest, 'guest')).toBe('g1,John,Doe,Johnny,unhoused,Adult');
        });

        it('formats guest row without preferred name', () => {
            const guest = { id: 'g1', firstName: 'John', lastName: 'Doe', preferredName: null, housingStatus: 'unhoused', age: 'Adult' };
            expect(formatRow(guest, 'guest')).toBe('g1,John,Doe,,unhoused,Adult');
        });
    });

    describe('Filename Generation', () => {
        const getFilename = (type: string, date: string) => `${type}_export_${date}.csv`;

        it('generates correct guest filename', () => {
            expect(getFilename('guests', '2025-01-06')).toBe('guests_export_2025-01-06.csv');
        });

        it('generates correct donation filename', () => {
            expect(getFilename('donations', '2025-01-01')).toBe('donations_export_2025-01-01.csv');
        });
    });

    describe('JSON to CSV conversion logic', () => {
        it('handles objects with missing keys', () => {
            const data = [{ a: 1, b: 2 }, { a: 3 }];
            const keys = ['a', 'b'];
            const rows = data.map(d => keys.map(k => (d as any)[k] ?? '').join(','));
            expect(rows[1]).toBe('3,');
        });
    });
});
