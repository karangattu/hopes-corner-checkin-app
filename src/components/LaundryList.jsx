import { useCallback, useMemo, useRef } from "react";
import { CheckCircle, RefreshCw, Trash2 } from "lucide-react";
import usePullToRefresh from "../hooks/usePullToRefresh";
import useSwipeToComplete from "../hooks/useSwipeToComplete";
import haptics from "../utils/haptics";
import enhancedToast from "../utils/toast";

const noopAsync = async () => {};

const LaundryListItem = ({
  guest,
  index,
  list,
  slots,
  slotsUsed,
  onSlotChange,
  onRemove,
  onComplete,
}) => {
  const {
    translateX,
    progress,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = useSwipeToComplete({ onComplete: () => onComplete(guest) });

  const isSelectDisabled = !!guest.slot || (slotsUsed >= 5 && !guest.slot);

  const slotIsUnavailable = (slot) =>
    list.some((g) => g.slot === slot && g.id !== guest.id);

  return (
    <li
      className="list-item overflow-hidden touch-none"
      data-testid={`laundry-list-item-${guest.id}`}
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
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          color: "#047857",
        }}
        aria-hidden="true"
      >
        <CheckCircle size={16} />
        <span className="ml-2 text-sm font-medium">Complete</span>
      </div>

      <div className="relative z-10 flex w-full items-center gap-3">
        <span className="flex-1 min-w-0 text-gray-700">
          <strong className="text-gray-900 mr-1">{index + 1}.</strong>
          <span className="truncate" title={guest.name}>
            {guest.name}
          </span>
        </span>

        {guest.slot && (
          <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
            {guest.slot}
          </span>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={guest.slot || ""}
            onChange={(event) => onSlotChange(guest.id, event.target.value)}
            disabled={isSelectDisabled}
            className="min-w-[9rem] rounded-md border border-gray-200 bg-white px-2 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
            aria-label={`Select laundry slot for ${guest.name}`}
            data-swipe-ignore
          >
            <option value="">Select Slot</option>
            {slots.map((slot) => (
              <option
                key={slot}
                value={slot}
                disabled={slotIsUnavailable(slot)}
              >
                {slot}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onComplete(guest)}
            className="hidden md:inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={`Mark ${guest.name}'s laundry as complete`}
            data-swipe-ignore
          >
            <CheckCircle size={14} />
            Complete
          </button>

          <button
            type="button"
            onClick={() => onRemove(guest)}
            className="rounded-md border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 touch-manipulation"
            aria-label={`Remove ${guest.name} from laundry list`}
            data-swipe-ignore
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </li>
  );
};

export default function LaundryList({ list, setList, onRefresh = noopAsync }) {
  const containerRef = useRef(null);

  const slots = useMemo(
    () => [
      "8:30 - 9:30",
      "9:30 - 10:30",
      "10:30 - 11:30",
      "11:30 - 12:30",
      "12:30 - 1:30",
    ],
    [],
  );

  const slotsUsed = useMemo(
    () => list.filter((guest) => guest.slot).length,
    [list],
  );

  const handleSlotChange = useCallback(
    (guestId, slot) => {
      setList((prev) =>
        prev.map((guest) =>
          guest.id === guestId ? { ...guest, slot } : guest,
        ),
      );
      haptics.selection();
    },
    [setList],
  );

  const handleRemove = useCallback(
    (guest, { silent } = {}) => {
      setList((prev) => prev.filter((item) => item.id !== guest.id));
      if (silent) return;
      haptics.delete();
      enhancedToast.warning(`${guest.name} removed from the laundry list`, {
        duration: 2500,
      });
    },
    [setList],
  );

  const handleComplete = useCallback(
    (guest) => {
      handleRemove(guest, { silent: true });
      haptics.complete();
      enhancedToast.success(`${guest.name}'s laundry marked complete`, {
        duration: 2400,
      });
    },
    [handleRemove],
  );

  const refreshList = useCallback(async () => {
    await onRefresh();
    haptics.actionSuccess();
    enhancedToast.success("Laundry list refreshed", { duration: 2000 });
  }, [onRefresh]);

  const { pullDistance, readyToRefresh, isRefreshing } = usePullToRefresh({
    containerRef,
    onRefresh: refreshList,
    threshold: 68,
    disabled: list.length === 0,
  });

  return (
    <div
      className="list-container"
      ref={containerRef}
      data-testid="laundry-list-container"
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

      {list.length === 0 ? (
        <p className="text-sm text-gray-500">Laundry list is empty.</p>
      ) : (
        <ul>
          {list.map((guest, index) => (
            <LaundryListItem
              key={`${guest.id}-${index}`}
              guest={guest}
              index={index}
              list={list}
              slots={slots}
              slotsUsed={slotsUsed}
              onSlotChange={handleSlotChange}
              onRemove={handleRemove}
              onComplete={handleComplete}
            />
          ))}
        </ul>
      )}

      <div className="slot-counter" aria-live="polite">
        <strong>Slots Used:</strong>
        <span>{slotsUsed} / 5</span>
      </div>
    </div>
  );
}
