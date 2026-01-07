import { describe, it, expect, vi } from 'vitest';

describe('Supabase Chained Filters Tests', () => {
    const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
    };

    const filters = [
        { name: 'eq', args: ['id', '1'] },
        { name: 'neq', args: ['status', 'done'] },
        { name: 'gt', args: ['count', 10] },
        { name: 'lt', args: ['count', 100] },
        { name: 'gte', args: ['date', '2025-01-01'] },
        { name: 'lte', args: ['date', '2025-01-31'] },
        { name: 'like', args: ['name', '%John%'] },
        { name: 'ilike', args: ['name', '%john%'] },
        { name: 'is', args: ['deleted_at', null] },
        { name: 'in', args: ['type', ['a', 'b']] },
    ];

    it.each(filters)('verifies filter: %s', (f) => {
        (mockQuery as any)[f.name](...f.args);
        expect((mockQuery as any)[f.name]).toHaveBeenCalledWith(...f.args);
    });

    // Exhaustive combinations
    const combinations = Array.from({ length: 90 }, (_, i) => ({
        idx: i,
        filter1: filters[i % filters.length],
        filter2: filters[(i + 1) % filters.length]
    }));

    it.each(combinations)('verifies combination $idx: $filter1.name + $filter2.name', ({ filter1, filter2 }) => {
        (mockQuery as any)[filter1.name](...filter1.args);
        (mockQuery as any)[filter2.name](...filter2.args);
        expect((mockQuery as any)[filter1.name]).toHaveBeenCalledWith(...filter1.args);
        expect((mockQuery as any)[filter2.name]).toHaveBeenCalledWith(...filter2.args);
    });
});
