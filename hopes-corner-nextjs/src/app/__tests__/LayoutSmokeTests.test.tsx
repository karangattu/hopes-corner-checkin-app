import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import MainLayout from '../(protected)/layout';
import BaseLayout from '../layout';

// Mock next/font/google
vi.mock('next/font/google', () => ({
    Inter: () => ({ variable: 'inter' }),
    Outfit: () => ({ variable: 'outfit' }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/providers/NextAuthProvider', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock auth config
vi.mock('@/lib/auth/config', () => ({
    auth: vi.fn(() => Promise.resolve({ user: { role: 'admin', name: 'Admin' } })),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
}));

// Mock components used in layouts
vi.mock('@/components/layouts/MainLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

describe('Layout Smoke Tests', () => {
    it('BaseLayout renders children correctly', () => {
        render(
            <BaseLayout>
                <div data-testid="child">Content</div>
            </BaseLayout>
        );
        expect(screen.getByTestId('child')).toBeDefined();
    });

    it('Protected layout (MainLayout) renders correctly', async () => {
        // Since ProtectedLayout is an async Server Component, we can test it by calling it as a function
        // and rendering its returned JSX.
        const result = await (MainLayout as any)({
            children: <div data-testid="protected-content">Protected</div>
        });

        render(result);

        expect(screen.getByTestId('main-layout')).toBeDefined();
        expect(screen.getByTestId('protected-content')).toBeDefined();
    });
});
