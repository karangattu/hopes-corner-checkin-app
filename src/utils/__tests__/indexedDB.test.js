/**
 * Tests for IndexedDB utility functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDB,
  addToQueue,
  getPendingOperations,
  getAllOperations,
  updateOperationStatus,
  removeFromQueue,
  moveToFailed,
  getFailedOperations,
  clearCompletedOperations,
  getQueueStats,
} from '../indexedDB';

describe('IndexedDB Utilities', () => {
  let db;

  beforeEach(async () => {
    // Initialize a fresh database for each test
    db = await initDB();
  });

  afterEach(async () => {
    // Clean up database after each test
    if (db) {
      db.close();
    }
    // Delete the database
    const deleteRequest = indexedDB.deleteDatabase('HopesCornerOfflineDB');
    await new Promise((resolve, reject) => {
      deleteRequest.onsuccess = resolve;
      deleteRequest.onerror = reject;
    });
  });

  describe('initDB', () => {
    it('should initialize database successfully', async () => {
      expect(db).toBeDefined();
      expect(db.name).toBe('HopesCornerOfflineDB');
    });

    it('should create required object stores', async () => {
      const storeNames = Array.from(db.objectStoreNames);
      expect(storeNames).toContain('offlineQueue');
      expect(storeNames).toContain('failedOperations');
    });
  });

  describe('addToQueue', () => {
    it('should add operation to queue', async () => {
      const operation = {
        operationType: 'ADD_MEAL',
        payload: { guest_id: '123', quantity: 2 },
      };

      const id = await addToQueue(operation);

      expect(id).toBeDefined();
      expect(typeof id).toBe('number');
    });

    it('should add timestamp and status automatically', async () => {
      const operation = {
        operationType: 'ADD_SHOWER',
        payload: { guest_id: '456' },
      };

      const id = await addToQueue(operation);
      const operations = await getAllOperations();
      const addedOp = operations.find((op) => op.id === id);

      expect(addedOp.timestamp).toBeDefined();
      expect(addedOp.status).toBe('pending');
      expect(addedOp.retryCount).toBe(0);
      expect(addedOp.createdAt).toBeDefined();
    });
  });

  describe('getPendingOperations', () => {
    it('should return only pending operations', async () => {
      // Add pending operation
      await addToQueue({
        operationType: 'ADD_MEAL',
        payload: { guest_id: '1' },
      });

      // Add and complete another operation
      const id2 = await addToQueue({
        operationType: 'ADD_SHOWER',
        payload: { guest_id: '2' },
      });
      await updateOperationStatus(id2, 'completed');

      const pending = await getPendingOperations();

      expect(pending.length).toBe(1);
      expect(pending[0].status).toBe('pending');
      expect(pending[0].operationType).toBe('ADD_MEAL');
    });

    it('should return empty array when no pending operations', async () => {
      const pending = await getPendingOperations();
      expect(pending).toEqual([]);
    });
  });

  describe('getAllOperations', () => {
    it('should return all operations regardless of status', async () => {
      await addToQueue({
        operationType: 'ADD_MEAL',
        payload: { guest_id: '1' },
      });

      const id2 = await addToQueue({
        operationType: 'ADD_SHOWER',
        payload: { guest_id: '2' },
      });
      await updateOperationStatus(id2, 'completed');

      const all = await getAllOperations();

      expect(all.length).toBe(2);
    });
  });

  describe('updateOperationStatus', () => {
    it('should update operation status', async () => {
      const id = await addToQueue({
        operationType: 'ADD_LAUNDRY',
        payload: { guest_id: '789' },
      });

      await updateOperationStatus(id, 'retrying');

      const operations = await getAllOperations();
      const updated = operations.find((op) => op.id === id);

      expect(updated.status).toBe('retrying');
      expect(updated.lastAttempt).toBeDefined();
    });

    it('should increment retry count when status is retrying', async () => {
      const id = await addToQueue({
        operationType: 'ADD_MEAL',
        payload: { guest_id: '123' },
      });

      await updateOperationStatus(id, 'retrying');
      await updateOperationStatus(id, 'retrying');

      const operations = await getAllOperations();
      const updated = operations.find((op) => op.id === id);

      expect(updated.retryCount).toBe(2);
    });

    it('should store error message when provided', async () => {
      const id = await addToQueue({
        operationType: 'ADD_SHOWER',
        payload: { guest_id: '456' },
      });

      await updateOperationStatus(id, 'retrying', 'Network error');

      const operations = await getAllOperations();
      const updated = operations.find((op) => op.id === id);

      expect(updated.lastError).toBe('Network error');
    });
  });

  describe('removeFromQueue', () => {
    it('should remove operation from queue', async () => {
      const id = await addToQueue({
        operationType: 'ADD_MEAL',
        payload: { guest_id: '123' },
      });

      await removeFromQueue(id);

      const operations = await getAllOperations();
      expect(operations.find((op) => op.id === id)).toBeUndefined();
    });
  });

  describe('moveToFailed', () => {
    it('should move operation to failed store', async () => {
      const id = await addToQueue({
        operationType: 'ADD_LAUNDRY',
        payload: { guest_id: '789' },
      });

      const operations = await getAllOperations();
      const operation = operations.find((op) => op.id === id);

      await moveToFailed(operation);

      // Should be removed from queue
      const queueOps = await getAllOperations();
      expect(queueOps.find((op) => op.id === id)).toBeUndefined();

      // Should be in failed store
      const failedOps = await getFailedOperations();
      expect(failedOps.length).toBe(1);
      expect(failedOps[0].operationType).toBe('ADD_LAUNDRY');
    });

    it('should add failed metadata', async () => {
      const id = await addToQueue({
        operationType: 'ADD_SHOWER',
        payload: { guest_id: '456' },
      });

      // Update retry count
      await updateOperationStatus(id, 'retrying');
      await updateOperationStatus(id, 'retrying');

      const operations = await getAllOperations();
      const operation = operations.find((op) => op.id === id);

      await moveToFailed(operation);

      const failedOps = await getFailedOperations();
      const failed = failedOps[0];

      expect(failed.failedAt).toBeDefined();
      expect(failed.failureCount).toBe(2);
    });
  });

  describe('getFailedOperations', () => {
    it('should return all failed operations', async () => {
      const id1 = await addToQueue({
        operationType: 'ADD_MEAL',
        payload: { guest_id: '1' },
      });
      const id2 = await addToQueue({
        operationType: 'ADD_SHOWER',
        payload: { guest_id: '2' },
      });

      const ops = await getAllOperations();
      await moveToFailed(ops.find((op) => op.id === id1));
      await moveToFailed(ops.find((op) => op.id === id2));

      const failed = await getFailedOperations();

      expect(failed.length).toBe(2);
    });
  });

  describe('clearCompletedOperations', () => {
    it('should remove only completed operations', async () => {
      // Add pending
      await addToQueue({
        operationType: 'ADD_MEAL',
        payload: { guest_id: '1' },
      });

      // Add completed
      const id2 = await addToQueue({
        operationType: 'ADD_SHOWER',
        payload: { guest_id: '2' },
      });
      await updateOperationStatus(id2, 'completed');

      await clearCompletedOperations();

      const remaining = await getAllOperations();
      expect(remaining.length).toBe(1);
      expect(remaining[0].status).toBe('pending');
    });
  });

  describe('getQueueStats', () => {
    it('should return accurate statistics', async () => {
      // Add pending
      await addToQueue({
        operationType: 'ADD_MEAL',
        payload: { guest_id: '1' },
      });

      // Add retrying
      const id2 = await addToQueue({
        operationType: 'ADD_SHOWER',
        payload: { guest_id: '2' },
      });
      await updateOperationStatus(id2, 'retrying');

      // Add completed
      const id3 = await addToQueue({
        operationType: 'ADD_LAUNDRY',
        payload: { guest_id: '3' },
      });
      await updateOperationStatus(id3, 'completed');

      // Add failed
      const id4 = await addToQueue({
        operationType: 'ADD_MEAL',
        payload: { guest_id: '4' },
      });
      const ops = await getAllOperations();
      await moveToFailed(ops.find((op) => op.id === id4));

      const stats = await getQueueStats();

      expect(stats.pending).toBe(1);
      expect(stats.retrying).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should return zero stats for empty queue', async () => {
      const stats = await getQueueStats();

      expect(stats.pending).toBe(0);
      expect(stats.retrying).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });
});
