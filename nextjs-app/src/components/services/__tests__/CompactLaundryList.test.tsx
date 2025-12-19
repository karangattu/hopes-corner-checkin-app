import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompactLaundryList } from '../CompactLaundryList';

// Mock the date utilities
vi.mock('@/utils/date', () => ({
  todayPacificDateString: vi.fn(() => '2025-01-15'),
  pacificDateStringFrom: vi.fn((date: string | Date | undefined) => {
    if (!date) return null;
    if (typeof date === 'string' && date.includes('T')) {
      return date.split('T')[0];
    }
    return date;
  }),
}));

describe('CompactLaundryList', () => {
  const defaultGuests = [
    { id: 'guest-1', name: 'John Doe' },
    { id: 'guest-2', name: 'Jane Smith' },
    { id: 'guest-3', name: 'Bob Wilson' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders empty state when no laundry records exist', () => {
      render(
        <CompactLaundryList
          laundryRecords={[]}
          guests={defaultGuests}
        />
      );
      expect(screen.getByText('Laundry Today')).toBeInTheDocument();
      expect(screen.getByText(/No laundry bookings/i)).toBeInTheDocument();
    });

    it('displays onsite laundry records for today', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          time: '8:30 - 9:30',
          date: '2025-01-15T08:30:00Z',
          status: 'waiting',
          laundryType: 'onsite' as const,
          createdAt: '2025-01-15T07:00:00Z',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Waiting')).toBeInTheDocument();
    });

    it('displays offsite laundry records when expanded', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'pending',
          laundryType: 'offsite' as const,
          bagNumber: 'B001',
          createdAt: '2025-01-15T07:00:00Z',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      // Offsite section should be collapsed by default, need to expand it
      const offsiteButton = screen.getByRole('button', { name: /off-site/i });
      expect(offsiteButton).toBeInTheDocument();
      
      // Click to expand offsite section
      fireEvent.click(offsiteButton);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('status badges', () => {
    it('displays waiting status', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'waiting',
          laundryType: 'onsite' as const,
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      expect(screen.getByText('Waiting')).toBeInTheDocument();
    });

    it('displays washer status', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'washer',
          laundryType: 'onsite' as const,
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      expect(screen.getByText('Washer')).toBeInTheDocument();
    });

    it('displays dryer status', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'dryer',
          laundryType: 'onsite' as const,
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      expect(screen.getByText('Dryer')).toBeInTheDocument();
    });

    it('displays done status', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'done',
          laundryType: 'onsite' as const,
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('displays picked up status', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'picked_up',
          laundryType: 'onsite' as const,
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      expect(screen.getByText('Picked Up')).toBeInTheDocument();
    });
  });

  describe('guest name resolution', () => {
    it('resolves guest name from name field', () => {
      const guests = [{ id: 'guest-1', name: 'John Doe' }];
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'waiting',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={guests}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('resolves guest name from preferredName field', () => {
      const guests = [{ id: 'guest-1', preferredName: 'Johnny' }];
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'waiting',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={guests}
        />
      );

      expect(screen.getByText('Johnny')).toBeInTheDocument();
    });

    it('resolves guest name from firstName/lastName fields', () => {
      const guests = [{ id: 'guest-1', firstName: 'John', lastName: 'Doe' }];
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'waiting',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={guests}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('falls back to "Guest" when no name is found', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'unknown-guest',
          date: '2025-01-15T08:30:00Z',
          status: 'waiting',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={[]}
        />
      );

      expect(screen.getByText('Guest')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('only shows records for today by default', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z', // Today
          status: 'waiting',
        },
        {
          id: 'laundry-2',
          guestId: 'guest-2',
          date: '2025-01-14T08:30:00Z', // Yesterday
          status: 'waiting',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('respects viewDate prop when provided', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'waiting',
        },
        {
          id: 'laundry-2',
          guestId: 'guest-2',
          date: '2025-01-14T08:30:00Z',
          status: 'waiting',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
          viewDate="2025-01-14"
        />
      );

      // When viewDate is yesterday, should show Jane Smith
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('sorts records by time slot', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-2',
          time: '9:30 - 10:30',
          date: '2025-01-15T09:30:00Z',
          status: 'waiting',
          laundryType: 'onsite' as const,
        },
        {
          id: 'laundry-2',
          guestId: 'guest-1',
          time: '8:30 - 9:30',
          date: '2025-01-15T08:30:00Z',
          status: 'waiting',
          laundryType: 'onsite' as const,
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      // Both guests should be present
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();

      // Verify John Doe (8:30) appears before Jane Smith (9:30) in DOM
      const johnElement = screen.getByText('John Doe');
      const janeElement = screen.getByText('Jane Smith');
      
      // Compare their positions in the DOM
      const result = johnElement.compareDocumentPosition(janeElement);
      expect(result & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('offsite laundry', () => {
    it('shows bag number for offsite laundry when expanded', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'pending',
          laundryType: 'offsite' as const,
          bagNumber: 'B123',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      // Expand offsite section
      const offsiteButton = screen.getByRole('button', { name: /off-site/i });
      fireEvent.click(offsiteButton);

      expect(screen.getByText(/B123/)).toBeInTheDocument();
    });

    it('displays offsite-specific statuses when expanded', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'transported',
          laundryType: 'offsite' as const,
          bagNumber: 'B001',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      // Expand offsite section
      const offsiteButton = screen.getByRole('button', { name: /off-site/i });
      fireEvent.click(offsiteButton);

      expect(screen.getByText('Transported')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty guests array gracefully', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'waiting',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={[]}
        />
      );

      expect(screen.getByText('Guest')).toBeInTheDocument();
    });

    it('handles missing time field gracefully', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'waiting',
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('handles numeric bag number when expanded', () => {
      const laundryRecords = [
        {
          id: 'laundry-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:30:00Z',
          status: 'pending',
          laundryType: 'offsite' as const,
          bagNumber: 42,
        },
      ];

      render(
        <CompactLaundryList
          laundryRecords={laundryRecords}
          guests={defaultGuests}
        />
      );

      // Expand offsite section
      const offsiteButton = screen.getByRole('button', { name: /off-site/i });
      fireEvent.click(offsiteButton);

      expect(screen.getByText(/42/)).toBeInTheDocument();
    });
  });
});
