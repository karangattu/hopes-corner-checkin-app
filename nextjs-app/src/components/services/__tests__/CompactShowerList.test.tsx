import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompactShowerList } from '../CompactShowerList';

// Mock the date utilities
vi.mock('@/utils/date', () => ({
  todayPacificDateString: vi.fn(() => '2025-01-15'),
  pacificDateStringFrom: vi.fn((date: string | Date | undefined) => {
    if (!date) return null;
    // Simple mock: return the date part if ISO string
    if (typeof date === 'string' && date.includes('T')) {
      return date.split('T')[0];
    }
    return date;
  }),
}));

describe('CompactShowerList', () => {
  const defaultGuests = [
    { id: 'guest-1', name: 'John Doe' },
    { id: 'guest-2', name: 'Jane Smith' },
    { id: 'guest-3', name: 'Bob Wilson' },
  ];

  const defaultShowerSlots = [
    { time: '08:00' },
    { time: '08:30' },
    { time: '09:00' },
    { time: '09:30' },
    { time: '10:00' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders empty state when no bookings exist', () => {
      render(
        <CompactShowerList
          showerRecords={[]}
          guests={defaultGuests}
          allShowerSlots={defaultShowerSlots}
        />
      );
      expect(screen.getByText('Showers Today')).toBeInTheDocument();
      expect(screen.getByText('No shower bookings yet today')).toBeInTheDocument();
    });

    it('displays shower bookings for today', () => {
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
          createdAt: '2025-01-15T07:00:00Z',
        },
        {
          id: 'shower-2',
          guestId: 'guest-2',
          time: '08:30',
          date: '2025-01-15T08:30:00Z',
          status: 'done' as const,
          createdAt: '2025-01-15T07:05:00Z',
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={defaultGuests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Booked')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('shows capacity indicator correctly', () => {
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
          createdAt: '2025-01-15T07:00:00Z',
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={defaultGuests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      // 5 slots * 2 capacity = 10 total, 1 booked
      expect(screen.getByText('1/10')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('sorts bookings by time slot, then by createdAt within same slot', () => {
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-2',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
          createdAt: '2025-01-15T07:10:00Z', // Later creation
        },
        {
          id: 'shower-2',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
          createdAt: '2025-01-15T07:00:00Z', // Earlier creation
        },
        {
          id: 'shower-3',
          guestId: 'guest-3',
          time: '09:00',
          date: '2025-01-15T09:00:00Z',
          status: 'booked' as const,
          createdAt: '2025-01-15T07:05:00Z',
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={defaultGuests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      // All three guests should be present
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();

      // Verify John Doe (earlier createdAt) appears before Jane Smith (same time slot)
      const johnElement = screen.getByText('John Doe');
      const janeElement = screen.getByText('Jane Smith');
      
      // Compare their positions in the DOM
      const result = johnElement.compareDocumentPosition(janeElement);
      expect(result & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('status badges', () => {
    it('displays correct status badges', () => {
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'done' as const,
          createdAt: '2025-01-15T07:00:00Z',
        },
        {
          id: 'shower-2',
          guestId: 'guest-2',
          time: '08:30',
          date: '2025-01-15T08:30:00Z',
          status: 'in_progress' as const,
          createdAt: '2025-01-15T07:05:00Z',
        },
        {
          id: 'shower-3',
          guestId: 'guest-3',
          time: '09:00',
          date: '2025-01-15T09:00:00Z',
          status: 'booked' as const,
          createdAt: '2025-01-15T07:10:00Z',
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={defaultGuests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Booked')).toBeInTheDocument();
    });
  });

  describe('waitlist', () => {
    it('shows waitlist section when waitlisted guests exist', () => {
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
          createdAt: '2025-01-15T07:00:00Z',
        },
        {
          id: 'shower-2',
          guestId: 'guest-2',
          date: '2025-01-15T08:30:00Z',
          status: 'waitlisted' as const,
          createdAt: '2025-01-15T07:05:00Z',
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={defaultGuests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      // Should show waitlist toggle
      expect(screen.getByText(/Waitlist/i)).toBeInTheDocument();
    });

    it('toggles waitlist visibility when clicked', () => {
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
          createdAt: '2025-01-15T07:00:00Z',
        },
        {
          id: 'shower-2',
          guestId: 'guest-2',
          date: '2025-01-15T08:30:00Z',
          status: 'waitlisted' as const,
          createdAt: '2025-01-15T07:05:00Z',
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={defaultGuests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      const waitlistButton = screen.getByRole('button', {
        name: /waitlist|show waitlist/i,
      });

      fireEvent.click(waitlistButton);
      // After clicking, Jane Smith should be visible in waitlist
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('guest name resolution', () => {
    it('resolves guest name from name field', () => {
      const guests = [{ id: 'guest-1', name: 'John Doe' }];
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={guests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('resolves guest name from preferredName field', () => {
      const guests = [{ id: 'guest-1', preferredName: 'Johnny' }];
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={guests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      expect(screen.getByText('Johnny')).toBeInTheDocument();
    });

    it('resolves guest name from firstName/lastName fields', () => {
      const guests = [{ id: 'guest-1', firstName: 'John', lastName: 'Doe' }];
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={guests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('falls back to "Guest" when no name is found', () => {
      const guests: { id: string }[] = [];
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'unknown-guest',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={guests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      expect(screen.getByText('Guest')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('only shows bookings for today', () => {
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z', // Today
          status: 'booked' as const,
        },
        {
          id: 'shower-2',
          guestId: 'guest-2',
          time: '08:30',
          date: '2025-01-14T08:30:00Z', // Yesterday
          status: 'booked' as const,
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={defaultGuests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty guests array gracefully', () => {
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={[]}
          allShowerSlots={defaultShowerSlots}
        />
      );

      expect(screen.getByText('Guest')).toBeInTheDocument();
    });

    it('handles missing allShowerSlots gracefully', () => {
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          time: '08:00',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={defaultGuests}
        />
      );

      // Should render without crashing
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('handles missing time field gracefully', () => {
      const showerRecords = [
        {
          id: 'shower-1',
          guestId: 'guest-1',
          date: '2025-01-15T08:00:00Z',
          status: 'booked' as const,
        },
      ];

      render(
        <CompactShowerList
          showerRecords={showerRecords}
          guests={defaultGuests}
          allShowerSlots={defaultShowerSlots}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
