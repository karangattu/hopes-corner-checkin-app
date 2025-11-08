/**
 * IndexedDB utility for offline queue storage
 * Handles storing pending operations when offline and retrieving them for sync
 */

const DB_NAME = 'HopesCornerOfflineDB';
const DB_VERSION = 1;
const QUEUE_STORE = 'offlineQueue';
const FAILED_STORE = 'failedOperations';

/**
 * Initialize IndexedDB database
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

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
export const addToQueue = async (operation) => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);

    const queueItem = {
      ...operation,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    const request = store.add(queueItem);

    request.onsuccess = () => {
      resolve(request.result); // Returns the auto-generated ID
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
export const getPendingOperations = async () => {
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
export const getAllOperations = async () => {
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
export const updateOperationStatus = async (id, status, error = null) => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const operation = getRequest.result;

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
export const removeFromQueue = async (id) => {
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
 * Move operation to failed store (after max retries)
 */
export const moveToFailed = async (operation) => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE, FAILED_STORE], 'readwrite');
    const queueStore = transaction.objectStore(QUEUE_STORE);
    const failedStore = transaction.objectStore(FAILED_STORE);

    // Add to failed store
    const failedItem = {
      ...operation,
      failedAt: Date.now(),
      failureCount: operation.retryCount || 0,
    };

    const addRequest = failedStore.add(failedItem);

    addRequest.onsuccess = () => {
      // Remove from queue store
      const deleteRequest = queueStore.delete(operation.id);

      deleteRequest.onsuccess = () => {
        resolve();
      };

      deleteRequest.onerror = () => {
        reject(deleteRequest.error);
      };
    };

    addRequest.onerror = () => {
      reject(addRequest.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Get failed operations (for manual review/retry)
 */
export const getFailedOperations = async () => {
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
 * Clear all completed operations (cleanup)
 */
export const clearCompletedOperations = async () => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE);
    const index = store.index('status');
    const request = index.openCursor('completed');

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
};

/**
 * Get queue statistics
 */
export const getQueueStats = async () => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE, FAILED_STORE], 'readonly');
    const queueStore = transaction.objectStore(QUEUE_STORE);
    const failedStore = transaction.objectStore(FAILED_STORE);

    const stats = {
      pending: 0,
      retrying: 0,
      completed: 0,
      failed: 0,
    };

    const queueRequest = queueStore.getAll();

    queueRequest.onsuccess = () => {
      const operations = queueRequest.result;
      operations.forEach((op) => {
        if (stats[op.status] !== undefined) {
          stats[op.status]++;
        }
      });

      const failedRequest = failedStore.count();

      failedRequest.onsuccess = () => {
        stats.failed = failedRequest.result;
        resolve(stats);
      };

      failedRequest.onerror = () => {
        reject(failedRequest.error);
      };
    };

    queueRequest.onerror = () => {
      reject(queueRequest.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Add failed operation with error context
 * @param {object} operation - The failed operation with error details
 * @param {object} errorContext - Error classification and details
 */
export const addFailedOperationWithContext = async (operation, errorContext = {}) => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FAILED_STORE], 'readwrite');
    const store = transaction.objectStore(FAILED_STORE);

    const failedItem = {
      ...operation,
      failedAt: Date.now(),
      failureCount: operation.retryCount || 0,
      ...errorContext, // Include error type, user message, severity, etc.
    };

    const request = store.add(failedItem);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Failed to add to failed operations store:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Retry a failed operation by moving it back to the queue
 * @param {number} failedOperationId - ID of the failed operation
 */
export const retryFailedOperation = async (failedOperationId) => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FAILED_STORE, QUEUE_STORE], 'readwrite');
    const failedStore = transaction.objectStore(FAILED_STORE);
    const queueStore = transaction.objectStore(QUEUE_STORE);

    const getRequest = failedStore.get(failedOperationId);

    getRequest.onsuccess = () => {
      const failedOp = getRequest.result;

      if (!failedOp) {
        reject(new Error(`Failed operation with id ${failedOperationId} not found`));
        return;
      }

      // Create new queue item with reset retry count
      const queueItem = {
        operationType: failedOp.operationType,
        payload: failedOp.payload,
        executeFuncName: failedOp.executeFuncName,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        createdAt: new Date().toISOString(),
      };

      const addRequest = queueStore.add(queueItem);

      addRequest.onsuccess = () => {
        // Remove from failed store
        const deleteRequest = failedStore.delete(failedOperationId);

        deleteRequest.onsuccess = () => {
          resolve(addRequest.result);
        };

        deleteRequest.onerror = () => {
          reject(deleteRequest.error);
        };
      };

      addRequest.onerror = () => {
        reject(addRequest.error);
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
 * Delete a failed operation permanently
 * @param {number} failedOperationId - ID of the failed operation
 */
export const deleteFailedOperation = async (failedOperationId) => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FAILED_STORE], 'readwrite');
    const store = transaction.objectStore(FAILED_STORE);
    const request = store.delete(failedOperationId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to delete failed operation:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};
