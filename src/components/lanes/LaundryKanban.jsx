import { useState } from "react";
import {
  WashingMachine,
  ChevronDown,
  ChevronUp,
  CheckCircle2Icon,
  Clock,
  Trash2,
  GripVertical,
  Wind,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import { LAUNDRY_STATUS } from "../../context/constants";

const LaundryKanban = ({
  laundryRecords,
  guests,
  updateLaundryStatus,
  updateLaundryBagNumber,
  cancelLaundryRecord,
}) => {
  const [expandedCards, setExpandedCards] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);

  const getGuestNameDetails = (guestId) => {
    const guest = guests.find((g) => g.id === guestId) || null;
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
  };

  const toggleCard = (recordId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

  const handleDragStart = (e, record) => {
    setDraggedItem(record);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedItem && draggedItem.status !== newStatus) {
      updateLaundryStatus(draggedItem.id, newStatus);
      toast.success("Status updated");
    }
    setDraggedItem(null);
  };

  // Separate on-site and off-site records
  const onsiteRecords = laundryRecords.filter((r) => !r.offsite);
  const offsiteRecords = laundryRecords.filter((r) => r.offsite);

  const groupedOnsiteRecords = {
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
  };

  const groupedOffsiteRecords = {
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
  };

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

  const renderCard = (record, isOffsite = false) => {
    const nameDetails = getGuestNameDetails(record.guestId);
    const isExpanded = expandedCards[record.id];
    const isCompleted =
      record.status === LAUNDRY_STATUS.PICKED_UP ||
      record.status === LAUNDRY_STATUS.OFFSITE_PICKED_UP;

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
        className={`bg-white rounded-lg border-2 shadow-sm p-3 cursor-move transition-all hover:shadow-md ${
          draggedItem?.id === record.id ? "opacity-50" : ""
        } ${
          isCompleted
            ? "border-emerald-200 hover:border-emerald-300"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <GripVertical
              size={16}
              className="text-gray-400 flex-shrink-0 mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 truncate">
                {nameDetails.primaryName}
              </div>
              {nameDetails.hasPreferred && (
                <div className="text-[10px] text-gray-500 truncate">
                  Legal: {nameDetails.legalName}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleCard(record.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

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
                    updateLaundryStatus(record.id, e.target.value)
                  }
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
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
  };

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

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {onsiteColumns.map((column) => {
            const records = groupedOnsiteRecords[column.id];
            const Icon = column.icon;

            return (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`${column.bgClass} ${column.borderClass} border-2 rounded-xl p-4 min-h-[400px] transition-colors ${
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {offsiteColumns.map((column) => {
              const records = groupedOffsiteRecords[column.id];
              const Icon = column.icon;

              return (
                <div
                  key={column.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                  className={`${column.bgClass} ${column.borderClass} border-2 rounded-xl p-4 min-h-[400px] transition-colors ${
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
