import React, { memo } from "react";
import {
    ChevronDown,
    ChevronUp,
    Package,
    Timer,
    Trash2,
    AlertTriangle,
} from "lucide-react";
import { CompactWaiverIndicator } from "../ui/CompactWaiverIndicator";
import { LAUNDRY_STATUS } from "../../context/constants";

/**
 * Calculates and formats time elapsed from an ISO timestamp to now
 */
const formatTimeElapsed = (isoTimestamp) => {
    if (!isoTimestamp) return null;

    try {
        const timestamp = new Date(isoTimestamp);
        if (isNaN(timestamp.getTime())) return null;

        const now = new Date();
        const diffMs = now - timestamp;

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

const formatSlotTime = (slotTime) => {
    if (!slotTime) return null;
    const [start] = String(slotTime).split(" - ");
    const [hoursStr, minutesStr] = String(start).split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return slotTime;
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const LaundryCard = memo(({
    record,
    isOffsite = false,
    isExpanded,
    isDragging,
    guestDetails,
    warnings,
    onToggle,
    onDragStart,
    onDragEnd,
    onUpdateBagNumber,
    onUpdateStatus,
    onCancel,
    statusOptions,
}) => {
    const isCompleted =
        record.status === LAUNDRY_STATUS.PICKED_UP ||
        record.status === LAUNDRY_STATUS.OFFSITE_PICKED_UP;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, record)}
            onDragEnd={onDragEnd}
            data-testid={`laundry-card-${record.id}`}
            style={{ willChange: isDragging ? 'transform, opacity' : 'auto' }}
            className={`bg-white rounded-lg border-2 shadow-sm p-3 cursor-move transition-all duration-75 hover:shadow-md ${isDragging ? "opacity-50 scale-105" : ""
                } ${isCompleted
                    ? "border-emerald-200 hover:border-emerald-300"
                    : "border-gray-200 hover:border-gray-300"
                }`}
        >
            <div className="flex items-center justify-between gap-1.5 mb-2 min-h-[24px]">
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs text-gray-900 leading-tight break-words line-clamp-2" title={guestDetails.displayName}>
                        {guestDetails.primaryName}
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {!isCompleted && (
                        <CompactWaiverIndicator guestId={record.guestId} serviceType="laundry" />
                    )}
                    {warnings.length > 0 && (
                        <div
                            className="text-red-600 flex-shrink-0"
                            title={`⚠️ ${warnings.length} warning${warnings.length > 1 ? 's' : ''}`}
                            aria-label={`Guest has warning${warnings.length > 1 ? 's' : ''}`}
                        >
                            <AlertTriangle size={14} />
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => onToggle(record.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                        aria-label={`${isExpanded ? "Collapse" : "Expand"
                            } laundry details for ${guestDetails.primaryName}`}
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {(guestDetails.hasPreferred || (!isOffsite && record.time)) && (
                <div className="text-[9px] text-gray-500 mb-2 line-clamp-1">
                    {guestDetails.hasPreferred && guestDetails.legalName}
                    {guestDetails.hasPreferred && !isOffsite && record.time && " • "}
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
                                    onUpdateBagNumber(record.id, e.target.value)
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
                                    onUpdateStatus(record, e.target.value)
                                }
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                                aria-label={`Update laundry status for ${guestDetails.primaryName}`}
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
                                        `Cancel laundry booking for ${guestDetails.primaryName}?`,
                                    )
                                ) {
                                    onCancel(record.id);
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
});

LaundryCard.displayName = "LaundryCard";

export default LaundryCard;
