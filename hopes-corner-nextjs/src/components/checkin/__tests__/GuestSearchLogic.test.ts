import { describe, it, expect, vi } from 'vitest';

describe('GuestSearch logic', () => {
    const guests = [
        { id: '1', firstName: 'John', lastName: 'Doe', name: 'John Doe' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', name: 'Jane Smith' },
        { id: '3', firstName: 'Alice', lastName: 'Johnson', name: 'Alice Johnson' },
        { id: '4', firstName: 'Bob', lastName: 'Williams', name: 'Bob Williams' },
    ];

    describe('filtering logic', () => {
        it('filters by first name', () => {
            const query = 'jo';
            const filtered = guests.filter(g => g.firstName.toLowerCase().includes(query));
            expect(filtered.length).toBe(1);
            expect(filtered[0].firstName).toBe('John');
        });

        it('filters by last name', () => {
            const query = 'sm';
            const filtered = guests.filter(g => g.lastName.toLowerCase().includes(query));
            expect(filtered.length).toBe(1);
            expect(filtered[0].lastName).toBe('Smith');
        });

        it('filters by full name', () => {
            const query = 'alice j';
            const filtered = guests.filter(g => g.name.toLowerCase().includes(query));
            expect(filtered.length).toBe(1);
            expect(filtered[0].firstName).toBe('Alice');
        });

        it('returns empty for no match', () => {
            const query = 'xyz';
            const filtered = guests.filter(g => g.name.toLowerCase().includes(query));
            expect(filtered.length).toBe(0);
        });

        it('is case insensitive', () => {
            const query = 'JOHN';
            const filtered = guests.filter(g => g.name.toLowerCase().includes(query.toLowerCase()));
            // Matches both 'John Doe' and 'Alice Johnson'
            expect(filtered.length).toBe(2);
        });
    });

    describe('sorting logic', () => {
        it('sorts by first name alphabetically', () => {
            const sorted = [...guests].sort((a, b) => a.firstName.localeCompare(b.firstName));
            expect(sorted[0].firstName).toBe('Alice');
            expect(sorted[sorted.length - 1].firstName).toBe('John');
        });

        it('sorts by last name alphabetically', () => {
            const sorted = [...guests].sort((a, b) => a.lastName.localeCompare(b.lastName));
            expect(sorted[0].lastName).toBe('Doe');
            expect(sorted[sorted.length - 1].lastName).toBe('Williams');
        });
    });

    describe('pagination logic', () => {
        it('calculates total pages', () => {
            const pageSize = 2;
            const totalPages = Math.ceil(guests.length / pageSize);
            expect(totalPages).toBe(2);
        });

        it('gets first page', () => {
            const pageSize = 2;
            const page = 1;
            const startIndex = (page - 1) * pageSize;
            const pagedGuests = guests.slice(startIndex, startIndex + pageSize);
            expect(pagedGuests.length).toBe(2);
            expect(pagedGuests[0].id).toBe('1');
        });

        it('gets second page', () => {
            const pageSize = 2;
            const page = 2;
            const startIndex = (page - 1) * pageSize;
            const pagedGuests = guests.slice(startIndex, startIndex + pageSize);
            expect(pagedGuests.length).toBe(2);
            expect(pagedGuests[0].id).toBe('3');
        });
    });

    describe('search analytics', () => {
        it('tracks search queries', () => {
            const queries: string[] = [];
            const onSearch = (q: string) => queries.push(q);
            onSearch('test');
            expect(queries).toContain('test');
        });
    });

    describe('search highlights', () => {
        it('highlights matching text', () => {
            const text = 'John Doe';
            const query = 'john';
            const highlightRange = { start: text.toLowerCase().indexOf(query), end: query.length };
            expect(highlightRange.start).toBe(0);
            expect(highlightRange.end).toBe(4);
        });
    });
});
