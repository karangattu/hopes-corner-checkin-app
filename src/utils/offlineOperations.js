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
 * Map of operation types to execution functions (for sync)
 */
export const EXECUTE_FUNCTIONS = {
  ADD_MEAL: executeMealInsertion,
  ADD_SHOWER: executeShowerInsertion,
  ADD_LAUNDRY: executeLaundryInsertion,
  UPDATE_SHOWER: executeShowerUpdate,
  UPDATE_LAUNDRY: executeLaundryUpdate,
  DELETE_SHOWER: executeShowerDeletion,
  DELETE_LAUNDRY: executeLaundryDeletion,
};
