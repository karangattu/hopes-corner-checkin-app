import { useEffect, useState, useRef } from 'react';
import {
  useSettingsStore,
  useGuestsStore,
  initializeStoresFromSupabase,
} from '../stores';
import { isSupabaseEnabled } from '../supabaseClient';
import { useAuth } from '../context/useAuth';

/**
 * Hook to initialize all Zustand stores on app startup
 * Loads data from Supabase if enabled AND user is authenticated
 * 
 * On first-time login (no persisted cache), waits for data to load
 * On subsequent loads, shows cached data immediately while syncing
 */
export const useStoreInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const initStartedRef = useRef(false);
  const { user, authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    // If not authenticated, mark as initialized (show login screen)
    if (!user) {
      setIsInitialized(true);
      return;
    }
    
    // Prevent double initialization in React 18 Strict Mode
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const initStores = async () => {
      try {
        console.log('Initializing Zustand stores...');
        
        // Check if we have any persisted guest data (indicates returning user)
        // This determines whether we should wait for cloud data or show cached immediately
        const persistedGuests = useGuestsStore.getState().guests;
        const hasCachedData = persistedGuests && persistedGuests.length > 0;
        
        if (hasCachedData) {
          // Returning user with cached data: show UI immediately, sync in background
          console.log('Found cached data, showing UI immediately while syncing...');
          setIsInitialized(true);
          
          // Sync in background
          const settingsPromise = useSettingsStore.getState().loadFromSupabase();
          const dataPromise = isSupabaseEnabled()
            ? initializeStoresFromSupabase()
            : Promise.resolve();

          await Promise.all([settingsPromise, dataPromise]);
          console.log('Background sync completed');
        } else {
          // New user or no cached data: wait for data to load before showing UI
          console.log('No cached data found, waiting for cloud data...');
          
          const settingsPromise = useSettingsStore.getState().loadFromSupabase();
          const dataPromise = isSupabaseEnabled()
            ? initializeStoresFromSupabase()
            : Promise.resolve();

          await Promise.all([settingsPromise, dataPromise]);
          
          console.log('Zustand stores initialized successfully');
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Failed to initialize stores:', err);
        setError(err);
        // Still mark as initialized to allow app to function (will show empty state)
        setIsInitialized(true);
      }
    };

    initStores();
  }, [user, authLoading]);

  return { isInitialized, error };
};
