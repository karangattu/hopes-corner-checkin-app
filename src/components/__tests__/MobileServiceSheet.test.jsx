import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileServiceSheet from '../MobileServiceSheet';

// Mock haptics
vi.mock('../../utils/haptics', () => ({
    default: {
        buttonPress: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('MobileServiceSheet', () => {
    const mockGuest = {
        id: 'guest-1',
        name: 'John Doe',
        preferredName: 'Johnny',
        isBanned: false,
        bannedFromMeals: false,
        bannedFromShower: false,
        bannedFromLaundry: false,
    };

    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        guest: mockGuest,
        onMealSelect: vi.fn(),
        hasMealToday: false,
        mealCount: 0,
        isPendingMeal: false,
        isBannedFromMeals: false,
        onShowerSelect: vi.fn(),
        hasShowerToday: false,
        isBannedFromShower: false,
        onLaundrySelect: vi.fn(),
        hasLaundryToday: false,
        isBannedFromLaundry: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the sheet when isOpen is true', () => {
            render(<MobileServiceSheet {...defaultProps} />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText(/Quick Add for Johnny/i)).toBeInTheDocument();
        });

        it('does not render content when guest is null', () => {
            render(<MobileServiceSheet {...defaultProps} guest={null} />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('displays meal buttons when guest has no meal today', () => {
            render(<MobileServiceSheet {...defaultProps} />);

            expect(screen.getByRole('button', { name: /1 Meal/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /2 Meals/i })).toBeInTheDocument();
        });

        it('shows meal status when guest already has meal today', () => {
            render(
                <MobileServiceSheet
                    {...defaultProps}
                    hasMealToday={true}
                    mealCount={2}
                />
            );

            expect(screen.getByText(/2 Meals Today/i)).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /1 Meal/i })).not.toBeInTheDocument();
        });

        it('shows banned message when guest is banned from meals', () => {
            render(
                <MobileServiceSheet
                    {...defaultProps}
                    isBannedFromMeals={true}
                />
            );

            expect(screen.getByText(/Banned from Meals/i)).toBeInTheDocument();
        });

        it('displays shower book button when not booked today', () => {
            render(<MobileServiceSheet {...defaultProps} />);

            expect(screen.getByRole('button', { name: /Book Shower/i })).toBeInTheDocument();
        });

        it('shows shower booked status when guest has shower today', () => {
            render(
                <MobileServiceSheet
                    {...defaultProps}
                    hasShowerToday={true}
                />
            );

            expect(screen.getByText(/Shower Booked Today/i)).toBeInTheDocument();
        });

        it('displays laundry book button when not booked today', () => {
            render(<MobileServiceSheet {...defaultProps} />);

            expect(screen.getByRole('button', { name: /Book Laundry/i })).toBeInTheDocument();
        });

        it('shows laundry booked status when guest has laundry today', () => {
            render(
                <MobileServiceSheet
                    {...defaultProps}
                    hasLaundryToday={true}
                />
            );

            expect(screen.getByText(/Laundry Booked Today/i)).toBeInTheDocument();
        });
    });

    describe('Interactions', () => {
        it('calls onMealSelect and onClose when meal button is clicked', async () => {
            const user = userEvent.setup();
            render(<MobileServiceSheet {...defaultProps} />);

            const mealButton = screen.getByRole('button', { name: /1 Meal/i });
            await user.click(mealButton);

            expect(defaultProps.onMealSelect).toHaveBeenCalledWith('guest-1', 1);
            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('calls onShowerSelect and onClose when shower button is clicked', async () => {
            const user = userEvent.setup();
            render(<MobileServiceSheet {...defaultProps} />);

            const showerButton = screen.getByRole('button', { name: /Book Shower/i });
            await user.click(showerButton);

            expect(defaultProps.onShowerSelect).toHaveBeenCalledWith(mockGuest);
            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('calls onLaundrySelect and onClose when laundry button is clicked', async () => {
            const user = userEvent.setup();
            render(<MobileServiceSheet {...defaultProps} />);

            const laundryButton = screen.getByRole('button', { name: /Book Laundry/i });
            await user.click(laundryButton);

            expect(defaultProps.onLaundrySelect).toHaveBeenCalledWith(mockGuest);
            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('calls onClose when close button is clicked', async () => {
            const user = userEvent.setup();
            const { container } = render(<MobileServiceSheet {...defaultProps} />);

            // Get the X close button specifically (not the hint at bottom)
            const closeButton = container.querySelector('button[aria-label="Close"]');
            await user.click(closeButton);

            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('calls onClose when backdrop is clicked', async () => {
            const user = userEvent.setup();
            const { container } = render(<MobileServiceSheet {...defaultProps} />);

            // Click the backdrop (first div with fixed inset-0)
            const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
            await user.click(backdrop);

            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('calls onClose when Escape key is pressed', async () => {
            render(<MobileServiceSheet {...defaultProps} />);

            fireEvent.keyDown(document, { key: 'Escape' });

            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('disables meal buttons when isPendingMeal is true', () => {
            render(
                <MobileServiceSheet
                    {...defaultProps}
                    isPendingMeal={true}
                />
            );

            const mealButtons = screen.getAllByRole('button', { name: /Meal/i });
            mealButtons.forEach(button => {
                if (button.textContent.includes('1') || button.textContent.includes('2')) {
                    expect(button).toBeDisabled();
                }
            });
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA attributes', () => {
            render(<MobileServiceSheet {...defaultProps} />);

            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveAttribute('aria-modal', 'true');
            expect(dialog).toHaveAttribute('aria-labelledby', 'mobile-service-sheet-title');
        });

        it('has a properly labeled close button', () => {
            const { container } = render(<MobileServiceSheet {...defaultProps} />);

            expect(container.querySelector('button[aria-label="Close"]')).toBeInTheDocument();
        });
    });

    describe('Guest name display', () => {
        it('uses preferred name when available', () => {
            render(<MobileServiceSheet {...defaultProps} />);

            expect(screen.getByText(/Quick Add for Johnny/i)).toBeInTheDocument();
        });

        it('falls back to full name when no preferred name', () => {
            const guestWithoutPreferred = { ...mockGuest, preferredName: null };
            render(<MobileServiceSheet {...defaultProps} guest={guestWithoutPreferred} />);

            expect(screen.getByText(/Quick Add for John Doe/i)).toBeInTheDocument();
        });
    });
});
