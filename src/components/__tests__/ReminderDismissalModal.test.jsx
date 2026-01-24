import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReminderDismissalModal from '../guest/ReminderDismissalModal';

// Mock the reminders store - components now select state.reminders and filter by guestId
const mockDismissReminder = vi.fn();
const mockReminders = [];

vi.mock('../../stores/useRemindersStore', () => ({
  useRemindersStore: (selector) => {
    const state = {
      reminders: mockReminders,
      dismissReminder: mockDismissReminder,
    };
    return selector(state);
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ReminderDismissalModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    guestId: 'guest-123',
    guestName: 'John Doe',
    onDismissComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReminders.length = 0;
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ReminderDismissalModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when there are no active reminders', () => {
    const { container } = render(
      <ReminderDismissalModal {...defaultProps} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with guest name in title', () => {
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Return sleeping bag',
      createdBy: 'Staff',
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderDismissalModal {...defaultProps} />);

    expect(screen.getByText(/Reminder for John Doe/i)).toBeInTheDocument();
  });

  it('displays reminder message', () => {
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Return sleeping bag from last week',
      createdBy: 'Staff',
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderDismissalModal {...defaultProps} />);

    expect(screen.getByText('Return sleeping bag from last week')).toBeInTheDocument();
  });

  it('shows pluralized title for multiple reminders', () => {
    mockReminders.push(
      {
        id: 'reminder-1',
        guestId: 'guest-123',
        message: 'First reminder',
        createdBy: 'Staff',
        createdAt: '2025-01-24T12:00:00Z',
        active: true,
      },
      {
        id: 'reminder-2',
        guestId: 'guest-123',
        message: 'Second reminder',
        createdBy: 'Staff',
        createdAt: '2025-01-24T12:00:00Z',
        active: true,
      }
    );

    render(<ReminderDismissalModal {...defaultProps} />);

    expect(screen.getByText(/Reminders for John Doe/i)).toBeInTheDocument();
  });

  it('requires staff name before dismissing', async () => {
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test',
      createdBy: null,
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderDismissalModal {...defaultProps} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss reminder/i });
    expect(dismissButton).toBeDisabled();
  });

  it('enables dismiss button when staff name is entered', async () => {
    const user = userEvent.setup();
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test',
      createdBy: null,
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderDismissalModal {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText(/enter your name/i);
    await user.type(nameInput, 'Jane Smith');

    const dismissButton = screen.getByRole('button', { name: /dismiss reminder/i });
    expect(dismissButton).not.toBeDisabled();
  });

  it('calls dismissReminder with correct arguments', async () => {
    const user = userEvent.setup();
    mockDismissReminder.mockResolvedValue(true);
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test',
      createdBy: null,
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderDismissalModal {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText(/enter your name/i);
    await user.type(nameInput, 'Jane Smith');

    const dismissButton = screen.getByRole('button', { name: /dismiss reminder/i });
    await user.click(dismissButton);

    await waitFor(() => {
      expect(mockDismissReminder).toHaveBeenCalledWith('reminder-1', 'Jane Smith');
    });
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test',
      createdBy: null,
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderDismissalModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test',
      createdBy: null,
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderDismissalModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close reminder dialog/i });
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error when dismissal fails', async () => {
    const user = userEvent.setup();
    mockDismissReminder.mockResolvedValue(false);
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test',
      createdBy: null,
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderDismissalModal {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText(/enter your name/i);
    await user.type(nameInput, 'Jane Smith');

    const dismissButton = screen.getByRole('button', { name: /dismiss reminder/i });
    await user.click(dismissButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to dismiss/i)).toBeInTheDocument();
    });
  });

  it('displays creator name when available', () => {
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test',
      createdBy: 'John Staff',
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderDismissalModal {...defaultProps} />);

    expect(screen.getByText('John Staff')).toBeInTheDocument();
  });

  it('displays created date', () => {
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test',
      createdBy: null,
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderDismissalModal {...defaultProps} />);

    // Date will be formatted as "Jan 24" or similar
    expect(screen.getByText(/Jan 24/i)).toBeInTheDocument();
  });

  it('only shows reminders for the specified guest', () => {
    mockReminders.push(
      {
        id: 'reminder-1',
        guestId: 'guest-123',
        message: 'My reminder',
        createdBy: null,
        createdAt: '2025-01-24T12:00:00Z',
        active: true,
      },
      {
        id: 'reminder-2',
        guestId: 'other-guest',
        message: 'Other reminder',
        createdBy: null,
        createdAt: '2025-01-24T12:00:00Z',
        active: true,
      }
    );

    render(<ReminderDismissalModal {...defaultProps} />);

    expect(screen.getByText('My reminder')).toBeInTheDocument();
    expect(screen.queryByText('Other reminder')).not.toBeInTheDocument();
  });
});
