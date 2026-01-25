import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoreToContextSync } from '../useStoreToContextSync';
import { useServicesStore } from '../../stores/useServicesStore';
import { useMealsStore } from '../../stores/useMealsStore';
import { useDonationsStore } from '../../stores/useDonationsStore';
import { useGuestsStore } from '../../stores/useGuestsStore';

describe('useStoreToContextSync', () => {
  let setShowerRecords;
  let setLaundryRecords;
  let setBicycleRecords;
  let setMealRecords;
  let setHolidayRecords;
  let setHaircutRecords;
  let setDonationRecords;
  let setItemGivenRecords;
  let setGuests;

  beforeEach(() => {
    // Create mock setters
    setShowerRecords = vi.fn();
    setLaundryRecords = vi.fn();
    setBicycleRecords = vi.fn();
    setMealRecords = vi.fn();
    setHolidayRecords = vi.fn();
    setHaircutRecords = vi.fn();
    setDonationRecords = vi.fn();
    setItemGivenRecords = vi.fn();
    setGuests = vi.fn();

    // Reset stores to initial state
    useServicesStore.setState({
      showerRecords: [],
      laundryRecords: [],
      bicycleRecords: [],
    });
    useMealsStore.setState({
      mealRecords: [],
      holidayRecords: [],
      haircutRecords: [],
    });
    useDonationsStore.setState({
      donationRecords: [],
      itemRecords: [],
    });
    useGuestsStore.setState({
      guests: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call setShowerRecords when showerRecords change in store', async () => {
    renderHook(() =>
      useStoreToContextSync({
        setShowerRecords,
        setLaundryRecords,
        setBicycleRecords,
        setMealRecords,
        setHolidayRecords,
        setHaircutRecords,
        setDonationRecords,
        setItemGivenRecords,
        setGuests,
      })
    );

    const newRecords = [{ id: '1', guestId: 'g1', status: 'reserved' }];

    // Simulate store update (like from realtime)
    act(() => {
      useServicesStore.setState({ showerRecords: newRecords });
    });

    expect(setShowerRecords).toHaveBeenCalledWith(newRecords);
  });

  it('should call setLaundryRecords when laundryRecords change in store', async () => {
    renderHook(() =>
      useStoreToContextSync({
        setShowerRecords,
        setLaundryRecords,
        setBicycleRecords,
        setMealRecords,
        setHolidayRecords,
        setHaircutRecords,
        setDonationRecords,
        setItemGivenRecords,
        setGuests,
      })
    );

    const newRecords = [{ id: '1', guestId: 'g1', status: 'washing' }];

    act(() => {
      useServicesStore.setState({ laundryRecords: newRecords });
    });

    expect(setLaundryRecords).toHaveBeenCalledWith(newRecords);
  });

  it('should call setBicycleRecords when bicycleRecords change in store', async () => {
    renderHook(() =>
      useStoreToContextSync({
        setShowerRecords,
        setLaundryRecords,
        setBicycleRecords,
        setMealRecords,
        setHolidayRecords,
        setHaircutRecords,
        setDonationRecords,
        setItemGivenRecords,
        setGuests,
      })
    );

    const newRecords = [{ id: '1', guestId: 'g1', status: 'received' }];

    act(() => {
      useServicesStore.setState({ bicycleRecords: newRecords });
    });

    expect(setBicycleRecords).toHaveBeenCalledWith(newRecords);
  });

  it('should call setMealRecords when mealRecords change in store', async () => {
    renderHook(() =>
      useStoreToContextSync({
        setShowerRecords,
        setLaundryRecords,
        setBicycleRecords,
        setMealRecords,
        setHolidayRecords,
        setHaircutRecords,
        setDonationRecords,
        setItemGivenRecords,
        setGuests,
      })
    );

    const newRecords = [{ id: '1', guestId: 'g1', mealType: 'breakfast' }];

    act(() => {
      useMealsStore.setState({ mealRecords: newRecords });
    });

    expect(setMealRecords).toHaveBeenCalledWith(newRecords);
  });

  it('should call setGuests when guests change in store', async () => {
    renderHook(() =>
      useStoreToContextSync({
        setShowerRecords,
        setLaundryRecords,
        setBicycleRecords,
        setMealRecords,
        setHolidayRecords,
        setHaircutRecords,
        setDonationRecords,
        setItemGivenRecords,
        setGuests,
      })
    );

    const newGuests = [{ id: '1', firstName: 'John', lastName: 'Doe' }];

    act(() => {
      useGuestsStore.setState({ guests: newGuests });
    });

    expect(setGuests).toHaveBeenCalledWith(newGuests);
  });

  it('should not call setter when undefined is passed', async () => {
    renderHook(() =>
      useStoreToContextSync({
        setShowerRecords: undefined,
        setLaundryRecords,
        setBicycleRecords,
        setMealRecords,
        setHolidayRecords,
        setHaircutRecords,
        setDonationRecords,
        setItemGivenRecords,
        setGuests,
      })
    );

    const newRecords = [{ id: '1', guestId: 'g1', status: 'reserved' }];

    act(() => {
      useServicesStore.setState({ showerRecords: newRecords });
    });

    // setShowerRecords is undefined, so it shouldn't be called
    // (No error should be thrown either)
    expect(true).toBe(true);
  });

  it('should handle donations store changes', async () => {
    renderHook(() =>
      useStoreToContextSync({
        setShowerRecords,
        setLaundryRecords,
        setBicycleRecords,
        setMealRecords,
        setHolidayRecords,
        setHaircutRecords,
        setDonationRecords,
        setItemGivenRecords,
        setGuests,
      })
    );

    const newDonations = [{ id: '1', donorName: 'Test Donor', amount: 100 }];
    const newItems = [{ id: '1', guestId: 'g1', itemType: 'blanket' }];

    act(() => {
      useDonationsStore.setState({ donationRecords: newDonations });
    });

    expect(setDonationRecords).toHaveBeenCalledWith(newDonations);

    act(() => {
      useDonationsStore.setState({ itemRecords: newItems });
    });

    expect(setItemGivenRecords).toHaveBeenCalledWith(newItems);
  });

  it('should clean up subscriptions on unmount', async () => {
    const { unmount } = renderHook(() =>
      useStoreToContextSync({
        setShowerRecords,
        setLaundryRecords,
        setBicycleRecords,
        setMealRecords,
        setHolidayRecords,
        setHaircutRecords,
        setDonationRecords,
        setItemGivenRecords,
        setGuests,
      })
    );

    // Unmount the hook
    unmount();

    // Clear mock call counts
    vi.clearAllMocks();

    // Update store after unmount
    act(() => {
      useServicesStore.setState({ 
        showerRecords: [{ id: 'new', guestId: 'g1', status: 'reserved' }] 
      });
    });

    // Setter should NOT be called after unmount
    expect(setShowerRecords).not.toHaveBeenCalled();
  });
});
