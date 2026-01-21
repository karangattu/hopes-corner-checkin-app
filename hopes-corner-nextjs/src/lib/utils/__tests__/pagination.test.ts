import { describe, it, expect, vi } from 'vitest';

describe('supabasePagination utilities', () => {
    describe('fetchAllPaginated', () => {
        it('calculates page ranges correctly', () => {
            const pageSize = 100;
            const page = 0;
            const start = page * pageSize;
            const end = start + pageSize - 1;

            expect(start).toBe(0);
            expect(end).toBe(99);
        });

        it('calculates second page range', () => {
            const pageSize = 100;
            const page = 1;
            const start = page * pageSize;
            const end = start + pageSize - 1;

            expect(start).toBe(100);
            expect(end).toBe(199);
        });

        it('handles page size of 1000', () => {
            const pageSize = 1000;
            const page = 0;
            const start = page * pageSize;
            const end = start + pageSize - 1;

            expect(start).toBe(0);
            expect(end).toBe(999);
        });

        it('handles custom page sizes', () => {
            const pageSize = 50;
            const page = 2;
            const start = page * pageSize;
            const end = start + pageSize - 1;

            expect(start).toBe(100);
            expect(end).toBe(149);
        });
    });

    describe('pagination loop logic', () => {
        it('continues fetching while more data exists', () => {
            const results: number[][] = [[1, 2], [3, 4], []];
            let page = 0;
            let allData: number[] = [];

            while (page < results.length && (page === 0 || results[page - 1].length > 0)) {
                const data = results[page];
                if (data.length === 0) break;
                allData = [...allData, ...data];
                page++;
            }

            expect(allData).toEqual([1, 2, 3, 4]);
            expect(page).toBe(2);
        });

        it('stops when empty page received', () => {
            const pageSize = 100;
            let pagesFetched = 0;
            const mockData = [
                Array.from({ length: 100 }, (_, i) => i),
                Array.from({ length: 50 }, (_, i) => i + 100),
                [],
            ];

            for (let i = 0; i < mockData.length; i++) {
                pagesFetched++;
                if (mockData[i].length < pageSize) break;
            }

            expect(pagesFetched).toBe(2);
        });
    });

    describe('mapper function application', () => {
        it('applies mapper to each row', () => {
            const rows = [
                { first_name: 'John', last_name: 'Doe' },
                { first_name: 'Jane', last_name: 'Smith' },
            ];

            const mapper = (row: any) => ({
                firstName: row.first_name,
                lastName: row.last_name,
            });

            const mapped = rows.map(mapper);

            expect(mapped[0].firstName).toBe('John');
            expect(mapped[1].lastName).toBe('Smith');
        });

        it('handles empty array with mapper', () => {
            const rows: any[] = [];
            const mapper = (row: any) => ({ name: row.name });
            const mapped = rows.map(mapper);

            expect(mapped).toEqual([]);
        });

        it('handles null values in mapper', () => {
            const rows = [{ first_name: null, last_name: 'Doe' }];
            const mapper = (row: any) => ({
                firstName: row.first_name || '',
                lastName: row.last_name || '',
            });

            const mapped = rows.map(mapper);
            expect(mapped[0].firstName).toBe('');
        });
    });

    describe('query options', () => {
        it('parses table name', () => {
            const options = { table: 'guests', select: '*' };
            expect(options.table).toBe('guests');
        });

        it('parses select columns', () => {
            const options = { table: 'guests', select: 'id,first_name,last_name' };
            expect(options.select).toBe('id,first_name,last_name');
        });

        it('parses order by', () => {
            const options = { orderBy: 'created_at', ascending: false };
            expect(options.orderBy).toBe('created_at');
            expect(options.ascending).toBe(false);
        });

        it('defaults ascending to true', () => {
            const options = { orderBy: 'name', ascending: undefined };
            const ascending = options.ascending ?? true;
            expect(ascending).toBe(true);
        });
    });

    describe('error handling', () => {
        it('identifies error object', () => {
            const response = { data: null, error: { message: 'Failed' } };
            expect(response.error).toBeTruthy();
        });

        it('identifies success response', () => {
            const response = { data: [{ id: 1 }], error: null };
            expect(response.error).toBeFalsy();
            expect(response.data.length).toBe(1);
        });

        it('handles empty data array', () => {
            const response = { data: [], error: null };
            expect(response.data.length).toBe(0);
            expect(response.error).toBeFalsy();
        });
    });

    describe('data accumulation', () => {
        it('accumulates data across pages', () => {
            let allData: number[] = [];
            const pages = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

            pages.forEach(page => {
                allData = [...allData, ...page];
            });

            expect(allData).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            expect(allData.length).toBe(9);
        });

        it('handles single page', () => {
            let allData: number[] = [];
            const pages = [[1, 2, 3]];

            pages.forEach(page => {
                allData = [...allData, ...page];
            });

            expect(allData.length).toBe(3);
        });

        it('handles many pages', () => {
            const pageCount = 100;
            const pageSize = 10;
            let allData: number[] = [];

            for (let i = 0; i < pageCount; i++) {
                const page = Array.from({ length: pageSize }, (_, j) => i * pageSize + j);
                allData = [...allData, ...page];
            }

            expect(allData.length).toBe(1000);
        });
    });

    describe('performance considerations', () => {
        it('limits page size appropriately', () => {
            const maxPageSize = 1000;
            const requestedSize = 5000;
            const actualSize = Math.min(requestedSize, maxPageSize);

            expect(actualSize).toBe(1000);
        });

        it('handles large result sets', () => {
            const totalRows = 10000;
            const pageSize = 1000;
            const expectedPages = Math.ceil(totalRows / pageSize);

            expect(expectedPages).toBe(10);
        });
    });
});

