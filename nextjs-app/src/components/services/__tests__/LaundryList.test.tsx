import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LaundryList } from '../LaundryList';

const hapticsMock = vi.hoisted(() => ({
  selection: vi.fn(),
  delete: vi.fn(),
  actionSuccess: vi.fn(),
  complete: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/utils/haptics', () => ({
  __esModule: true,
  default: hapticsMock,
}));

vi.mock('@/utils/toast', () => ({
  __esModule: true,
  default: toastMock,
}));

describe('LaundryList', () => {
  let mockSetList: ReturnType<typeof vi.fn>;
  let initialList: { id: string; name: string; slot?: string }[];

  beforeEach(() => {
    mockSetList = vi.fn();
    initialList = [
      { id: '1', name: 'Alice', slot: '' },
      { id: '2', name: 'Bob', slot: '8:30 - 9:30' },
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders empty list message when no guests', () => {
      render(<LaundryList list={[]} setList={mockSetList} />);
      expect(screen.getByText('Laundry list is empty.')).toBeInTheDocument();
    });

    it('renders list of guests with slots', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getAllByText('8:30 - 9:30').length).toBeGreaterThan(0);
      expect(screen.getByText('1 / 5')).toBeInTheDocument();
    });

    it('displays numbered list items', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
    });

    it('has correct data-testid attributes for list items', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      expect(screen.getByTestId('laundry-list-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('laundry-list-item-2')).toBeInTheDocument();
    });
  });

  describe('slot selection', () => {
    it('allows selecting a slot for a guest', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      const selects = screen.getAllByRole('combobox');
      const firstSelect = selects[0]; // First guest's select (Alice)
      fireEvent.change(firstSelect, { target: { value: '9:30 - 10:30' } });

      expect(mockSetList).toHaveBeenCalledWith(expect.any(Function));
      expect(hapticsMock.selection).toHaveBeenCalled();
    });

    it('disables select when guest already has a slot', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      const selects = screen.getAllByRole('combobox');
      const secondSelect = selects[1]; // Bob's select - already has a slot
      expect(secondSelect).toBeDisabled();
    });

    it('disables slot option when taken by another guest', () => {
      const listWithTakenSlot = [
        { id: '1', name: 'Alice', slot: '' },
        { id: '2', name: 'Bob', slot: '9:30 - 10:30' },
      ];
      render(<LaundryList list={listWithTakenSlot} setList={mockSetList} />);

      const select = screen.getAllByRole('combobox')[0];
      const options = select.querySelectorAll('option');
      const takenOption = Array.from(options).find(
        (opt) => opt.value === '9:30 - 10:30'
      );
      expect(takenOption).toBeDisabled();
    });

    it('disables all selects when 5 slots are used', () => {
      const fullList = [
        { id: '1', name: 'Guest 1', slot: '8:30 - 9:30' },
        { id: '2', name: 'Guest 2', slot: '9:30 - 10:30' },
        { id: '3', name: 'Guest 3', slot: '10:30 - 11:30' },
        { id: '4', name: 'Guest 4', slot: '11:30 - 12:30' },
        { id: '5', name: 'Guest 5', slot: '12:30 - 1:30' },
        { id: '6', name: 'New Guest', slot: '' },
      ];

      render(<LaundryList list={fullList} setList={mockSetList} />);

      const selects = screen.getAllByRole('combobox');
      // The last select (for New Guest without slot) should be disabled
      expect(selects[selects.length - 1]).toBeDisabled();
    });

    it('shows 5/5 when all slots are used', () => {
      const fullList = [
        { id: '1', name: 'Guest 1', slot: '8:30 - 9:30' },
        { id: '2', name: 'Guest 2', slot: '9:30 - 10:30' },
        { id: '3', name: 'Guest 3', slot: '10:30 - 11:30' },
        { id: '4', name: 'Guest 4', slot: '11:30 - 12:30' },
        { id: '5', name: 'Guest 5', slot: '12:30 - 1:30' },
      ];

      render(<LaundryList list={fullList} setList={mockSetList} />);
      expect(screen.getByText('5 / 5')).toBeInTheDocument();
    });
  });

  describe('guest removal', () => {
    it('allows removing a guest', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      const removeButton = screen.getByLabelText('Remove Alice from laundry list');
      fireEvent.click(removeButton);

      expect(mockSetList).toHaveBeenCalledWith(expect.any(Function));
      expect(hapticsMock.delete).toHaveBeenCalled();
      expect(toastMock.warning).toHaveBeenCalledWith(
        expect.stringContaining('Alice'),
        expect.any(Object)
      );
    });

    it('removes the correct guest from list', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      const removeButton = screen.getByLabelText('Remove Bob from laundry list');
      fireEvent.click(removeButton);

      const updater = mockSetList.mock.calls[0][0] as (prev: typeof initialList) => typeof initialList;
      const result = updater(initialList);
      expect(result).toHaveLength(1);
      expect(result.find((g) => g.id === '2')).toBeUndefined();
    });
  });

  describe('completion actions', () => {
    it('has complete button for desktop view', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      const completeButton = screen.getByLabelText("Mark Alice's laundry as complete");
      expect(completeButton).toBeInTheDocument();
    });

    it('calls haptics and toast on completion', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      const completeButton = screen.getByLabelText("Mark Alice's laundry as complete");
      fireEvent.click(completeButton);

      expect(mockSetList).toHaveBeenCalled();
      expect(hapticsMock.complete).toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith(
        expect.stringContaining('Alice'),
        expect.any(Object)
      );
    });
  });

  describe('pull to refresh', () => {
    it('invokes refresh when pulling the list', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      render(
        <LaundryList
          list={initialList}
          setList={mockSetList}
          onRefresh={onRefresh}
        />
      );

      const container = screen.getByTestId('laundry-list-container');
      fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
      fireEvent.touchMove(container, {
        touches: [{ clientY: 150 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(container);

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
      expect(toastMock.success).toHaveBeenCalledWith(
        'Laundry list refreshed',
        expect.any(Object)
      );
    });
  });

  describe('swipe to complete', () => {
    it('marks a laundry entry complete on swipe', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      const item = screen.getByTestId('laundry-list-item-1');
      fireEvent.touchStart(item, { touches: [{ clientX: 160 }] });
      fireEvent.touchMove(item, {
        touches: [{ clientX: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(item);

      expect(mockSetList).toHaveBeenCalledTimes(1);
      expect(hapticsMock.complete).toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith(
        expect.stringContaining('Alice'),
        expect.any(Object)
      );
    });
  });

  describe('accessibility', () => {
    it('has accessible remove buttons', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      expect(
        screen.getByRole('button', { name: /Remove Alice from laundry list/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Remove Bob from laundry list/i })
      ).toBeInTheDocument();
    });

    it('has accessible complete buttons', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      expect(
        screen.getByRole('button', { name: /Mark Alice's laundry as complete/i })
      ).toBeInTheDocument();
    });

    it('has accessible slot selectors', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      expect(
        screen.getByLabelText(/Select laundry slot for Alice/i)
      ).toBeInTheDocument();
    });

    it('has aria-live region for slot count', () => {
      render(<LaundryList list={initialList} setList={mockSetList} />);

      const slotCounter = screen.getByText('1 / 5').closest('[aria-live]');
      expect(slotCounter).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('edge cases', () => {
    it('handles empty list gracefully', () => {
      render(<LaundryList list={[]} setList={mockSetList} />);
      expect(screen.getByText('Laundry list is empty.')).toBeInTheDocument();
      expect(screen.getByText('0 / 5')).toBeInTheDocument();
    });

    it('handles guest with special characters in name', () => {
      const specialList = [{ id: '1', name: "O'Brien & Söderström", slot: '' }];
      render(<LaundryList list={specialList} setList={mockSetList} />);

      expect(screen.getByText("O'Brien & Söderström")).toBeInTheDocument();
    });

    it('handles long guest names with truncation', () => {
      const longNameList = [
        { id: '1', name: 'A Very Long Guest Name That Should Be Truncated', slot: '' },
      ];
      render(<LaundryList list={longNameList} setList={mockSetList} />);

      const nameElement = screen.getByText('A Very Long Guest Name That Should Be Truncated');
      expect(nameElement).toHaveAttribute(
        'title',
        'A Very Long Guest Name That Should Be Truncated'
      );
    });
  });
});
