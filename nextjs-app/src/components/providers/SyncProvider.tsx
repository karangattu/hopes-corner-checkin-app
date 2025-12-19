'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  syncPendingOperations, 
  hasPendingOperations, 
  cleanupCompletedOperations 
} from '@/lib/utils/offlineQueueManager';
import { getQueueStats } from '@/lib/utils/indexedDB';

// Types
interface SyncStats {
  pending: number;
  retrying: number;
  completed: number;
  failed: number;
}

interface SyncContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  syncStats: SyncStats;
  lastSyncTime: Date | null;
  syncError: string | null;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
  triggerSync: (showProgress?: boolean) => Promise<SyncResult | undefined>;
  hasPending: boolean;
}

interface SyncResult {
  success: boolean;
  completed?: number;
  failed?: number;
  error?: string;
}

interface SyncProviderProps {
  children: React.ReactNode;
  executeFunctions?: Record<string, (payload: unknown) => Promise<unknown>>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncStatus() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncProvider');
  }
  return context;
}

export function SyncProvider({ children, executeFunctions = {} }: SyncProviderProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    pending: 0,
    retrying: 0,
    completed: 0,
    failed: 0,
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [hasPending, setHasPending] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update queue statistics
  const updateStats = useCallback(async () => {
    try {
      const stats = await getQueueStats();
      if (stats && typeof stats === 'object') {
        setSyncStats(stats);
        setHasPending(stats.pending > 0 || stats.retrying > 0);
      }
    } catch (error) {
      console.error('[SyncProvider] Failed to update stats:', error);
    }
  }, []);

  // Trigger manual sync
  const triggerSync = useCallback(
    async (showProgress = true): Promise<SyncResult | undefined> => {
      if (isSyncing) {
        console.log('[SyncProvider] Sync already in progress');
        return;
      }

      if (!isOnline) {
        console.log('[SyncProvider] Cannot sync while offline');
        return;
      }

      setIsSyncing(true);
      setSyncError(null);

      try {
        console.log('[SyncProvider] Starting manual sync...');

        const result = await syncPendingOperations(
          executeFunctions,
          showProgress
            ? (progress: { completed: number; total: number }) => {
                console.log('[SyncProvider] Sync progress:', progress);
              }
            : undefined
        );

        if (result.success) {
          setLastSyncTime(new Date());
          console.log('[SyncProvider] Sync completed:', result);

          // Update stats after sync
          await updateStats();

          // Cleanup old completed operations
          await cleanupCompletedOperations();
        } else {
          setSyncError(result.error || 'Sync failed');
          console.error('[SyncProvider] Sync failed:', result);
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setSyncError(errorMessage);
        console.error('[SyncProvider] Sync error:', error);
        return { success: false, error: errorMessage };
      } finally {
        setIsSyncing(false);
      }
    },
    [isOnline, isSyncing, executeFunctions, updateStats]
  );

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('[SyncProvider] Network online');
      setIsOnline(true);
      // Trigger sync when coming back online
      if (autoSyncEnabled) {
        triggerSync(false);
      }
    };

    const handleOffline = () => {
      console.log('[SyncProvider] Network offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSyncEnabled, triggerSync]);

  // Auto-sync interval
  useEffect(() => {
    if (!autoSyncEnabled || !isOnline) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Check for pending operations every 30 seconds
    syncIntervalRef.current = setInterval(async () => {
      const hasPendingOps = await hasPendingOperations();
      if (hasPendingOps) {
        triggerSync(false);
      }
    }, 30000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSyncEnabled, isOnline, triggerSync]);

  // Update stats on mount and periodically
  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 10000);
    return () => clearInterval(interval);
  }, [updateStats]);

  // Handle visibility change (sync when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOnline && autoSyncEnabled) {
        updateStats();
        triggerSync(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOnline, autoSyncEnabled, updateStats, triggerSync]);

  const value: SyncContextValue = {
    isOnline,
    isSyncing,
    syncStats,
    lastSyncTime,
    syncError,
    autoSyncEnabled,
    setAutoSyncEnabled,
    triggerSync,
    hasPending,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}
