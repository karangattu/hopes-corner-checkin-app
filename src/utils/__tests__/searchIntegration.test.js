
import { describe, test, expect } from 'vitest';
import { flexibleNameSearch } from '../flexibleNameSearch';
import { createSearchIndex, searchWithIndex } from '../guestSearchIndex';

describe('Search Integration - Space Insensitivity', () => {
    const guests = [
        { id: 1, firstName: 'Wenxing', lastName: 'Gao', name: 'Wenxing Gao' },
        { id: 2, firstName: 'John', lastName: 'Doe', name: 'John Doe' },
        { id: 3, firstName: 'Mary', lastName: 'Jane Watson', name: 'Mary Jane Watson' },
    ];

    describe('Non-indexed Search (flexibleNameSearch)', () => {
        test('matches name with spaces removed in search', () => {
            const results = flexibleNameSearch('wenxing gao', guests);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(1);
        });

        test('matches name with spaces added in search', () => {
            const results = flexibleNameSearch('wen xing gao', guests);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(1);
        });

        test('matches multi-part last name with spaces removed', () => {
            const results = flexibleNameSearch('mary janewatson', guests);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(3);
        });
    });

    describe('Indexed Search (searchWithIndex)', () => {
        const index = createSearchIndex(guests);

        test('matches name with spaces removed in search', () => {
            const results = searchWithIndex('wenxing gao', index);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(1);
        });

        test('matches name with spaces added in search', () => {
            const results = searchWithIndex('wen xing gao', index);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(1);
        });

        test('matches name with all spaces removed', () => {
            const results = searchWithIndex('wenxinggao', index);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(1);
        });
    });
});
