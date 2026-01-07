import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    redirect: vi.fn(),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { role: 'admin', name: 'Admin' } }, status: 'authenticated' }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock auth from config (for server components)
vi.mock('@/lib/auth/config', () => ({
    auth: vi.fn(async () => ({ user: { role: 'admin', name: 'Admin' } })),
}));

// Mock stores
vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
        fetchTodaysRecords: vi.fn(),
        loadFromSupabase: vi.fn(),
    })),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(() => ({
        mealRecords: [],
        rvMealRecords: [],
        extraMealRecords: [],
        unitedEffortMealRecords: [],
        loadFromSupabase: vi.fn(),
    })),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [],
        searchGuests: vi.fn(),
        loadFromSupabase: vi.fn(),
        loadGuestWarningsFromSupabase: vi.fn(),
        loadGuestProxiesFromSupabase: vi.fn(),
    })),
}));

vi.mock('@/stores/useSettingsStore', () => ({
    useSettingsStore: vi.fn(() => ({
        loadSettings: vi.fn(),
        targets: {
            dailyMeals: 100,
            monthlyMeals: 2000,
            monthlyShowers: 500,
            monthlyLaundry: 200,
            monthlyBicycles: 50,
            yearlyMeals: 25000,
            yearlyShowers: 6000,
            yearlyLaundry: 2400,
            yearlyBicycles: 600,
        },
    })),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        blockedSlots: [],
        fetchBlockedSlots: vi.fn(() => Promise.resolve()),
        isSlotBlocked: vi.fn(() => false),
    })),
}));

// Import pages
import HomePage from '../page';
import LoginPage from '../(auth)/login/page';
import DashboardPage from '../(protected)/dashboard/page';
import CheckInPage from '../(protected)/check-in/page';

describe('Page Smoke Tests', () => {
    it('HomePage redirects correctly (Server Component)', async () => {
        const { redirect } = await import('next/navigation');
        await HomePage();
        expect(redirect).toHaveBeenCalled();
    });

    it('LoginPage renders correctly', () => {
        render(<LoginPage />);
        // Get the header, not the button
        expect(screen.getByRole('heading', { name: /Sign In/i })).toBeDefined();
    });

    it('DashboardPage renders correctly', () => {
        render(<DashboardPage />);
        expect(screen.getByText(/Mission Intelligence/i)).toBeDefined();
    });

    it('CheckInPage renders correctly', () => {
        render(<CheckInPage />);
        expect(screen.getByText(/Find or Add Guests/i)).toBeDefined();
    });
});
