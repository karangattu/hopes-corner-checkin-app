import React, { useEffect, useRef, useCallback, useState } from 'react';
import { isSupabaseEnabled } from '../supabaseClient';
import { isRealtimeAvailable } from '../hooks/useRealtimeSubscription';
import { useServicesStore } from '../stores/useServicesStore';
import { useMealsStore } from '../stores/useMealsStore';
import { useGuestsStore } from '../stores/useGuestsStore';
import { useDonationsStore } from '../stores/useDonationsStore';
import { useRemindersStore } from '../stores/useRemindersStore';
import { useDailyNotesStore } from '../stores/useDailyNotesStore';
import { RealtimeContext } from './realtimeContext';
import { useAuth } from './useAuth';

/**
 * RealtimeProvider - Manages realtime subscriptions for all stores
 * 
 * This provider initializes Supabase realtime subscriptions when the app loads
 * and cleans them up on unmount. It provides automatic reconnection on failures.
 */
export const RealtimeProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [subscribedStores, setSubscribedStores] = useState([]);
  const cleanupFnsRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const { user, authLoading } = useAuth();

  // Check if realtime is available - require authentication
  const isRealtimeEnabled = isSupabaseEnabled() && isRealtimeAvailable() && !authLoading && !!user;

  // Get subscribe functions from stores
  const subscribeServices = useServicesStore((state) => state.subscribeToRealtime);
  const subscribeMeals = useMealsStore((state) => state.subscribeToRealtime);
  const subscribeGuests = useGuestsStore((state) => state.subscribeToRealtime);
  const subscribeDonations = useDonationsStore((state) => state.subscribeToRealtime);
  const subscribeReminders = useRemindersStore((state) => state.subscribeToRealtime);
  const subscribeDailyNotes = useDailyNotesStore((state) => state.subscribeToRealtime);

  // Get unsubscribe functions from stores
  const unsubscribeServices = useServicesStore((state) => state.unsubscribeFromRealtime);
  const unsubscribeMeals = useMealsStore((state) => state.unsubscribeFromRealtime);
  const unsubscribeGuests = useGuestsStore((state) => state.unsubscribeFromRealtime);
  const unsubscribeDonations = useDonationsStore((state) => state.unsubscribeFromRealtime);
  const unsubscribeReminders = useRemindersStore((state) => state.unsubscribeFromRealtime);
  const unsubscribeDailyNotes = useDailyNotesStore((state) => state.unsubscribeFromRealtime);

  const subscribeAll = useCallback(() => {
    if (!isRealtimeEnabled) {
      console.log('[RealtimeProvider] Realtime not available, skipping subscriptions');
      return;
    }

    // Clean up any existing subscriptions first
    cleanupFnsRef.current.forEach((fn) => fn?.());
    cleanupFnsRef.current = [];

    console.log('[RealtimeProvider] Initializing realtime subscriptions...');

    const stores = [];
    
    try {
      // Subscribe each store and collect cleanup functions
      const servicesCleanup = subscribeServices();
      if (servicesCleanup) {
        cleanupFnsRef.current.push(servicesCleanup);
        stores.push('services');
      }

      const mealsCleanup = subscribeMeals();
      if (mealsCleanup) {
        cleanupFnsRef.current.push(mealsCleanup);
        stores.push('meals');
      }

      const guestsCleanup = subscribeGuests();
      if (guestsCleanup) {
        cleanupFnsRef.current.push(guestsCleanup);
        stores.push('guests');
      }

      const donationsCleanup = subscribeDonations();
      if (donationsCleanup) {
        cleanupFnsRef.current.push(donationsCleanup);
        stores.push('donations');
      }

      const remindersCleanup = subscribeReminders();
      if (remindersCleanup) {
        cleanupFnsRef.current.push(remindersCleanup);
        stores.push('reminders');
      }

      const dailyNotesCleanup = subscribeDailyNotes();
      if (dailyNotesCleanup) {
        cleanupFnsRef.current.push(dailyNotesCleanup);
        stores.push('dailyNotes');
      }

      setSubscribedStores(stores);
      setIsConnected(stores.length > 0);
      
      console.log(`[RealtimeProvider] Subscribed to ${stores.length} stores:`, stores);
    } catch (error) {
      console.error('[RealtimeProvider] Error setting up subscriptions:', error);
      setIsConnected(false);
    }
  }, [
    isRealtimeEnabled,
    subscribeServices,
    subscribeMeals,
    subscribeGuests,
    subscribeDonations,
    subscribeReminders,
    subscribeDailyNotes,
  ]);

  const unsubscribeAll = useCallback(() => {
    console.log('[RealtimeProvider] Cleaning up all realtime subscriptions...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Call cleanup functions
    cleanupFnsRef.current.forEach((fn) => fn?.());
    cleanupFnsRef.current = [];

    // Also call direct unsubscribe methods as backup
    unsubscribeServices?.();
    unsubscribeMeals?.();
    unsubscribeGuests?.();
    unsubscribeDonations?.();
    unsubscribeReminders?.();
    unsubscribeDailyNotes?.();

    setSubscribedStores([]);
    setIsConnected(false);
  }, [
    unsubscribeServices,
    unsubscribeMeals,
    unsubscribeGuests,
    unsubscribeDonations,
    unsubscribeReminders,
    unsubscribeDailyNotes,
  ]);

  const reconnectAll = useCallback(() => {
    console.log('[RealtimeProvider] Manual reconnect requested');
    unsubscribeAll();
    
    // Small delay before reconnecting
    reconnectTimeoutRef.current = setTimeout(() => {
      subscribeAll();
    }, 500);
  }, [subscribeAll, unsubscribeAll]);

  // Initialize subscriptions when authenticated
  useEffect(() => {
    // Don't subscribe if auth is still loading or user is not authenticated
    if (authLoading || !user) {
      return;
    }
    
    // Delay subscription slightly to allow app to initialize
    const initTimeout = setTimeout(() => {
      subscribeAll();
    }, 100);

    return () => {
      clearTimeout(initTimeout);
      unsubscribeAll();
    };
  }, [subscribeAll, unsubscribeAll, authLoading, user]);

  // Refresh all stores from Supabase to catch missed events
  const refreshAllStores = useCallback(async () => {
    console.log('[RealtimeProvider] Refreshing all stores from Supabase...');
    try {
      await Promise.allSettled([
        useServicesStore.getState().loadFromSupabase?.(),
        useMealsStore.getState().loadFromSupabase?.(),
        useGuestsStore.getState().loadFromSupabase?.(),
        useDonationsStore.getState().loadFromSupabase?.(),
      ]);
      console.log('[RealtimeProvider] Store refresh complete');
    } catch (err) {
      console.error('[RealtimeProvider] Store refresh failed:', err);
    }
  }, []);

  // Handle visibility changes - reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRealtimeEnabled) {
        console.log('[RealtimeProvider] Tab became visible, refreshing data...');
        // Refresh data to catch any missed events while tab was hidden
        reconnectTimeoutRef.current = setTimeout(() => {
          refreshAllStores();
          if (!isConnected) {
            subscribeAll();
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRealtimeEnabled, isConnected, subscribeAll, refreshAllStores]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('[RealtimeProvider] Network came online, reconnecting and refreshing...');
      reconnectTimeoutRef.current = setTimeout(() => {
        subscribeAll();
        // Refresh data to catch events missed during offline period
        refreshAllStores();
      }, 500);
    };

    const handleOffline = () => {
      console.log('[RealtimeProvider] Network went offline');
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [subscribeAll, refreshAllStores]);

  const contextValue = {
    isConnected,
    isRealtimeEnabled,
    reconnectAll,
    subscribedStores,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
};

export default RealtimeProvider;
