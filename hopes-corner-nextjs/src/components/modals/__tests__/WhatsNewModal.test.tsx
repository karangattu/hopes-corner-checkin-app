import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { WhatsNewModal } from '../WhatsNewModal';

// Mock dependencies
const mockMarkVersionAsSeen = vi.fn();

vi.mock('@/lib/utils/appVersion', () => ({
    APP_VERSION: '1.2.3',
    CHANGELOG: [
        {
            version: '1.2.3',
            date: '2026-01-01',
            highlights: [
                { type: 'feature', title: 'Cool Feature', description: 'Does cool things' },
                { type: 'fix', title: 'Important Fix', description: 'Fixed a bug' },
            ],
        },
        {
            version: '1.2.2',
            date: '2025-12-31',
            highlights: [{ type: 'improvement', title: 'Better UI', description: 'Looks nice' }],
        },
    ],
    markVersionAsSeen: () => mockMarkVersionAsSeen(),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, onClick }: any) => (
            <div className={className} onClick={onClick}>
                {children}
            </div>
        ),
    },
}));

describe('WhatsNewModal Component', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when closed', () => {
        const { container } = render(<WhatsNewModal isOpen={false} onClose={mockOnClose} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders content when open', () => {
        render(<WhatsNewModal isOpen={true} onClose={mockOnClose} />);

        expect(screen.getByText("What's New")).toBeDefined();
        expect(screen.getByText('Version 1.2.3')).toBeDefined();

        // Check changelog items
        expect(screen.getByText('Cool Feature')).toBeDefined();
        expect(screen.getByText('Important Fix')).toBeDefined();
        // Check labels
        expect(screen.getByText('New Feature')).toBeDefined();
        expect(screen.getByText('Bug Fix')).toBeDefined();
    });

    it('calls markVersionAsSeen when opened', () => {
        render(<WhatsNewModal isOpen={true} onClose={mockOnClose} />);
        expect(mockMarkVersionAsSeen).toHaveBeenCalled();
    });

    it('closes when close button is clicked', () => {
        render(<WhatsNewModal isOpen={true} onClose={mockOnClose} />);

        // X button in header
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[0]);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes when Got it button is clicked', () => {
        render(<WhatsNewModal isOpen={true} onClose={mockOnClose} />);

        fireEvent.click(screen.getByText('Got it'));

        expect(mockOnClose).toHaveBeenCalled();
    });
    it('closes when Escape key is pressed', () => {
        render(<WhatsNewModal isOpen={true} onClose={mockOnClose} />);

        fireEvent.keyDown(document, { key: 'Escape' });

        expect(mockOnClose).toHaveBeenCalled();
    });
});
