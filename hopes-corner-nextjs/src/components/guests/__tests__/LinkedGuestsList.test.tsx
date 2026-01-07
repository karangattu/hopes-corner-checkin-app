
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import LinkedGuestsList from '../LinkedGuestsList';

// Mock Dependencies
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

// Create spies
const mockAddMealRecord = vi.fn().mockResolvedValue({ id: 'new-record' });
const mockAddAction = vi.fn();

// Mock stores
vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [],
        getLinkedGuests: vi.fn((guestId) => {
            if (guestId === 'proxy-1') {
                return [{
                    id: 'linked-1',
                    firstName: 'Linked',
                    lastName: 'Guest',
                    preferredName: 'Linky'
                }];
            }
            return [];
        }),
        linkGuests: vi.fn(),
        unlinkGuests: vi.fn(),
    })),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(() => ({
        mealRecords: [],
        addMealRecord: mockAddMealRecord,
    })),
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: vi.fn(() => ({
        addAction: mockAddAction,
        getActionsForGuestToday: vi.fn(() => []),
        undoAction: vi.fn(),
    })),
}));

describe('LinkedGuestsList Component Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('passes proxy ID (current guestId) to addMealRecord when adding meal for linked guest', async () => {
        const proxyId = 'proxy-1'; // The main guest at the window
        render(<LinkedGuestsList guestId={proxyId} />);

        // Should see the linked guest
        expect(screen.getByText('Linky')).toBeDefined();

        // Should see the "1" meal button
        const oneMealButton = screen.getByTitle('1 Meal');
        expect(oneMealButton).toBeDefined();

        // Click it
        fireEvent.click(oneMealButton);

        // Verify addMealRecord call
        // Expected: (linkedGuestId, quantity, pickedUpByGuestId)
        await waitFor(() => {
            expect(mockAddMealRecord).toHaveBeenCalledWith('linked-1', 1, proxyId);
        });

        await waitFor(() => {
            expect(mockAddAction).toHaveBeenCalled();
        });
    });
});
