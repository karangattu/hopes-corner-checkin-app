/**
 * Offline Queue Manager
 * Handles queuing operations when offline and syncing when connection returns
 */

import {
  addToQueue,
  getPendingOperations,
  updateOperationStatus,
  removeFromQueue,
  initDB,
  addFailedOperationWithContext,
  clearOldCompletedOperations,
  type QueueItem,
} from './indexedDB';

const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff in ms
const BATCH_SIZE = 10; // Process 10 operations at a time

export interface SyncResult {
  success: boolean;
  completed: number;
  failed: number;
  remaining: number;
  error?: string;
}

export interface ErrorInfo {
  type: 'network' | 'validation' | 'conflict' | 'permission' | 'unknown';
  userMessage: string;
  action: string;
  severity: 'low' | 'medium' | 'high';
}

type ExecuteFunction = (payload: unknown) => Promise<unknown>;
type ProgressCallback = (progress: { completed: number; total: number }) => void;

/**
 * Classify error for retry logic
 */
const classifyError = (error: Error): ErrorInfo => {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('offline')) {
    return {
      type: 'network',
      userMessage: 'Network error - will retry automatically',
      action: 'retry',
      severity: 'low',
    };
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return {
      type: 'validation',
      userMessage: 'Invalid data - please check and retry',
      action: 'fix',
      severity: 'medium',
    };
  }
  
  if (message.includes('conflict') || message.includes('duplicate')) {
    return {
      type: 'conflict',
      userMessage: 'Data conflict - may already exist',
      action: 'review',
      severity: 'medium',
    };
  }
  
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return {
      type: 'permission',
      userMessage: 'Permission denied',
      action: 'contact_admin',
      severity: 'high',
    };
  }
  
  return {
    type: 'unknown',
    userMessage: 'An unexpected error occurred',
    action: 'retry',
    severity: 'medium',
  };
};

/**
 * Get retry strategy based on error type
 */
const getRetryStrategy = (errorType: ErrorInfo['type']): { shouldRetry: boolean; maxAttempts: number } => {
  switch (errorType) {
    case 'network':
      return { shouldRetry: true, maxAttempts: 5 };
    case 'validation':
      return { shouldRetry: false, maxAttempts: 1 };
    case 'conflict':
      return { shouldRetry: false, maxAttempts: 1 };
    case 'permission':
      return { shouldRetry: false, maxAttempts: 1 };
    default:
      return { shouldRetry: true, maxAttempts: 3 };
  }
};

/**
 * Queue an operation for later execution
 */
