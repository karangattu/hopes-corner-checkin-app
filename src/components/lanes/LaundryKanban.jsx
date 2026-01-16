import { useState, useCallback, useMemo, useRef } from "react";
import {
  WashingMachine,
  CheckCircle2Icon,
  Clock,
  Wind,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import { LAUNDRY_STATUS } from "../../context/constants";
import { useGuestsStore } from "../../stores/useGuestsStore";

import LaundryCard from "./LaundryCard";

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

  const ONSITE_STATUS_OPTIONS = [
    { value: LAUNDRY_STATUS.WAITING, label: "Waiting" },
    { value: LAUNDRY_STATUS.WASHER, label: "In Washer" },
    { value: LAUNDRY_STATUS.DRYER, label: "In Dryer" },
    { value: LAUNDRY_STATUS.DONE, label: "Done" },
    { value: LAUNDRY_STATUS.PICKED_UP, label: "Picked Up" },
  ];

  const OFFSITE_STATUS_OPTIONS = [
    { value: LAUNDRY_STATUS.PENDING, label: "Pending" },
    { value: LAUNDRY_STATUS.TRANSPORTED, label: "Transported" },
    { value: LAUNDRY_STATUS.RETURNED, label: "Returned" },
    { value: LAUNDRY_STATUS.OFFSITE_PICKED_UP, label: "Picked Up" },
  ];

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
                className={`${column.bgClass} ${column.borderClass} border-2 rounded-xl p-4 min-h-[400px] transition-colors flex-shrink-0 w-[240px] md:w-[220px] lg:flex-1 lg:min-w-[180px] ${draggedItem?.status !== column.id && !draggedItem?.offsite
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
                    records.map((record) => (
                      <LaundryCard
                        key={record.id}
                        record={record}
                        isOffsite={false}
                        isExpanded={expandedCards[record.id]}
                        isDragging={draggedItem?.id === record.id}
                        guestDetails={getGuestNameDetails(record.guestId)}
                        warnings={getWarningsForGuest(record.guestId) || []}
                        onToggle={toggleCard}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onUpdateBagNumber={updateLaundryBagNumber}
                        onUpdateStatus={processStatusChange}
                        onCancel={cancelLaundryRecord}
                        statusOptions={ONSITE_STATUS_OPTIONS}
                      />
                    ))
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
                  className={`${column.bgClass} ${column.borderClass} border-2 rounded-xl p-4 min-h-[400px] transition-colors flex-shrink-0 w-[240px] md:w-[220px] lg:flex-1 lg:min-w-[200px] ${draggedItem?.status !== column.id && draggedItem?.offsite
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
                      records.map((record) => (
                        <LaundryCard
                          key={record.id}
                          record={record}
                          isOffsite={true}
                          isExpanded={expandedCards[record.id]}
                          isDragging={draggedItem?.id === record.id}
                          guestDetails={getGuestNameDetails(record.guestId)}
                          warnings={getWarningsForGuest(record.guestId) || []}
                          onToggle={toggleCard}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onUpdateBagNumber={updateLaundryBagNumber}
                          onUpdateStatus={processStatusChange}
                          onCancel={cancelLaundryRecord}
                          statusOptions={OFFSITE_STATUS_OPTIONS}
                        />
                      ))
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
