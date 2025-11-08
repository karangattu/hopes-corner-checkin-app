/**
 * Tests for Error Classification and Failed Operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  classifyError,
  getRetryStrategy,
  isNetworkError,
  formatErrorDetails,
} from '../syncErrorHandler';
import {
  initDB,
  addToQueue,
  getPendingOperations,
  addFailedOperationWithContext,
  getFailedOperations,
  retryFailedOperation,
  deleteFailedOperation,
} from '../indexedDB';

describe('Error Classification (syncErrorHandler)', () => {
  describe('classifyError', () => {
    it('should classify foreign key constraint error as CONFLICT_DELETED', () => {
      const error = new Error('Foreign key constraint violation');
      error.code = '23503';

      const result = classifyError(error, 'ADD_MEAL');

      expect(result.type).toBe('CONFLICT_DELETED');
      expect(result.userMessage).toContain('no longer exists');
      expect(result.retriable).toBe(false);
      expect(result.severity).toBe('medium');
    });

    it('should classify duplicate entry error as CONFLICT_DUPLICATE', () => {
      const error = new Error('Duplicate key value violates unique constraint');
      error.code = 23505;

      const result = classifyError(error, 'ADD_SHOWER');

      expect(result.type).toBe('CONFLICT_DUPLICATE');
      expect(result.userMessage).toContain('already recorded');
      expect(result.retriable).toBe(false);
      expect(result.severity).toBe('low');
    });

    it('should classify 401 as AUTH_EXPIRED', () => {
      const error = new Error('Unauthorized');
      error.status = 401;

      const result = classifyError(error, 'ADD_LAUNDRY');

      expect(result.type).toBe('AUTH_EXPIRED');
      expect(result.userMessage).toContain('session expired');
      expect(result.retriable).toBe(false);
      expect(result.severity).toBe('high');
    });

    it('should classify 403 as PERMISSION_DENIED', () => {
      const error = new Error('Forbidden');
      error.status = 403;

      const result = classifyError(error, 'ADD_BICYCLE');

      expect(result.type).toBe('PERMISSION_DENIED');
      expect(result.userMessage).toContain('permission');
      expect(result.retriable).toBe(false);
      expect(result.severity).toBe('high');
    });

    it('should classify 500+ errors as SERVER_ERROR (retriable)', () => {
      const error = new Error('Internal Server Error');
      error.status = 500;

      const result = classifyError(error, 'ADD_HAIRCUT');

      expect(result.type).toBe('SERVER_ERROR');
      expect(result.retriable).toBe(true);
      expect(result.severity).toBe('medium');
    });

    it('should classify network errors as NETWORK_ERROR (retriable)', () => {
      const error = new Error('Failed to fetch');

      const result = classifyError(error, 'ADD_HOLIDAY');

      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.retriable).toBe(true);
      expect(result.severity).toBe('low');
    });

    it('should classify timeout errors as NETWORK_ERROR', () => {
      const error = new Error('Request timeout');

      const result = classifyError(error, 'ADD_ITEM');

      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.userMessage).toContain('Network error');
      expect(result.retriable).toBe(true);
    });

    it('should classify generic validation errors', () => {
      const error = new Error('Invalid data');
      error.status = 400;

      const result = classifyError(error, 'ADD_DONATION');

      expect(result.type).toBe('VALIDATION_ERROR');
      expect(result.retriable).toBe(false);
    });

    it('should handle unknown errors gracefully', () => {
      const error = new Error('something went wrong');

      const result = classifyError(error, 'UNKNOWN_OP');

      expect(result.type).toBe('UNKNOWN_ERROR');
      expect(result.userMessage).toContain('something went wrong');
      expect(result.severity).toBeDefined();
      expect(result.retriable).toBeDefined();
    });
  });

  describe('getRetryStrategy', () => {
    it('should not retry CONFLICT_DELETED errors', () => {
      const strategy = getRetryStrategy('CONFLICT_DELETED');
      expect(strategy.shouldRetry).toBe(false);
      expect(strategy.maxAttempts).toBe(0);
    });

    it('should not retry CONFLICT_DUPLICATE errors', () => {
      const strategy = getRetryStrategy('CONFLICT_DUPLICATE');
      expect(strategy.shouldRetry).toBe(false);
    });

    it('should not retry AUTH_EXPIRED errors', () => {
      const strategy = getRetryStrategy('AUTH_EXPIRED');
      expect(strategy.shouldRetry).toBe(false);
    });

    it('should retry NETWORK_ERROR', () => {
      const strategy = getRetryStrategy('NETWORK_ERROR');
      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.maxAttempts).toBe(5);
    });

    it('should retry SERVER_ERROR', () => {
      const strategy = getRetryStrategy('SERVER_ERROR');
      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.maxAttempts).toBe(5);
    });

    it('should retry UNKNOWN_ERROR', () => {
      const strategy = getRetryStrategy('UNKNOWN_ERROR');
      expect(strategy.shouldRetry).toBe(true);
    });
  });

  describe('isNetworkError', () => {
    it('should detect network errors', () => {
      const error = new Error('Failed to fetch');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should detect timeout errors', () => {
      const error = new Error('Request timeout');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = new Error('Invalid data');
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('formatErrorDetails', () => {
    it('should format error details correctly', () => {
      const error = new Error('Test error');
      error.code = '123';

      const result = formatErrorDetails(error, 'ADD_MEAL', { guestId: '456' });

      expect(result.operationType).toBe('ADD_MEAL');
      expect(result.errorMessage).toBe('Test error');
      expect(result.errorCode).toBe('123');
      expect(result.timestamp).toBeDefined();
      expect(result.context.guestId).toBe('456');
    });
  });
});

describe('Failed Operations (IndexedDB with Error Context)', () => {
  let db;

  beforeEach(async () => {
    db = await initDB();
  });

  afterEach(async () => {
    if (db) {
      db.close();
    }
    const deleteRequest = indexedDB.deleteDatabase('HopesCornerOfflineDB');
    await new Promise((resolve, reject) => {
      deleteRequest.onsuccess = resolve;
      deleteRequest.onerror = reject;
    });
  });

  describe('addFailedOperationWithContext', () => {
    it('should add failed operation with error context', async () => {
      const operation = {
        operationType: 'ADD_MEAL',
        payload: { guest_id: '123', quantity: 2 },
        retryCount: 5,
      };

      const errorContext = {
        errorType: 'CONFLICT_DELETED',
        userMessage: 'Guest no longer exists',
        action: 'Delete this entry',
        severity: 'medium',
        retriable: false,
      };

      const id = await addFailedOperationWithContext(operation, errorContext);

      expect(id).toBeDefined();

      const failed = await getFailedOperations();
      const addedOp = failed.find((op) => op.id === id);

      expect(addedOp).toBeDefined();
      expect(addedOp.operationType).toBe('ADD_MEAL');
      expect(addedOp.errorType).toBe('CONFLICT_DELETED');
      expect(addedOp.userMessage).toBe('Guest no longer exists');
      expect(addedOp.severity).toBe('medium');
      expect(addedOp.retriable).toBe(false);
    });

    it('should set failedAt timestamp', async () => {
      const operation = {
        operationType: 'ADD_SHOWER',
        payload: { guest_id: '456' },
        retryCount: 5,
      };

      const beforeTime = Date.now();
      const id = await addFailedOperationWithContext(operation, { errorType: 'NETWORK_ERROR' });
      const afterTime = Date.now();

      const failed = await getFailedOperations();
      const addedOp = failed.find((op) => op.id === id);

      expect(addedOp.failedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(addedOp.failedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should store failureCount from retryCount', async () => {
      const operation = {
        operationType: 'ADD_LAUNDRY',
        payload: { guest_id: '789' },
        retryCount: 5,
      };

      const id = await addFailedOperationWithContext(operation, {});

      const failed = await getFailedOperations();
      const addedOp = failed.find((op) => op.id === id);

      expect(addedOp.failureCount).toBe(5);
    });
  });

  describe('retryFailedOperation', () => {
    it('should move failed operation back to queue', async () => {
      // Add to queue, move to failed
      const queueId = await addToQueue({
        operationType: 'ADD_MEAL',
        payload: { guest_id: '123' },
      });

      const operation = (await getPendingOperations()).find((op) => op.id === queueId);
      const failedId = await addFailedOperationWithContext(
        { ...operation, retryCount: 5 },
        { errorType: 'NETWORK_ERROR' }
      );

      // Verify it's in failed store
      let failed = await getFailedOperations();
      expect(failed.some((op) => op.id === failedId)).toBe(true);

      // Retry the operation
      const newQueueId = await retryFailedOperation(failedId);

      // Verify it's back in queue with reset retry count
      const pending = await getPendingOperations();
      const retriedOp = pending.find((op) => op.id === newQueueId);

      expect(retriedOp).toBeDefined();
      expect(retriedOp.retryCount).toBe(0);
      expect(retriedOp.status).toBe('pending');

      // Verify it's removed from failed store
      failed = await getFailedOperations();
      expect(failed.some((op) => op.id === failedId)).toBe(false);
    });

    it('should preserve operation details when retrying', async () => {
      const originalPayload = { guest_id: '123', quantity: 5 };

      const queueId = await addToQueue({
        operationType: 'ADD_DONATION',
        payload: originalPayload,
      });

      const operation = (await getPendingOperations()).find((op) => op.id === queueId);
      const failedId = await addFailedOperationWithContext(operation, {
        errorType: 'SERVER_ERROR',
      });

      const newQueueId = await retryFailedOperation(failedId);
      const retriedOp = (await getPendingOperations()).find((op) => op.id === newQueueId);

      expect(retriedOp.payload).toEqual(originalPayload);
      expect(retriedOp.operationType).toBe('ADD_DONATION');
    });

    it('should throw error if failed operation not found', async () => {
      const nonExistentId = 99999;

      await expect(retryFailedOperation(nonExistentId)).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('deleteFailedOperation', () => {
    it('should delete failed operation permanently', async () => {
      const operation = {
        operationType: 'ADD_HAIRCUT',
        payload: { guest_id: '456' },
        retryCount: 5,
      };

      const id = await addFailedOperationWithContext(operation, {
        errorType: 'CONFLICT_DELETED',
      });

      // Verify it exists
      let failed = await getFailedOperations();
      expect(failed.some((op) => op.id === id)).toBe(true);

      // Delete it
      await deleteFailedOperation(id);

      // Verify it's deleted
      failed = await getFailedOperations();
      expect(failed.some((op) => op.id === id)).toBe(false);
    });
  });

  describe('getFailedOperations', () => {
    it('should return all failed operations', async () => {
      const op1 = {
        operationType: 'ADD_MEAL',
        payload: { guest_id: '1' },
        retryCount: 5,
      };

      const op2 = {
        operationType: 'ADD_SHOWER',
        payload: { guest_id: '2' },
        retryCount: 5,
      };

      await addFailedOperationWithContext(op1, { errorType: 'NETWORK_ERROR' });
      await addFailedOperationWithContext(op2, { errorType: 'CONFLICT_DELETED' });

      const failed = await getFailedOperations();

      expect(failed.length).toBe(2);
      expect(failed.some((op) => op.operationType === 'ADD_MEAL')).toBe(true);
      expect(failed.some((op) => op.operationType === 'ADD_SHOWER')).toBe(true);
    });

    it('should return empty array if no failed operations', async () => {
      const failed = await getFailedOperations();
      expect(failed.length).toBe(0);
    });
  });
});
