import { describe, expect, it, vi } from 'vitest';
import * as handlers from '../route';

// Mock lib/auth/config to avoid actual NextAuth initialization
vi.mock('@/lib/auth/config', () => ({
    handlers: {
        GET: vi.fn(() => ({ type: 'GET_HANDLER' })),
        POST: vi.fn(() => ({ type: 'POST_HANDLER' })),
    },
}));

describe('Auth API route', () => {
    it('exports GET and POST handlers correctly', () => {
        expect(handlers.GET).toBeDefined();
        expect(handlers.POST).toBeDefined();
        expect(typeof handlers.GET).toBe('function');
        expect(typeof handlers.POST).toBe('function');
    });

    it('GET handler returns expected result', async () => {
        const result = (handlers.GET as any)();
        expect(result.type).toBe('GET_HANDLER');
    });

    it('POST handler returns expected result', async () => {
        const result = (handlers.POST as any)();
        expect(result.type).toBe('POST_HANDLER');
    });
});
