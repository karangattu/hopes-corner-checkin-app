/**
 * Sync Status Hooks
 * Lightweight hooks for accessing sync status
 */

import { useSyncStatus as useSyncStatusBase } from './SyncContext';

/**
 * Hook to get just online status (lightweight)
 */
export const useOnlineStatus = () => {
  const { isOnline } = useSyncStatusBase();
  return isOnline;
};

/**
 * Hook to check if operations are pending
 */
export const useHasPendingSync = () => {
  const { hasPendingItems, totalPending } = useSyncStatusBase();
  return { hasPendingItems, totalPending };
};
