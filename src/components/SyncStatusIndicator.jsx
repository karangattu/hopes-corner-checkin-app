/**
 * Sync Status Indicator
 * Shows online/offline status and pending sync operations
 */

import React from 'react';
import { useSyncStatus } from '../context/SyncContext';

export const SyncStatusIndicator = () => {
  const {
    isOnline,
    isSyncing,
    syncStats,
    lastSyncTime,
    syncError,
    hasPendingItems,
    totalPending,
    triggerSync,
  } = useSyncStatus();

  // Don't show anything if online and no pending items
  if (isOnline && !hasPendingItems && !isSyncing) {
    return null;
  }

  const handleManualSync = () => {
    if (!isSyncing && isOnline) {
      triggerSync(true);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (isSyncing) return 'bg-blue-500 animate-pulse';
    if (hasPendingItems) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (hasPendingItems) return `${totalPending} pending`;
    return 'Online';
  };

  const getDetailText = () => {
    if (!isOnline) {
      return hasPendingItems
        ? `${totalPending} operation${totalPending !== 1 ? 's' : ''} will sync when online`
        : 'Changes will sync when connection is restored';
    }

    if (isSyncing) {
      return 'Syncing pending operations...';
    }

    if (hasPendingItems) {
      return `${totalPending} operation${totalPending !== 1 ? 's' : ''} waiting to sync`;
    }

    return 'All changes synced';
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg shadow-lg border border-gray-200 bg-white max-w-sm transition-all duration-300 ${
        hasPendingItems || !isOnline ? 'opacity-100' : 'opacity-90 hover:opacity-100'
      }`}
    >
      <div className="p-3">
        {/* Status Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="font-medium text-sm text-gray-900">{getStatusText()}</span>
          {syncError && (
            <span className="text-xs text-red-600" title={syncError}>
              ⚠
            </span>
          )}
        </div>

        {/* Detail Text */}
        <p className="text-xs text-gray-600 mb-2">{getDetailText()}</p>

        {/* Stats (when expanded) */}
        {hasPendingItems && (
          <div className="text-xs text-gray-500 space-y-1 mb-2">
            {syncStats.pending > 0 && (
              <div>
                • {syncStats.pending} pending
              </div>
            )}
            {syncStats.retrying > 0 && (
              <div className="text-yellow-600">
                • {syncStats.retrying} retrying
              </div>
            )}
            {syncStats.failed > 0 && (
              <div className="text-red-600">
                • {syncStats.failed} failed
              </div>
            )}
          </div>
        )}

        {/* Manual Sync Button */}
        {isOnline && hasPendingItems && !isSyncing && (
          <button
            onClick={handleManualSync}
            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors w-full"
          >
            Sync Now
          </button>
        )}

        {/* Last Sync Time */}
        {lastSyncTime && !hasPendingItems && (
          <div className="text-xs text-gray-400 mt-1">
            Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Compact Sync Status Badge (for header/navbar)
 */
export const SyncStatusBadge = () => {
  const { isOnline, isSyncing, hasPendingItems, totalPending } = useSyncStatus();

  // Show badge when offline or has pending items
  if (isOnline && !hasPendingItems && !isSyncing) {
    return null;
  }

  const getIcon = () => {
    if (!isOnline) return '🔴';
    if (isSyncing) return '🔄';
    if (hasPendingItems) return '⏳';
    return '🟢';
  };

  const getTitle = () => {
    if (!isOnline) return 'Offline - changes will sync when online';
    if (isSyncing) return 'Syncing pending changes...';
    if (hasPendingItems) return `${totalPending} operations pending sync`;
    return 'All changes synced';
  };

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-xs"
      title={getTitle()}
    >
      <span className={isSyncing ? 'animate-spin' : ''}>{getIcon()}</span>
      {hasPendingItems && <span className="text-gray-700">{totalPending}</span>}
    </div>
  );
};

export default SyncStatusIndicator;
