/**
 * IndexedDB utility for offline queue storage
 * Handles storing pending operations when offline and retrieving them for sync
 */

const DB_NAME = 'HopesCornerOfflineDB';
const DB_VERSION = 1;
const QUEUE_STORE = 'offlineQueue';
const FAILED_STORE = 'failedOperations';

export interface QueueStats {
  pending: number;
  retrying: number;
  completed: number;
  failed: number;
}

export interface QueueItem {
  id?: number;
  operationType: string;
  payload: unknown;
  executeFuncName: string;
  timestamp: number;
  status: 'pending' | 'retrying' | 'completed' | 'failed';
  retryCount: number;
  createdAt: string;
  lastAttempt?: number;
  lastError?: string;
}

export interface FailedOperation extends QueueItem {
  failureCount: number;
  errorContext?: {
    errorType: string;
    userMessage: string;
    action: string;
    severity: string;
    retriable: boolean;
    errorDetails: string;
  };
}

// Check if IndexedDB is available
const isIndexedDBAvailable = (): boolean => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};

/**
 * Initialize IndexedDB database
 */
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create offline queue store
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('operationType', 'operationType', { unique: false });
        queueStore.createIndex('status', 'status', { unique: false });
      }

      // Create failed operations store (for manual review)
      if (!db.objectStoreNames.contains(FAILED_STORE)) {
        const failedStore = db.createObjectStore(FAILED_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        failedStore.createIndex('timestamp', 'timestamp', { unique: false });
        failedStore.createIndex('failureCount', 'failureCount', { unique: false });
      }
    };
  });
};

/**
 * Add operation to offline queue
 */
export const addToQueue = async (operation: Omit<QueueItem, 'id' | 'timestamp' | 'status' | 'retryCount' | 'createdAt'>): Promise<number> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);

    const queueItem: Omit<QueueItem, 'id'> = {
      ...operation,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    const request = store.add(queueItem);

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      console.error('Failed to add to queue:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Get all pending operations from queue
 */
export const getPendingOperations = async (): Promise<QueueItem[]> => {
  if (!isIndexedDBAvailable()) return [];
  
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(QUEUE_STORE);
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Failed to get pending operations:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Get all operations (for debugging/status display)
 */
export const getAllOperations = async (): Promise<QueueItem[]> => {
  if (!isIndexedDBAvailable()) return [];
  
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Failed to get all operations:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Update operation status
 */
export const updateOperationStatus = async (id: number, status: QueueItem['status'], error: string | null = null): Promise<QueueItem> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const operation = getRequest.result as QueueItem;

      if (!operation) {
        reject(new Error(`Operation with id ${id} not found`));
        return;
      }

      operation.status = status;
      operation.lastAttempt = Date.now();

      if (status === 'retrying') {
        operation.retryCount = (operation.retryCount || 0) + 1;
      }

      if (error) {
        operation.lastError = error;
      }

      const updateRequest = store.put(operation);

      updateRequest.onsuccess = () => {
        resolve(operation);
      };

      updateRequest.onerror = () => {
        reject(updateRequest.error);
      };
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Remove operation from queue
 */
export const removeFromQueue = async (id: number): Promise<void> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to remove from queue:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Add failed operation to failed store
 */
export const addToFailedStore = async (operation: FailedOperation): Promise<number> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FAILED_STORE], 'readwrite');
    const store = transaction.objectStore(FAILED_STORE);

    const failedItem = {
      ...operation,
      timestamp: Date.now(),
      failureCount: 1,
    };

    const request = store.add(failedItem);

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      console.error('Failed to add to failed store:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Add failed operation with context
 */
export const addFailedOperationWithContext = async (
  operation: QueueItem,
  context: FailedOperation['errorContext']
): Promise<number> => {
  // Remove from queue first
  if (operation.id) {
    try {
      await removeFromQueue(operation.id);
    } catch (error) {
      console.warn('[IndexedDB] Failed to remove from queue before adding to failed:', error);
    }
  }

  return addToFailedStore({
    ...operation,
    failureCount: 1,
    errorContext: context,
  });
};

/**
 * Get all failed operations
 */
export const getFailedOperations = async (): Promise<FailedOperation[]> => {
  if (!isIndexedDBAvailable()) return [];
  
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FAILED_STORE], 'readonly');
    const store = transaction.objectStore(FAILED_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Failed to get failed operations:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Remove failed operation
 */
export const removeFromFailedStore = async (id: number): Promise<void> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FAILED_STORE], 'readwrite');
    const store = transaction.objectStore(FAILED_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to remove from failed store:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Clear all failed operations
 */
export const clearFailedOperations = async (): Promise<void> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FAILED_STORE], 'readwrite');
    const store = transaction.objectStore(FAILED_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to clear failed operations:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Get queue statistics
 */
export const getQueueStats = async (): Promise<QueueStats> => {
  if (!isIndexedDBAvailable()) {
    return { pending: 0, retrying: 0, completed: 0, failed: 0 };
  }

  try {
    const [allOps, failedOps] = await Promise.all([
      getAllOperations(),
      getFailedOperations(),
    ]);

    const stats: QueueStats = {
      pending: allOps.filter(op => op.status === 'pending').length,
      retrying: allOps.filter(op => op.status === 'retrying').length,
      completed: allOps.filter(op => op.status === 'completed').length,
      failed: failedOps.length,
    };

    return stats;
  } catch (error) {
    console.error('[IndexedDB] Failed to get queue stats:', error);
    return { pending: 0, retrying: 0, completed: 0, failed: 0 };
  }
};

/**
 * Clear completed operations older than given hours
 */
export const clearOldCompletedOperations = async (hoursOld = 24): Promise<number> => {
  if (!isIndexedDBAvailable()) return 0;
  
  const db = await initDB();
  const cutoffTime = Date.now() - hoursOld * 60 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.getAll();
    let deletedCount = 0;

    request.onsuccess = () => {
      const operations = request.result as QueueItem[];
      const toDelete = operations.filter(
        op => op.status === 'completed' && op.timestamp < cutoffTime
      );

      toDelete.forEach(op => {
        if (op.id) {
          store.delete(op.id);
          deletedCount++;
        }
      });
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
      resolve(deletedCount);
    };
  });
};
