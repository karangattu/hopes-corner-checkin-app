import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuestForm from '../GuestForm';

const mockAddGuest = vi.fn();

vi.mock('../../context/useAppContext', () => ({
  useAppContext: () => ({
    addGuest: mockAddGuest,
  }),
}));

describe('GuestForm', () => {
  beforeEach(() => {
    mockAddGuest.mockReset();
  });

  it('renders the bicycle description textarea', () => {
    render(<GuestForm />);

    expect(
      screen.getByPlaceholderText('Bike make, color, or identifying details')
    ).toBeInTheDocument();
  });

  it('shows an error when submitting without a name', async () => {
    const user = userEvent.setup();
    render(<GuestForm />);

    await user.click(screen.getByRole('button', { name: /register guest/i }));

    expect(
      await screen.findByText(/please enter a guest name/i)
    ).toBeInTheDocument();
    expect(mockAddGuest).not.toHaveBeenCalled();
  });
});
