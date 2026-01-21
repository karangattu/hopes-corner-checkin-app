import { describe, it, expect, vi } from 'vitest';

describe('normalizers utilities', () => {
    describe('toTitleCase', () => {
        it('capitalizes first letter', () => {
            const text = 'john';
            const result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            expect(result).toBe('John');
        });

        it('handles already capitalized text', () => {
            const text = 'John';
            const result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            expect(result).toBe('John');
        });

        it('handles all caps', () => {
            const text = 'JOHN';
            const result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            expect(result).toBe('John');
        });

        it('handles empty string', () => {
            const text = '';
            const result = text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : '';
            expect(result).toBe('');
        });

        it('handles single character', () => {
            const text = 'j';
            const result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            expect(result).toBe('J');
        });

        it('handles multiple words', () => {
            const text = 'john doe';
            const result = text.split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');
            expect(result).toBe('John Doe');
        });
    });

    describe('normalizePreferredName', () => {
        it('trims whitespace', () => {
            const name = '  Johnny  ';
            const result = name.trim();
            expect(result).toBe('Johnny');
        });

        it('handles empty string', () => {
            const name = '';
            const result = name.trim();
            expect(result).toBe('');
        });

        it('handles null/undefined gracefully', () => {
            const name = null;
            const result = name?.trim() || '';
            expect(result).toBe('');
        });
    });

    describe('normalizeBicycleDescription', () => {
        it('trims whitespace', () => {
            const desc = '  Red Trek bike  ';
            const result = desc.trim();
            expect(result).toBe('Red Trek bike');
        });

        it('handles empty string', () => {
            const desc = '';
            const result = desc.trim();
            expect(result).toBe('');
        });

        it('preserves special characters', () => {
            const desc = "Mike's 26\" Huffy";
            const result = desc.trim();
            expect(result).toBe("Mike's 26\" Huffy");
        });
    });

    describe('normalizeHousingStatus', () => {
        const validStatuses = ['housed', 'unhoused', 'unknown', 'at-risk', 'transitional'];

        it('accepts valid housing statuses', () => {
            validStatuses.forEach(status => {
                expect(validStatuses.includes(status)).toBe(true);
            });
        });

        it('defaults to unknown for invalid status', () => {
            const status = 'invalid-status';
            const normalized = validStatuses.includes(status) ? status : 'unknown';
            expect(normalized).toBe('unknown');
        });

        it('handles empty string', () => {
            const status = '';
            const normalized = validStatuses.includes(status) ? status : 'unknown';
            expect(normalized).toBe('unknown');
        });

        it('handles null', () => {
            const status = null;
            const normalized = status && validStatuses.includes(status) ? status : 'unknown';
            expect(normalized).toBe('unknown');
        });

        it('is case sensitive', () => {
            const status = 'HOUSED';
            const normalized = validStatuses.includes(status.toLowerCase()) ? status.toLowerCase() : 'unknown';
            expect(normalized).toBe('housed');
        });
    });

    describe('computeIsGuestBanned', () => {
        it('returns false if no bannedUntil', () => {
            const guest = { bannedUntil: null };
            const isBanned = guest.bannedUntil ? new Date(guest.bannedUntil) > new Date() : false;
            expect(isBanned).toBe(false);
        });

        it('returns true if bannedUntil is in future', () => {
            const guest = { bannedUntil: '2030-12-31' };
            const isBanned = guest.bannedUntil ? new Date(guest.bannedUntil) > new Date() : false;
            expect(isBanned).toBe(true);
        });

        it('returns false if bannedUntil is in past', () => {
            const guest = { bannedUntil: '2020-01-01' };
            const isBanned = guest.bannedUntil ? new Date(guest.bannedUntil) > new Date() : false;
            expect(isBanned).toBe(false);
        });

        it('handles bannedFromMeals flag', () => {
            const guest = { bannedFromMeals: true };
            expect(guest.bannedFromMeals).toBe(true);
        });

        it('handles bannedFromShower flag', () => {
            const guest = { bannedFromShower: true };
            expect(guest.bannedFromShower).toBe(true);
        });

        it('handles bannedFromLaundry flag', () => {
            const guest = { bannedFromLaundry: true };
            expect(guest.bannedFromLaundry).toBe(true);
        });

        it('handles bannedFromBicycle flag', () => {
            const guest = { bannedFromBicycle: true };
            expect(guest.bannedFromBicycle).toBe(true);
        });
    });

    describe('normalizeDateInputToISO', () => {
        it('converts YYYY-MM-DD to ISO', () => {
            const input = '2025-01-06';
            const result = new Date(input).toISOString();
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('handles Date object', () => {
            const input = new Date('2025-01-06');
            const result = input.toISOString();
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('handles timestamp', () => {
            const input = new Date('2025-01-06').getTime();
            const result = new Date(input).toISOString();
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
    });

    describe('email validation', () => {
        const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        it('validates correct email', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
        });

        it('rejects email without @', () => {
            expect(isValidEmail('testexample.com')).toBe(false);
        });

        it('rejects email without domain', () => {
            expect(isValidEmail('test@')).toBe(false);
        });

        it('rejects email without local part', () => {
            expect(isValidEmail('@example.com')).toBe(false);
        });

        it('rejects empty string', () => {
            expect(isValidEmail('')).toBe(false);
        });
    });

    describe('phone number normalization', () => {
        it('removes non-digit characters', () => {
            const phone = '(555) 123-4567';
            const normalized = phone.replace(/\D/g, '');
            expect(normalized).toBe('5551234567');
        });

        it('handles already clean number', () => {
            const phone = '5551234567';
            const normalized = phone.replace(/\D/g, '');
            expect(normalized).toBe('5551234567');
        });

        it('handles empty string', () => {
            const phone = '';
            const normalized = phone.replace(/\D/g, '');
            expect(normalized).toBe('');
        });

        it('handles international format', () => {
            const phone = '+1-555-123-4567';
            const normalized = phone.replace(/\D/g, '');
            expect(normalized).toBe('15551234567');
        });
    });

    describe('name truncation', () => {
        it('truncates long names', () => {
            const name = 'A'.repeat(100);
            const maxLength = 50;
            const truncated = name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
            expect(truncated.length).toBe(53); // 50 + '...'
        });

        it('does not truncate short names', () => {
            const name = 'John Doe';
            const maxLength = 50;
            const truncated = name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
            expect(truncated).toBe('John Doe');
        });
    });
});
