import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GuestCard } from '../GuestCard';
import LinkedGuestsList from '../LinkedGuestsList';
import { CompactWaiverIndicator } from '../../ui/CompactWaiverIndicator';
import { WaiverBadge } from '../../ui/WaiverBadge';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
    SessionProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock stores
vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [],
        getWarningsForGuest: vi.fn(() => []),
        getProxiesForGuest: vi.fn(() => []),
        getLinkedGuests: vi.fn(() => []),
    })),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(() => ({
        mealRecords: [],
        extraMealRecords: [],
        addMealRecord: vi.fn(),
        addExtraMealRecord: vi.fn(),
    })),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
        addHaircutRecord: vi.fn(),
        addHolidayRecord: vi.fn(),
    })),
}));

vi.mock('@/stores/useWaiverStore', () => ({
    useWaiverStore: vi.fn(() => ({
        hasActiveWaiver: vi.fn(async () => false), // Changed to false so indicators show up
        guestNeedsWaiverReminder: vi.fn(async () => true),
        dismissWaiver: vi.fn(),
        waiverVersion: 1,
    })),
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: vi.fn(() => ({
        addAction: vi.fn(),
        undoAction: vi.fn(),
        getActionsForGuestToday: vi.fn(() => []),
    })),
}));

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: vi.fn(() => ({
        setShowerPickerGuest: vi.fn(),
        setLaundryPickerGuest: vi.fn(),
        setBicyclePickerGuest: vi.fn(),
    })),
}));

const mockGuest = {
    id: 'g1',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    preferredName: 'Johnny',
    birthDate: '1990-01-01',
    housingStatus: 'Unsheltered',
    isBanned: false
};

describe('UI Component Rendering', () => {
    it('GuestCard renders correctly', () => {
        render(<GuestCard guest={mockGuest as any} />);
        // GuestCard renders preferredName || name. 
        // Our guest has both, so it renders "Johnny".
        expect(screen.getByText(/Johnny/i)).toBeDefined();
        // It also renders housingStatus
        expect(screen.getByText(/Unsheltered/i)).toBeDefined();
    });

    it('LinkedGuestsList renders correctly', () => {
        render(<LinkedGuestsList guestId="g1" />);
        expect(screen.getByText(/Link Guest/i)).toBeDefined();
    });

    it('CompactWaiverIndicator renders correctly', async () => {
        render(<CompactWaiverIndicator guestId="g1" serviceType="shower" />);
        // Wait for useEffect to finish and loading to become false
        expect(await screen.findByLabelText(/Services waiver needed/i)).toBeDefined();
    });

    it('WaiverBadge renders correctly', async () => {
        render(<WaiverBadge guestId="g1" serviceType="shower" />);
        expect(await screen.findByText(/Waiver needed/i)).toBeDefined();
    });
});
