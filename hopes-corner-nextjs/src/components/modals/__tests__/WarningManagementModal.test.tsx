import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { WarningManagementModal } from '../WarningManagementModal';
import { useGuestsStore } from '@/stores/useGuestsStore';
import toast from 'react-hot-toast';

// Mock the store
vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(),
}));

// Mock hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('WarningManagementModal', () => {
    const mockGuest = { id: 'guest-1', name: 'John Doe', preferredName: 'Johnny' };
    const mockWarnings = [
        { id: 'warn-1', message: 'First warning', severity: 1, createdAt: '2023-01-01T10:00:00Z' },
        { id: 'warn-2', message: 'Second warning', severity: 2, createdAt: '2023-01-02T10:00:00Z' },
    ];

    const mockAddGuestWarning = vi.fn();
    const mockRemoveGuestWarning = vi.fn();
    const mockGetWarningsForGuest = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useGuestsStore).mockReturnValue({
            addGuestWarning: mockAddGuestWarning,
            removeGuestWarning: mockRemoveGuestWarning,
            getWarningsForGuest: mockGetWarningsForGuest,
        } as any);
        mockGetWarningsForGuest.mockReturnValue(mockWarnings);
    });

    it('renders guest name and existing warnings', () => {
        render(<WarningManagementModal guest={mockGuest} onClose={vi.fn()} />);

        expect(screen.getByText('Johnny')).toBeDefined();
        expect(screen.getByText('First warning')).toBeDefined();
        expect(screen.getByText('Second warning')).toBeDefined();
        expect(screen.getAllByText('Low')).toBeDefined();
        expect(screen.getAllByText('Medium')).toBeDefined();
    });

    it('shows empty state when no warnings exist', () => {
        mockGetWarningsForGuest.mockReturnValue([]);
        render(<WarningManagementModal guest={mockGuest} onClose={vi.fn()} />);
        expect(screen.getByText('No active warnings for this guest')).toBeDefined();
    });

    it('handles adding a new warning successfully', async () => {
        mockAddGuestWarning.mockResolvedValueOnce({});
        render(<WarningManagementModal guest={mockGuest} onClose={vi.fn()} />);

        const textarea = screen.getByPlaceholderText('Describe the warning...');
        fireEvent.change(textarea, { target: { value: 'New test warning' } });

        const addButton = screen.getByText('Add');
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(mockAddGuestWarning).toHaveBeenCalledWith('guest-1', {
                message: 'New test warning',
                severity: 1,
            });
            expect(toast.success).toHaveBeenCalledWith('Warning added');
        });
    });

    it('handles adding warning error', async () => {
        mockAddGuestWarning.mockRejectedValueOnce(new Error('Failed to add'));
        render(<WarningManagementModal guest={mockGuest} onClose={vi.fn()} />);

        fireEvent.change(screen.getByPlaceholderText('Describe the warning...'), {
            target: { value: 'Bad warning' }
        });
        fireEvent.click(screen.getByText('Add'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to add');
        });
    });

    it('disables add button when message is empty', () => {
        render(<WarningManagementModal guest={mockGuest} onClose={vi.fn()} />);
        const addButton = screen.getByText('Add');
        // The word "Add" might be in other places? No, it's unique enough here.
        // Actually, let's use the role for safety.
        const button = screen.getByRole('button', { name: /add/i });
        expect(button).toBeDisabled();
    });

    it('changes severity level', () => {
        render(<WarningManagementModal guest={mockGuest} onClose={vi.fn()} />);
        const highButton = screen.getByText('High');
        fireEvent.click(highButton);

        // Severity 3 (High) should be selected. We can check via class if needed, 
        // but the internal state newSeverity is used on Add call.
        fireEvent.change(screen.getByPlaceholderText('Describe the warning...'), {
            target: { value: 'Critical issue' }
        });
        fireEvent.click(screen.getByText('Add'));

        expect(mockAddGuestWarning).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ severity: 3 }));
    });

    it('removes a warning successfully', async () => {
        mockRemoveGuestWarning.mockResolvedValueOnce({});
        const { container } = render(<WarningManagementModal guest={mockGuest} onClose={vi.fn()} />);

        // Find the first trash icon and click its parent button
        const trashIcon = container.querySelector('.lucide-trash-2');
        const removeButton = trashIcon?.parentElement;
        if (!removeButton) throw new Error('Remove button not found');

        fireEvent.click(removeButton);

        await waitFor(() => {
            expect(mockRemoveGuestWarning).toHaveBeenCalledWith('warn-1');
            expect(toast.success).toHaveBeenCalledWith('Warning removed');
        });
    });

    it('handles removal error', async () => {
        mockRemoveGuestWarning.mockRejectedValueOnce(new Error('Delete error'));
        const { container } = render(<WarningManagementModal guest={mockGuest} onClose={vi.fn()} />);

        const trashIcon = container.querySelector('.lucide-trash-2');
        const removeButton = trashIcon?.parentElement;
        if (!removeButton) throw new Error('Remove button not found');

        fireEvent.click(removeButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Delete error');
        });
    });

    it('calls onClose when Done or X is clicked', () => {
        const onClose = vi.fn();
        const { container } = render(<WarningManagementModal guest={mockGuest} onClose={onClose} />);

        fireEvent.click(screen.getByText('Done'));
        expect(onClose).toHaveBeenCalled();

        const xIcon = container.querySelector('.lucide-x');
        const xButton = xIcon?.parentElement;
        if (!xButton) throw new Error('X button not found');

        fireEvent.click(xButton);
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
