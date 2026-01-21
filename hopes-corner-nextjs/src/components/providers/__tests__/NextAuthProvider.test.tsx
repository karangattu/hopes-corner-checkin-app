import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import NextAuthProvider from '../NextAuthProvider';

// Mock SessionProvider since it's from next-auth/react
vi.mock('next-auth/react', () => ({
    SessionProvider: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="session-provider">{children}</div>
    ),
}));

describe('NextAuthProvider', () => {
    it('renders and wraps children with SessionProvider', () => {
        render(
            <NextAuthProvider>
                <div data-testid="child">Provided</div>
            </NextAuthProvider>
        );

        expect(screen.getByTestId('session-provider')).toBeDefined();
        expect(screen.getByTestId('child')).toBeDefined();
        expect(screen.getByText('Provided')).toBeDefined();
    });
});
