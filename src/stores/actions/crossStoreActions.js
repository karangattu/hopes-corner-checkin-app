/**
 * Cross-store actions that coordinate operations across multiple stores
 * and automatically log to history
 */

import { useGuestsStore } from '../useGuestsStore';
import { useMealsStore } from '../useMealsStore';
import { useServicesStore } from '../useServicesStore';
import { useDonationsStore } from '../useDonationsStore';
import { useHistoryStore, ACTION_TYPES, createAction } from '../useHistoryStore';
import { useRemindersStore } from '../useRemindersStore';
import enhancedToast from '../../utils/toast';

/**
 * Check if a guest can use services (not banned)
 */
export const checkGuestEligibility = (guestId) => {
  const guests = useGuestsStore.getState().guests;
  const guest = guests.find((g) => g.id === guestId);

  if (!guest) {
    throw new Error('Guest not found');
  }

  if (guest.isBanned) {
    const bannedUntil = guest.bannedUntil
      ? new Date(guest.bannedUntil).toLocaleDateString()
      : 'indefinitely';
    throw new Error(
      `${guest.name} is banned until ${bannedUntil}. Reason: ${guest.banReason || 'No reason provided'}`
    );
  }

  return guest;
};

/**
 * Add a meal record with history logging
 */
export const addMealWithHistory = async (guestId, quantity = 1) => {
  try {
    const guest = checkGuestEligibility(guestId);

    const record = await useMealsStore.getState().addMealRecord(guestId, quantity);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.MEAL_ADDED, {
        recordId: record.id,
        guestId,
        guestName: guest.name,
        quantity,
      })
    );

    enhancedToast.success(`Meal recorded for ${guest.name}`);
    return record;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to add meal record');
    throw error;
  }
};

/**
 * Add an extra meal record with history logging
 */
export const addExtraMealWithHistory = async (guestId, quantity = 1) => {
  try {
    const guest = checkGuestEligibility(guestId);

    const record = await useMealsStore.getState().addExtraMealRecord(guestId, quantity);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.MEAL_ADDED, {
        recordId: record.id,
        guestId,
        guestName: guest.name,
        quantity,
        type: 'extra',
      })
    );

    enhancedToast.success(`Extra meal recorded for ${guest.name}`);
    return record;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to add extra meal record');
    throw error;
  }
};

/**
 * Add a holiday visit record with history logging
 */
export const addHolidayWithHistory = async (guestId) => {
  try {
    const guest = checkGuestEligibility(guestId);

    const record = await useMealsStore.getState().addHolidayRecord(guestId);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.MEAL_ADDED, {
        recordId: record.id,
        guestId,
        guestName: guest.name,
        type: 'holiday',
      })
    );

    enhancedToast.success(`Holiday visit recorded for ${guest.name}`);
    return record;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to add holiday record');
    throw error;
  }
};

/**
 * Add a haircut record with history logging
 */
export const addHaircutWithHistory = async (guestId) => {
  try {
    const guest = checkGuestEligibility(guestId);

    const record = await useMealsStore.getState().addHaircutRecord(guestId);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.MEAL_ADDED, {
        recordId: record.id,
        guestId,
        guestName: guest.name,
        type: 'haircut',
      })
    );

    enhancedToast.success(`Haircut recorded for ${guest.name}`);
    return record;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to add haircut record');
    throw error;
  }
};

/**
 * Add an RV meal record with history logging
 */
export const addRvMealWithHistory = async (guestId, quantity = 1) => {
  try {
    const guest = checkGuestEligibility(guestId);

    const record = await useMealsStore.getState().addRvMealRecord(guestId, quantity);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.RV_MEAL_ADDED, {
        recordId: record.id,
        guestId,
        guestName: guest.name,
        quantity,
      })
    );

    enhancedToast.success(`RV meal recorded for ${guest.name}`);
    return record;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to add RV meal record');
    throw error;
  }
};

