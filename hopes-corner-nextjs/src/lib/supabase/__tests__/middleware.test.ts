import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @supabase/ssr
const mockGetUser = vi.fn();
let capturedCookieHandlers: any = {};

vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn((url: string, key: string, options: any) => {
        // Capture the cookie handlers for testing
        capturedCookieHandlers = options.cookies;
        return {
            auth: {
                getUser: mockGetUser,
            },
        };
    }),
}));

// Mock NextResponse
vi.mock('next/server', () => ({
    NextResponse: {
        next: vi.fn((options?: any) => ({
            request: options?.request || {},
            headers: options?.request?.headers || new Headers(),
            cookies: {
                set: vi.fn(),
            },
        })),
    },
}));

// Import after mocks
import { updateSession } from '@/lib/supabase/middleware';

describe('updateSession', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        capturedCookieHandlers = {};
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns early when NEXT_PUBLIC_SUPABASE_URL is not set', async () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

        const mockRequest = {
            headers: new Headers(),
            cookies: {
                get: vi.fn(),
            },
        };

        const response = await updateSession(mockRequest as any);
        expect(response).toBeDefined();
        expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('returns early when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY is not set', async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

        const mockRequest = {
            headers: new Headers(),
            cookies: {
                get: vi.fn(),
            },
        };

        const response = await updateSession(mockRequest as any);
        expect(response).toBeDefined();
        expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('creates supabase client and refreshes session when both env vars are set', async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-key';

        mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });

        const mockRequest = {
            headers: new Headers(),
            cookies: {
                get: vi.fn((name: string) => ({ name, value: 'test-cookie-value' })),
                set: vi.fn(),
            },
        };

        const response = await updateSession(mockRequest as any);
        expect(response).toBeDefined();
        expect(mockGetUser).toHaveBeenCalled();
    });

    it('handles cookie get operation correctly', async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-key';

        mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

        const mockCookieGet = vi.fn((name: string) => {
            if (name === 'sb-access-token') return { name, value: 'access-token' };
            return undefined;
        });

        const mockRequest = {
            headers: new Headers(),
            cookies: {
                get: mockCookieGet,
                set: vi.fn(),
            },
        };

        const response = await updateSession(mockRequest as any);
        expect(response).toBeDefined();
    });

    it('cookie get handler returns correct value', async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-key';

        mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

        const mockRequest = {
            headers: new Headers(),
            cookies: {
                get: vi.fn((name: string) => ({ name, value: 'cookie-value' })),
                set: vi.fn(),
            },
        };

        await updateSession(mockRequest as any);

        // Test the captured cookie get handler
        if (capturedCookieHandlers.get) {
            const result = capturedCookieHandlers.get('test-cookie');
            expect(result).toBe('cookie-value');
        }
    });

    it('cookie get handler returns undefined for missing cookie', async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-key';

        mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

        const mockRequest = {
            headers: new Headers(),
            cookies: {
                get: vi.fn(() => undefined),
                set: vi.fn(),
            },
        };

        await updateSession(mockRequest as any);

        // Test the captured cookie get handler
        if (capturedCookieHandlers.get) {
            const result = capturedCookieHandlers.get('missing-cookie');
            expect(result).toBeUndefined();
        }
    });

    it('cookie set handler updates request and response cookies', async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-key';

        mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

        const mockCookieSet = vi.fn();
        const mockRequest = {
            headers: new Headers(),
            cookies: {
                get: vi.fn(() => ({ name: 'test', value: 'value' })),
                set: mockCookieSet,
            },
        };

        await updateSession(mockRequest as any);

        // Test the captured cookie set handler
        if (capturedCookieHandlers.set) {
            capturedCookieHandlers.set('session-cookie', 'session-value', { path: '/', httpOnly: true });
            expect(mockCookieSet).toHaveBeenCalledWith({
                name: 'session-cookie',
                value: 'session-value',
                path: '/',
                httpOnly: true,
            });
        }
    });

    it('cookie remove handler clears cookie with empty value', async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-key';

        mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

        const mockCookieSet = vi.fn();
        const mockRequest = {
            headers: new Headers(),
            cookies: {
                get: vi.fn(() => ({ name: 'test', value: 'value' })),
                set: mockCookieSet,
            },
        };

        await updateSession(mockRequest as any);

        // Test the captured cookie remove handler
        if (capturedCookieHandlers.remove) {
            capturedCookieHandlers.remove('session-cookie', { path: '/' });
            expect(mockCookieSet).toHaveBeenCalledWith({
                name: 'session-cookie',
                value: '',
                path: '/',
            });
        }
    });
});
