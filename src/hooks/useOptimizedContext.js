/**
 * Optimized context hook that uses Zustand stores when possible
 * Falls back to AppContext for values not yet in Zustand
 *
 * This allows gradual migration while getting immediate performance benefits
 */

import { useAppContext } from '../context/useAppContext';
import { useGuestsStore } from '../stores/useGuestsStore';
import { useMealsStore } from '../stores/useMealsStore';
import { useServicesStore } from '../stores/useServicesStore';
import { useDonationsStore } from '../stores/useDonationsStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useMemo } from 'react';

/**
 * Drop-in replacement for useAppContext() that uses Zustand stores for better performance
 * Only re-renders when the specific data you need changes
 */
export const useOptimizedContext = () => {
  // Get Zustand store data (fast, selective subscriptions)
  const zustandGuests = useGuestsStore((state) => state.guests);
  const zustandMealRecords = useMealsStore((state) => state.mealRecords);
  const zustandRvMealRecords = useMealsStore((state) => state.rvMealRecords);
  const zustandExtraMealRecords = useMealsStore((state) => state.extraMealRecords);
  const zustandHolidayRecords = useMealsStore((state) => state.holidayRecords);
  const zustandHaircutRecords = useMealsStore((state) => state.haircutRecords);

  const zustandShowerRecords = useServicesStore((state) => state.showerRecords);
  const zustandLaundryRecords = useServicesStore((state) => state.laundryRecords);
  const zustandBicycleRecords = useServicesStore((state) => state.bicycleRecords);

  const zustandDonations = useDonationsStore((state) => state.donationRecords);
  const zustandSettings = useSettingsStore((state) => state.settings);

  // Get AppContext (slow, re-renders on any change)
  const appContext = useAppContext();

  // Merge Zustand + AppContext (prefer Zustand when available)
  return useMemo(() => ({
    ...appContext,

    // Override with Zustand data (faster)
    guests: zustandGuests?.length > 0 ? zustandGuests : appContext.guests,
    mealRecords: zustandMealRecords?.length > 0 ? zustandMealRecords : appContext.mealRecords,
    rvMealRecords: zustandRvMealRecords?.length > 0 ? zustandRvMealRecords : appContext.rvMealRecords,
    extraMealRecords: zustandExtraMealRecords?.length > 0 ? zustandExtraMealRecords : appContext.extraMealRecords,
    holidayRecords: zustandHolidayRecords?.length > 0 ? zustandHolidayRecords : appContext.holidayRecords,
    haircutRecords: zustandHaircutRecords?.length > 0 ? zustandHaircutRecords : appContext.haircutRecords,

    showerRecords: zustandShowerRecords?.length > 0 ? zustandShowerRecords : appContext.showerRecords,
    laundryRecords: zustandLaundryRecords?.length > 0 ? zustandLaundryRecords : appContext.laundryRecords,
    bicycleRecords: zustandBicycleRecords?.length > 0 ? zustandBicycleRecords : appContext.bicycleRecords,

    donationRecords: zustandDonations?.length > 0 ? zustandDonations : appContext.donationRecords,
    settings: zustandSettings || appContext.settings,
  }), [
    appContext,
    zustandGuests,
    zustandMealRecords,
    zustandRvMealRecords,
    zustandExtraMealRecords,
    zustandHolidayRecords,
    zustandHaircutRecords,
    zustandShowerRecords,
    zustandLaundryRecords,
    zustandBicycleRecords,
    zustandDonations,
    zustandSettings,
  ]);
};

/**
 * Selective hooks for when you only need specific data
 * These are MUCH faster because they only re-render when that specific data changes
 */

export const useGuests = () => {
  const zustandGuests = useGuestsStore((state) => state.guests);
  const contextGuests = useAppContext().guests;
  return zustandGuests?.length > 0 ? zustandGuests : contextGuests;
};

export const useMealRecords = () => {
  const zustandMeals = useMealsStore((state) => state.mealRecords);
  const contextMeals = useAppContext().mealRecords;
  return zustandMeals?.length > 0 ? zustandMeals : contextMeals;
};

export const useShowerRecords = () => {
  const zustandShowers = useServicesStore((state) => state.showerRecords);
  const contextShowers = useAppContext().showerRecords;
  return zustandShowers?.length > 0 ? zustandShowers : contextShowers;
};

export const useLaundryRecords = () => {
  const zustandLaundry = useServicesStore((state) => state.laundryRecords);
  const contextLaundry = useAppContext().laundryRecords;
  return zustandLaundry?.length > 0 ? zustandLaundry : contextLaundry;
};

// Export for easy use
export default useOptimizedContext;
