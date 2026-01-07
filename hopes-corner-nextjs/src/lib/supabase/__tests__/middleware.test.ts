import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @supabase/ssr
const mockGetUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(() => ({
        auth: {
            getUser: mockGetUser,
        },
    })),
}));

// Mock NextResponse
const mockNextResponse = {
    next: vi.fn(),
    cookies: {
        set: vi.fn(),
    },
};

vi.mock('next/server', () => ({
    NextResponse: {
        next: vi.fn(() => ({ ...mockNextResponse, cookies: { set: vi.fn() } })),
    },
}));

// Import after mocks
import { updateSession } from '@/lib/supabase/middleware';

describe('updateSession', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
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
});
