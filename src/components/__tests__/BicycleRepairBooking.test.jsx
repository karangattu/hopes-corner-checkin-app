import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BicycleRepairBooking from '../BicycleRepairBooking';

const createDefaultContext = () => ({
  bicyclePickerGuest: null,
  setBicyclePickerGuest: vi.fn(),
  addBicycleRecord: vi.fn(),
});

let mockContextValue = createDefaultContext();

vi.mock('../../context/useAppContext', () => ({
  useAppContext: () => mockContextValue,
}));

describe('BicycleRepairBooking', () => {
  beforeEach(() => {
    mockContextValue = createDefaultContext();
  });

  it('renders nothing when no guest is selected', () => {
    const { container } = render(<BicycleRepairBooking />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the stored bicycle description when available', () => {
    mockContextValue = {
      ...createDefaultContext(),
      bicyclePickerGuest: {
        id: 'g1',
        name: 'Alex Rider',
        bicycleDescription: 'Blue Trek commuter with rear basket',
      },
    };

    render(<BicycleRepairBooking />);

    expect(
      screen.getByText(/Blue Trek commuter with rear basket/i)
    ).toBeInTheDocument();
  });

  it('warns when no bicycle description is recorded', () => {
    mockContextValue = {
      ...createDefaultContext(),
      bicyclePickerGuest: {
        id: 'g2',
        name: 'Sam Doe',
        bicycleDescription: '',
      },
    };

    render(<BicycleRepairBooking />);

    expect(
      screen.getByText(/no bicycle description saved/i)
    ).toBeInTheDocument();
  });

  it('submits a repair when the form is completed', async () => {
    const user = userEvent.setup();
    const addBicycleRecord = vi.fn();
    const setBicyclePickerGuest = vi.fn();

    mockContextValue = {
      bicyclePickerGuest: {
        id: 'g3',
        name: 'Jamie Lane',
        bicycleDescription: 'Red Specialized hardtail',
      },
      addBicycleRecord,
      setBicyclePickerGuest,
    };

    render(<BicycleRepairBooking />);

    await user.click(screen.getByRole('button', { name: /log repair/i }));

    expect(addBicycleRecord).toHaveBeenCalledWith('g3', {
      repairType: 'Flat Tire',
      notes: '',
    });
    expect(setBicyclePickerGuest).toHaveBeenCalledWith(null);
  });
});
