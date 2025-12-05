import { useEffect, useState } from 'react';
import {
  useSettingsStore,
  initializeStoresFromSupabase,
} from '../stores';
import { isSupabaseEnabled } from '../supabaseClient';

/**
 * Hook to initialize all Zustand stores on app startup
 * Loads data from Supabase if enabled
 */
export const useStoreInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initStores = async () => {
      try {
        console.log('Initializing Zustand stores...');
        // Allow the UI to render immediately with persisted cache while cloud sync runs
        setIsInitialized(true);

        const settingsPromise = useSettingsStore.getState().loadFromSupabase();
        const dataPromise = isSupabaseEnabled()
          ? initializeStoresFromSupabase()
          : Promise.resolve();

        await Promise.all([settingsPromise, dataPromise]);

        console.log('Zustand stores initialized successfully');
      } catch (err) {
        console.error('Failed to initialize stores:', err);
        setError(err);
        // Still mark as initialized to allow app to function
        setIsInitialized(true);
      }
    };

    initStores();
  }, []);

  return { isInitialized, error };
};
