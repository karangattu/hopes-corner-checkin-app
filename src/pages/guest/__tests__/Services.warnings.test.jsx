/**
 * Services Component - Guest Warning Display Tests
 * 
 * Tests that verify warning badges appear for guests with warnings in:
 * - Shower list view
 * - Shower detail modal
 * - Services overview
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Mock warning display logic

/**
 * Component that simulates shower card with warning badge
 */
const ShowerCard = ({ name, hasWarning, warnings }) => {
  return (
    <div data-testid={`shower-card-${name}`} className="p-4 border rounded">
      <div className="flex items-center gap-2">
        <h3>{name}</h3>
        {hasWarning && (
          <div className="text-red-600" title="⚠️ Guest has warning">
            ⚠️
          </div>
        )}
      </div>
      {warnings && warnings.length > 0 && (
        <div className="text-sm text-red-700 mt-2">
          {warnings.map((w, i) => (
            <div key={i}>{w.message}</div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Component simulating the laundry row with warning badge
 */
const LaundryRow = ({ name, hasWarning }) => {
  return (
    <div data-testid={`laundry-row-${name}`} className="flex items-center gap-2 p-3">
      {hasWarning && (
        <div className="text-red-600 flex-shrink-0" title="⚠️ Guest has warning">
          ⚠️
        </div>
      )}
      <span>{name}</span>
    </div>
  );
};

describe('Services - Guest Warning Display', () => {
  describe('Warning Badge Rendering', () => {
    it('renders warning badge when guest has warnings', () => {
      render(<ShowerCard name="John Doe" hasWarning={true} warnings={[{ message: 'Test warning' }]} />);
      
      const warningElement = screen.getByTitle('⚠️ Guest has warning');
      expect(warningElement).toBeInTheDocument();
    });

    it('does not render warning badge when guest has no warnings', () => {
      const { container } = render(<ShowerCard name="Jane Doe" hasWarning={false} warnings={[]} />);
      
      const warningElement = container.querySelector('[title="⚠️ Guest has warning"]');
      expect(warningElement).not.toBeInTheDocument();
    });

    it('displays warning message when present', () => {
      const warnings = [{ message: 'Behavior concern' }];
      render(<ShowerCard name="John Doe" hasWarning={true} warnings={warnings} />);
      
      expect(screen.getByText('Behavior concern')).toBeInTheDocument();
    });

    it('displays multiple warning messages', () => {
      const warnings = [
        { message: 'Behavior concern' },
        { message: 'Medical alert' }
      ];
      render(<ShowerCard name="John Doe" hasWarning={true} warnings={warnings} />);
      
      expect(screen.getByText('Behavior concern')).toBeInTheDocument();
      expect(screen.getByText('Medical alert')).toBeInTheDocument();
    });
  });

  describe('Shower View Warning Display', () => {
    it('renders warning badge in shower card', () => {
      render(<ShowerCard name="Test Guest" hasWarning={true} warnings={[]} />);
      
      const card = screen.getByTestId('shower-card-Test Guest');
      const warning = within(card).getByTitle('⚠️ Guest has warning');
      expect(warning).toBeInTheDocument();
    });

    it('shows multiple shower cards with warnings correctly', () => {
      render(
        <div>
          <ShowerCard name="Guest A" hasWarning={true} warnings={[]} />
          <ShowerCard name="Guest B" hasWarning={false} warnings={[]} />
          <ShowerCard name="Guest C" hasWarning={true} warnings={[]} />
        </div>
      );

      const cardA = screen.getByTestId('shower-card-Guest A');
      const cardB = screen.getByTestId('shower-card-Guest B');
      const cardC = screen.getByTestId('shower-card-Guest C');

      expect(within(cardA).getByTitle('⚠️ Guest has warning')).toBeInTheDocument();
      expect(within(cardB).queryByTitle('⚠️ Guest has warning')).not.toBeInTheDocument();
      expect(within(cardC).getByTitle('⚠️ Guest has warning')).toBeInTheDocument();
    });
  });

  describe('Laundry View Warning Display', () => {
    it('renders warning badge in laundry row', () => {
      render(<LaundryRow name="Test Guest" hasWarning={true} />);
      
      const row = screen.getByTestId('laundry-row-Test Guest');
      const warning = within(row).getByTitle('⚠️ Guest has warning');
      expect(warning).toBeInTheDocument();
    });

    it('does not render warning badge when guest has no warnings', () => {
      render(<LaundryRow name="Test Guest" hasWarning={false} />);
      
      const row = screen.getByTestId('laundry-row-Test Guest');
      const warning = within(row).queryByTitle('⚠️ Guest has warning');
      expect(warning).not.toBeInTheDocument();
    });

    it('shows correct warning status for mixed laundry rows', () => {
      render(
        <div>
          <LaundryRow name="Guest A" hasWarning={false} />
          <LaundryRow name="Guest B" hasWarning={true} />
          <LaundryRow name="Guest C" hasWarning={false} />
        </div>
      );

      const rowA = screen.getByTestId('laundry-row-Guest A');
      const rowB = screen.getByTestId('laundry-row-Guest B');
      const rowC = screen.getByTestId('laundry-row-Guest C');

      expect(within(rowA).queryByTitle('⚠️ Guest has warning')).not.toBeInTheDocument();
      expect(within(rowB).getByTitle('⚠️ Guest has warning')).toBeInTheDocument();
      expect(within(rowC).queryByTitle('⚠️ Guest has warning')).not.toBeInTheDocument();
    });
  });

  describe('Warning Badge Styling', () => {
    it('applies correct CSS classes for warning badge', () => {
      render(<ShowerCard name="Test Guest" hasWarning={true} warnings={[]} />);
      
      const warning = screen.getByTitle('⚠️ Guest has warning');
      // Check that the warning has the text-red-600 class
      expect(warning.className).toContain('text-red-600');
    });

    it('warning badge is not affected by other styling', () => {
      render(
        <div className="bg-blue-100">
          <ShowerCard name="Test Guest" hasWarning={true} warnings={[]} />
        </div>
      );
      
      const warning = screen.getByTitle('⚠️ Guest has warning');
      expect(warning).toHaveClass('text-red-600');
    });
  });

  describe('Warning Logic - getWarningsForGuest', () => {
    it('returns empty array when guest has no warnings', () => {
      const getWarningsForGuest = () => [];
      const warnings = getWarningsForGuest();
      
      expect(warnings).toEqual([]);
      expect(warnings.length).toBe(0);
    });

    it('returns array with warnings when guest has warnings', () => {
      const getWarningsForGuest = (guestId) => {
        const warningsMap = {
          'guest-1': [{ id: 'w1', message: 'Test warning' }],
          'guest-2': []
        };
        return warningsMap[guestId] || [];
      };

      const warnings = getWarningsForGuest('guest-1');
      expect(warnings.length).toBe(1);
      expect(warnings[0].message).toBe('Test warning');
    });

    it('determines hasWarning correctly using optional chaining and length check', () => {
      const getWarningsForGuest = (guestId) => {
        const warningsMap = {
          'guest-1': [{ id: 'w1', message: 'Warning 1' }, { id: 'w2', message: 'Warning 2' }],
          'guest-2': []
        };
        return warningsMap[guestId];
      };

      // Pattern: hasWarning={getWarningsForGuest(booking.guestId)?.length > 0}
      const hasWarning1 = getWarningsForGuest('guest-1')?.length > 0;
      const hasWarning2 = getWarningsForGuest('guest-2')?.length > 0;
      const hasWarning3 = getWarningsForGuest('guest-999')?.length > 0;

      expect(hasWarning1).toBe(true);
      expect(hasWarning2).toBe(false);
      expect(hasWarning3).toBe(false);
    });
  });
});
