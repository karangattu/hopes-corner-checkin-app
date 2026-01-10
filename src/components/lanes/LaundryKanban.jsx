import { useState, useCallback, useMemo, useRef } from "react";
import {
  WashingMachine,
  ChevronDown,
  ChevronUp,
  CheckCircle2Icon,
  Clock,
  Trash2,
  Wind,
  Package,
  AlertTriangle,
  Timer,
} from "lucide-react";
import toast from "react-hot-toast";
import { LAUNDRY_STATUS } from "../../context/constants";
import { CompactWaiverIndicator } from "../ui/CompactWaiverIndicator";
import { useGuestsStore } from "../../stores/useGuestsStore";

/**
 * Calculates and formats time elapsed from an ISO timestamp to now
 * @param {string|null} isoTimestamp - ISO format timestamp
 * @returns {string|null} - Human-readable time elapsed, e.g., "2h 15m", "45m", "< 1m"
 */
const formatTimeElapsed = (isoTimestamp) => {
  if (!isoTimestamp) return null;

  try {
    const timestamp = new Date(isoTimestamp);
    if (isNaN(timestamp.getTime())) return null;

    const now = new Date();
    const diffMs = now - timestamp;

    // Don't show negative times (future timestamps)
    if (diffMs < 0) return null;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;

    if (diffMinutes < 1) {
      return "< 1m";
    } else if (diffHours < 1) {
      return `${diffMinutes}m`;
    } else if (diffHours < 24) {
      return remainingMinutes > 0 
        ? `${diffHours}h ${remainingMinutes}m` 
        : `${diffHours}h`;
    } else {
      const days = Math.floor(diffHours / 24);
      const remainingHours = diffHours % 24;
      return remainingHours > 0 
        ? `${days}d ${remainingHours}h` 
        : `${days}d`;
    }
  } catch {
    return null;
  }
};

