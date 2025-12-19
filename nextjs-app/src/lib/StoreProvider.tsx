'use client';

import React, { createContext, useContext, useRef, type ReactNode } from 'react';
import { useGuestsStore } from './stores/useGuestsStore';
import { useServicesStore } from './stores/useServicesStore';
import { useMealsStore } from './stores/useMealsStore';

/**
 * Store Provider for Zustand stores
 * 
 * This provider creates a single reference for each store and passes them
 * through context. This is useful for:
 * 1. Testing - allows injecting mock stores
 * 2. Server Components - ensures stores are created once per request
 * 3. Consistency - prevents store recreation issues
 * 
 * Usage:
 * ```tsx
 * // In app layout or provider
 * <StoreProvider>
 *   <App />
 * </StoreProvider>
 * 
 * // In components
 * const { guestsStore, servicesStore, mealsStore } = useStores();
 * const guests = guestsStore.getState().guests;
 * ```
 */

// Infer store types from the hooks
type GuestsStoreType = typeof useGuestsStore;
type ServicesStoreType = typeof useServicesStore;
type MealsStoreType = typeof useMealsStore;

interface StoreContextValue {
  guestsStore: GuestsStoreType;
  servicesStore: ServicesStoreType;
  mealsStore: MealsStoreType;
}

const StoreContext = createContext<StoreContextValue | null>(null);

interface StoreProviderProps {
  children: ReactNode;
  // Allow injecting mock stores for testing
  mockGuestsStore?: typeof useGuestsStore;
  mockServicesStore?: typeof useServicesStore;
  mockMealsStore?: typeof useMealsStore;
}

export function StoreProvider({
  children,
  mockGuestsStore,
  mockServicesStore,
  mockMealsStore,
}: StoreProviderProps) {
  // Use refs to ensure stores are only created once
  const storesRef = useRef<StoreContextValue | null>(null);
  
  if (!storesRef.current) {
    storesRef.current = {
      guestsStore: mockGuestsStore || useGuestsStore,
      servicesStore: mockServicesStore || useServicesStore,
      mealsStore: mockMealsStore || useMealsStore,
    };
  }

  return (
    <StoreContext.Provider value={storesRef.current}>
      {children}
    </StoreContext.Provider>
  );
}

/**
 * Hook to access all stores from context
 * 
 * @throws Error if used outside of StoreProvider
 */
export function useStores(): StoreContextValue {
  const context = useContext(StoreContext);
  
  if (!context) {
    throw new Error('useStores must be used within a StoreProvider');
  }
  
  return context;
}

/**
 * Hook to access the guests store
 */
export function useGuestsStoreContext() {
  const { guestsStore } = useStores();
  return guestsStore;
}

/**
 * Hook to access the services store
 */
export function useServicesStoreContext() {
  const { servicesStore } = useStores();
  return servicesStore;
}

/**
 * Hook to access the meals store
 */
export function useMealsStoreContext() {
  const { mealsStore } = useStores();
  return mealsStore;
}

// Re-export store types for convenience
export type { GuestsStoreType, ServicesStoreType, MealsStoreType };

export default StoreProvider;
