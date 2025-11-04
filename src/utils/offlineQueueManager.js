/**
 * Offline Queue Manager
 * Handles queuing operations when offline and syncing when connection returns
 */

import {
  addToQueue,
  getPendingOperations,
  updateOperationStatus,
  removeFromQueue,
  moveToFailed,
  initDB,
} from './indexedDB';

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff in ms
const BATCH_SIZE = 10; // Process 10 operations at a time

/**
 * Queue an operation for later execution
 */
export const queueOperation = async (operationType, payload, executeFunc) => {
  try {
    const operation = {
      operationType,
      payload,
      executeFuncName: executeFunc.name || 'anonymous',
    };

    const id = await addToQueue(operation);
    console.log(`[OfflineQueue] Queued ${operationType} operation with id ${id}`);

    // Register background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-offline-queue');
        console.log('[OfflineQueue] Background sync registered');
      } catch (error) {
        console.warn('[OfflineQueue] Failed to register background sync:', error);
      }
    }

    return {
      success: true,
      queued: true,
      queueId: id,
      message: 'Operation queued for sync when online',
    };
  } catch (error) {
    console.error('[OfflineQueue] Failed to queue operation:', error);
    throw error;
  }
};

/**
 * Process a single operation with retry logic
 */
const processOperation = async (operation, executeFunc) => {
  const { id, payload, retryCount } = operation;

  try {
    console.log(`[OfflineQueue] Processing operation ${id} (attempt ${retryCount + 1})`);

    // Execute the operation
    const result = await executeFunc(payload);

    // Mark as completed and remove from queue
    await removeFromQueue(id);
    console.log(`[OfflineQueue] Successfully completed operation ${id}`);

    return { success: true, result };
  } catch (error) {
    console.error(`[OfflineQueue] Operation ${id} failed:`, error);

    // Check if we should retry
    if (retryCount < MAX_RETRIES - 1) {
      // Update status for retry
      await updateOperationStatus(id, 'retrying', error.message);

      // Calculate retry delay with exponential backoff
      const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.log(`[OfflineQueue] Will retry operation ${id} in ${delay}ms`);

      return {
        success: false,
        shouldRetry: true,
        delay,
        error: error.message,
      };
    } else {
      // Max retries reached, move to failed store
      console.error(`[OfflineQueue] Operation ${id} failed after ${MAX_RETRIES} attempts`);
      await moveToFailed(operation);

      return {
        success: false,
        shouldRetry: false,
        error: error.message,
        maxRetriesReached: true,
      };
    }
  }
};

/**
 * Sync all pending operations
 */
export const syncPendingOperations = async (executeFunctions, onProgress = null) => {
  console.log('[OfflineQueue] Starting sync of pending operations...');

  try {
    // Initialize DB
    await initDB();

    // Get all pending operations
    const pendingOps = await getPendingOperations();

    if (pendingOps.length === 0) {
      console.log('[OfflineQueue] No pending operations to sync');
      return {
        success: true,
        total: 0,
        synced: 0,
        failed: 0,
        pending: 0,
      };
    }

    console.log(`[OfflineQueue] Found ${pendingOps.length} pending operations`);

    const results = {
      total: pendingOps.length,
      synced: 0,
      failed: 0,
      pending: 0,
      errors: [],
    };

    // Process operations in batches
    for (let i = 0; i < pendingOps.length; i += BATCH_SIZE) {
      const batch = pendingOps.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      await Promise.allSettled(
        batch.map(async (operation) => {
          const { operationType } = operation;
          const executeFunc = executeFunctions[operationType];

          if (!executeFunc) {
            console.error(
              `[OfflineQueue] No execution function found for ${operationType}`
            );
            results.failed++;
            results.errors.push({
              operation,
              error: 'No execution function found',
            });
            return;
          }

          const result = await processOperation(operation, executeFunc);

          if (result.success) {
            results.synced++;
          } else if (result.shouldRetry) {
            results.pending++;
            // Schedule retry after delay
            setTimeout(() => {
              processOperation(operation, executeFunc);
            }, result.delay);
          } else {
            results.failed++;
            results.errors.push({
              operation,
              error: result.error,
            });
          }

          // Call progress callback
          if (onProgress) {
            onProgress({
              current: results.synced + results.failed,
              total: results.total,
              operation,
              success: result.success,
            });
          }
        })
      );
    }

    console.log('[OfflineQueue] Sync completed:', results);
    return { success: true, ...results };
  } catch (error) {
    console.error('[OfflineQueue] Sync failed:', error);
    return {
      success: false,
      error: error.message,
      total: 0,
      synced: 0,
      failed: 0,
      pending: 0,
    };
  }
};

/**
 * Execute operation with offline fallback
 * Tries to execute immediately, queues if offline or fails
 */
export const executeWithOfflineFallback = async (
  operationType,
  payload,
  executeFunc,
  isOnline = navigator.onLine
) => {
  // Check if online
  if (!isOnline) {
    console.log(`[OfflineQueue] Offline - queuing ${operationType} operation`);
    return queueOperation(operationType, payload, executeFunc);
  }

  // Try to execute immediately
  try {
    const result = await executeFunc(payload);
    return {
      success: true,
      queued: false,
      result,
      message: 'Operation completed successfully',
    };
  } catch (error) {
    console.error(`[OfflineQueue] Failed to execute ${operationType}:`, error);

    // Check if it's a network error
    const isNetworkError =
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.code === 'PGRST301' || // Supabase connection error
      error.code === 'ECONNREFUSED';

    if (isNetworkError) {
      console.log(
        `[OfflineQueue] Network error detected - queuing ${operationType} operation`
      );
      return queueOperation(operationType, payload, executeFunc);
    }

    // If it's not a network error, throw it
    throw error;
  }
};

/**
 * Retry a specific failed operation manually
 */
export const retryOperation = async (operation, executeFunc) => {
  console.log(`[OfflineQueue] Manually retrying operation ${operation.id}`);

  try {
    // Reset retry count
    operation.retryCount = 0;
    await updateOperationStatus(operation.id, 'pending');

    // Process the operation
    const result = await processOperation(operation, executeFunc);

    return result;
  } catch (error) {
    console.error(`[OfflineQueue] Manual retry failed:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Clear old completed operations (call periodically for cleanup)
 */
export const cleanupCompletedOperations = async (maxAgeMs = 24 * 60 * 60 * 1000) => {
  try {
    const db = await initDB();
    const transaction = db.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    const index = store.index('status');
    const request = index.openCursor('completed');

    const now = Date.now();
    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const operation = cursor.value;
        if (now - operation.timestamp > maxAgeMs) {
          cursor.delete();
          deletedCount++;
        }
        cursor.continue();
      }
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        console.log(`[OfflineQueue] Cleaned up ${deletedCount} completed operations`);
        resolve(deletedCount);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[OfflineQueue] Cleanup failed:', error);
    return 0;
  }
};

/**
 * Check if there are pending operations
 */
export const hasPendingOperations = async () => {
  try {
    const pendingOps = await getPendingOperations();
    return pendingOps.length > 0;
  } catch (error) {
    console.error('[OfflineQueue] Failed to check pending operations:', error);
    return false;
  }
};