const LaundryKanban = ({
  laundryRecords,
  guests,
  updateLaundryStatus,
  updateLaundryBagNumber,
  cancelLaundryRecord,
  attemptLaundryStatusChange,
}) => {
  const getWarningsForGuest = useGuestsStore((state) => state.getWarningsForGuest);
  const [expandedCards, setExpandedCards] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  
  // Use ref to track dragged item for optimistic updates without re-renders
  const draggedItemRef = useRef(null);

  // Memoize guest lookup map for O(1) access
  const guestMap = useMemo(() => {
    const map = new Map();
    (guests || []).forEach(g => map.set(g.id, g));
    return map;
  }, [guests]);

  const applyStatusUpdate = useCallback(async (record, newStatus) => {
    if (!record) return false;
    const success = await updateLaundryStatus(record.id, newStatus);
    if (success) {
      toast.success("Status updated");
    }
    return success;
  }, [updateLaundryStatus]);

  const hasBagNumber = useCallback((record) =>
    Boolean(String(record?.bagNumber ?? "").trim().length), []);

  const requiresBagPrompt = useCallback((record, newStatus) =>
    record?.laundryType !== "offsite" &&
    record?.status === LAUNDRY_STATUS.WAITING &&
    newStatus !== LAUNDRY_STATUS.WAITING &&
    !hasBagNumber(record), [hasBagNumber]);

  const promptForBagNumber = useCallback(async (record, newStatus) => {
    if (!record) {
      return;
    }

    if (attemptLaundryStatusChange) {
      await attemptLaundryStatusChange(record, newStatus);
      return;
    }

    const manualBag = window.prompt(
      "A bag number is required before moving out of waiting. Enter one to continue.",
    );
    const trimmedBag = (manualBag || "").trim();

    if (!trimmedBag) {
      toast.error("Please enter a bag number to continue");
      return;
    }

    const saved = await updateLaundryBagNumber(record.id, trimmedBag);
    if (!saved) {
      return;
    }

    toast.success("Bag number saved");
    await applyStatusUpdate(record, newStatus);
  }, [attemptLaundryStatusChange, updateLaundryBagNumber, applyStatusUpdate]);

  const processStatusChange = useCallback(async (record, newStatus) => {
    if (!record) {
      return;
    }

    if (requiresBagPrompt(record, newStatus)) {
      await promptForBagNumber(record, newStatus);
      return;
    }

    await applyStatusUpdate(record, newStatus);
  }, [requiresBagPrompt, promptForBagNumber, applyStatusUpdate]);

  // Optimized guest name lookup using memoized map
  const getGuestNameDetails = useCallback((guestId) => {
    const guest = guestMap.get(guestId) || null;
    const fallback = "Unknown Guest";
    const legalName =
      guest?.name ||
      `${guest?.firstName || ""} ${guest?.lastName || ""}`.trim() ||
      fallback;
    const preferredName = (guest?.preferredName || "").trim();
    const hasPreferred =
      Boolean(preferredName) &&
      preferredName.toLowerCase() !== legalName.toLowerCase();
    const primaryName = hasPreferred ? preferredName : legalName;
    const displayName = hasPreferred
      ? `${preferredName} (${legalName})`
      : legalName;
    return {
      guest,
      legalName,
      preferredName,
      hasPreferred,
      primaryName,
      displayName,
      sortKey: legalName.toLowerCase(),
    };
  }, [guestMap]);

  const formatSlotTime = useCallback((slotTime) => {
    if (!slotTime) return null;
    // Slot can be a range like "8:30 - 9:30"
    const [start] = String(slotTime).split(" - ");
    const [hoursStr, minutesStr] = String(start).split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return slotTime;
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, []);

  const toggleCard = useCallback((recordId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  }, []);

  // Optimized drag handlers - use refs to avoid state updates during drag
  const handleDragStart = useCallback((e, record) => {
    draggedItemRef.current = record;
    setDraggedItem(record);
    e.dataTransfer.effectAllowed = "move";
    // Add drag image effect for smoother visual (only if supported - not available in jsdom)
    if (typeof e.dataTransfer.setDragImage === 'function') {
      e.dataTransfer.setDragImage(e.target, 0, 0);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(async (e, newStatus) => {
    e.preventDefault();
    const item = draggedItemRef.current;
    if (item && item.status !== newStatus) {
      await processStatusChange(item, newStatus);
    }
    draggedItemRef.current = null;
    setDraggedItem(null);
  }, [processStatusChange]);

  const handleDragEnd = useCallback(() => {
    draggedItemRef.current = null;
    setDraggedItem(null);
  }, []);

  // Memoize record filtering to prevent unnecessary recalculation
  const { onsiteRecords, offsiteRecords } = useMemo(() => ({
    onsiteRecords: laundryRecords.filter((r) => r.laundryType !== "offsite"),
    offsiteRecords: laundryRecords.filter((r) => r.laundryType === "offsite"),
  }), [laundryRecords]);

  const groupedOnsiteRecords = useMemo(() => ({
    [LAUNDRY_STATUS.WAITING]: onsiteRecords.filter(
      (r) => r.status === LAUNDRY_STATUS.WAITING,
    ),
    [LAUNDRY_STATUS.WASHER]: onsiteRecords.filter(
      (r) => r.status === LAUNDRY_STATUS.WASHER,
    ),
    [LAUNDRY_STATUS.DRYER]: onsiteRecords.filter(
      (r) => r.status === LAUNDRY_STATUS.DRYER,
    ),
    [LAUNDRY_STATUS.DONE]: onsiteRecords.filter(
      (r) => r.status === LAUNDRY_STATUS.DONE,
    ),
    [LAUNDRY_STATUS.PICKED_UP]: onsiteRecords.filter(
      (r) => r.status === LAUNDRY_STATUS.PICKED_UP,
    ),
  }), [onsiteRecords]);

  const groupedOffsiteRecords = useMemo(() => ({
    [LAUNDRY_STATUS.PENDING]: offsiteRecords.filter(
      (r) => r.status === LAUNDRY_STATUS.PENDING,
    ),
    [LAUNDRY_STATUS.TRANSPORTED]: offsiteRecords.filter(
      (r) => r.status === LAUNDRY_STATUS.TRANSPORTED,
    ),
    [LAUNDRY_STATUS.RETURNED]: offsiteRecords.filter(
      (r) => r.status === LAUNDRY_STATUS.RETURNED,
    ),
    [LAUNDRY_STATUS.OFFSITE_PICKED_UP]: offsiteRecords.filter(
      (r) => r.status === LAUNDRY_STATUS.OFFSITE_PICKED_UP,
    ),
  }), [offsiteRecords]);

  const onsiteColumns = [
    {
      id: LAUNDRY_STATUS.WAITING,
      title: "Waiting",
      icon: Clock,
      color: "amber",
      bgClass: "bg-amber-50",
      borderClass: "border-amber-200",
      textClass: "text-amber-700",
      iconClass: "text-amber-600",
      badgeClass: "bg-amber-100 text-amber-700",
    },
    {
      id: LAUNDRY_STATUS.WASHER,
      title: "In Washer",
      icon: WashingMachine,
      color: "blue",
      bgClass: "bg-blue-50",
      borderClass: "border-blue-200",
      textClass: "text-blue-700",
      iconClass: "text-blue-600",
      badgeClass: "bg-blue-100 text-blue-700",
    },
    {
      id: LAUNDRY_STATUS.DRYER,
      title: "In Dryer",
      icon: Wind,
      color: "purple",
      bgClass: "bg-purple-50",
      borderClass: "border-purple-200",
      textClass: "text-purple-700",
      iconClass: "text-purple-600",
      badgeClass: "bg-purple-100 text-purple-700",
    },
    {
      id: LAUNDRY_STATUS.DONE,
      title: "Done",
      icon: Package,
      color: "emerald",
      bgClass: "bg-emerald-50",
      borderClass: "border-emerald-200",
      textClass: "text-emerald-700",
      iconClass: "text-emerald-600",
      badgeClass: "bg-emerald-100 text-emerald-700",
    },
    {
      id: LAUNDRY_STATUS.PICKED_UP,
      title: "Picked Up",
      icon: CheckCircle2Icon,
      color: "green",
      bgClass: "bg-green-50",
      borderClass: "border-green-200",
      textClass: "text-green-700",
      iconClass: "text-green-600",
      badgeClass: "bg-green-100 text-green-700",
    },
  ];

  const offsiteColumns = [
    {
      id: LAUNDRY_STATUS.PENDING,
      title: "Pending",
      icon: Clock,
      color: "amber",
      bgClass: "bg-amber-50",
      borderClass: "border-amber-200",
      textClass: "text-amber-700",
      iconClass: "text-amber-600",
      badgeClass: "bg-amber-100 text-amber-700",
    },
    {
      id: LAUNDRY_STATUS.TRANSPORTED,
      title: "Transported",
      icon: Package,
      color: "blue",
      bgClass: "bg-blue-50",
      borderClass: "border-blue-200",
      textClass: "text-blue-700",
      iconClass: "text-blue-600",
      badgeClass: "bg-blue-100 text-blue-700",
    },
    {
      id: LAUNDRY_STATUS.RETURNED,
      title: "Returned",
      icon: CheckCircle2Icon,
      color: "purple",
      bgClass: "bg-purple-50",
      borderClass: "border-purple-200",
      textClass: "text-purple-700",
      iconClass: "text-purple-600",
      badgeClass: "bg-purple-100 text-purple-700",
    },
    {
      id: LAUNDRY_STATUS.OFFSITE_PICKED_UP,
      title: "Picked Up",
      icon: CheckCircle2Icon,
      color: "emerald",
      bgClass: "bg-emerald-50",
      borderClass: "border-emerald-200",
      textClass: "text-emerald-700",
      iconClass: "text-emerald-600",
      badgeClass: "bg-emerald-100 text-emerald-700",
    },
  ];

  const renderCard = useCallback((record, isOffsite = false) => {
    const nameDetails = getGuestNameDetails(record.guestId);
    const isExpanded = expandedCards[record.id];
    const isCompleted =
      record.status === LAUNDRY_STATUS.PICKED_UP ||
      record.status === LAUNDRY_STATUS.OFFSITE_PICKED_UP;
    const isDragging = draggedItem?.id === record.id;

    const statusOptions = isOffsite
      ? [
          { value: LAUNDRY_STATUS.PENDING, label: "Pending" },
          { value: LAUNDRY_STATUS.TRANSPORTED, label: "Transported" },
          { value: LAUNDRY_STATUS.RETURNED, label: "Returned" },
          { value: LAUNDRY_STATUS.OFFSITE_PICKED_UP, label: "Picked Up" },
        ]
      : [
          { value: LAUNDRY_STATUS.WAITING, label: "Waiting" },
          { value: LAUNDRY_STATUS.WASHER, label: "In Washer" },
          { value: LAUNDRY_STATUS.DRYER, label: "In Dryer" },
          { value: LAUNDRY_STATUS.DONE, label: "Done" },
          { value: LAUNDRY_STATUS.PICKED_UP, label: "Picked Up" },
        ];

    return (
      <div
        key={record.id}
        draggable
        onDragStart={(e) => handleDragStart(e, record)}
        onDragEnd={handleDragEnd}
        data-testid={`laundry-card-${record.id}`}
        style={{ willChange: isDragging ? 'transform, opacity' : 'auto' }}
        className={`bg-white rounded-lg border-2 shadow-sm p-3 cursor-move transition-all duration-75 hover:shadow-md ${
          isDragging ? "opacity-50 scale-105" : ""
        } ${
          isCompleted
            ? "border-emerald-200 hover:border-emerald-300"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 mb-2 min-h-[24px]">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs text-gray-900 leading-tight break-words line-clamp-2" title={nameDetails.displayName}>
              {nameDetails.primaryName}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Show waiver indicator for non-completed records */}
            {!isCompleted && (
              <CompactWaiverIndicator guestId={record.guestId} serviceType="laundry" />
            )}
            {/* Show warning indicator if guest has warnings */}
            {(() => {
              const warnings = getWarningsForGuest(record.guestId) || [];
              return warnings.length > 0 ? (
                <div
                  className="text-red-600 flex-shrink-0"
                  title={`⚠️ ${warnings.length} warning${warnings.length > 1 ? 's' : ''}`}
                  aria-label={`Guest has warning${warnings.length > 1 ? 's' : ''}`}
                >
                  <AlertTriangle size={14} />
                </div>
              ) : null;
            })()}
            <button
              type="button"
              onClick={() => toggleCard(record.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label={`${
                isExpanded ? "Collapse" : "Expand"
              } laundry details for ${nameDetails.primaryName}`}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Secondary info line */}
        {(nameDetails.hasPreferred || (!isOffsite && record.time)) && (
          <div className="text-[9px] text-gray-500 mb-2 line-clamp-1">
            {nameDetails.hasPreferred && nameDetails.legalName}
            {nameDetails.hasPreferred && !isOffsite && record.time && " • "}
            {!isOffsite && record.time && formatSlotTime(record.time)}
          </div>
        )}

        <div className="space-y-2">
          {record.bagNumber && (
            <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-purple-50 border border-purple-100 rounded px-2 py-1.5">
              <Package
                size={12}
                className="text-purple-600 flex-shrink-0 mt-0.5"
              />
              <span>Bag #{record.bagNumber}</span>
            </div>
          )}

          {isOffsite && (
            <div className="text-xs bg-blue-50 border border-blue-100 rounded px-2 py-1">
              <span className="font-semibold text-blue-700">
                Off-site laundry
              </span>
            </div>
          )}

          {/* Time tracking indicator - show for non-completed records */}
          {!isCompleted && (record.createdAt || record.lastUpdated) && (
            <div 
              className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 rounded px-2 py-1 cursor-help"
              title={`Dropoff: ${record.createdAt ? formatTimeElapsed(record.createdAt) + " ago" : "N/A"}\nIn current status: ${record.lastUpdated ? formatTimeElapsed(record.lastUpdated) + " ago" : "N/A"}`}
              data-testid={`laundry-time-tracker-${record.id}`}
            >
              <Timer size={10} className="text-gray-400 flex-shrink-0" />
              <span>
                {formatTimeElapsed(record.createdAt) || "—"}
                {record.lastUpdated && record.lastUpdated !== record.createdAt && (
                  <span className="text-gray-400"> • {formatTimeElapsed(record.lastUpdated)} in status</span>
                )}
              </span>
            </div>
          )}

          {isExpanded && (
            <div className="pt-2 mt-2 border-t border-gray-100 space-y-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Bag Number
                </label>
                <input
                  type="text"
                  value={record.bagNumber || ""}
                  onChange={(e) =>
                    updateLaundryBagNumber(record.id, e.target.value)
                  }
                  placeholder="Enter bag number"
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Status
                </label>
                <select
                  value={record.status}
                  onChange={(e) =>
                    processStatusChange(record, e.target.value)
                  }
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  aria-label={`Update laundry status for ${nameDetails.primaryName}`}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Cancel laundry booking for ${nameDetails.primaryName}?`,
                    )
                  ) {
                    cancelLaundryRecord(record.id);
                    toast.success("Laundry booking cancelled");
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded px-3 py-1.5 transition-colors"
              >
                <Trash2 size={12} />
                Cancel Booking
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }, [getGuestNameDetails, expandedCards, draggedItem, handleDragStart, handleDragEnd, toggleCard, updateLaundryBagNumber, processStatusChange, cancelLaundryRecord, formatSlotTime, getWarningsForGuest]);

  return (
    <div className="space-y-6">
      {/* On-site Laundry Kanban */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <WashingMachine className="text-purple-600" size={22} />
              On-site Laundry - Kanban Board
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Drag and drop cards between columns to update status
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-gray-100 text-gray-700 font-medium px-3 py-1 rounded-full">
              {onsiteRecords.length} total
            </span>
          </div>
        </div>

        {/* Use flex with horizontal scroll to keep all 5 columns in one row */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 min-w-0">
          {onsiteColumns.map((column) => {
            const records = groupedOnsiteRecords[column.id];
            const Icon = column.icon;

            return (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                data-testid={`onsite-column-${column.id}`}
                className={`${column.bgClass} ${column.borderClass} border-2 rounded-xl p-4 min-h-[400px] transition-colors flex-shrink-0 w-[240px] md:w-[220px] lg:flex-1 lg:min-w-[180px] ${
                  draggedItem?.status !== column.id && !draggedItem?.offsite
                    ? "hover:border-opacity-75"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className={column.iconClass} />
                    <h3 className={`font-semibold text-sm ${column.textClass}`}>
                      {column.title}
                    </h3>
                  </div>
                  <span
                    className={`${column.badgeClass} text-xs font-bold px-2.5 py-1 rounded-full`}
                  >
                    {records.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {records.length === 0 ? (
                    <div className="text-center py-12 text-xs text-gray-400">
                      <Icon size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No laundry in this stage</p>
                      <p className="mt-1 text-[10px]">
                        Drag cards here to update
                      </p>
                    </div>
                  ) : (
                    records.map((record) => renderCard(record, false))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Off-site Laundry Kanban */}
      {offsiteRecords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="text-blue-600" size={22} />
                Off-site Laundry - Kanban Board
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Track laundry sent to external facility
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-gray-100 text-gray-700 font-medium px-3 py-1 rounded-full">
                {offsiteRecords.length} total
              </span>
            </div>
          </div>

          {/* Use flex with horizontal scroll to keep all 4 columns in one row */}
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 min-w-0">
            {offsiteColumns.map((column) => {
              const records = groupedOffsiteRecords[column.id];
              const Icon = column.icon;

              return (
                <div
                  key={column.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                  data-testid={`offsite-column-${column.id}`}
                  className={`${column.bgClass} ${column.borderClass} border-2 rounded-xl p-4 min-h-[400px] transition-colors flex-shrink-0 w-[240px] md:w-[220px] lg:flex-1 lg:min-w-[200px] ${
                    draggedItem?.status !== column.id && draggedItem?.offsite
                      ? "hover:border-opacity-75"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon size={18} className={column.iconClass} />
                      <h3
                        className={`font-semibold text-sm ${column.textClass}`}
                      >
                        {column.title}
                      </h3>
                    </div>
                    <span
                      className={`${column.badgeClass} text-xs font-bold px-2.5 py-1 rounded-full`}
                    >
                      {records.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {records.length === 0 ? (
                      <div className="text-center py-12 text-xs text-gray-400">
                        <Icon size={32} className="mx-auto mb-2 opacity-30" />
                        <p>No laundry in this stage</p>
                        <p className="mt-1 text-[10px]">
                          Drag cards here to update
                        </p>
                      </div>
                    ) : (
                      records.map((record) => renderCard(record, true))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LaundryKanban;
