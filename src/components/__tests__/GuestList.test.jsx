import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuestList from '../GuestList';

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
  setShowerPickerGuest: vi.fn(),
  setLaundryPickerGuest: vi.fn(),
  addMealRecord: vi.fn(),
  addExtraMealRecord: vi.fn(),
  addGuest: vi.fn(),
  setBicyclePickerGuest: vi.fn(),
  addHaircutRecord: vi.fn(),
  addHolidayRecord: vi.fn(),
  updateGuest: vi.fn(),
  removeGuest: vi.fn(),
});

let mockContextValue = createDefaultContext();

vi.mock('../../context/useAppContext', () => ({
  useAppContext: () => mockContextValue,
}));

describe('GuestList', () => {
  beforeEach(() => {
    mockContextValue = createDefaultContext();
  });

  it('shows the tip describing how to enable the create guest shortcut', () => {
    render(<GuestList />);

    expect(
      screen.getByText(/first name and at least the first letter of the last name/i)
    ).toBeInTheDocument();
  });

  it('displays create-guest prompt when search has first and last initial with no results', async () => {
    const user = userEvent.setup();
    render(<GuestList />);

    const search = screen.getByPlaceholderText(/search by name/i);
    await user.type(search, 'Alex R');

    expect(await screen.findByText(/no guest found for "Alex R"/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create new guest/i })
    ).toBeInTheDocument();
  });

  it('shows matched guests instead of create prompt when results exist', async () => {
    const user = userEvent.setup();
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        {
          id: 'g1',
          name: 'Jane Roe',
          preferredName: '',
          firstName: 'Jane',
          lastName: 'Roe',
          housingStatus: 'Unhoused',
          location: 'Mountain View',
          age: 'Adult 18-59',
          gender: 'Female',
        },
      ],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    await user.type(search, 'Jane R');

    expect(await screen.findByText(/found 1 guest/i)).toBeInTheDocument();
    expect(screen.queryByText(/no guest found/i)).not.toBeInTheDocument();
  });
});
