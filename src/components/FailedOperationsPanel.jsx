/**
 * FailedOperationsPanel Component
 * Displays failed operations that couldn't sync after max retries
 * Allows users to retry or delete failed operations
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, RotateCcw, RefreshCw } from 'lucide-react';
import { getFailedOperations, retryFailedOperation, deleteFailedOperation } from '../utils/indexedDB';

export default function FailedOperationsPanel() {
  const [failedOps, setFailedOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(null);

  useEffect(() => {
    loadFailedOperations();
    // Refresh every 5 seconds
    const interval = setInterval(loadFailedOperations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadFailedOperations = async () => {
    try {
      const ops = await getFailedOperations();
      setFailedOps(ops);
    } catch (error) {
      console.error('[FailedOperationsPanel] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (operationId) => {
    setRetrying(operationId);
    try {
      await retryFailedOperation(operationId);
      console.log('[FailedOperationsPanel] Operation moved back to queue for retry');
      await loadFailedOperations();
    } catch (error) {
      console.error('[FailedOperationsPanel] Retry failed:', error);
    } finally {
      setRetrying(null);
    }
  };

  const handleDelete = async (operationId) => {
    if (window.confirm('Are you sure you want to delete this failed operation?')) {
      try {
        await deleteFailedOperation(operationId);
        console.log('[FailedOperationsPanel] Operation deleted');
        await loadFailedOperations();
      } catch (error) {
        console.error('[FailedOperationsPanel] Delete failed:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (failedOps.length === 0) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <p className="text-green-800 font-semibold">✅ All operations synced successfully</p>
        <p className="text-sm text-green-700 mt-1">No failed operations detected.</p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-red-300 rounded bg-red-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="font-bold text-red-900">Failed Operations ({failedOps.length})</h3>
        </div>
        <button
          onClick={loadFailedOperations}
          className="p-1 text-gray-600 hover:text-gray-900"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {failedOps.map((op) => (
          <div key={op.id} className="p-4 bg-white border border-red-200 rounded">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                {/* Operation Type */}
                <p className="font-mono font-semibold text-gray-900">{op.operationType}</p>

                {/* Error Type Badge */}
                {op.errorType && (
                  <span
                    className={`inline-block text-xs font-bold px-2 py-1 rounded mt-2 ${
                      op.severity === 'high'
                        ? 'bg-red-200 text-red-800'
                        : op.severity === 'medium'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-blue-200 text-blue-800'
                    }`}
                  >
                    {op.errorType}
                  </span>
                )}

                {/* User-friendly Message */}
                {op.userMessage && (
                  <p className="text-sm text-gray-700 mt-2">{op.userMessage}</p>
                )}

                {/* Suggested Action */}
                {op.action && <p className="text-xs text-blue-600 mt-2">💡 {op.action}</p>}

                {/* Failure Details */}
                <div className="text-xs text-gray-500 mt-3 space-y-1">
                  <p>
                    Failed: {new Date(op.failedAt || op.timestamp).toLocaleString()}
                  </p>
                  {op.failureCount !== undefined && (
                    <p>Retry attempts: {op.failureCount}</p>
                  )}
                  {op.lastError && (
                    <p className="text-red-600">Error: {op.lastError}</p>
                  )}
                </div>

                {/* Payload Info */}
                {op.payload && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                      View details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 text-xs overflow-auto max-h-32 rounded border border-gray-300">
                      {JSON.stringify(op.payload, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {/* Retry button - shown for retriable errors */}
                {op.retriable !== false && (
                  <button
                    onClick={() => handleRetry(op.id)}
                    disabled={retrying === op.id}
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition flex items-center gap-1 justify-center"
                    title="Retry operation"
                  >
                    {retrying === op.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-xs">Retry</span>
                      </>
                    )}
                  </button>
                )}

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(op.id)}
                  disabled={retrying === op.id}
                  className="p-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 transition flex items-center gap-1 justify-center"
                  title="Delete operation"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-xs">Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
        <p className="font-semibold mb-1">💡 What does this mean?</p>
        <ul className="text-xs space-y-1 list-disc list-inside">
          <li>
            <strong>Network Error:</strong> Will retry automatically when connection is stable
          </li>
          <li>
            <strong>Conflict (Deleted/Duplicate):</strong> Guest or data no longer exists on
            server
          </li>
          <li>
            <strong>Permission/Auth Error:</strong> Log in again or contact administrator
          </li>
          <li>
            <strong>Validation Error:</strong> Check your input data and contact support
          </li>
        </ul>
      </div>
    </div>
  );
}
