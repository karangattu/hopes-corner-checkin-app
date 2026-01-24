import React, { memo } from "react";
import {
    Shirt,
    Bed,
    Backpack,
    TentTree,
    Footprints,
    Layers,
    CheckCircle2Icon,
    Circle,
    ShowerHead,
    AlertTriangle,
    Clock,
    History,
    CalendarClock,
    RotateCcw,
    Sparkles,
    Trash2,
    WashingMachine,
} from "lucide-react";
import { animated as Animated } from "../utils/animations";
import { WaiverBadge } from "./ui/WaiverBadge";
import Selectize from "./Selectize";
import toast from "react-hot-toast";
import ReminderBadge from "./guest/ReminderBadge";

const CompactShowerCard = memo(({
    record,
    guest,
    index,
    section,
    isExpanded,
    onToggleExpand,
    animationStyle,
    // Context functions
    canGiveItem,
    getDaysUntilAvailable,
    getLastGivenItem,
    giveItem,
    getWarningsForGuest,
    updateShowerStatus,
    rescheduleShower,
    cancelShowerRecord,
    // Undo support
    actionHistory = [],
    undoAction,
    // Data
    showerSlotOptions,
    laundryLinked,
    // Helpers
    formatShowerSlotLabel,
    onCloseModal, // Optional, for closing modal on completion
}) => {
    if (!record) return null;

    const guestName = guest?.preferredName || guest?.name || `${guest?.firstName || ""} ${guest?.lastName || ""}`.trim() || "Unknown Guest";
    const nameDetails = {
        primaryName: guestName,
        hasPreferred: Boolean(guest?.preferredName),
        legalName: guest?.name || `${guest?.firstName || ""} ${guest?.lastName || ""}`.trim()
    };

    // Essentials logic
    const canT = guest ? canGiveItem(guest.id, "tshirt") : false;
    const canSB = guest ? canGiveItem(guest.id, "sleeping_bag") : false;
    const canBP = guest ? canGiveItem(guest.id, "backpack") : false;
    const canTent = guest ? canGiveItem(guest.id, "tent") : false;
    const canFF = guest ? canGiveItem(guest.id, "flip_flops") : false;
    const canJacket = guest ? canGiveItem(guest.id, "jacket") : false;

    const daysT = guest ? getDaysUntilAvailable(guest.id, "tshirt") : 0;
    const daysSB = guest ? getDaysUntilAvailable(guest.id, "sleeping_bag") : 0;
    const daysBP = guest ? getDaysUntilAvailable(guest.id, "backpack") : 0;
    const daysTent = guest ? getDaysUntilAvailable(guest.id, "tent") : 0;
    const daysFF = guest ? getDaysUntilAvailable(guest.id, "flip_flops") : 0;
    const daysJacket = guest ? getDaysUntilAvailable(guest.id, "jacket") : 0;

    const lastTGuest = guest ? getLastGivenItem(guest.id, "tshirt") : null;
    const lastSBGuest = guest ? getLastGivenItem(guest.id, "sleeping_bag") : null;
    const lastBPGuest = guest ? getLastGivenItem(guest.id, "backpack") : null;
    const lastTentGuest = guest ? getLastGivenItem(guest.id, "tent") : null;
    const lastFFGuest = guest ? getLastGivenItem(guest.id, "flip_flops") : null;
    const lastJacketGuest = guest ? getLastGivenItem(guest.id, "jacket") : null;

    const isDone = record.status === "done";
    const slotLabel = formatShowerSlotLabel ? formatShowerSlotLabel(record.time) : record.time;
    const bookedLabel = new Date(record.date).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });

    const getStatusInfo = (status) => {
        switch (status) {
            case "done":
                return {
                    label: "Completed",
                    icon: CheckCircle2Icon,
                    badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
                };
            case "awaiting":
            default:
                return {
                    label: "Awaiting",
                    icon: Circle,
                    badgeClass: "bg-blue-50 text-blue-700 border border-blue-200",
                };
        }
    };

    const statusInfo = getStatusInfo(record.status);
    const StatusIcon = statusInfo.icon;
    const isWaitlisted = record.status === "waitlisted";
    const queuePosition = section === "active" || section === "waitlist" ? index + 1 : null;
    const isPriority = isWaitlisted && queuePosition <= 2;

    const essentialsConfig = guest
        ? [
            {
                key: "tshirt",
                label: "T-Shirt",
                buttonLabel: "Give T-Shirt",
                icon: Shirt,
                canGive: canT,
                lastRecord: lastTGuest,
                daysRemaining: daysT,
                successMessage: "T-Shirt given",
            },
            {
                key: "sleeping_bag",
                label: "Sleeping Bag",
                buttonLabel: "Give Sleeping Bag",
                icon: Bed,
                canGive: canSB,
                lastRecord: lastSBGuest,
                daysRemaining: daysSB,
                successMessage: "Sleeping bag given",
            },
            {
                key: "backpack",
                label: "Backpack/Duffel Bag",
                buttonLabel: "Give Backpack/Duffel Bag",
                icon: Backpack,
                canGive: canBP,
                lastRecord: lastBPGuest,
                daysRemaining: daysBP,
                successMessage: "Backpack/Duffel Bag given",
            },
            {
                key: "tent",
                label: "Tent",
                buttonLabel: "Give Tent",
                icon: TentTree,
                canGive: canTent,
                lastRecord: lastTentGuest,
                daysRemaining: daysTent,
                successMessage: "Tent given",
            },
            {
                key: "flip_flops",
                label: "Flip Flops",
                buttonLabel: "Give Flip Flops",
                icon: Footprints,
                canGive: canFF,
                lastRecord: lastFFGuest,
                daysRemaining: daysFF,
                successMessage: "Flip Flops given",
            },
            {
                key: "jacket",
                label: "Jacket",
                buttonLabel: "Give Jacket",
                icon: Layers,
                canGive: canJacket,
                lastRecord: lastJacketGuest,
                daysRemaining: daysJacket,
                successMessage: "Jacket given",
            },
        ]
        : [];

    const availableItems = essentialsConfig.filter((i) => i.canGive);

    const handleGiveItem = (itemKey, successMessage) => {
        if (!guest) return;
        try {
            giveItem(guest.id, itemKey);
            toast.success(successMessage);
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Find the most recent ITEM_GIVEN action for this guest and item (for undo)
    const findItemAction = (itemKey) => {
        if (!guest || !actionHistory || actionHistory.length === 0) return null;
        return actionHistory.find(
            (a) =>
                a.type === "ITEM_GIVEN" &&
                a.data?.guestId === guest.id &&
                a.data?.item === itemKey
        );
    };

    const handleUndoItem = async (action, itemLabel) => {
        if (!action || !undoAction) return;
        try {
            const success = await undoAction(action.id);
            if (success) {
                toast.success(`Undid ${itemLabel}`);
            } else {
                toast.error(`Unable to undo ${itemLabel}`);
            }
        } catch (error) {
            toast.error(error.message || `Unable to undo ${itemLabel}`);
        }
    };

    return (
        <Animated.div
            style={animationStyle}
            className={`will-change-transform bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 focus-within:z-50 relative ${isDone
                ? "border-emerald-100 bg-emerald-50/30"
                : "border-blue-100 hover:border-blue-200 hover:shadow-md"
                }`}
        >
            <div className="p-4 sm:p-5">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                    <div className="flex items-start gap-4 min-w-0">
                        {/* Status Icon/Queue Number */}
                        <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl ${isDone
                            ? "bg-emerald-100 text-emerald-600"
                            : isPriority
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                                : isWaitlisted
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-blue-100 text-blue-600"
                            }`}>
                            {isDone ? (
                                <CheckCircle2Icon size={24} />
                            ) : (
                                <div className="flex flex-col items-center leading-none">
                                    {isWaitlisted && <span className="text-[8px] uppercase font-bold mb-0.5">{isPriority ? "Next" : "Wait"}</span>}
                                    <span className="text-lg font-bold">
                                        {queuePosition ? `#${queuePosition}` : <ShowerHead size={24} />}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-gray-900 truncate">
                                    {nameDetails.primaryName}
                                </h3>
                                {nameDetails.hasPreferred && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        Legal: {nameDetails.legalName}
                                    </span>
                                )}
                                {isPriority && (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wide animate-pulse">
                                        Priority
                                    </span>
                                )}
                                {/* Reminder Badge - must be dismissed before service */}
                                <ReminderBadge 
                                    guestId={record.guestId} 
                                    guestName={nameDetails.primaryName}
                                    size="sm"
                                />
                                {(() => {
                                    const warnings = getWarningsForGuest ? getWarningsForGuest(record.guestId) : [];
                                    return warnings.length > 0 ? (
                                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1">
                                            <AlertTriangle size={12} />
                                            ⚠️ Warning
                                        </span>
                                    ) : null;
                                })()}
                            </div>

                            {/* Warning Messages Display */}
                            {(() => {
                                const warnings = getWarningsForGuest ? getWarningsForGuest(record.guestId) : [];
                                return warnings.length > 0 ? (
                                    <div className="space-y-2 mt-2">
                                        {warnings.map((warning) => (
                                            <div
                                                key={warning.id}
                                                className={`p-2 rounded text-xs border ${warning.severity >= 3
                                                    ? "bg-red-50 border-red-200"
                                                    : warning.severity === 2
                                                        ? "bg-orange-50 border-orange-200"
                                                        : "bg-yellow-50 border-yellow-200"
                                                    }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${warning.severity >= 3
                                                        ? "text-red-600"
                                                        : warning.severity === 2
                                                            ? "text-orange-600"
                                                            : "text-yellow-600"
                                                        }`} />
                                                    <div className="flex-1">
                                                        <p className={`font-semibold ${warning.severity >= 3
                                                            ? "text-red-800"
                                                            : warning.severity === 2
                                                                ? "text-orange-800"
                                                                : "text-yellow-800"
                                                            }`}>
                                                            {warning.message}
                                                        </p>
                                                        {warning.createdAt && (
                                                            <p className="text-[10px] text-gray-600 mt-1">
                                                                {new Date(warning.createdAt).toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null;
                            })()}

                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} className={isWaitlisted ? "text-amber-500" : "text-blue-500"} />
                                    <span className="font-medium text-gray-700">
                                        {isWaitlisted ? `Joined ${bookedLabel}` : slotLabel}
                                    </span>
                                </div>
                                {isWaitlisted && (
                                    <>
                                        <span className="text-gray-300">•</span>
                                        <div className="flex items-center gap-1.5">
                                            <History size={14} />
                                            <span>Waiting {Math.round((Date.now() - new Date(record.date).getTime()) / 60000)}m</span>
                                        </div>
                                    </>
                                )}
                                {!isWaitlisted && (
                                    <>
                                        <span className="text-gray-300">•</span>
                                        <div className="flex items-center gap-1.5">
                                            <CalendarClock size={14} />
                                            <span>Added {bookedLabel}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <span className={`${statusInfo.badgeClass} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5`}>
                            <StatusIcon size={14} />
                            {statusInfo.label}
                        </span>
                        {!isDone && section !== "modal" && (
                            <div className="ml-2">
                                <WaiverBadge guestId={record.guestId} serviceType="shower" />
                            </div>
                        )}
                        {laundryLinked && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1">
                                <WashingMachine size={12} />
                                Laundry Linked
                            </span>
                        )}
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Primary Action */}
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                const nextStatus = isDone ? "awaiting" : "done";
                                const success = await updateShowerStatus(record.id, nextStatus);
                                if (success) {
                                    toast.success(nextStatus === "done" ? "Shower completed!" : "Shower reopened");
                                    // Close modal if this is being shown in the modal context
                                    if (section === "modal" && nextStatus === "done" && onCloseModal) {
                                        onCloseModal();
                                    }
                                }
                            } catch (error) {
                                toast.error(error.message);
                            }
                        }}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${isDone
                            ? "bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            : isWaitlisted
                                ? "bg-amber-600 text-white hover:bg-amber-700 hover:shadow-amber-200"
                                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200"
                            }`}
                    >
                        {isDone ? (
                            <>
                                <RotateCcw size={18} />
                                Reopen
                            </>
                        ) : (
                            <>
                                <CheckCircle2Icon size={18} />
                                {isWaitlisted ? "Mark Complete" : "Complete Shower"}
                            </>
                        )}
                    </button>

                    {/* Reschedule / Assign */}
                    <div className="flex-1 sm:flex-none min-w-[180px]">
                        <Selectize
                            options={showerSlotOptions}
                            value={record.time || ""}
                            onChange={async (time) => {
                                try {
                                    const updated = await rescheduleShower(record.id, time);
                                    if (!updated || updated.time !== time) return;
                                    if (record.status === "waitlisted") {
                                        await updateShowerStatus(record.id, "awaiting");
                                    }
                                    toast.success(`Moved to ${formatShowerSlotLabel ? formatShowerSlotLabel(time) : time}`);
                                } catch (error) {
                                    toast.error(error.message);
                                }
                            }}
                            size="sm"
                            className="w-full"
                            buttonClassName={`w-full !rounded-xl !border-2 !py-2.5 !px-4 !font-bold !transition-all !shadow-sm ${isDone
                                ? "!border-emerald-100 !text-emerald-700 hover:!bg-emerald-50"
                                : "!border-blue-100 !text-blue-700 hover:!bg-blue-50"
                                }`}
                            placeholder={isWaitlisted ? "Assign to slot..." : "Reschedule..."}
                            displayValue={record.time ? `Move: ${(formatShowerSlotLabel ? formatShowerSlotLabel(record.time) : record.time)}` : isWaitlisted ? "Assign Slot" : "Reschedule"}
                        />
                    </div>

                    {/* More Actions */}
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            type="button"
                            onClick={() => onToggleExpand(record.id)}
                            className={`p-2.5 rounded-xl border-2 transition-all ${isExpanded
                                ? "bg-blue-50 border-blue-200 text-blue-600"
                                : "bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700"
                                }`}
                            title="Essentials & Notes"
                        >
                            <Sparkles size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm("Are you sure you want to cancel this booking?")) {
                                    try {
                                        cancelShowerRecord(record.id);
                                        toast.success("Booking cancelled");
                                        if (onCloseModal) onCloseModal();
                                    } catch (error) {
                                        toast.error(error.message);
                                    }
                                }
                            }}
                            className="p-2.5 rounded-xl border-2 border-gray-100 text-gray-400 hover:border-red-100 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="Cancel Booking"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="mt-5 pt-5 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Essentials Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <Sparkles size={14} />
                                        Essentials Kit
                                    </h4>
                                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                        {availableItems.length} available
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    {essentialsConfig.map((item) => {
                                        const Icon = item.icon;
                                        const isAvailable = item.canGive;
                                        const itemAction = findItemAction(item.key);
                                        const canUndo = Boolean(itemAction && undoAction);

                                        return (
                                            <div
                                                key={item.key}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isAvailable
                                                    ? "bg-white border-emerald-100 hover:border-emerald-300"
                                                    : canUndo
                                                        ? "bg-orange-50 border-orange-200"
                                                        : "bg-gray-50 border-gray-100 opacity-75"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`p-2 rounded-lg ${isAvailable ? "bg-emerald-50 text-emerald-600" : canUndo ? "bg-orange-100 text-orange-600" : "bg-gray-200 text-gray-400"
                                                        }`}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-gray-900 truncate">
                                                            {item.label}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">
                                                            {canUndo ? (
                                                                <span className="text-orange-600 font-medium">Just given - can undo</span>
                                                            ) : isAvailable ? (
                                                                item.lastRecord ? (
                                                                    `Last: ${new Date(item.lastRecord.date).toLocaleDateString()}`
                                                                ) : (
                                                                    <span className="text-emerald-600 font-medium">Never given</span>
                                                                )
                                                            ) : (
                                                                <span className="text-amber-600">
                                                                    Available in {item.daysRemaining} days
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {canUndo && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUndoItem(itemAction, item.label)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm bg-orange-100 text-orange-700 hover:bg-orange-200 flex items-center gap-1"
                                                            title={`Undo ${item.label}`}
                                                        >
                                                            <RotateCcw size={12} />
                                                            Undo
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={!isAvailable}
                                                        onClick={() => handleGiveItem(item.key, item.successMessage)}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isAvailable
                                                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                            }`}
                                                    >
                                                        {item.buttonLabel}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </Animated.div>
    );
});

CompactShowerCard.displayName = "CompactShowerCard";

export default CompactShowerCard;
