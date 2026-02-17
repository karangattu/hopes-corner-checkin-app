import { useEffect } from 'react';
import { useServicesStore } from '../stores/useServicesStore';
import { useMealsStore } from '../stores/useMealsStore';
import { useGuestsStore } from '../stores/useGuestsStore';
import { useDonationsStore } from '../stores/useDonationsStore';
import { onCrossTabChange } from '../utils/crossTabSync';

/**
 * Hook to sync Zustand store updates to AppContext setters.
 * This enables realtime updates to flow from Zustand stores (which receive
 * Supabase realtime events) to the legacy AppContext (which components use).
 * 
 * Also listens for cross-tab BroadcastChannel messages to update stores
 * when mutations happen in other tabs on the same browser.
 * 
 * @param {Object} setters - Object containing AppContext state setters
 */
export const useStoreToContextSync = ({
  setShowerRecords,
  setLaundryRecords,
  setBicycleRecords,
  setMealRecords,
  setHolidayRecords,
  setHaircutRecords,
  setDonationRecords,
  setItemGivenRecords,
  setGuests,
}) => {
  // Subscribe to services store changes
  useEffect(() => {
    // Subscribe to shower records changes
    const unsubShowers = useServicesStore.subscribe(
      (state) => state.showerRecords,
      (showerRecords) => {
        if (showerRecords && setShowerRecords) {
          console.log('[StoreSync] Syncing showerRecords to AppContext:', showerRecords.length);
          setShowerRecords(showerRecords);
        }
      }
    );

    // Subscribe to laundry records changes
    const unsubLaundry = useServicesStore.subscribe(
      (state) => state.laundryRecords,
      (laundryRecords) => {
        if (laundryRecords && setLaundryRecords) {
          console.log('[StoreSync] Syncing laundryRecords to AppContext:', laundryRecords.length);
          setLaundryRecords(laundryRecords);
        }
      }
    );

    // Subscribe to bicycle records changes
    const unsubBicycles = useServicesStore.subscribe(
      (state) => state.bicycleRecords,
      (bicycleRecords) => {
        if (bicycleRecords && setBicycleRecords) {
          console.log('[StoreSync] Syncing bicycleRecords to AppContext:', bicycleRecords.length);
          setBicycleRecords(bicycleRecords);
        }
      }
    );

    return () => {
      unsubShowers();
      unsubLaundry();
      unsubBicycles();
    };
  }, [setShowerRecords, setLaundryRecords, setBicycleRecords]);

  // Subscribe to meals store changes
  useEffect(() => {
    const unsubMeals = useMealsStore.subscribe(
      (state) => state.mealRecords,
      (mealRecords) => {
        if (mealRecords && setMealRecords) {
          // Filter to ensure only valid guest meal records are synced
          // This prevents corrupted data (e.g., lunch_bag records without guestId)
          // from being synced to AppContext
          const validMealRecords = mealRecords.filter(
            (r) => r.guestId && (r.type === 'guest' || !r.type)
          );
          console.log('[StoreSync] Syncing mealRecords to AppContext:', validMealRecords.length, 
            '(filtered from', mealRecords.length, ')');
          setMealRecords(validMealRecords);
        }
      }
    );

    const unsubHolidays = useMealsStore.subscribe(
      (state) => state.holidayRecords,
      (holidayRecords) => {
        if (holidayRecords && setHolidayRecords) {
          console.log('[StoreSync] Syncing holidayRecords to AppContext:', holidayRecords.length);
          setHolidayRecords(holidayRecords);
        }
      }
    );

    const unsubHaircuts = useMealsStore.subscribe(
      (state) => state.haircutRecords,
      (haircutRecords) => {
        if (haircutRecords && setHaircutRecords) {
          console.log('[StoreSync] Syncing haircutRecords to AppContext:', haircutRecords.length);
          setHaircutRecords(haircutRecords);
        }
      }
    );

    return () => {
      unsubMeals();
      unsubHolidays();
      unsubHaircuts();
    };
  }, [setMealRecords, setHolidayRecords, setHaircutRecords]);

  // Subscribe to donations store changes
  useEffect(() => {
    const unsubDonations = useDonationsStore.subscribe(
      (state) => state.donationRecords,
      (donationRecords) => {
        if (donationRecords && setDonationRecords) {
          console.log('[StoreSync] Syncing donationRecords to AppContext:', donationRecords.length);
          setDonationRecords(donationRecords);
        }
      }
    );

    const unsubItems = useDonationsStore.subscribe(
      (state) => state.itemRecords,
      (itemRecords) => {
        if (itemRecords && setItemGivenRecords) {
          console.log('[StoreSync] Syncing itemRecords to AppContext:', itemRecords.length);
          setItemGivenRecords(itemRecords);
        }
      }
    );

    return () => {
      unsubDonations();
      unsubItems();
    };
  }, [setDonationRecords, setItemGivenRecords]);

  // Subscribe to guests store changes
  useEffect(() => {
    const unsubGuests = useGuestsStore.subscribe(
      (state) => state.guests,
      (guests) => {
        if (guests && setGuests) {
          console.log('[StoreSync] Syncing guests to AppContext:', guests.length);
          setGuests(guests);
        }
      }
    );

    return () => {
      unsubGuests();
    };
  }, [setGuests]);

  // Listen for cross-tab changes via BroadcastChannel
  // When another tab on the same browser makes a mutation, update the Zustand stores
  // which will then flow to AppContext via the subscriptions above
  useEffect(() => {
    const unsubShowersCrossTab = onCrossTabChange('showers', (action, data) => {
      if (!data) return;
      useServicesStore.getState().syncShowerFromMutation(action, data);
    });

    const unsubLaundryCrossTab = onCrossTabChange('laundry', (action, data) => {
      if (!data) return;
      useServicesStore.getState().syncLaundryFromMutation(action, data);
    });

    return () => {
      unsubShowersCrossTab();
      unsubLaundryCrossTab();
    };
  }, []);
};
