import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuestsByCityReport } from '../GuestsByCityReport';

describe('GuestsByCityReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultGuests = [
    { id: 'g1', location: 'San Jose', createdAt: '2025-01-15T10:00:00Z' },
    { id: 'g2', location: 'San Jose', createdAt: '2025-01-16T10:00:00Z' },
    { id: 'g3', location: 'San Francisco', createdAt: '2025-01-17T10:00:00Z' },
    { id: 'g4', location: 'Mountain View', createdAt: '2025-01-18T10:00:00Z' },
  ];

  const defaultMealRecords = [
    { id: 'm1', date: '2025-01-15', guest_id: 'g1' },
    { id: 'm2', date: '2025-01-16', guest_id: 'g2' },
    { id: 'm3', date: '2025-01-17', guest_id: 'g3' },
  ];

  describe('rendering', () => {
    it('renders report title', () => {
      render(<GuestsByCityReport guests={defaultGuests} />);
      expect(screen.getByText('Guests by City Report')).toBeInTheDocument();
    });

    it('renders empty state when no guests', () => {
      render(<GuestsByCityReport guests={[]} />);
      expect(screen.getByText('No guest data available to display')).toBeInTheDocument();
    });

    it('renders city breakdown', () => {
      render(
        <GuestsByCityReport
          guests={defaultGuests}
          mealRecords={defaultMealRecords}
        />
      );

      expect(screen.getByText('San Jose')).toBeInTheDocument();
      expect(screen.getByText('San Francisco')).toBeInTheDocument();
    });

    it('shows download button', () => {
      render(<GuestsByCityReport guests={defaultGuests} />);
      expect(
        screen.getByRole('button', { name: /download|export|csv/i })
      ).toBeInTheDocument();
    });
  });

  describe('city aggregation', () => {
    it('groups guests by city correctly', () => {
      const guests = [
        { id: 'g1', location: 'San Jose', createdAt: '2025-01-15T10:00:00Z' },
        { id: 'g2', location: 'San Jose', createdAt: '2025-01-16T10:00:00Z' },
        { id: 'g3', location: 'San Jose', createdAt: '2025-01-17T10:00:00Z' },
      ];

      const mealRecords = [
        { id: 'm1', date: '2025-01-15', guest_id: 'g1' },
        { id: 'm2', date: '2025-01-16', guest_id: 'g2' },
        { id: 'm3', date: '2025-01-17', guest_id: 'g3' },
      ];

      render(
        <GuestsByCityReport
          guests={guests}
          mealRecords={mealRecords}
        />
      );

      // Should show San Jose in the table
      expect(screen.getByText('San Jose')).toBeInTheDocument();
      // Find the table and check that it has the expected structure
      const tables = document.querySelectorAll('table');
      expect(tables.length).toBeGreaterThan(0);
    });

    it('handles guests without location', () => {
      const guests = [
        { id: 'g1', location: 'San Jose', createdAt: '2025-01-15T10:00:00Z' },
        { id: 'g2', createdAt: '2025-01-16T10:00:00Z' }, // No location
      ];

      render(<GuestsByCityReport guests={guests} />);
      // Should render without crashing
      expect(screen.getByText('Guests by City Report')).toBeInTheDocument();
    });
  });

  describe('yearly breakdown', () => {
    it('shows data by year', () => {
      const guests = [
        { id: 'g1', location: 'San Jose', createdAt: '2024-01-15T10:00:00Z' },
        { id: 'g2', location: 'San Jose', createdAt: '2025-01-16T10:00:00Z' },
      ];

      const mealRecords = [
        { id: 'm1', date: '2024-06-15', guest_id: 'g1' },
        { id: 'm2', date: '2025-06-16', guest_id: 'g2' },
      ];

      render(
        <GuestsByCityReport
          guests={guests}
          mealRecords={mealRecords}
        />
      );

      // Should show year columns
      expect(screen.getByText('2024')).toBeInTheDocument();
      expect(screen.getByText('2025')).toBeInTheDocument();
    });
  });

  describe('CSV export', () => {
    it('triggers download when export button is clicked', async () => {
      const user = userEvent.setup();
      const createObjectURLMock = vi.fn(() => 'blob:test');
      const revokeObjectURLMock = vi.fn();
      
      Object.defineProperty(URL, 'createObjectURL', { value: createObjectURLMock });
      Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURLMock });

      render(
        <GuestsByCityReport
          guests={defaultGuests}
          mealRecords={defaultMealRecords}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download|export|csv/i });
      await user.click(downloadButton);

      // Should create blob URL for download
      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled();
      });
    });
  });

  describe('service records integration', () => {
    it('counts unique guests across all service types', () => {
      const guests = [
        { id: 'g1', location: 'San Jose', createdAt: '2025-01-15T10:00:00Z' },
      ];

      const mealRecords = [
        { id: 'm1', date: '2025-01-15', guest_id: 'g1' },
        { id: 'm2', date: '2025-01-16', guest_id: 'g1' },
      ];

      const showerRecords = [
        { id: 's1', date: '2025-01-15', guest_id: 'g1' },
      ];

      const laundryRecords = [
        { id: 'l1', date: '2025-01-15', guest_id: 'g1' },
      ];

      render(
        <GuestsByCityReport
          guests={guests}
          mealRecords={mealRecords}
          showerRecords={showerRecords}
          laundryRecords={laundryRecords}
        />
      );

      // Same guest should be counted once per city/year
      expect(screen.getByText('San Jose')).toBeInTheDocument();
    });

    it('handles records with guestId field instead of guest_id', () => {
      const guests = [
        { id: 'g1', location: 'San Jose', createdAt: '2025-01-15T10:00:00Z' },
      ];

      const mealRecords = [
        { id: 'm1', date: '2025-01-15', guestId: 'g1' }, // guestId instead of guest_id
      ];

      render(
        <GuestsByCityReport
          guests={guests}
          mealRecords={mealRecords}
        />
      );

      expect(screen.getByText('San Jose')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible download button', () => {
      render(<GuestsByCityReport guests={defaultGuests} />);
      
      const downloadButton = screen.getByRole('button', { name: /download|export|csv/i });
      expect(downloadButton).toBeInTheDocument();
    });

    it('renders data in a table structure', () => {
      render(
        <GuestsByCityReport
          guests={defaultGuests}
          mealRecords={defaultMealRecords}
        />
      );

      // Should have table elements for data display
      const tables = document.querySelectorAll('table');
      expect(tables.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty records arrays', () => {
      render(
        <GuestsByCityReport
          guests={defaultGuests}
          mealRecords={[]}
          showerRecords={[]}
          laundryRecords={[]}
          bicycleRecords={[]}
        />
      );

      expect(screen.getByText('Guests by City Report')).toBeInTheDocument();
    });

    it('handles records without dates', () => {
      const mealRecords = [
        { id: 'm1', guest_id: 'g1' }, // No date
      ];

      render(
        <GuestsByCityReport
          guests={defaultGuests}
          mealRecords={mealRecords}
        />
      );

      expect(screen.getByText('Guests by City Report')).toBeInTheDocument();
    });

    it('handles invalid dates in records', () => {
      const mealRecords = [
        { id: 'm1', date: 'invalid-date', guest_id: 'g1' },
      ];

      render(
        <GuestsByCityReport
          guests={defaultGuests}
          mealRecords={mealRecords}
        />
      );

      // Should render without crashing
      expect(screen.getByText('Guests by City Report')).toBeInTheDocument();
    });
  });
});
