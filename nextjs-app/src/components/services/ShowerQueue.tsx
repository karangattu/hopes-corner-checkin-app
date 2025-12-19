'use client';

import React, { useCallback, useRef } from 'react';
import { CheckCircle, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSwipeToComplete } from '@/hooks/useSwipeToComplete';
import haptics from '@/utils/haptics';
import enhancedToast from '@/utils/toast';

interface Guest {
  id: string;
  name: string;
}

interface ShowerQueueItemProps {
  guest: Guest;
  index: number;
  isActive: boolean;
  onRemove: (guest: Guest) => void;
  onComplete: (guest: Guest) => void;
  getSlotTime: (index: number) => string;
}

function ShowerQueueItem({
  guest,
  index,
  isActive,
  onRemove,
  onComplete,
  getSlotTime,
}: ShowerQueueItemProps) {
  const {
    translateX,
    progress,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = useSwipeToComplete({ onComplete: () => onComplete(guest) });

  return (
    <li
      className={`relative flex items-center gap-3 rounded-lg border bg-white dark:bg-gray-800 p-3 mb-2 overflow-hidden touch-none transition-colors ${
        isActive 
          ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/20' 
          : 'border-gray-200 dark:border-gray-700'
      }`}
      data-testid={`shower-queue-item-${guest.id}`}
      style={{
        transform: `translateX(${translateX}px)`,
        touchAction: 'pan-y',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none"
        style={{
          opacity: progress,
          backgroundColor: 'rgba(16, 185, 129, 0.18)',
          color: '#047857',
        }}
        aria-hidden="true"
      >
        <CheckCircle size={16} />
        <span className="ml-2 text-sm font-medium">Complete</span>
      </div>

      <div className="relative z-10 flex w-full items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="text-gray-900 dark:text-gray-100 truncate" title={guest.name}>
            {guest.name}
          </strong>
          <small className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Clock size={12} /> {getSlotTime(index)}
          </small>
        </div>

        {isActive && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle size={14} /> In Use
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onComplete(guest)}
            className="hidden md:inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-800/50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={`Mark ${guest.name}'s shower as complete`}
            data-swipe-ignore
          >
            <CheckCircle size={14} />
            Complete
          </button>
          <button
            type="button"
            onClick={() => onRemove(guest)}
            className="rounded-md border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-2 text-red-600 dark:text-red-400 transition-colors hover:bg-red-100 dark:hover:bg-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-300 touch-manipulation"
            aria-label={`Remove ${guest.name} from shower queue`}
            data-swipe-ignore
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}

interface ShowerQueueProps {
  queue: Guest[];
  setQueue: React.Dispatch<React.SetStateAction<Guest[]>>;
  onRefresh?: () => Promise<void>;
}

const noopAsync = async () => {};

export function ShowerQueue({ queue, setQueue, onRefresh = noopAsync }: ShowerQueueProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRemove = useCallback(
    (guest: Guest, options?: { silent?: boolean }) => {
      setQueue((prev) => prev.filter((item) => item.id !== guest.id));
      if (options?.silent) return;
      haptics.delete();
      enhancedToast.warning(`${guest.name} removed from the shower queue`, {
        duration: 2400,
      });
    },
    [setQueue]
  );

  const handleComplete = useCallback(
    (guest: Guest) => {
      handleRemove(guest, { silent: true });
      haptics.complete();
      enhancedToast.success(`${guest.name}'s shower marked complete`, {
        duration: 2200,
      });
    },
    [handleRemove]
  );

  const getSlotTime = useCallback((index: number) => {
    const now = new Date();
    const minutes = Math.floor(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes, 0, 0);
    const slotOffset = Math.floor(index / 2) * 15;
    now.setMinutes(now.getMinutes() + slotOffset);
    return now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const refreshQueue = useCallback(async () => {
    await onRefresh();
    haptics.actionSuccess();
    enhancedToast.success('Shower queue refreshed', { duration: 2000 });
  }, [onRefresh]);

  const { pullDistance, readyToRefresh, isRefreshing } = usePullToRefresh({
    containerRef,
    onRefresh: refreshQueue,
    threshold: 68,
    disabled: queue.length === 0,
  });

  return (
    <div
      className="relative overflow-auto max-h-96"
      ref={containerRef}
      data-testid="shower-queue-container"
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className={`flex items-center justify-center gap-2 text-sm transition-colors ${
            readyToRefresh ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400 dark:text-gray-500'
          }`}
          style={{
            height: Math.max(32, Math.min(pullDistance, 72)),
            opacity: readyToRefresh ? 1 : Math.min(pullDistance / 72, 1),
          }}
          aria-live="polite"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? 'animate-spin' : ''}
            aria-hidden="true"
          />
          <span>
            {isRefreshing
              ? 'Refreshing…'
              : readyToRefresh
              ? 'Release to refresh'
              : 'Pull to refresh'}
          </span>
        </div>
      )}

      {queue.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Shower queue is empty.</p>
      ) : (
        <ul className="space-y-0">
          {queue.map((guest, index) => (
            <ShowerQueueItem
              key={`${guest.id}-${index}`}
              guest={guest}
              index={index}
              isActive={index < 2}
              onRemove={handleRemove}
              onComplete={handleComplete}
              getSlotTime={getSlotTime}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default ShowerQueue;
