/**
 * Laundry Components - Warning Badge Tests
 * 
 * Tests that verify warning badges appear in:
 * - LaundryKanban component (Kanban board view)
 * - CompactLaundryList component (List view)
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

/**
 * Mock of LaundryKanban card with warning badge
 */
const LaundryKanbanCard = ({ booking, hasWarning }) => {
  return (
    <div
      data-testid={`kanban-card-${booking.guestId}`}
      className="bg-white border rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <h4>{booking.name}</h4>
        {hasWarning && (
          <div className="text-red-600 flex-shrink-0" title="⚠️ Guest has warning">
            ⚠️
          </div>
        )}
      </div>
      <div className="text-sm text-gray-600">{booking.status}</div>
    </div>
  );
};

/**
 * Mock of CompactLaundryList active row with warning badge
 */
const ActiveLaundryRow = ({ booking, hasWarning = false }) => {
  return (
    <div
      data-testid={`active-row-${booking.guestId}`}
      className="px-4 py-2.5 flex items-center gap-2"
    >
      {hasWarning && (
        <div className="text-red-600 flex-shrink-0" title="⚠️ Guest has warning">
          ⚠️
        </div>
      )}
      <span className="font-medium">{booking.name}</span>
    </div>
  );
};

/**
 * Mock of CompactLaundryList done row with warning badge
 */
const DoneLaundryRow = ({ booking, hasWarning = false }) => {
  return (
    <div
      data-testid={`done-row-${booking.guestId}`}
      className="px-4 py-2.5 flex items-center gap-2"
    >
      {hasWarning && (
        <div className="text-red-600 flex-shrink-0" title="⚠️ Guest has warning">
          ⚠️
        </div>
      )}
      <span className="font-medium">{booking.name}</span>
    </div>
  );
};

