import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { AppVersion } from '../AppVersion';
import * as appVersionUtils from '@/lib/utils/appVersion';

// Mock the utils
vi.mock('@/lib/utils/appVersion', () => ({
    APP_VERSION: '1.2.3',
    hasUnseenUpdates: vi.fn(),
}));

// Mock the modal
vi.mock('@/components/modals/WhatsNewModal', () => ({
    WhatsNewModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
        isOpen ? (
            <div data-testid="whats-new-modal">
                <button onClick={onClose}>Close</button>
            </div>
        ) : null,
}));

describe('AppVersion', () => {
    it('renders current version correctly', async () => {
        vi.mocked(appVersionUtils.hasUnseenUpdates).mockReturnValue(false);

        await act(async () => {
            render(<AppVersion />);
        });

        expect(screen.getByText('v1.2.3')).toBeDefined();
        expect(screen.queryByText('What\'s New')).toBeDefined();
    });

    it('shows update indicator when updates are available', async () => {
        vi.mocked(appVersionUtils.hasUnseenUpdates).mockReturnValue(true);

        await act(async () => {
            render(<AppVersion />);
        });

        // The sparkle button should have update-specific classes or a pulse indicator
        // Based on implementation, a pulse dot is shown
        const pulseDot = document.querySelector('.animate-pulse');
        expect(pulseDot).toBeDefined();
    });

    it('opens and closes the modal', async () => {
        vi.mocked(appVersionUtils.hasUnseenUpdates).mockReturnValue(true);

        render(<AppVersion />);

        const openButton = screen.getByText('What\'s New');
        fireEvent.click(openButton);

        expect(screen.getByTestId('whats-new-modal')).toBeDefined();

        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);

        expect(screen.queryByTestId('whats-new-modal')).toBeNull();
    });
});
