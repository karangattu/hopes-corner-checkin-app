import { useState, useEffect, useCallback, useRef } from 'react';

const SYNC_INTERVALS = {
  CRITICAL: 60000,
  STANDARD: 300000,
  LOW_PRIORITY: 900000,
};

const SMART_SYNC_EVENTS = {
  USER_ACTION: 2000,
  TAB_FOCUS: 5000,
  MANUAL_ONLY: ['donations', 'bicycles', 'holidays', 'haircuts'],
};

const isBusinessHours = () => {
  const hour = new Date().getHours();
  return hour >= 6 && hour <= 20;
};

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
};

const getWeekAgo = () => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  return weekAgo.toISOString();
};

class QuotaManager {
  constructor() {
    this.dailyReads = parseInt(localStorage.getItem('supabase_daily_reads') || '0');
    this.lastReset = localStorage.getItem('supabase_last_reset');
    this.DAILY_LIMIT = 250000;
    this.resetIfNewDay();
  }

  resetIfNewDay() {
    const today = new Date().toDateString();
    if (this.lastReset !== today) {
      this.dailyReads = 0;
      this.lastReset = today;
      localStorage.setItem('supabase_daily_reads', '0');
      localStorage.setItem('supabase_last_reset', today);
    }
  }

  recordRead(count = 1) {
    this.dailyReads += count;
    localStorage.setItem('supabase_daily_reads', this.dailyReads.toString());
  }

  shouldSync(priority = 'normal') {
    this.resetIfNewDay();
    if (this.dailyReads > this.DAILY_LIMIT * 0.8) {
      console.warn(`Approaching quota limit: ${this.dailyReads}/${this.DAILY_LIMIT}`);
      return priority === 'critical';
    }
    return true;
  }

  getRemainingQuota() {
    return Math.max(0, this.DAILY_LIMIT - this.dailyReads);
  }
}

const globalQuotaManager = new QuotaManager();

class SyncManager {
  constructor() {
    this.activeListeners = new Map();
    this.syncQueue = new Map();
    this.lastSync = new Map();
    this.syncInterval = SYNC_INTERVALS.STANDARD;
    this.batchSize = 3;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.tabVisible = typeof document !== 'undefined' ? !document.hidden : true;
    this.setupNetworkListeners();
    this.setupVisibilityListener();

    this.collectionConfig = {
      guests: { interval: SYNC_INTERVALS.CRITICAL, priority: 'critical', businessHours: false },
      meals: { interval: SYNC_INTERVALS.STANDARD, priority: 'normal', businessHours: true },
      showers: { interval: SYNC_INTERVALS.STANDARD, priority: 'normal', businessHours: true },
      laundry: { interval: SYNC_INTERVALS.STANDARD, priority: 'normal', businessHours: true },
      itemsGiven: { interval: SYNC_INTERVALS.LOW_PRIORITY, priority: 'low', businessHours: false },
      donations: { interval: 0, priority: 'manual', businessHours: false },
      bicycles: { interval: 0, priority: 'manual', businessHours: false },
      holidays: { interval: 0, priority: 'manual', businessHours: false },
      haircuts: { interval: 0, priority: 'manual', businessHours: false },
      rvMeals: { interval: SYNC_INTERVALS.LOW_PRIORITY, priority: 'low', businessHours: true },
      unitedEffortMeals: { interval: SYNC_INTERVALS.LOW_PRIORITY, priority: 'low', businessHours: true },
      extraMeals: { interval: SYNC_INTERVALS.LOW_PRIORITY, priority: 'low', businessHours: true },
      dayWorkerMeals: { interval: SYNC_INTERVALS.LOW_PRIORITY, priority: 'low', businessHours: true },
      lunchBags: { interval: SYNC_INTERVALS.LOW_PRIORITY, priority: 'low', businessHours: true },
    };
  }

