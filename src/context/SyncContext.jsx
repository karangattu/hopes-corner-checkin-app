/**
 * Sync Context
 * Manages offline queue sync status and provides hooks for components
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  syncPendingOperations,
  hasPendingOperations,
  cleanupCompletedOperations,
} from '../utils/offlineQueueManager';
import { getQueueStats } from '../utils/indexedDB';

const SyncContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSyncStatus = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncProvider');
  }
  return context;
};

export const SyncProvider = ({ children, executeFunctions }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({
    pending: 0,
    retrying: 0,
    completed: 0,
    failed: 0,
  });
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  /**
   * Update queue statistics
   */
  const updateStats = useCallback(async () => {
    try {
      const stats = await getQueueStats();
      // Ensure we always have valid stats object
      if (stats && typeof stats === 'object') {
        setSyncStats(stats);
      }
    } catch (error) {
      console.error('[SyncContext] Failed to update stats:', error);
    }
  }, []);

  /**
   * Trigger manual sync
   */
  const triggerSync = useCallback(
    async (showProgress = true) => {
      if (isSyncing) {
        console.log('[SyncContext] Sync already in progress');
        return;
      }

      if (!isOnline) {
        console.log('[SyncContext] Cannot sync while offline');
        return;
      }

      setIsSyncing(true);
      setSyncError(null);

      try {
        console.log('[SyncContext] Starting manual sync...');

        const result = await syncPendingOperations(
          executeFunctions,
          showProgress
            ? (progress) => {
                console.log('[SyncContext] Sync progress:', progress);
              }
            : null
        );

        if (result.success) {
          setLastSyncTime(new Date());
          console.log('[SyncContext] Sync completed:', result);

          // Update stats after sync
          await updateStats();

          // Cleanup old completed operations
          await cleanupCompletedOperations();
        } else {
          setSyncError(result.error || 'Sync failed');
          console.error('[SyncContext] Sync failed:', result);
        }

        return result;
      } catch (error) {
        setSyncError(error.message);
        console.error('[SyncContext] Sync error:', error);
        return { success: false, error: error.message };
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing, isOnline, executeFunctions, updateStats]
  );

  /**
   * Check for pending operations
   */
  const checkPendingOperations = useCallback(async () => {
    try {
      const hasPending = await hasPendingOperations();
      if (hasPending) {
        await updateStats();
      }
      return hasPending;
    } catch (error) {
      console.error('[SyncContext] Failed to check pending operations:', error);
      return false;
    }
  }, [updateStats]);

  /**
   * Register background sync when operations are queued
   */
  const registerBackgroundSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-offline-queue');
        console.log('[SyncContext] Background sync registered');
      } catch (error) {
        console.error('[SyncContext] Failed to register background sync:', error);
      }
    }
  }, []);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[SyncContext] Network connection restored');
      setIsOnline(true);

      // Register background sync
      await registerBackgroundSync();

      // Auto-sync when coming back online
      if (autoSyncEnabled) {
        const hasPending = await checkPendingOperations();
        if (hasPending) {
          console.log('[SyncContext] Auto-syncing pending operations...');
          setTimeout(() => triggerSync(false), 1000); // Wait 1s before syncing
        }
      }
    };

    const handleOffline = () => {
      console.log('[SyncContext] Network connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSyncEnabled, checkPendingOperations, triggerSync, registerBackgroundSync]);

  /**
   * Listen for service worker sync triggers
   */
  useEffect(() => {
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'TRIGGER_SYNC') {
        console.log('[SyncContext] Received sync trigger from service worker');
        if (isOnline && autoSyncEnabled) {
          triggerSync(false);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [isOnline, autoSyncEnabled, triggerSync]);

  /**
   * Initial stats load and periodic updates
   */
  useEffect(() => {
    updateStats();

    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000);

    return () => clearInterval(interval);
  }, [updateStats]);

  /**
   * Check for pending operations on mount
   */
  useEffect(() => {
    const initCheck = async () => {
      if (isOnline) {
        const hasPending = await checkPendingOperations();
        if (hasPending && autoSyncEnabled) {
          console.log('[SyncContext] Found pending operations on mount, syncing...');
          setTimeout(() => triggerSync(false), 2000); // Wait 2s after mount
        }
      }
    };

    initCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const value = {
    // Network status
    isOnline,

    // Sync status
    isSyncing,
    syncStats,
    lastSyncTime,
    syncError,

    // Settings
    autoSyncEnabled,
    setAutoSyncEnabled,

    // Actions
    triggerSync,
    checkPendingOperations,
    updateStats,

    // Computed values
    hasPendingItems: (syncStats?.pending || 0) > 0 || (syncStats?.retrying || 0) > 0,
    totalPending: (syncStats?.pending || 0) + (syncStats?.retrying || 0),
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
