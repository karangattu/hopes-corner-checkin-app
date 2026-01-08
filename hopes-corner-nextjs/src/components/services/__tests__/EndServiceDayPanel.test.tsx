import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { EndServiceDayPanel } from '../EndServiceDayPanel';

describe('EndServiceDayPanel Component', () => {
    const mockOnEndShowerDay = vi.fn().mockResolvedValue(undefined);
    const mockOnEndLaundryDay = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Visibility Based on Props', () => {
        it('does not render when showShower and showLaundry are false', () => {
            const { container } = render(
                <EndServiceDayPanel
                    onEndShowerDay={mockOnEndShowerDay}
                    onEndLaundryDay={mockOnEndLaundryDay}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('does not render when not admin', () => {
            const { container } = render(
                <EndServiceDayPanel
                    showShower={true}
                    onEndShowerDay={mockOnEndShowerDay}
                    onEndLaundryDay={mockOnEndLaundryDay}
                    isAdmin={false}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('renders shower button when showShower is true and isAdmin', () => {
            render(
                <EndServiceDayPanel
                    showShower={true}
                    pendingShowerCount={5}
                    onEndShowerDay={mockOnEndShowerDay}
                    onEndLaundryDay={mockOnEndLaundryDay}
                    isAdmin={true}
                />
            );
            expect(screen.getByText('End Showers')).toBeDefined();
        });
    });

    describe('Pending Counts', () => {
        it('shows pending shower count', () => {
            render(
                <EndServiceDayPanel
                    showShower={true}
                    pendingShowerCount={5}
                    onEndShowerDay={mockOnEndShowerDay}
                    onEndLaundryDay={mockOnEndLaundryDay}
                    isAdmin={true}
                />
            );
            expect(screen.getByText('5')).toBeDefined();
        });
    });

    describe('Confirmation Dialog', () => {
        it('calls onEndShowerDay when confirmed', async () => {
            render(
                <EndServiceDayPanel
                    showShower={true}
                    pendingShowerCount={5}
                    onEndShowerDay={mockOnEndShowerDay}
                    onEndLaundryDay={mockOnEndLaundryDay}
                    isAdmin={true}
                />
            );

            fireEvent.click(screen.getByText('End Showers'));

            // Use getByRole to target the button specifically, avoiding the H3 title
            const confirmBtn = screen.getByRole('button', { name: 'End Service Day' });
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(mockOnEndShowerDay).toHaveBeenCalled();
            });
        });

        it('calls onEndLaundryDay when confirmed', async () => {
            render(
                <EndServiceDayPanel
                    showLaundry={true}
                    pendingLaundryCount={3}
                    onEndShowerDay={mockOnEndShowerDay}
                    onEndLaundryDay={mockOnEndLaundryDay}
                    isAdmin={true}
                />
            );

            fireEvent.click(screen.getByText('End Laundry'));

            const confirmBtn = screen.getByRole('button', { name: 'End Service Day' });
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(mockOnEndLaundryDay).toHaveBeenCalled();
            });
        });
    });
});
