import { useCallback, useRef } from "react";
import { CheckCircle, Clock, RefreshCw, Trash2 } from "lucide-react";
import usePullToRefresh from "../hooks/usePullToRefresh";
import useSwipeToComplete from "../hooks/useSwipeToComplete";
import haptics from "../utils/haptics";
import enhancedToast from "../utils/toast";

const noopAsync = async () => {};

const ShowerQueueItem = ({
  guest,
  index,
  isActive,
  onRemove,
  onComplete,
  getSlotTime,
}) => {
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
      className={`list-item overflow-hidden touch-none transition-colors ${isActive ? "active-service" : ""}`}
      data-testid={`shower-queue-item-${guest.id}`}
      style={{
        transform: `translateX(${translateX}px)`,
        touchAction: "pan-y",
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
          backgroundColor: "rgba(16, 185, 129, 0.18)",
          color: "#047857",
        }}
        aria-hidden="true"
      >
        <CheckCircle size={16} />
        <span className="ml-2 text-sm font-medium">Complete</span>
      </div>

      <div className="relative z-10 flex w-full items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="text-gray-900 truncate" title={guest.name}>
            {guest.name}
          </strong>
          <small className="flex items-center gap-1 text-gray-500">
            <Clock size={12} /> {getSlotTime(index)}
          </small>
        </div>

        {isActive && (
          <span className="in-use-label whitespace-nowrap">
            <CheckCircle size={14} /> In Use
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onComplete(guest)}
            className="hidden md:inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={`Mark ${guest.name}'s shower as complete`}
            data-swipe-ignore
          >
            <CheckCircle size={14} />
            Complete
          </button>
          <button
            type="button"
            onClick={() => onRemove(guest)}
            className="rounded-md border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 touch-manipulation"
            aria-label={`Remove ${guest.name} from shower queue`}
            data-swipe-ignore
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </li>
  );
};

function ShowerQueue({ queue, setQueue, onRefresh = noopAsync }) {
  const containerRef = useRef(null);

  const handleRemove = useCallback(
    (guest, { silent } = {}) => {
      setQueue((prev) => prev.filter((item) => item.id !== guest.id));
      if (silent) return;
      haptics.delete();
      enhancedToast.warning(`${guest.name} removed from the shower queue`, {
        duration: 2400,
      });
    },
    [setQueue],
  );

  const handleComplete = useCallback(
    (guest) => {
      handleRemove(guest, { silent: true });
      haptics.complete();
      enhancedToast.success(`${guest.name}'s shower marked complete`, {
        duration: 2200,
      });
    },
    [handleRemove],
  );

  const getSlotTime = useCallback((index) => {
    const now = new Date();
    const minutes = Math.floor(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes, 0, 0);
    const slotOffset = Math.floor(index / 2) * 15;
    now.setMinutes(now.getMinutes() + slotOffset);
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const refreshQueue = useCallback(async () => {
    await onRefresh();
    haptics.actionSuccess();
    enhancedToast.success("Shower queue refreshed", { duration: 2000 });
  }, [onRefresh]);

  const { pullDistance, readyToRefresh, isRefreshing } = usePullToRefresh({
    containerRef,
    onRefresh: refreshQueue,
    threshold: 68,
    disabled: queue.length === 0,
  });

  return (
    <div
      className="list-container"
      ref={containerRef}
      data-testid="shower-queue-container"
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className={`pull-indicator ${
            readyToRefresh ? "pull-indicator--ready" : ""
          }`}
          style={{
            height: Math.max(32, Math.min(pullDistance, 72)),
            opacity: readyToRefresh ? 1 : Math.min(pullDistance / 72, 1),
          }}
          aria-live="polite"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? "animate-spin" : ""}
            aria-hidden="true"
          />
          <span>
            {isRefreshing
              ? "Refreshing…"
              : readyToRefresh
                ? "Release to refresh"
                : "Pull to refresh"}
          </span>
        </div>
      )}

      {queue.length === 0 ? (
        <p className="text-sm text-gray-500">Shower queue is empty.</p>
      ) : (
        <ul>
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
