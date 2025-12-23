import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GuestList from '../GuestList';
import { useGuestsStore } from '../../stores/useGuestsStore';

const createDefaultContext = () => ({
  guests: [],
  mealRecords: [],
  extraMealRecords: [],
  showerRecords: [],
  laundryRecords: [],
  holidayRecords: [],
  haircutRecords: [],
  bicycleRecords: [],
  dayWorkerMealRecords: [],
  unitedEffortMealRecords: [],
  rvMealRecords: [],
  lunchBagRecords: [],
  actionHistory: [],
  undoAction: () => {},
  setShowerPickerGuest: () => {},
  setLaundryPickerGuest: () => {},
  addMealRecord: () => {},
  addGuest: () => {},
  setBicyclePickerGuest: () => {},
  addHaircutRecord: () => {},
  addHolidayRecord: () => {},
  updateGuest: () => {},
  removeGuest: () => {},
  guestNeedsWaiverReminder: () => false,
  dismissWaiver: () => {},
  hasActiveWaiver: () => true,
});

let mockContextValue = createDefaultContext();

vi.mock('../../context/useAppContext', () => ({
  useAppContext: () => mockContextValue,
}));

describe('GuestList warnings badge', () => {
  beforeEach(() => {
    mockContextValue = createDefaultContext();
    useGuestsStore.getState().clearGuestWarnings();
    useGuestsStore.setState({ guests: [] });
  });

  it('shows a warning badge when a guest has warnings', async () => {
    const guest = { id: 'g-test', name: 'Warning Guest', firstName: 'Warning', lastName: 'Guest', housingStatus: 'Unhoused' };
    useGuestsStore.setState({ guests: [guest] });
    // Ensure app context also has the guest (GuestList reads from useAppContext)
    mockContextValue.guests = [guest];

    // Add a warning locally
    await useGuestsStore.getState().addGuestWarning(guest.id, { message: 'Test note' });

    render(<GuestList />);

    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: 'Warning' } });

    const badge = await screen.findByTitle('Test note');
    expect(badge).toBeInTheDocument();
    // Ensure it contains the count
    expect(within(badge).getByText('1')).toBeInTheDocument();
  });
});
