import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EssentialsKit } from '../EssentialsKit';

const mockGiveItem = vi.fn();
const mockCanGiveItem = vi.fn();
const mockGetDaysUntilAvailable = vi.fn();
const mockGetLastGivenItem = vi.fn();

vi.mock('@/lib/stores/useEssentialsStore', () => ({
    useEssentialsStore: () => ({
        giveItem: mockGiveItem,
        canGiveItem: mockCanGiveItem,
        getDaysUntilAvailable: mockGetDaysUntilAvailable,
        getLastGivenItem: mockGetLastGivenItem,
    }),
}));

vi.mock('@/utils/toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('EssentialsKit', () => {
    const guestId = 'guest-123';

    beforeEach(() => {
        vi.clearAllMocks();
        mockCanGiveItem.mockReturnValue(true);
        mockGetDaysUntilAvailable.mockReturnValue(0);
        mockGetLastGivenItem.mockReturnValue(null);
        mockGiveItem.mockResolvedValue({
            id: 'new-item',
            guestId,
            item: 'tshirt',
            date: new Date().toISOString(),
        });
    });

    describe('rendering', () => {
        it('renders all 6 essential items', () => {
            render(<EssentialsKit guestId={guestId} />);

            expect(screen.getByTestId('essential-item-jacket')).toBeInTheDocument();
            expect(screen.getByTestId('essential-item-tshirt')).toBeInTheDocument();
            expect(screen.getByTestId('essential-item-sleeping_bag')).toBeInTheDocument();
            expect(screen.getByTestId('essential-item-backpack')).toBeInTheDocument();
            expect(screen.getByTestId('essential-item-tent')).toBeInTheDocument();
            expect(screen.getByTestId('essential-item-flip_flops')).toBeInTheDocument();
        });

        it('displays correct labels for items', () => {
            render(<EssentialsKit guestId={guestId} />);

            expect(screen.getByText('Jacket')).toBeInTheDocument();
            expect(screen.getByText('T-Shirt')).toBeInTheDocument();
            expect(screen.getByText('Sleeping Bag')).toBeInTheDocument();
            expect(screen.getByText('Backpack/Duffel Bag')).toBeInTheDocument();
            expect(screen.getByText('Tent')).toBeInTheDocument();
            expect(screen.getByText('Flip Flops')).toBeInTheDocument();
        });

        it('shows available count badge', () => {
            mockCanGiveItem.mockReturnValue(true);
            render(<EssentialsKit guestId={guestId} />);

            expect(screen.getByText('6 available')).toBeInTheDocument();
        });
    });

    describe('availability status', () => {
        it('shows "Never given" when item has not been given before', () => {
            mockCanGiveItem.mockReturnValue(true);
            mockGetLastGivenItem.mockReturnValue(null);

            render(<EssentialsKit guestId={guestId} />);

            const neverGivenElements = screen.getAllByText('Never given');
            expect(neverGivenElements.length).toBeGreaterThan(0);
        });

        it('shows last given date when item was previously given', () => {
            mockCanGiveItem.mockReturnValue(true);
            mockGetLastGivenItem.mockImplementation((guestId, item) => {
                if (item === 'tshirt') {
                    return { id: 'item-1', guestId, item, date: '2025-01-01T10:00:00Z' };
                }
                return null;
            });

            render(<EssentialsKit guestId={guestId} />);

            expect(screen.getByText(/Last:/)).toBeInTheDocument();
        });

        it('shows days remaining when on cooldown', () => {
            mockCanGiveItem.mockImplementation((guestId, item) => item !== 'backpack');
            mockGetDaysUntilAvailable.mockImplementation((guestId, item) =>
                item === 'backpack' ? 15 : 0
            );

            render(<EssentialsKit guestId={guestId} />);

            expect(screen.getByText('Available in 15 days')).toBeInTheDocument();
        });

        it('shows correct singular/plural for days', () => {
            mockCanGiveItem.mockImplementation((guestId, item) => item !== 'tent');
            mockGetDaysUntilAvailable.mockImplementation((guestId, item) =>
                item === 'tent' ? 1 : 0
            );

            render(<EssentialsKit guestId={guestId} />);

            expect(screen.getByText('Available in 1 day')).toBeInTheDocument();
        });
    });

    describe('button behavior', () => {
        it('enables button when item is available', () => {
            mockCanGiveItem.mockReturnValue(true);

            render(<EssentialsKit guestId={guestId} />);

            const tshirtBtn = screen.getByTestId('give-tshirt-btn');
            expect(tshirtBtn).not.toBeDisabled();
        });

        it('disables button when item is on cooldown', () => {
            mockCanGiveItem.mockImplementation((guestId, item) => item !== 'sleeping_bag');

            render(<EssentialsKit guestId={guestId} />);

            const sleepingBagBtn = screen.getByTestId('give-sleeping_bag-btn');
            expect(sleepingBagBtn).toBeDisabled();
        });

        it('calls giveItem when button is clicked', async () => {
            mockCanGiveItem.mockReturnValue(true);

            render(<EssentialsKit guestId={guestId} />);

            const tshirtBtn = screen.getByTestId('give-tshirt-btn');
            fireEvent.click(tshirtBtn);

            await waitFor(() => {
                expect(mockGiveItem).toHaveBeenCalledWith(guestId, 'tshirt');
            });
        });
    });

    describe('error handling', () => {
        it('handles errors when giving item fails', async () => {
            mockCanGiveItem.mockReturnValue(true);
            mockGiveItem.mockRejectedValue(new Error('Network error'));

            render(<EssentialsKit guestId={guestId} />);

            const tentBtn = screen.getByTestId('give-tent-btn');
            fireEvent.click(tentBtn);

            await waitFor(() => {
                expect(mockGiveItem).toHaveBeenCalled();
            });
        });
    });
});
