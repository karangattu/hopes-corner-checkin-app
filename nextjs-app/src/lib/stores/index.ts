// Re-export all stores for convenient importing
export { useGuestsStore } from './useGuestsStore';
export { useMealsStore } from './useMealsStore';
export { useServicesStore } from './useServicesStore';
export { useDonationsStore } from './useDonationsStore';
export { useSettingsStore, DEFAULT_TARGETS, createDefaultSettings } from './useSettingsStore';

// Re-export store types
export type { Guest, MealRecord, HolidayRecord, HaircutRecord } from '@/lib/types';
export type { 
  ShowerRecord, 
  LaundryRecord, 
  BicycleRepair,
  Donation,
  LaPlazaDonation,
  AppSettings,
  ServiceTargets,
} from '@/lib/types';
