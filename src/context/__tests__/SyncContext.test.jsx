/**
 * Tests for Sync Context
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SyncProvider, useSyncStatus } from '../SyncContext';
import { useOnlineStatus, useHasPendingSync } from '../useSyncStatus';

// Mock the offline queue manager
vi.mock('../../utils/offlineQueueManager', () => ({
  syncPendingOperations: vi.fn().mockResolvedValue({
    success: true,
    total: 0,
    synced: 0,
    failed: 0,
    pending: 0,
  }),
  hasPendingOperations: vi.fn().mockResolvedValue(false),
  cleanupCompletedOperations: vi.fn().mockResolvedValue(0),
}));

vi.mock('../../utils/indexedDB', () => ({
  getQueueStats: vi.fn().mockResolvedValue({
    pending: 0,
    retrying: 0,
    completed: 0,
    failed: 0,
  }),
}));

// Test component that uses the hook
function TestComponent() {
  const {
    isOnline,
    isSyncing,
    hasPendingItems,
    totalPending,
    triggerSync,
  } = useSyncStatus();

  return (
    <div>
      <div data-testid="online-status">{isOnline ? 'online' : 'offline'}</div>
      <div data-testid="syncing-status">{isSyncing ? 'syncing' : 'idle'}</div>
      <div data-testid="pending-count">{totalPending}</div>
      <div data-testid="has-pending">{hasPendingItems ? 'yes' : 'no'}</div>
      <button onClick={() => triggerSync()}>Sync</button>
    </div>
  );
}

function OnlineStatusTestComponent() {
  const isOnline = useOnlineStatus();
  return <div data-testid="online">{isOnline ? 'online' : 'offline'}</div>;
}

function PendingSyncTestComponent() {
  const { hasPendingItems, totalPending } = useHasPendingSync();
  return (
    <div>
      <div data-testid="has-pending">{hasPendingItems ? 'yes' : 'no'}</div>
      <div data-testid="total">{totalPending}</div>
    </div>
  );
}

describe('SyncContext', () => {
  const mockExecuteFunctions = {
    ADD_MEAL: vi.fn(),
    ADD_SHOWER: vi.fn(),
    ADD_LAUNDRY: vi.fn(),
  };

  beforeEach(async () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    vi.clearAllMocks();

    // Re-import and reset mocks to ensure clean state
    const { syncPendingOperations } = await import('../../utils/offlineQueueManager');
    syncPendingOperations.mockResolvedValue({
      success: true,
      total: 0,
      synced: 0,
      failed: 0,
      pending: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SyncProvider', () => {
    it('should render children', () => {
      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <div data-testid="child">Child Content</div>
        </SyncProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide sync context', () => {
      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <TestComponent />
        </SyncProvider>
      );

      expect(screen.getByTestId('online-status')).toHaveTextContent('online');
      expect(screen.getByTestId('syncing-status')).toHaveTextContent('idle');
    });
  });

  describe('useSyncStatus', () => {
    it('should provide initial online status', () => {
      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <TestComponent />
        </SyncProvider>
      );

      expect(screen.getByTestId('online-status')).toHaveTextContent('online');
    });

    it('should detect offline status', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <TestComponent />
        </SyncProvider>
      );

      expect(screen.getByTestId('online-status')).toHaveTextContent('offline');
    });

    it('should provide sync statistics', () => {
      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <TestComponent />
        </SyncProvider>
      );

      expect(screen.getByTestId('pending-count')).toHaveTextContent('0');
      expect(screen.getByTestId('has-pending')).toHaveTextContent('no');
    });

    it('should trigger manual sync', async () => {
      const { syncPendingOperations } = await import('../../utils/offlineQueueManager');

      // Ensure mock returns proper result
      syncPendingOperations.mockResolvedValue({
        success: true,
        total: 0,
        synced: 0,
        failed: 0,
        pending: 0,
      });

      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <TestComponent />
        </SyncProvider>
      );

      const syncButton = screen.getByText('Sync');

      await act(async () => {
        syncButton.click();
      });

      await waitFor(() => {
        expect(syncPendingOperations).toHaveBeenCalled();
      });
    });

    it('should handle online event', async () => {
      const { syncPendingOperations } = await import('../../utils/offlineQueueManager');

      // Ensure mock returns proper result
      syncPendingOperations.mockResolvedValue({
        success: true,
        total: 0,
        synced: 0,
        failed: 0,
        pending: 0,
      });

      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <TestComponent />
        </SyncProvider>
      );

      // Simulate going offline then online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('offline');
      });

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('online');
      });
    });
  });

  describe('useOnlineStatus', () => {
    it('should return online status', () => {
      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <OnlineStatusTestComponent />
        </SyncProvider>
      );

      expect(screen.getByTestId('online')).toHaveTextContent('online');
    });

    it('should update when status changes', async () => {
      const { syncPendingOperations } = await import('../../utils/offlineQueueManager');

      // Ensure mock returns proper result
      syncPendingOperations.mockResolvedValue({
        success: true,
        total: 0,
        synced: 0,
        failed: 0,
        pending: 0,
      });

      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <OnlineStatusTestComponent />
        </SyncProvider>
      );

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('online')).toHaveTextContent('offline');
      });
    });
  });

  describe('useHasPendingSync', () => {
    it('should return pending sync status', () => {
      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <PendingSyncTestComponent />
        </SyncProvider>
      );

      expect(screen.getByTestId('has-pending')).toHaveTextContent('no');
      expect(screen.getByTestId('total')).toHaveTextContent('0');
    });
  });

  describe('Auto-sync behavior', () => {

    it('should not sync when offline', async () => {
      const { syncPendingOperations } = await import('../../utils/offlineQueueManager');

      // Ensure mock returns proper result (even though it won't be called)
      syncPendingOperations.mockResolvedValue({
        success: true,
        total: 0,
        synced: 0,
        failed: 0,
        pending: 0,
      });

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <TestComponent />
        </SyncProvider>
      );

      const syncButton = screen.getByText('Sync');

      await act(async () => {
        syncButton.click();
      });

      expect(syncPendingOperations).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle sync errors gracefully', async () => {
      const { syncPendingOperations } = await import('../../utils/offlineQueueManager');

      // Mock rejection that will be caught
      syncPendingOperations.mockRejectedValueOnce(new Error('Sync failed'));

      render(
        <SyncProvider executeFunctions={mockExecuteFunctions}>
          <TestComponent />
        </SyncProvider>
      );

      const syncButton = screen.getByText('Sync');

      await act(async () => {
        syncButton.click();
      });

      // Wait for error handling to complete
      await waitFor(() => {
        expect(screen.getByTestId('syncing-status')).toHaveTextContent('idle');
      });
    });
  });
});
