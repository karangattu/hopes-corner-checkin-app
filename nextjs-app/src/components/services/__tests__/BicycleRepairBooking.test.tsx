import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BicycleRepairBooking } from '../BicycleRepairBooking';

describe('BicycleRepairBooking', () => {
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let defaultGuest: { id: string; name: string; bicycleDescription: string };

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnSubmit = vi.fn();
    defaultGuest = {
      id: 'g1',
      name: 'Alex Rider',
      bicycleDescription: 'Blue Trek commuter with rear basket',
    };
  });

  describe('rendering', () => {
    it('renders nothing when no guest is selected', () => {
      const { container } = render(
        <BicycleRepairBooking
          guest={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders modal when guest is provided', () => {
      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText(/Log Bicycle Repair for Alex Rider/i)).toBeInTheDocument();
    });

    it('shows the stored bicycle description when available', () => {
      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(
        screen.getByText(/Blue Trek commuter with rear basket/i)
      ).toBeInTheDocument();
    });

    it('warns when no bicycle description is recorded', () => {
      const guestWithoutBike = {
        id: 'g2',
        name: 'Sam Doe',
        bicycleDescription: '',
      };

      render(
        <BicycleRepairBooking
          guest={guestWithoutBike}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText(/no bicycle description saved/i)).toBeInTheDocument();
    });

    it('displays all repair type options', () => {
      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('checkbox', { name: /Flat Tire/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Brake Adjustment/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Chain Replacement/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /New Bicycle/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Other/i })).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('submits a repair when the form is completed', async () => {
      const user = userEvent.setup();

      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Select "Flat Tire" checkbox
      const flatTireCheckbox = screen.getByRole('checkbox', { name: /Flat Tire/i });
      await user.click(flatTireCheckbox);

      await user.click(screen.getByRole('button', { name: /log repair/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith('g1', {
        repairTypes: ['Flat Tire'],
        notes: '',
      });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('allows selecting multiple repair types', async () => {
      const user = userEvent.setup();

      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Select multiple repair types
      await user.click(screen.getByRole('checkbox', { name: /Chain Replacement/i }));
      await user.click(screen.getByRole('checkbox', { name: /Brake Adjustment/i }));
      await user.click(screen.getByRole('button', { name: /log repair/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith('g1', {
        repairTypes: ['Chain Replacement', 'Brake Adjustment'],
        notes: '',
      });
    });

    it('includes notes when provided', async () => {
      const user = userEvent.setup();

      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByRole('checkbox', { name: /Flat Tire/i }));
      const notesField = screen.getByRole('textbox', { name: /notes/i });
      await user.type(notesField, 'Front tire was completely worn');
      await user.click(screen.getByRole('button', { name: /log repair/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith('g1', {
        repairTypes: ['Flat Tire'],
        notes: 'Front tire was completely worn',
      });
    });
  });

  describe('validation', () => {
    it('disables submit when no repair type is selected', () => {
      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /log repair/i });
      expect(submitButton).toBeDisabled();
    });

    it('disables submit when guest has no bicycle description', async () => {
      const user = userEvent.setup();
      const guestWithoutBike = {
        id: 'g2',
        name: 'Sam Doe',
        bicycleDescription: '',
      };

      render(
        <BicycleRepairBooking
          guest={guestWithoutBike}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByRole('checkbox', { name: /Flat Tire/i }));

      const submitButton = screen.getByRole('button', { name: /log repair/i });
      expect(submitButton).toBeDisabled();
    });

    it('requires notes when "Other" is selected', async () => {
      const user = userEvent.setup();

      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByRole('checkbox', { name: /Other/i }));

      const submitButton = screen.getByRole('button', { name: /log repair/i });
      expect(submitButton).toBeDisabled();

      // Add notes to enable submission
      const notesField = screen.getByRole('textbox', { name: /notes/i });
      await user.type(notesField, 'Custom repair description');

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('closes modal when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('toggles repair type selection on checkbox click', async () => {
      const user = userEvent.setup();

      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const flatTireCheckbox = screen.getByRole('checkbox', { name: /Flat Tire/i });

      // First click - select
      await user.click(flatTireCheckbox);
      expect(flatTireCheckbox).toBeChecked();

      // Second click - deselect
      await user.click(flatTireCheckbox);
      expect(flatTireCheckbox).not.toBeChecked();
    });

    it('shows count of selected repair types', async () => {
      const user = userEvent.setup();

      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await user.click(screen.getByRole('checkbox', { name: /Flat Tire/i }));
      expect(screen.getByText(/1 repair type.* selected/i)).toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: /Brake Adjustment/i }));
      expect(screen.getByText(/2 repair types.* selected/i)).toBeInTheDocument();
    });
  });

  describe('special repair types', () => {
    it('highlights "New Bicycle" option with special styling', () => {
      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Check that NEW badge is present
      expect(screen.getByText('NEW')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible close button', () => {
      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(
        screen.getByRole('button', { name: /close bicycle repair dialog/i })
      ).toBeInTheDocument();
    });

    it('has accessible notes textarea', () => {
      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('textbox', { name: /notes/i })).toBeInTheDocument();
    });

    it('has dialog with proper aria attributes', () => {
      render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Modal should have aria-labelledby pointing to title
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });
  });

  describe('edge cases', () => {
    it('handles guest with whitespace-only bicycle description', () => {
      const guestWithWhitespace = {
        id: 'g3',
        name: 'John Doe',
        bicycleDescription: '   ',
      };

      render(
        <BicycleRepairBooking
          guest={guestWithWhitespace}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText(/no bicycle description saved/i)).toBeInTheDocument();
    });

    it('resets form state when closed and reopened', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Select a repair type
      await user.click(screen.getByRole('checkbox', { name: /Flat Tire/i }));
      expect(screen.getByRole('checkbox', { name: /Flat Tire/i })).toBeChecked();

      // Close modal
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Rerender with null guest (closed)
      rerender(
        <BicycleRepairBooking
          guest={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Rerender with guest again (reopened)
      rerender(
        <BicycleRepairBooking
          guest={defaultGuest}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Checkbox should not be checked (form was reset on close)
      expect(screen.getByRole('checkbox', { name: /Flat Tire/i })).not.toBeChecked();
    });
  });
});