/**
 * Add a shower record with history logging
 */
export const addShowerWithHistory = async (guestId) => {
  try {
    const guest = checkGuestEligibility(guestId);

    const record = await useServicesStore.getState().addShowerRecord(guestId);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.SHOWER_ADDED, {
        recordId: record.id,
        guestId,
        guestName: guest.name,
      })
    );

    enhancedToast.success(`Shower recorded for ${guest.name}`);
    return record;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to add shower record');
    throw error;
  }
};

/**
 * Add a laundry record with history logging
 */
export const addLaundryWithHistory = async (guestId, washType) => {
  try {
    const guest = checkGuestEligibility(guestId);

    const record = await useServicesStore.getState().addLaundryRecord(guestId, washType);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.LAUNDRY_ADDED, {
        recordId: record.id,
        guestId,
        guestName: guest.name,
        washType,
      })
    );

    enhancedToast.success(`${washType} laundry recorded for ${guest.name}`);
    return record;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to add laundry record');
    throw error;
  }
};

/**
 * Checkout a bicycle with history logging
 */
export const checkoutBicycleWithHistory = async (guestId, returnTime) => {
  try {
    const guest = checkGuestEligibility(guestId);

    const record = await useServicesStore.getState().addBicycleRecord(guestId, returnTime);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.BICYCLE_CHECKOUT, {
        recordId: record.id,
        guestId,
        guestName: guest.name,
        returnTime,
      })
    );

    enhancedToast.success(`Bicycle checked out to ${guest.name}`);
    return record;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to checkout bicycle');
    throw error;
  }
};

/**
 * Return a bicycle with history logging
 */
export const returnBicycleWithHistory = async (recordId) => {
  try {
    const bicycles = useServicesStore.getState().bicycleRecords;
    const record = bicycles.find((r) => r.id === recordId);

    if (!record) throw new Error('Bicycle record not found');

    const guests = useGuestsStore.getState().guests;
    const guest = guests.find((g) => g.id === record.guestId);

    await useServicesStore.getState().returnBicycle(recordId);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.BICYCLE_RETURNED, {
        recordId,
        guestId: record.guestId,
        guestName: guest?.name || 'Unknown',
      })
    );

    enhancedToast.success(`Bicycle returned by ${guest?.name || 'Unknown'}`);
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to return bicycle');
    throw error;
  }
};

/**
 * Add a donation with history logging
 */
export const addDonationWithHistory = async ({ guestId, type, amount, description }) => {
  try {
    const guest = checkGuestEligibility(guestId);

    const record = await useDonationsStore.getState().addDonation({
      guestId,
      type,
      amount,
      description,
    });

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.DONATION_ADDED, {
        recordId: record.id,
        guestId,
        guestName: guest.name,
        type,
        amount,
        description,
      })
    );

    enhancedToast.success(`Donation recorded for ${guest.name}`);
    return record;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to add donation');
    throw error;
  }
};

/**
 * Add an item distribution with history logging
 */
export const addItemWithHistory = async ({ guestId, item, quantity }) => {
  try {
    const guest = checkGuestEligibility(guestId);

    const record = await useDonationsStore.getState().addItem({
      guestId,
      item,
      quantity,
    });

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.ITEM_ADDED, {
        recordId: record.id,
        guestId,
        guestName: guest.name,
        item,
        quantity,
      })
    );

    enhancedToast.success(`${item} distributed to ${guest.name}`);
    return record;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to add item distribution');
    throw error;
  }
};

/**
 * Add a guest with history logging
 */
export const addGuestWithHistory = async (guestData) => {
  try {
    const guest = await useGuestsStore.getState().addGuest(guestData);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.GUEST_ADDED, {
        guestId: guest.id,
        guestName: guest.name,
        data: guestData,
      })
    );

    enhancedToast.success(`Guest ${guest.name} added successfully`);
    return guest;
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to add guest');
    throw error;
  }
};