export const queueOperation = async (
  operationType: string,
  payload: unknown,
  executeFunc: ExecuteFunction
): Promise<{ success: boolean; queued: boolean; queueId: number; message: string }> => {
  try {
    const operation = {
      operationType,
      payload,
      executeFuncName: executeFunc.name || 'anonymous',
    };

    const id = await addToQueue(operation);
    console.log(`[OfflineQueue] Queued ${operationType} operation with id ${id}`);

    // Register background sync if available
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-offline-queue');
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
 * Process a single operation with retry logic and error classification
 */
const processOperation = async (
  operation: QueueItem,
  executeFunc: ExecuteFunction
): Promise<{ success: boolean; shouldRetry?: boolean; delay?: number; error?: string; errorType?: string; userMessage?: string; maxRetriesReached?: boolean }> => {
  const { id, payload, retryCount, operationType } = operation;

  if (id === undefined) {
    return { success: false, error: 'Operation has no ID' };
  }

  try {
    console.log(`[OfflineQueue] Processing operation ${id} (attempt ${retryCount + 1})`);

    // Execute the operation
    await executeFunc(payload);

    // Mark as completed and remove from queue
    await removeFromQueue(id);
    console.log(`[OfflineQueue] Successfully completed operation ${id}`);

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[OfflineQueue] Operation ${id} failed:`, err);

    // Classify the error
    const errorInfo = classifyError(err);
    const { shouldRetry, maxAttempts } = getRetryStrategy(errorInfo.type);

    console.log(`[OfflineQueue] Error classified as ${errorInfo.type}, retriable: ${shouldRetry}`);

    // Check if we should retry
    if (shouldRetry && retryCount < maxAttempts - 1) {
      // Update status for retry
      await updateOperationStatus(id, 'retrying', err.message);

      // Calculate retry delay with exponential backoff
      const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.log(`[OfflineQueue] Will retry operation ${id} in ${delay}ms (attempt ${retryCount + 1}/${maxAttempts})`);

      return {
        success: false,
        shouldRetry: true,
        delay,
        error: err.message,
      };
    } else {
      // Max retries reached or non-retriable error - move to failed store
      console.error(
        `[OfflineQueue] Operation ${id} failed (${
          shouldRetry ? 'max retries reached' : errorInfo.type
        }): ${err.message}`
      );

      await addFailedOperationWithContext(operation, {
        errorType: errorInfo.type,
        userMessage: errorInfo.userMessage,
        action: errorInfo.action,
        severity: errorInfo.severity,
        retriable: shouldRetry,
        errorDetails: err.message,
      });

      return {
        success: false,
        shouldRetry: false,
        error: err.message,
        errorType: errorInfo.type,
        userMessage: errorInfo.userMessage,
        maxRetriesReached: true,
      };
    }
  }
};

/**
 * Sync all pending operations
 */
export const syncPendingOperations = async (
  executeFunctions: Record<string, ExecuteFunction>,
  onProgress?: ProgressCallback
): Promise<SyncResult> => {
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
        completed: 0,
        failed: 0,
        remaining: 0,
      };
    }

    console.log(`[OfflineQueue] Found ${pendingOps.length} pending operations`);

    let completed = 0;
    let failed = 0;
    const retryQueue: Array<{ operation: QueueItem; delay: number }> = [];

    // Process operations in batches
    for (let i = 0; i < pendingOps.length; i += BATCH_SIZE) {
      const batch = pendingOps.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (operation) => {
          const executeFunc = executeFunctions[operation.operationType];
          
          if (!executeFunc) {
            console.warn(`[OfflineQueue] No execute function for ${operation.operationType}`);
            return { success: false, error: 'No execute function' };
          }

          return processOperation(operation, executeFunc);
        })
      );

      results.forEach((result, index) => {
        if (result.success) {
          completed++;
        } else if (result.shouldRetry) {
          retryQueue.push({
            operation: batch[index],
            delay: result.delay || 1000,
          });
        } else {
          failed++;
        }
      });

      if (onProgress) {
        onProgress({
          completed: completed + failed,
          total: pendingOps.length,
        });
      }
    }

    // Process retry queue with delays
    for (const { operation, delay } of retryQueue) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const executeFunc = executeFunctions[operation.operationType];
      if (executeFunc) {
        const result = await processOperation(operation, executeFunc);
        if (result.success) {
          completed++;
        } else {
          failed++;
        }
      }
    }

    console.log(`[OfflineQueue] Sync complete: ${completed} completed, ${failed} failed`);

    return {
      success: failed === 0,
      completed,
      failed,
      remaining: 0,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[OfflineQueue] Sync failed:', err);
    return {
      success: false,
      completed: 0,
      failed: 0,
      remaining: 0,
      error: err.message,
    };
  }
};

/**
 * Check if there are pending operations
 */
export const hasPendingOperations = async (): Promise<boolean> => {
  try {
    const pending = await getPendingOperations();
    return pending.length > 0;
  } catch (error) {
    console.error('[OfflineQueue] Failed to check pending operations:', error);
    return false;
  }
};

/**
 * Cleanup completed operations older than 24 hours
 */
export const cleanupCompletedOperations = async (): Promise<void> => {
  try {
    const deleted = await clearOldCompletedOperations(24);
    if (deleted > 0) {
      console.log(`[OfflineQueue] Cleaned up ${deleted} old completed operations`);
    }
  } catch (error) {
    console.error('[OfflineQueue] Failed to cleanup operations:', error);
  }
};
