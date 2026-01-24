import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReminderBadge, { CompactReminderIndicator } from '../guest/ReminderBadge';

// Mock the reminders store - components now select state.reminders and filter by guestId
const mockReminders = [];
const mockHasActiveReminders = vi.fn();

vi.mock('../../stores/useRemindersStore', () => ({
  useRemindersStore: (selector) => {
    const state = {
      reminders: mockReminders,
      hasActiveReminders: mockHasActiveReminders,
      dismissReminder: vi.fn(),
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

describe('ReminderBadge', () => {
  const defaultProps = {
    guestId: 'guest-123',
    guestName: 'John Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReminders.length = 0;
    mockHasActiveReminders.mockReturnValue(false);
  });

  it('does not render when there are no active reminders', () => {
    const { container } = render(<ReminderBadge {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders badge when guest has active reminders', () => {
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test',
      active: true,
    });

    render(<ReminderBadge {...defaultProps} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows reminder count', () => {
    mockReminders.push(
      { id: 'reminder-1', guestId: 'guest-123', message: 'Test 1', active: true },
      { id: 'reminder-2', guestId: 'guest-123', message: 'Test 2', active: true },
      { id: 'reminder-3', guestId: 'guest-123', message: 'Test 3', active: true }
    );

    render(<ReminderBadge {...defaultProps} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides count when showCount is false', () => {
    mockReminders.push(
      { id: 'reminder-1', guestId: 'guest-123', message: 'Test 1', active: true },
      { id: 'reminder-2', guestId: 'guest-123', message: 'Test 2', active: true }
    );

    render(<ReminderBadge {...defaultProps} showCount={false} />);

    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    mockReminders.push(
      { id: 'reminder-1', guestId: 'guest-123', message: 'Test 1', active: true },
      { id: 'reminder-2', guestId: 'guest-123', message: 'Test 2', active: true }
    );

    render(<ReminderBadge {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'View 2 reminders for John Doe');
  });

  it('has correct title tooltip', () => {
    mockReminders.push({ id: 'reminder-1', guestId: 'guest-123', message: 'Test', active: true });

    render(<ReminderBadge {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', '1 active reminder - click to view');
  });

  it('opens modal when clicked', async () => {
    const user = userEvent.setup();
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test reminder message',
      createdBy: 'Staff',
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<ReminderBadge {...defaultProps} />);

    const button = screen.getByRole('button');
    await user.click(button);

    // Modal should open and show the reminder
    expect(screen.getByText(/Reminder for John Doe/i)).toBeInTheDocument();
    expect(screen.getByText('Test reminder message')).toBeInTheDocument();
  });

  it('applies small size classes by default', () => {
    mockReminders.push({ id: 'reminder-1', guestId: 'guest-123', message: 'Test', active: true });

    render(<ReminderBadge {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button.className).toContain('text-[10px]');
  });

  it('applies medium size classes when size is md', () => {
    mockReminders.push({ id: 'reminder-1', guestId: 'guest-123', message: 'Test', active: true });

    render(<ReminderBadge {...defaultProps} size="md" />);

    const button = screen.getByRole('button');
    expect(button.className).toContain('text-xs');
  });

  it('stops event propagation on click', async () => {
    const user = userEvent.setup();
    const parentClick = vi.fn();
    mockReminders.push({ id: 'reminder-1', guestId: 'guest-123', message: 'Test', active: true });

    render(
      <div onClick={parentClick}>
        <ReminderBadge {...defaultProps} />
      </div>
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(parentClick).not.toHaveBeenCalled();
  });

  it('only shows reminders for the specified guest', () => {
    mockReminders.push(
      { id: 'reminder-1', guestId: 'guest-123', message: 'Test 1', active: true },
      { id: 'reminder-2', guestId: 'other-guest', message: 'Test 2', active: true }
    );

    render(<ReminderBadge {...defaultProps} />);

    // Should only show count of 1 for guest-123
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

describe('CompactReminderIndicator', () => {
  const defaultProps = {
    guestId: 'guest-123',
    guestName: 'John Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReminders.length = 0;
    mockHasActiveReminders.mockReturnValue(false);
  });

  it('does not render when guest has no reminders', () => {
    mockHasActiveReminders.mockReturnValue(false);

    const { container } = render(<CompactReminderIndicator {...defaultProps} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders when guest has reminders', () => {
    mockHasActiveReminders.mockReturnValue(true);

    render(<CompactReminderIndicator {...defaultProps} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has correct title', () => {
    mockHasActiveReminders.mockReturnValue(true);

    render(<CompactReminderIndicator {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Guest has active reminders - click to view');
  });

  it('opens modal when clicked', async () => {
    const user = userEvent.setup();
    mockHasActiveReminders.mockReturnValue(true);
    mockReminders.push({
      id: 'reminder-1',
      guestId: 'guest-123',
      message: 'Test reminder',
      createdBy: 'Staff',
      createdAt: '2025-01-24T12:00:00Z',
      active: true,
    });

    render(<CompactReminderIndicator {...defaultProps} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByText(/Reminder for John Doe/i)).toBeInTheDocument();
  });
});
