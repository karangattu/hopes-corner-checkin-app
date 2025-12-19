import { describe, test, expect } from 'vitest';
import { formatDateForDisplay } from '../date';

describe('formatDateForDisplay', () => {
    test('correctly formats YYYY-MM-DD strings without shifting day', () => {
        // We can't easily test "local time" in a CI environment without mocking, 
        // but we can check if it returns a string and is consistent.
        const dateStr = '2025-12-18';
        const result = formatDateForDisplay(dateStr, { year: 'numeric', month: '2-digit', day: '2-digit' });

        // In any timezone, it should at least contain the day "18"
        expect(result).toContain('18');
        expect(result).toContain('2025');
    });

    test('returns empty string for null/undefined', () => {
        expect(formatDateForDisplay(null)).toBe("");
        expect(formatDateForDisplay(undefined)).toBe("");
    });

    test('handles ISO strings', () => {
        const isoStr = '2025-12-18T10:00:00Z';
        const result = formatDateForDisplay(isoStr);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});