/**
 * Update a guest with history logging
 */
export const updateGuestWithHistory = async (guestId, updates) => {
  try {
    const guests = useGuestsStore.getState().guests;
    const guest = guests.find((g) => g.id === guestId);

    if (!guest) throw new Error('Guest not found');

    await useGuestsStore.getState().updateGuest(guestId, updates);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.GUEST_UPDATED, {
        guestId,
        guestName: guest.name,
        updates,
      })
    );

    enhancedToast.success(`Guest ${guest.name} updated successfully`);
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to update guest');
    throw error;
  }
};

/**
 * Ban a guest with history logging
 */
export const banGuestWithHistory = async (guestId, banData) => {
  try {
    const guests = useGuestsStore.getState().guests;
    const guest = guests.find((g) => g.id === guestId);

    if (!guest) throw new Error('Guest not found');

    await useGuestsStore.getState().banGuest(guestId, banData);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.GUEST_BANNED, {
        guestId,
        guestName: guest.name,
        bannedUntil: banData.bannedUntil,
        banReason: banData.banReason,
      })
    );

    enhancedToast.success(`${guest.name} has been banned`);
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to ban guest');
    throw error;
  }
};

/**
 * Clear a guest ban with history logging
 */
export const clearGuestBanWithHistory = async (guestId) => {
  try {
    const guests = useGuestsStore.getState().guests;
    const guest = guests.find((g) => g.id === guestId);

    if (!guest) throw new Error('Guest not found');

    await useGuestsStore.getState().clearGuestBan(guestId);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.GUEST_BAN_CLEARED, {
        guestId,
        guestName: guest.name,
      })
    );

    enhancedToast.success(`Ban cleared for ${guest.name}`);
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to clear ban');
    throw error;
  }
};

/**
 * Delete a meal record with history logging
 */
export const deleteMealWithHistory = async (recordId) => {
  try {
    const meals = useMealsStore.getState().mealRecords;
    const record = meals.find((r) => r.id === recordId);

    if (!record) throw new Error('Meal record not found');

    const guests = useGuestsStore.getState().guests;
    const guest = guests.find((g) => g.id === record.guestId);

    await useMealsStore.getState().deleteMealRecord(recordId);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.MEAL_DELETED, {
        recordId,
        guestId: record.guestId,
        guestName: guest?.name || 'Unknown',
      })
    );

    enhancedToast.success('Meal record deleted');
  } catch (error) {
    enhancedToast.error(error.message || 'Failed to delete meal record');
    throw error;
  }
};

/**
 * Initialize all stores from Supabase
 *
 * IMPORTANT: Guest data must load FIRST before services (showers, laundry, meals, donations).
 * Services reference guests by ID, and if guest data isn't loaded yet, components will
 * display "Unknown Guest" instead of the actual guest name. This was a race condition
 * where parallel loading caused services to render before guest lookups were available.
 */
export const initializeStoresFromSupabase = async () => {
  try {
    // Phase 1: Load guest data first - this is required for all other stores
    // to properly resolve guest names in their records
    await Promise.all([
      useGuestsStore.getState().loadFromSupabase(),
      useGuestsStore.getState().loadGuestProxiesFromSupabase(),
      useGuestsStore.getState().loadGuestWarningsFromSupabase(),
      useRemindersStore.getState().fetchReminders(),
    ]);

    // Phase 2: Now load service records - guest lookups will work correctly
    await Promise.all([
      useMealsStore.getState().loadFromSupabase(),
      useServicesStore.getState().loadFromSupabase(),
      useDonationsStore.getState().loadFromSupabase(),
    ]);

    useHistoryStore.getState().pushAction(
      createAction(ACTION_TYPES.DATA_SYNCED, {
        timestamp: new Date().toISOString(),
      })
    );

    console.log('All stores initialized from Supabase');
  } catch (error) {
    console.error('Failed to initialize stores from Supabase:', error);
    throw error;
  }
};
