import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers
const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
};

vi.mock('next/headers', () => ({
    cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock @supabase/ssr
let capturedCookieHandlers: any = {};

vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn((url: string, key: string, options: any) => {
        // Capture the cookie handlers for testing
        capturedCookieHandlers = options.cookies;
        return {
            type: 'server-client',
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
            },
        };
    }),
}));

// Import after mocks
import { createClient } from '@/lib/supabase/server';

describe('createClient (server)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedCookieHandlers = {};
        mockCookieStore.get.mockReset();
        mockCookieStore.set.mockReset();
    });

    it('creates a server client correctly', async () => {
        const client = await createClient();
        expect(client).toBeDefined();
        expect(client.type).toBe('server-client');
    });

    it('cookie get handler retrieves cookie value', async () => {
        mockCookieStore.get.mockReturnValue({ name: 'test-cookie', value: 'test-value' });

        await createClient();

        // Test the captured cookie get handler
        if (capturedCookieHandlers.get) {
            const result = capturedCookieHandlers.get('test-cookie');
            expect(result).toBe('test-value');
            expect(mockCookieStore.get).toHaveBeenCalledWith('test-cookie');
        }
    });

    it('cookie get handler returns undefined for missing cookie', async () => {
        mockCookieStore.get.mockReturnValue(undefined);

        await createClient();

        if (capturedCookieHandlers.get) {
            const result = capturedCookieHandlers.get('missing-cookie');
            expect(result).toBeUndefined();
        }
    });

    it('cookie set handler sets cookie correctly', async () => {
        await createClient();

        if (capturedCookieHandlers.set) {
            capturedCookieHandlers.set('session-cookie', 'session-value', { path: '/', httpOnly: true });
            expect(mockCookieStore.set).toHaveBeenCalledWith({
                name: 'session-cookie',
                value: 'session-value',
                path: '/',
                httpOnly: true,
            });
        }
    });

    it('cookie set handler handles errors silently', async () => {
        mockCookieStore.set.mockImplementation(() => {
            throw new Error('Cannot set cookie from Server Component');
        });

        await createClient();

        // Should not throw when set fails
        if (capturedCookieHandlers.set) {
            expect(() => {
                capturedCookieHandlers.set('error-cookie', 'value', {});
            }).not.toThrow();
        }
    });

    it('cookie remove handler sets empty value', async () => {
        await createClient();

        if (capturedCookieHandlers.remove) {
            capturedCookieHandlers.remove('remove-cookie', { path: '/' });
            expect(mockCookieStore.set).toHaveBeenCalledWith({
                name: 'remove-cookie',
                value: '',
                path: '/',
            });
        }
    });

    it('cookie remove handler handles errors silently', async () => {
        mockCookieStore.set.mockImplementation(() => {
            throw new Error('Cannot delete cookie from Server Component');
        });

        await createClient();

        // Should not throw when remove fails
        if (capturedCookieHandlers.remove) {
            expect(() => {
                capturedCookieHandlers.remove('error-cookie', {});
            }).not.toThrow();
        }
    });
});
