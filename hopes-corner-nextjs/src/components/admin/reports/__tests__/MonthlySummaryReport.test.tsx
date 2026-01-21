import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MonthlySummaryReport from '../MonthlySummaryReport';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';

// Mock the stores
vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: {
        getState: vi.fn(),
    },
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Bike: () => <div data-testid="icon-bike" />,
    Info: () => <div data-testid="icon-info" />,
    Lightbulb: () => <div data-testid="icon-lightbulb" />,
    ShowerHead: () => <div data-testid="icon-shower" />,
}));

describe('MonthlySummaryReport', () => {
    const currentYear = 2026;
    const mockMeals = [
        { date: `${currentYear}-01-05T12:00:00`, count: 100, guestId: 'g1' }, // Jan 5, 2026 is Monday
        { date: `${currentYear}-01-07T12:00:00`, count: 120, guestId: 'g2' }, // Jan 7, 2026 is Wednesday
    ];

    const mockBikes = [
        { date: `${currentYear}-01-10T12:00:00`, status: 'done', repairTypes: ['Flat tire'] },
        { date: `${currentYear}-01-11T12:00:00`, status: 'done', repairType: 'New Bicycle' },
    ];

    const mockShowers = [
        { date: `${currentYear}-01-15T12:00:00`, status: 'done', guestId: 'g1' },
    ];

    const mockLaundry = [
        { date: `${currentYear}-01-20T12:00:00`, status: 'done', guestId: 'g1', laundryType: 'onsite' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useMealsStore).mockReturnValue({
            mealRecords: mockMeals,
            extraMealRecords: [],
            rvMealRecords: [],
            unitedEffortMealRecords: [],
        } as any);

        vi.mocked(useServicesStore.getState).mockReturnValue({
            bicycleRecords: mockBikes,
            showerRecords: mockShowers,
            laundryRecords: mockLaundry,
        } as any);
    });

    it('renders the report components and headers', () => {
        render(<MonthlySummaryReport />);
        expect(screen.getByText('Monthly Summary Report')).toBeDefined();
        expect(screen.getByText('Bicycle Services Summary')).toBeDefined();
        expect(screen.getByText('Shower & Laundry Summary')).toBeDefined();
    });

    it('handles year selection change', () => {
        render(<MonthlySummaryReport />);
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: '2023' } });
        expect(select).toHaveValue('2023');
    });

    it('filters and sums meal data correctly', () => {
        render(<MonthlySummaryReport />);
        const janRow = screen.getAllByText('January')[0].closest('tr');
        expect(janRow?.textContent).toContain('100'); // Monday meals
        expect(janRow?.textContent).toContain('120'); // Wednesday meals
    });

    it('calculates bicycle summary correctly', () => {
        render(<MonthlySummaryReport />);
        // Bicycle summary row for January
        const janRow = screen.getAllByText('January').find(el => el.closest('table')?.textContent?.includes('Bicycle'))?.closest('tr');
        expect(janRow?.textContent).toContain('1'); // New Bicycles
        expect(janRow?.textContent).toContain('1'); // Services
    });

    it('calculates shower and laundry summary correctly', () => {
        render(<MonthlySummaryReport />);
        const janRow = screen.getAllByText('January').find(el => el.closest('table')?.textContent?.includes('Shower'))?.closest('tr');
        expect(janRow?.textContent).toContain('1'); // Showers
        expect(janRow?.textContent).toContain('1'); // Laundry Loads
    });

    it('handles missing or empty store data', () => {
        vi.mocked(useMealsStore).mockReturnValue({} as any);
        vi.mocked(useServicesStore.getState).mockReturnValue({} as any);
        render(<MonthlySummaryReport />);
        expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
});