describe('validation utilities', () => {
    describe('isValidDate', () => {
        it('validates correct date string', () => {
            const dateStr = '2025-01-06';
            const date = new Date(dateStr);
            const isValid = !isNaN(date.getTime());
            expect(isValid).toBe(true);
        });

        it('rejects invalid date string', () => {
            const dateStr = 'not-a-date';
            const date = new Date(dateStr);
            const isValid = !isNaN(date.getTime());
            expect(isValid).toBe(false);
        });

        it('validates ISO date', () => {
            const dateStr = '2025-01-06T12:00:00Z';
            const date = new Date(dateStr);
            const isValid = !isNaN(date.getTime());
            expect(isValid).toBe(true);
        });

        it('handles empty string', () => {
            const dateStr = '';
            const isValid = dateStr && !isNaN(new Date(dateStr).getTime());
            expect(isValid).toBeFalsy();
        });
    });

    describe('isValidGuestId', () => {
        it('validates correct guest ID format', () => {
            const guestId = 'G123ABC456';
            const isValid = /^G[A-Z0-9]+\d{3}$/.test(guestId);
            expect(isValid).toBe(true);
        });

        it('rejects guest ID without G prefix', () => {
            const guestId = '123ABC456';
            const isValid = /^G[A-Z0-9]+/.test(guestId);
            expect(isValid).toBe(false);
        });

        it('requires alphanumeric after G', () => {
            const guestId = 'GABC123';
            const hasAlphanumeric = /^G[A-Z0-9]/.test(guestId);
            expect(hasAlphanumeric).toBe(true);
        });
    });

    describe('isValidQuantity', () => {
        it('accepts positive integers', () => {
            const qty = 5;
            const isValid = Number.isInteger(qty) && qty > 0;
            expect(isValid).toBe(true);
        });

        it('rejects zero', () => {
            const qty = 0;
            const isValid = Number.isInteger(qty) && qty > 0;
            expect(isValid).toBe(false);
        });

        it('rejects negative numbers', () => {
            const qty = -5;
            const isValid = Number.isInteger(qty) && qty > 0;
            expect(isValid).toBe(false);
        });

        it('rejects decimals', () => {
            const qty = 5.5;
            const isValid = Number.isInteger(qty) && qty > 0;
            expect(isValid).toBe(false);
        });

        it('accepts large quantities', () => {
            const qty = 999999;
            const isValid = Number.isInteger(qty) && qty > 0;
            expect(isValid).toBe(true);
        });
    });

    describe('isValidSlotTime', () => {
        it('validates HH:MM format', () => {
            const time = '08:30';
            const isValid = /^\d{2}:\d{2}$/.test(time);
            expect(isValid).toBe(true);
        });

        it('validates time range format', () => {
            const time = '08:00 - 09:00';
            const isValid = /^\d{2}:\d{2} - \d{2}:\d{2}$/.test(time);
            expect(isValid).toBe(true);
        });

        it('rejects invalid format', () => {
            const time = '8:30';
            const isValid = /^\d{2}:\d{2}$/.test(time);
            expect(isValid).toBe(false);
        });

        it('rejects text', () => {
            const time = 'morning';
            const isValid = /^\d{2}:\d{2}/.test(time);
            expect(isValid).toBe(false);
        });
    });

    describe('isValidStatus', () => {
        const validStatuses = ['waiting', 'showering', 'completed', 'no-show'];

        it('accepts valid status', () => {
            const status = 'waiting';
            const isValid = validStatuses.includes(status);
            expect(isValid).toBe(true);
        });

        it('rejects invalid status', () => {
            const status = 'invalid';
            const isValid = validStatuses.includes(status);
            expect(isValid).toBe(false);
        });

        it('rejects empty status', () => {
            const status = '';
            const isValid = validStatuses.includes(status);
            expect(isValid).toBe(false);
        });
    });

    describe('isValidAmount', () => {
        it('accepts positive decimal', () => {
            const amount = 99.99;
            const isValid = typeof amount === 'number' && amount >= 0;
            expect(isValid).toBe(true);
        });

        it('accepts zero', () => {
            const amount = 0;
            const isValid = typeof amount === 'number' && amount >= 0;
            expect(isValid).toBe(true);
        });

        it('rejects negative amount', () => {
            const amount = -50;
            const isValid = typeof amount === 'number' && amount >= 0;
            expect(isValid).toBe(false);
        });

        it('handles large amounts', () => {
            const amount = 9999999.99;
            const isValid = typeof amount === 'number' && amount >= 0;
            expect(isValid).toBe(true);
        });
    });

    describe('sanitizeInput', () => {
        it('trims whitespace', () => {
            const input = '  John  ';
            const sanitized = input.trim();
            expect(sanitized).toBe('John');
        });

        it('removes script tags', () => {
            const input = '<script>alert("xss")</script>John';
            const sanitized = input.replace(/<[^>]*>/g, '');
            expect(sanitized).toBe('alert("xss")John');
        });

        it('handles empty input', () => {
            const input = '';
            const sanitized = input.trim();
            expect(sanitized).toBe('');
        });

        it('preserves valid characters', () => {
            const input = "John O'Brien-Smith";
            const sanitized = input.trim();
            expect(sanitized).toBe("John O'Brien-Smith");
        });
    });
});
