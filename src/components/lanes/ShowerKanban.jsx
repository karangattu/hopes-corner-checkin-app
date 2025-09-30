import { useState } from "react";
import {
  ShowerHead,
  ChevronDown,
  ChevronUp,
  CheckCircle2Icon,
  Clock,
  Trash2,
  GripVertical,
} from "lucide-react";
import toast from "react-hot-toast";

const ShowerKanban = ({
  showerRecords,
  guests,
  updateShowerStatus,
  cancelShowerRecord,
  formatShowerSlotLabel,
}) => {
  const [expandedCards, setExpandedCards] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);

  const SHOWER_STATUS = {
    AWAITING: "awaiting",
    DONE: "done",
  };

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
      updateShowerStatus(draggedItem.id, newStatus);
      toast.success("Status updated");
    }
    setDraggedItem(null);
  };

  const groupedRecords = {
    [SHOWER_STATUS.AWAITING]: showerRecords.filter(
      (r) => r.status === SHOWER_STATUS.AWAITING,
    ),
    [SHOWER_STATUS.DONE]: showerRecords.filter(
      (r) => r.status === SHOWER_STATUS.DONE,
    ),
  };

  const columns = [
    {
      id: SHOWER_STATUS.AWAITING,
      title: "Awaiting",
      icon: Clock,
      color: "blue",
      bgClass: "bg-blue-50",
      borderClass: "border-blue-200",
      textClass: "text-blue-700",
      iconClass: "text-blue-600",
      badgeClass: "bg-blue-100 text-blue-700",
    },
    {
      id: SHOWER_STATUS.DONE,
      title: "Completed",
      icon: CheckCircle2Icon,
      color: "emerald",
      bgClass: "bg-emerald-50",
      borderClass: "border-emerald-200",
      textClass: "text-emerald-700",
      iconClass: "text-emerald-600",
      badgeClass: "bg-emerald-100 text-emerald-700",
    },
  ];

  const renderCard = (record) => {
    const nameDetails = getGuestNameDetails(record.guestId);
    const isExpanded = expandedCards[record.id];
    const isDone = record.status === SHOWER_STATUS.DONE;
    const timeLabel = formatShowerSlotLabel
      ? formatShowerSlotLabel(record.time)
      : record.time || "No slot";

    return (
      <div
        key={record.id}
        draggable
        onDragStart={(e) => handleDragStart(e, record)}
        className={`bg-white rounded-lg border-2 shadow-sm p-3 cursor-move transition-all hover:shadow-md ${
          draggedItem?.id === record.id ? "opacity-50" : ""
        } ${
          isDone
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
          <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
            <Clock size={12} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <span>{timeLabel}</span>
          </div>

          {record.laundry && (
            <div className="text-xs bg-purple-50 border border-purple-100 rounded px-2 py-1">
              <span className="font-semibold text-purple-700">
                + Laundry booked
              </span>
            </div>
          )}

          {isExpanded && (
            <div className="pt-2 mt-2 border-t border-gray-100 space-y-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Status
                </label>
                <select
                  value={record.status || SHOWER_STATUS.AWAITING}
                  onChange={(e) => updateShowerStatus(record.id, e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                >
                  <option value={SHOWER_STATUS.AWAITING}>Awaiting</option>
                  <option value={SHOWER_STATUS.DONE}>Completed</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Cancel shower booking for ${nameDetails.primaryName}?`,
                    )
                  ) {
                    cancelShowerRecord(record.id);
                    toast.success("Shower booking cancelled");
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShowerHead className="text-blue-600" size={22} />
            Showers - Kanban Board
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Drag and drop cards between columns to update status
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-gray-100 text-gray-700 font-medium px-3 py-1 rounded-full">
            {showerRecords.length} total
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {columns.map((column) => {
          const records = groupedRecords[column.id];
          const Icon = column.icon;

          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`${column.bgClass} ${column.borderClass} border-2 rounded-xl p-4 min-h-[400px] transition-colors ${
                draggedItem?.status !== column.id
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
                    <p>No showers in this stage</p>
                    <p className="mt-1 text-[10px]">
                      Drag cards here to update
                    </p>
                  </div>
                ) : (
                  records.map((record) => renderCard(record))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShowerKanban;
