import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ShowerDetailModal } from '../ShowerDetailModal';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the items store
const mockFetchItemsForGuest = vi.fn();
const mockCheckAvailability = vi.fn((_guestId: string, _itemKey: string) => ({ available: true }));
const mockGiveItem = vi.fn();

vi.mock('@/stores/useItemsStore', () => ({
    useItemsStore: () => ({
        fetchItemsForGuest: mockFetchItemsForGuest,
        checkAvailability: mockCheckAvailability,
        giveItem: mockGiveItem,
        distributedItems: [],
        isLoading: false,
    }),
}));

// Mock WaiverBadge
vi.mock('@/components/ui/WaiverBadge', () => ({
    WaiverBadge: () => <div data-testid="waiver-badge">Waiver Badge</div>,
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('ShowerDetailModal', () => {
    const mockGuest = {
        id: 'guest-1',
        firstName: 'John',
        preferredName: 'Johnny',
        name: 'John Doe',
    };

    const mockRecord = {
        id: 'shower-1',
        status: 'awaiting',
        time: '10:00 AM',
        date: new Date().toISOString(),
    };

    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        record: mockRecord,
        guest: mockGuest,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders modal when open', () => {
        render(<ShowerDetailModal {...defaultProps} />);
        expect(screen.getByText('Johnny')).toBeDefined();
        expect(screen.getByText('Shower Details & Amenities')).toBeDefined();
    });

    it('does not render when closed', () => {
        const { container } = render(<ShowerDetailModal {...defaultProps} isOpen={false} />);
        expect(container.innerHTML).toBe('');
    });

    it('does not render without guest', () => {
        const { container } = render(<ShowerDetailModal {...defaultProps} guest={null} />);
        expect(container.innerHTML).toBe('');
    });

    it('does not render without record', () => {
        const { container } = render(<ShowerDetailModal {...defaultProps} record={null} />);
        expect(container.innerHTML).toBe('');
    });

    describe('Amenity Items', () => {
        it('displays T-Shirt amenity with weekly limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('T-Shirt')).toBeDefined();
        });

        it('displays Jacket amenity with 30-day limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Jacket')).toBeDefined();
        });

        it('displays Tent amenity with 30-day limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Tent')).toBeDefined();
        });

        it('displays Sleeping Bag amenity with 30-day limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Sleeping Bag')).toBeDefined();
        });

        it('displays Backpack amenity with 30-day limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Backpack')).toBeDefined();
        });

        it('displays Flip Flops amenity with 30-day limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Flip Flops')).toBeDefined();
        });

        it('does NOT display Socks (unlimited item)', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.queryByText('Socks')).toBeNull();
        });

        it('does NOT display Underwear (unlimited item)', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.queryByText('Underwear')).toBeNull();
        });
    });

    describe('Amenity item interactions', () => {
        it('calls giveItem when available item button is clicked', async () => {
            mockGiveItem.mockResolvedValue({ id: 'item-1' });
            render(<ShowerDetailModal {...defaultProps} />);

            const jacketButton = screen.getByText('Jacket').closest('button');
            expect(jacketButton).toBeDefined();
            
            fireEvent.click(jacketButton!);
            
            await waitFor(() => {
                expect(mockGiveItem).toHaveBeenCalledWith('guest-1', 'jacket');
            });
        });

        it('disables item button when not available', () => {
            mockCheckAvailability.mockImplementation((_guestId: string, itemKey: string) => {
                if (itemKey === 'jacket') {
                    return { available: false, daysRemaining: 15 };
                }
                return { available: true };
            });

            render(<ShowerDetailModal {...defaultProps} />);

            const jacketButton = screen.getByText('Jacket').closest('button');
            expect(jacketButton?.hasAttribute('disabled')).toBe(true);
        });

        it('shows days remaining when item is on cooldown', () => {
            mockCheckAvailability.mockImplementation((_guestId: string, itemKey: string) => {
                if (itemKey === 'jacket') {
                    return { available: false, daysRemaining: 15 };
                }
                return { available: true };
            });

            render(<ShowerDetailModal {...defaultProps} />);

            expect(screen.getByText('15d left')).toBeDefined();
        });
    });

    describe('Close functionality', () => {
        it('calls onClose when close button is clicked', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            
            // Find the button with X icon (first button in the modal)
            const buttons = screen.getAllByRole('button');
            const closeBtn = buttons[0]; // First button is the close button
            
            fireEvent.click(closeBtn);
            expect(defaultProps.onClose).toHaveBeenCalled();
        });
    });

    describe('Fetches items on open', () => {
        it('fetches items when modal opens', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(mockFetchItemsForGuest).toHaveBeenCalledWith('guest-1');
        });
    });
});
