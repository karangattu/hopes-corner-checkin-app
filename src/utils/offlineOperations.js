/**
 * Offline Operations
 * Wrappers for meal, shower, and laundry operations with offline queue support
 */

import { executeWithOfflineFallback } from './offlineQueueManager';
import { supabase, isSupabaseEnabled } from '../supabaseClient';

/**
 * Execute meal insertion with offline fallback
 */
export const executeMealInsertion = async (payload) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('meal_attendance')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Execute shower insertion with offline fallback
 */
export const executeShowerInsertion = async (payload) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('shower_reservations')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Execute laundry insertion with offline fallback
 */
export const executeLaundryInsertion = async (payload) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('laundry_bookings')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Execute shower update with offline fallback
 */
export const executeShowerUpdate = async ({ id, updates }) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('shower_reservations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Execute laundry update with offline fallback
 */
export const executeLaundryUpdate = async ({ id, updates }) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('laundry_bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Execute shower deletion with offline fallback
 */
export const executeShowerDeletion = async ({ id }) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase.from('shower_reservations').delete().eq('id', id);

  if (error) {
    throw error;
  }

  return { id };
};

/**
 * Execute laundry deletion with offline fallback
 */
export const executeLaundryDeletion = async ({ id }) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase.from('laundry_bookings').delete().eq('id', id);

  if (error) {
    throw error;
  }

  return { id };
};

/**
 * Execute bicycle insertion with offline fallback
 * Supports both repair_type (single) and repair_types (array) for backward compatibility
 */
export const executeBicycleInsertion = async (payload) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('bicycle_repairs')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Execute haircut insertion with offline fallback
 */
export const executeHaircutInsertion = async (payload) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('haircut_visits')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Execute holiday insertion with offline fallback
 */
export const executeHolidayInsertion = async (payload) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('holiday_visits')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Execute item insertion with offline fallback
 */
export const executeItemInsertion = async (payload) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('items_given')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Execute donation insertion with offline fallback
 * Supports donation_type, item_name, trays, weight_lbs, donor, donated_at
 */
export const executeDonationInsertion = async (payload) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('donations')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Execute la plaza donation insertion with offline fallback
 * Supports category, weight_lbs, notes, received_at
 */
export const executeLaPlazaDonationInsertion = async (payload) => {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('la_plaza_donations')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Wrapper: Add meal with offline support
 */
export const addMealWithOffline = async (payload, isOnline) => {
  return executeWithOfflineFallback(
    'ADD_MEAL',
    payload,
    executeMealInsertion,
    isOnline
  );
};

/**
 * Wrapper: Add shower with offline support
 */
export const addShowerWithOffline = async (payload, isOnline) => {
  return executeWithOfflineFallback(
    'ADD_SHOWER',
    payload,
    executeShowerInsertion,
    isOnline
  );
};

/**
 * Wrapper: Add laundry with offline support
 */
export const addLaundryWithOffline = async (payload, isOnline) => {
  return executeWithOfflineFallback(
    'ADD_LAUNDRY',
    payload,
    executeLaundryInsertion,
    isOnline
  );
};

/**
 * Wrapper: Update shower with offline support
 */
export const updateShowerWithOffline = async (id, updates, isOnline) => {
  return executeWithOfflineFallback(
    'UPDATE_SHOWER',
    { id, updates },
    executeShowerUpdate,
    isOnline
  );
};

/**
 * Wrapper: Update laundry with offline support
 */
export const updateLaundryWithOffline = async (id, updates, isOnline) => {
  return executeWithOfflineFallback(
    'UPDATE_LAUNDRY',
    { id, updates },
    executeLaundryUpdate,
    isOnline
  );
};

/**
 * Wrapper: Delete shower with offline support
 */
export const deleteShowerWithOffline = async (id, isOnline) => {
  return executeWithOfflineFallback(
    'DELETE_SHOWER',
    { id },
    executeShowerDeletion,
    isOnline
  );
};

/**
 * Wrapper: Delete laundry with offline support
 */
export const deleteLaundryWithOffline = async (id, isOnline) => {
  return executeWithOfflineFallback(
    'DELETE_LAUNDRY',
    { id },
    executeLaundryDeletion,
    isOnline
  );
};

/**
 * Wrapper: Add bicycle repair with offline support
 */
export const addBicycleWithOffline = async (payload, isOnline) => {
  return executeWithOfflineFallback(
    'ADD_BICYCLE',
    payload,
    executeBicycleInsertion,
    isOnline
  );
};

/**
 * Wrapper: Add haircut with offline support
 */
export const addHaircutWithOffline = async (payload, isOnline) => {
  return executeWithOfflineFallback(
    'ADD_HAIRCUT',
    payload,
    executeHaircutInsertion,
    isOnline
  );
};

/**
 * Wrapper: Add holiday with offline support
 */
export const addHolidayWithOffline = async (payload, isOnline) => {
  return executeWithOfflineFallback(
    'ADD_HOLIDAY',
    payload,
    executeHolidayInsertion,
    isOnline
  );
};

/**
 * Wrapper: Add item with offline support
 */
export const addItemWithOffline = async (payload, isOnline) => {
  return executeWithOfflineFallback(
    'ADD_ITEM',
    payload,
    executeItemInsertion,
    isOnline
  );
};

/**
 * Wrapper: Add donation with offline support
 */
export const addDonationWithOffline = async (payload, isOnline) => {
  return executeWithOfflineFallback(
    'ADD_DONATION',
    payload,
    executeDonationInsertion,
    isOnline
  );
};

/**
 * Wrapper: Add la plaza donation with offline support
 */
export const addLaPlazaDonationWithOffline = async (payload, isOnline) => {
  return executeWithOfflineFallback(
    'ADD_LA_PLAZA_DONATION',
    payload,
    executeLaPlazaDonationInsertion,
    isOnline,
  );
};

/**
 * Map of operation types to execution functions (for sync)
 */
export const EXECUTE_FUNCTIONS = {
  ADD_MEAL: executeMealInsertion,
  ADD_SHOWER: executeShowerInsertion,
  ADD_LAUNDRY: executeLaundryInsertion,
  ADD_BICYCLE: executeBicycleInsertion,
  ADD_HAIRCUT: executeHaircutInsertion,
  ADD_HOLIDAY: executeHolidayInsertion,
  ADD_ITEM: executeItemInsertion,
  ADD_DONATION: executeDonationInsertion,
  ADD_LA_PLAZA_DONATION: executeLaPlazaDonationInsertion,
  UPDATE_SHOWER: executeShowerUpdate,
  UPDATE_LAUNDRY: executeLaundryUpdate,
  DELETE_SHOWER: executeShowerDeletion,
  DELETE_LAUNDRY: executeLaundryDeletion,
};
