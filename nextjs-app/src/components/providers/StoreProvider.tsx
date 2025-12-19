'use client';

import React, { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react';
import { useGuestsStore } from '@/lib/stores/useGuestsStore';
import { useMealsStore } from '@/lib/stores/useMealsStore';
import { useServicesStore } from '@/lib/stores/useServicesStore';
import { useDonationsStore } from '@/lib/stores/useDonationsStore';
import { useSettingsStore } from '@/lib/stores/useSettingsStore';

// Store context for hydration management
interface StoreContextValue {
  isHydrated: boolean;
  isInitialized: boolean;
  initializeStores: () => Promise<void>;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStoreContext() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStoreContext must be used within StoreProvider');
  }
  return context;
}

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializingRef = useRef(false);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const initializeStores = useCallback(async () => {
    if (initializingRef.current || isInitialized) return;
    initializingRef.current = true;

    try {
      console.log('[StoreProvider] Initializing stores...');
      
      // Load data from Supabase in parallel
      await Promise.all([
        useGuestsStore.getState().fetchGuests(),
        useMealsStore.getState().loadFromSupabase(),
        useServicesStore.getState().loadFromSupabase(),
        useDonationsStore.getState().loadFromSupabase(),
        useSettingsStore.getState().loadFromSupabase(),
      ]);

      setIsInitialized(true);
      console.log('[StoreProvider] All stores initialized');
    } catch (error) {
      console.error('[StoreProvider] Failed to initialize stores:', error);
      throw error;
    } finally {
      initializingRef.current = false;
    }
  }, [isInitialized]);

  const refreshStores = useCallback(async () => {
    console.log('[StoreProvider] Refreshing stores...');
    
    try {
      await Promise.all([
        useGuestsStore.getState().fetchGuests(),
        useMealsStore.getState().loadFromSupabase(),
        useServicesStore.getState().loadFromSupabase(),
        useDonationsStore.getState().loadFromSupabase(),
        useSettingsStore.getState().loadFromSupabase(),
      ]);

      console.log('[StoreProvider] All stores refreshed');
    } catch (error) {
      console.error('[StoreProvider] Failed to refresh stores:', error);
      throw error;
    }
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    if (isHydrated && !isInitialized) {
      initializeStores();
    }
  }, [isHydrated, isInitialized, initializeStores]);

  const value: StoreContextValue = {
    isHydrated,
    isInitialized,
    initializeStores,
    refreshStores,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

// Hook to wait for store initialization
export function useStoreReady() {
  const { isHydrated, isInitialized } = useStoreContext();
  return isHydrated && isInitialized;
}

// Export individual store hooks for convenience
export { useGuestsStore } from '@/lib/stores/useGuestsStore';
export { useMealsStore } from '@/lib/stores/useMealsStore';
export { useServicesStore } from '@/lib/stores/useServicesStore';
export { useDonationsStore } from '@/lib/stores/useDonationsStore';
export { useSettingsStore } from '@/lib/stores/useSettingsStore';
