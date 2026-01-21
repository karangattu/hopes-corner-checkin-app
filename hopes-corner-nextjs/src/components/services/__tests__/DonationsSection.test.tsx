import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DonationsSection } from '../DonationsSection';

vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

vi.mock('@/stores/useDonationsStore', () => ({
    useDonationsStore: vi.fn(() => ({
        donationRecords: [
            {
                id: 'd1',
                date_key: '2026-01-08',
                donation_type: 'Protein',
                item_name: 'Chicken',
                weight_lbs: 50,
                trays: 2,
                donated_at: '2026-01-08T10:00:00Z',
                type: 'Protein',
                itemName: 'Chicken',
                weightLbs: 50
            }
        ],
        laPlazaRecords: [
            {
                id: 'p1',
                date_key: '2026-01-08',
                category: 'Bakery',
                weight_lbs: 20,
                notes: 'Bread',
                donated_at: '2026-01-08T11:00:00Z',
                weightLbs: 20
            }
        ],
        addDonation: vi.fn().mockResolvedValue({ id: 'd-new' }),
        updateDonation: vi.fn().mockResolvedValue(true),
        deleteDonation: vi.fn().mockResolvedValue(true),
        addLaPlazaDonation: vi.fn().mockResolvedValue(true),
        updateLaPlazaDonation: vi.fn().mockResolvedValue(true),
        deleteLaPlazaDonation: vi.fn().mockResolvedValue(true),
    })),
}));

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2026-01-08',
    pacificDateStringFrom: (date: string) => date ? date.slice(0, 10) : null,
}));

vi.mock('@/lib/utils/donationUtils', () => ({
    deriveDonationDateKey: (record: any) => record.date_key || '2026-01-08',
    calculateServings: () => 10,
    formatProteinAndCarbsClipboardText: () => 'Summary',
    DENSITY_SERVINGS: {},
    MINIMAL_TYPES: new Set(['Bakery']),
}));

Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
    },
});

describe('DonationsSection Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders component without crashing', () => {
            render(<DonationsSection />);
            const container = document.querySelector('.space-y-6');
            expect(container).not.toBeNull();
        });

        it('shows donation type tabs', () => {
            render(<DonationsSection />);
            expect(screen.getByText('General')).toBeDefined();
            expect(screen.getByText('La Plaza')).toBeDefined();
        });
    });

    describe('Tab Switching', () => {
        it('has tab buttons', () => {
            render(<DonationsSection />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Display Records', () => {
        it('shows donation weight', () => {
            render(<DonationsSection />);
            expect(screen.getByText(/50\s*lbs/)).toBeDefined();
        });

        it('shows donation type/category', () => {
            render(<DonationsSection />);
            expect(screen.getByText('Protein', { selector: 'span' })).toBeDefined();
        });
    });
});