  setupNetworkListeners() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.resumeSync();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.pauseSync();
    });
  }

  setupVisibilityListener() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      this.tabVisible = !document.hidden;
      if (this.tabVisible && this.isOnline) {
        setTimeout(() => this.triggerTabFocusSync(), SMART_SYNC_EVENTS.TAB_FOCUS);
      }
    });
  }

  triggerTabFocusSync() {
    const criticalCollections = ['guests', 'meals', 'showers', 'laundry'];
    criticalCollections.forEach((collectionName) => {
      this.lastSync.set(collectionName, 0);
    });
    console.log('Tab focus sync triggered for critical collections');
  }

  shouldSync(collectionName) {
    if (!this.isOnline || !this.tabVisible) return false;

    const config = this.collectionConfig[collectionName];
    if (!config) return false;
    if (config.priority === 'manual') return false;

    if (!globalQuotaManager.shouldSync(config.priority)) return false;
    if (config.businessHours && !isBusinessHours()) return false;

    const lastSync = this.lastSync.get(collectionName) || 0;
    const interval = config.interval || this.syncInterval;
    return Date.now() - lastSync > interval;
  }

  markSynced(collectionName) {
    this.lastSync.set(collectionName, Date.now());
  }

  pauseSync() {
    this.activeListeners.forEach((unsubscribe) => unsubscribe?.());
    this.activeListeners.clear();
  }

  resumeSync() {
    this.syncQueue.forEach((_, collectionName) => {
      this.lastSync.set(collectionName, 0);
    });
  }
}

const globalSyncManager = new SyncManager();

const COLLECTION_FILTERS = {
  guests: null,
  meals: { dateField: 'date', since: getToday(), limit: 50, orderBy: 'date' },
  showers: { dateField: 'date', since: getToday(), limit: 30, orderBy: 'date' },
  laundry: { dateField: 'date', since: getToday(), limit: 30, orderBy: 'date' },
  itemsGiven: { dateField: 'date', since: getWeekAgo(), limit: 100, orderBy: 'date' },
  donations: { dateField: 'date', since: getWeekAgo(), limit: 50, orderBy: 'date' },
  bicycles: { dateField: 'date', since: getToday(), limit: 20, orderBy: 'date' },
  holidays: { dateField: 'date', since: getToday(), limit: 20, orderBy: 'date' },
  haircuts: { dateField: 'date', since: getToday(), limit: 20, orderBy: 'date' },
  rvMeals: { dateField: 'date', since: getToday(), limit: 20, orderBy: 'date' },
  unitedEffortMeals: { dateField: 'date', since: getToday(), limit: 20, orderBy: 'date' },
  extraMeals: { dateField: 'date', since: getToday(), limit: 20, orderBy: 'date' },
  dayWorkerMeals: { dateField: 'date', since: getToday(), limit: 20, orderBy: 'date' },
  lunchBags: { dateField: 'date', since: getToday(), limit: 20, orderBy: 'date' },
};

const normalizeRow = (row) => {
  if (!row) return row;
  const fallbackTimestamp = row.lastUpdated || row.updatedAt || row.date || row.createdAt || new Date().toISOString();
  return {
    ...row,
    docId: row.docId || row.id,
    id: row.id ?? row.docId,
    lastUpdated: row.lastUpdated || row.updatedAt || fallbackTimestamp,
  };
};

const fetchCollection = async (client, tableName) => {
  const filter = COLLECTION_FILTERS[tableName];
  let builder = client.from(tableName).select('*');

  if (filter?.dateField && filter?.since) {
    builder = builder.gte(filter.dateField, filter.since);
  }

  const sortField = filter?.orderBy || filter?.dateField || 'createdAt';
  builder = builder.order(sortField, { ascending: false, nullsLast: true });

  if (filter?.limit) {
    builder = builder.limit(filter.limit);
  } else {
    builder = builder.limit(500);
  }

  const { data, error } = await builder;
  if (error) throw error;
  return data || [];
};