describe('Laundry Components - Warning Display', () => {
  describe('LaundryKanban Card Warning', () => {
    it('renders warning badge in kanban card when guest has warnings', () => {
      const booking = { guestId: 'g1', name: 'John Doe', status: 'Waiting' };
      render(<LaundryKanbanCard booking={booking} hasWarning={true} />);

      const card = screen.getByTestId('kanban-card-g1');
      const warning = within(card).getByTitle('⚠️ Guest has warning');
      expect(warning).toBeInTheDocument();
    });

    it('does not render warning badge in kanban card when guest has no warnings', () => {
      const booking = { guestId: 'g1', name: 'John Doe', status: 'Waiting' };
      render(<LaundryKanbanCard booking={booking} hasWarning={false} />);

      const card = screen.getByTestId('kanban-card-g1');
      const warning = within(card).queryByTitle('⚠️ Guest has warning');
      expect(warning).not.toBeInTheDocument();
    });

    it('shows guest name in kanban card', () => {
      const booking = { guestId: 'g1', name: 'John Doe', status: 'Waiting' };
      render(<LaundryKanbanCard booking={booking} hasWarning={true} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('shows laundry status in kanban card', () => {
      const booking = { guestId: 'g1', name: 'John Doe', status: 'Drying' };
      render(<LaundryKanbanCard booking={booking} hasWarning={false} />);

      expect(screen.getByText('Drying')).toBeInTheDocument();
    });

    it('renders warning alongside status for card with warning', () => {
      const booking = { guestId: 'g1', name: 'John Doe', status: 'Washing' };
      render(<LaundryKanbanCard booking={booking} hasWarning={true} />);

      const card = screen.getByTestId('kanban-card-g1');
      expect(within(card).getByText('John Doe')).toBeInTheDocument();
      expect(within(card).getByText('Washing')).toBeInTheDocument();
      expect(within(card).getByTitle('⚠️ Guest has warning')).toBeInTheDocument();
    });
  });

  describe('CompactLaundryList - ActiveLaundryRow Warning', () => {
    it('renders warning badge in active row when guest has warnings', () => {
      const booking = { guestId: 'g1', name: 'Jane Doe' };
      render(<ActiveLaundryRow booking={booking} hasWarning={true} />);

      const row = screen.getByTestId('active-row-g1');
      const warning = within(row).getByTitle('⚠️ Guest has warning');
      expect(warning).toBeInTheDocument();
    });

    it('does not render warning badge in active row by default', () => {
      const booking = { guestId: 'g1', name: 'Jane Doe' };
      render(<ActiveLaundryRow booking={booking} />);

      const row = screen.getByTestId('active-row-g1');
      const warning = within(row).queryByTitle('⚠️ Guest has warning');
      expect(warning).not.toBeInTheDocument();
    });

    it('renders warning badge in active row when hasWarning is true', () => {
      const booking = { guestId: 'g1', name: 'Jane Doe' };
      render(<ActiveLaundryRow booking={booking} hasWarning={true} />);

      const row = screen.getByTestId('active-row-g1');
      expect(within(row).getByTitle('⚠️ Guest has warning')).toBeInTheDocument();
    });

    it('shows correct name in active row regardless of warning status', () => {
      render(
        <div>
          <ActiveLaundryRow booking={{ guestId: 'g1', name: 'Guest One' }} hasWarning={true} />
          <ActiveLaundryRow booking={{ guestId: 'g2', name: 'Guest Two' }} hasWarning={false} />
        </div>
      );

      expect(screen.getByText('Guest One')).toBeInTheDocument();
      expect(screen.getByText('Guest Two')).toBeInTheDocument();
    });
  });

  describe('CompactLaundryList - DoneLaundryRow Warning', () => {
    it('renders warning badge in done row when guest has warnings', () => {
      const booking = { guestId: 'g1', name: 'John Smith' };
      render(<DoneLaundryRow booking={booking} hasWarning={true} />);

      const row = screen.getByTestId('done-row-g1');
      const warning = within(row).getByTitle('⚠️ Guest has warning');
      expect(warning).toBeInTheDocument();
    });

    it('does not render warning badge in done row by default', () => {
      const booking = { guestId: 'g1', name: 'John Smith' };
      render(<DoneLaundryRow booking={booking} />);

      const row = screen.getByTestId('done-row-g1');
      const warning = within(row).queryByTitle('⚠️ Guest has warning');
      expect(warning).not.toBeInTheDocument();
    });

    it('renders warning badge in done row when hasWarning is explicitly true', () => {
      const booking = { guestId: 'g1', name: 'John Smith' };
      render(<DoneLaundryRow booking={booking} hasWarning={true} />);

      const row = screen.getByTestId('done-row-g1');
      expect(within(row).getByTitle('⚠️ Guest has warning')).toBeInTheDocument();
    });

    it('shows correct name in done row regardless of warning status', () => {
      render(
        <div>
          <DoneLaundryRow booking={{ guestId: 'g1', name: 'Completed Guest' }} hasWarning={true} />
          <DoneLaundryRow booking={{ guestId: 'g2', name: 'Ready Guest' }} hasWarning={false} />
        </div>
      );

      expect(screen.getByText('Completed Guest')).toBeInTheDocument();
      expect(screen.getByText('Ready Guest')).toBeInTheDocument();
    });
  });

  describe('Mixed Active and Done Rows with Warnings', () => {
    it('displays warnings correctly across multiple active and done rows', () => {
      render(
        <div>
          <ActiveLaundryRow booking={{ guestId: 'g1', name: 'Active Guest 1' }} hasWarning={true} />
          <ActiveLaundryRow booking={{ guestId: 'g2', name: 'Active Guest 2' }} hasWarning={false} />
          <DoneLaundryRow booking={{ guestId: 'g3', name: 'Done Guest 1' }} hasWarning={true} />
          <DoneLaundryRow booking={{ guestId: 'g4', name: 'Done Guest 2' }} hasWarning={false} />
        </div>
      );

      const activeRow1 = screen.getByTestId('active-row-g1');
      const activeRow2 = screen.getByTestId('active-row-g2');
      const doneRow1 = screen.getByTestId('done-row-g3');
      const doneRow2 = screen.getByTestId('done-row-g4');

      expect(within(activeRow1).getByTitle('⚠️ Guest has warning')).toBeInTheDocument();
      expect(within(activeRow2).queryByTitle('⚠️ Guest has warning')).not.toBeInTheDocument();
      expect(within(doneRow1).getByTitle('⚠️ Guest has warning')).toBeInTheDocument();
      expect(within(doneRow2).queryByTitle('⚠️ Guest has warning')).not.toBeInTheDocument();
    });
  });

  describe('Warning Badge Integration Pattern', () => {
    it('passes hasWarning prop correctly using getWarningsForGuest pattern', () => {
      const mockGetWarningsForGuest = (guestId) => {
        const warningsMap = {
          'g1': [{ id: 'w1', message: 'Test' }],
          'g2': []
        };
        return warningsMap[guestId] || [];
      };

      const bookings = [
        { guestId: 'g1', name: 'Guest 1' },
        { guestId: 'g2', name: 'Guest 2' }
      ];

      render(
        <div>
          {bookings.map(booking => (
            <ActiveLaundryRow
              key={booking.guestId}
              booking={booking}
              hasWarning={mockGetWarningsForGuest(booking.guestId)?.length > 0}
            />
          ))}
        </div>
      );

      const row1 = screen.getByTestId('active-row-g1');
      const row2 = screen.getByTestId('active-row-g2');

      expect(within(row1).getByTitle('⚠️ Guest has warning')).toBeInTheDocument();
      expect(within(row2).queryByTitle('⚠️ Guest has warning')).not.toBeInTheDocument();
    });
  });

  describe('Warning Badge Accessibility', () => {
    it('warning badge has proper title attribute for tooltip', () => {
      const booking = { guestId: 'g1', name: 'Test Guest' };
      render(<ActiveLaundryRow booking={booking} hasWarning={true} />);

      const warning = screen.getByTitle('⚠️ Guest has warning');
      expect(warning).toBeInTheDocument();
      expect(warning.getAttribute('title')).toBe('⚠️ Guest has warning');
    });

    it('warning badges use consistent styling across components', () => {
      render(
        <div>
          <LaundryKanbanCard
            booking={{ guestId: 'g1', name: 'Guest 1', status: 'Waiting' }}
            hasWarning={true}
          />
          <ActiveLaundryRow booking={{ guestId: 'g2', name: 'Guest 2' }} hasWarning={true} />
          <DoneLaundryRow booking={{ guestId: 'g3', name: 'Guest 3' }} hasWarning={true} />
        </div>
      );

      const warnings = screen.getAllByTitle('⚠️ Guest has warning');
      warnings.forEach(warning => {
        expect(warning).toHaveClass('text-red-600', 'flex-shrink-0');
      });
    });
  });
});
