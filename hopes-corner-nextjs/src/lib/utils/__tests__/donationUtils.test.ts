import { describe, it, expect } from 'vitest';
import { calculateServings, deriveDonationDateKey, formatProteinAndCarbsClipboardText } from '../donationUtils';

describe('donationUtils', () => {
    describe('calculateServings', () => {
        it('calculates servings based on trays and density', () => {
            expect(calculateServings('Protein', 0, 2, 'light')).toBe(20);
            expect(calculateServings('Protein', 0, 2, 'medium')).toBe(40);
            expect(calculateServings('Protein', 0, 2, 'high')).toBe(60);
            expect(calculateServings('Protein', 0, 2, 'unknown')).toBe(40); // default to medium
            expect(calculateServings('Protein', 0, 2)).toBe(40); // default to medium
        });

        it('calculates servings based on weight for Carbs', () => {
            expect(calculateServings('Carbs', 10)).toBe(40);
            expect(calculateServings('Carbs', '10')).toBe(40);
        });

        it('calculates servings based on weight for Protein/Veggie Protein', () => {
            expect(calculateServings('Protein', 10)).toBe(50);
            expect(calculateServings('Veggie Protein', 10)).toBe(50);
        });

        it('returns weight as servings for other types', () => {
            expect(calculateServings('Other', 10)).toBe(10);
        });

        it('handles missing or invalid inputs', () => {
            expect(calculateServings('Protein', null)).toBe(0);
            expect(calculateServings('Protein', undefined)).toBe(0);
            expect(calculateServings('Protein', 0, null)).toBe(0);
        });
    });

    describe('deriveDonationDateKey', () => {
        it('returns dateKey if present', () => {
            expect(deriveDonationDateKey({ dateKey: '2023-01-01' })).toBe('2023-01-01');
        });

        it('returns date if it matches YYYY-MM-DD', () => {
            expect(deriveDonationDateKey({ date: '2023-01-01' })).toBe('2023-01-01');
        });

        it('parses various date candidates', () => {
            expect(deriveDonationDateKey({ donatedAt: '2023-01-02' })).toBe('2023-01-02');
            expect(deriveDonationDateKey({ donated_at: '2023-01-03' })).toBe('2023-01-03');
            expect(deriveDonationDateKey({ createdAt: '2023-01-04' })).toBe('2023-01-04');
            expect(deriveDonationDateKey({ created_at: '2023-01-05' })).toBe('2023-01-05');
            expect(deriveDonationDateKey({ receivedAt: '2023-01-06' })).toBe('2023-01-06');
            expect(deriveDonationDateKey({ received_at: '2023-01-07' })).toBe('2023-01-07');
        });

        it('handles Date objects', () => {
            const date = new Date(2023, 0, 10); // Jan 10
            // We expect en-CA format YYYY-MM-DD
            expect(deriveDonationDateKey({ date })).toBe('2023-01-10');
        });

        it('handles timestamps', () => {
            const ts = new Date(2023, 0, 11).getTime();
            expect(deriveDonationDateKey({ date: ts })).toBe('2023-01-11');
        });

        it('returns null for invalid inputs', () => {
            expect(deriveDonationDateKey(null)).toBeNull();
            expect(deriveDonationDateKey({})).toBeNull();
            expect(deriveDonationDateKey({ date: 'invalid' })).toBeNull();
        });

        it('handles candidate with non-YYYY-MM-DD string', () => {
            expect(deriveDonationDateKey({ donatedAt: 'Jan 12 2023' })).toBe('2023-01-12');
        });
    });

    describe('formatProteinAndCarbsClipboardText', () => {
        it('formats consolidated activity correctly', () => {
            const activity = [
                { type: 'Protein', itemName: 'Chicken', trays: 2, servings: 40 },
                { type: 'Carbs', itemName: 'Rice', trays: 1, servings: 20 },
                { type: 'Veggie Protein', itemName: 'Tofu', trays: 1, servings: 25 },
                { type: 'Dairy', itemName: 'Milk', trays: 0, servings: 0 }, // Should be ignored
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            expect(text).toContain('Donations');
            expect(text).toContain('Protein');
            expect(text).toContain('Chicken: 2 trays, 40 servings');
            expect(text).toContain('Rice: 1 tray, 20 servings');
            expect(text).toContain('Tofu: 1 tray, 25 servings');
        });

        it('handles empty activity', () => {
            const text = formatProteinAndCarbsClipboardText([]);
            expect(text).toContain('None');
        });

        it('sorts items by servings desc then name', () => {
            const activity = [
                { type: 'Protein', itemName: 'Beef', trays: 1, servings: 30 },
                { type: 'Protein', itemName: 'Chicken', trays: 2, servings: 40 },
                { type: 'Protein', itemName: 'Aardvark', trays: 1, servings: 30 },
            ];
            const text = formatProteinAndCarbsClipboardText(activity);
            const proteinIndex = text.indexOf('Protein');
            const chickenIndex = text.indexOf('Chicken');
            const aardvarkIndex = text.indexOf('Aardvark');
            const beefIndex = text.indexOf('Beef');

            expect(chickenIndex).toBeLessThan(aardvarkIndex);
            expect(aardvarkIndex).toBeLessThan(beefIndex);
        });
    });
});