export const useSupabaseSync = (client, tableName, setState, enabled = true) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const syncTimeoutRef = useRef(null);
  const isActiveRef = useRef(true);

  const syncCollection = useCallback(async () => {
    if (!enabled || !client || !isActiveRef.current) return;
    if (!globalSyncManager.shouldSync(tableName)) return;

    try {
      const rows = await fetchCollection(client, tableName);
      globalQuotaManager.recordRead(rows.length);

      console.log(`[${tableName}] Synced ${rows.length} rows (${globalQuotaManager.getRemainingQuota()} quota remaining)`);

      setIsConnected(true);
      setError(null);
      globalSyncManager.markSynced(tableName);

      const normalizedRows = rows.map(normalizeRow);
      setState(normalizedRows);

      try {
        localStorage.setItem(`hopes-corner-${tableName}`, JSON.stringify(normalizedRows));
        localStorage.setItem(`hopes-corner-${tableName}-lastSync`, Date.now().toString());
      } catch (cacheError) {
        console.warn(`Failed to cache ${tableName}:`, cacheError);
      }
    } catch (syncError) {
      console.error(`Sync error for ${tableName}:`, syncError);
      setError(syncError.message);

      try {
        const cached = localStorage.getItem(`hopes-corner-${tableName}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          setState(cachedData);
          console.log(`[${tableName}] Loaded ${cachedData.length} items from cache`);
        }
      } catch (fallbackError) {
        console.error(`Cache fallback failed for ${tableName}:`, fallbackError);
      }
    }
  }, [client, enabled, tableName, setState]);

  const scheduleNextSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    const baseInterval = globalSyncManager.syncInterval;
    const jitter = Math.random() * 10000;
    const interval = baseInterval + jitter;

    syncTimeoutRef.current = setTimeout(() => {
      if (globalSyncManager.shouldSync(tableName)) {
        syncCollection().then(() => {
          if (isActiveRef.current) {
            scheduleNextSync();
          }
        });
      } else {
        scheduleNextSync();
      }
    }, interval);
  }, [syncCollection, tableName]);

  useEffect(() => {
    if (!enabled || !client) {
      setIsConnected(false);
      return;
    }

    isActiveRef.current = true;
    globalSyncManager.syncQueue.set(tableName, setState);

    const loadInitial = async () => {
      try {
        const cached = localStorage.getItem(`hopes-corner-${tableName}`);
        const lastSync = localStorage.getItem(`hopes-corner-${tableName}-lastSync`);

        if (cached) {
          const cachedData = JSON.parse(cached);
          setState(cachedData);
          console.log(`[${tableName}] Loaded ${cachedData.length} items from cache`);
        }

        const cacheAge = lastSync ? Date.now() - parseInt(lastSync, 10) : Infinity;
        if (cacheAge > globalSyncManager.syncInterval) {
          await syncCollection();
        }

        scheduleNextSync();
      } catch (loadError) {
        console.error(`Initial load failed for ${tableName}:`, loadError);
        await syncCollection();
        scheduleNextSync();
      }
    };

    loadInitial();

    return () => {
      isActiveRef.current = false;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      globalSyncManager.syncQueue.delete(tableName);
      setIsConnected(false);
    };
  }, [client, enabled, scheduleNextSync, setState, syncCollection, tableName]);

  const triggerSync = useCallback(async () => {
    if (enabled && client) {
      await syncCollection();
    }
  }, [client, enabled, syncCollection]);

  return {
    triggerSync,
    isConnected,
    error,
  };
};

export const useSupabaseConnectionStatus = (client, enabled, tableName = 'guests') => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !client) {
      setIsConnected(false);
      return;
    }

    let cancelled = false;

    const checkConnection = async () => {
      try {
        const { error } = await client
          .from(tableName)
          .select('id', { head: true, count: 'exact' })
          .limit(1);
        if (!cancelled) {
          setIsConnected(!error);
        }
      } catch {
        if (!cancelled) {
          setIsConnected(false);
        }
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client, enabled, tableName]);

  return isConnected;
};

export const mergeByNewest = (local, remote) => {
  const combined = [...local, ...remote];
  const uniqueById = new Map();

  combined.forEach((item) => {
    const existing = uniqueById.get(item.id);
    const itemTimestamp = new Date(item.lastUpdated || item.createdAt || item.date || 0);
    const existingTimestamp = existing
      ? new Date(existing.lastUpdated || existing.createdAt || existing.date || 0)
      : new Date(0);
    if (!existing || itemTimestamp > existingTimestamp) {
      uniqueById.set(item.id, item);
    }
  });

  return Array.from(uniqueById.values()).sort(
    (a, b) => new Date(b.createdAt || b.date || b.lastUpdated) - new Date(a.createdAt || a.date || a.lastUpdated),
  );
};

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  return isOnline;
};

export const useSyncTrigger = () => {
  const [isSyncing, setIsSyncing] = useState(false);

  const triggerGlobalSync = useCallback(async () => {
    if (isSyncing || !globalSyncManager.isOnline) return;

    setIsSyncing(true);

    try {
      globalSyncManager.syncQueue.forEach((_, collectionName) => {
        globalSyncManager.lastSync.set(collectionName, 0);
      });
      console.log('Triggered manual sync for all collections');
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  return { triggerGlobalSync, isSyncing };
};

export { globalSyncManager };
