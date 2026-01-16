import React, { useState, useMemo } from "react";
import {
  Ban,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  X,
  Clock,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { useAuth } from "../context/useAuth";
import { todayPacificDateString } from "../utils/date";
import toast from "react-hot-toast";

/**
 * SlotBlockManager - Allows staff/admin to block specific time slots
 * when there is no staff available to cover them.
 * 
 * @param {string} serviceType - "shower" or "laundry"
 */
const SlotBlockManager = ({ serviceType = "shower" }) => {
  const {
    allShowerSlots,
    allLaundrySlots,
    blockedSlots,
    blockSlot,
    unblockSlot,
    showerRecords,
    laundrySlots,
  } = useAppContext();

  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [isBlocking, setIsBlocking] = useState(false);

  const todayString = todayPacificDateString();

  // Only admin and staff users can manage blocked slots
  const canManageSlots = user?.role === "admin" || user?.role === "staff";

  const allSlots = serviceType === "shower" ? allShowerSlots : allLaundrySlots;
  const serviceLabel = serviceType === "shower" ? "Shower" : "Laundry";
  const bgColor = serviceType === "shower" ? "bg-blue-50" : "bg-purple-50";
  const borderColor = serviceType === "shower" ? "border-blue-200" : "border-purple-200";
  const buttonColor = serviceType === "shower" 
    ? "bg-blue-600 hover:bg-blue-700" 
    : "bg-purple-600 hover:bg-purple-700";

  // Get blocked slots for this service type and today
  const blockedForToday = useMemo(() => {
    if (!canManageSlots) return [];
    return (blockedSlots || []).filter(
      (slot) => slot.serviceType === serviceType && slot.date === todayString
    );
  }, [blockedSlots, serviceType, todayString, canManageSlots]);

  const blockedSlotTimes = useMemo(() => {
    return new Set(blockedForToday.map((s) => s.slotTime));
  }, [blockedForToday]);

  if (!canManageSlots) {
    return null;
  }

  // Check if a slot already has bookings
  const getSlotBookings = (slotTime) => {
    if (serviceType === "shower") {
      return (showerRecords || []).filter(
        (r) => r.time === slotTime && r.date?.startsWith?.(todayString)
      );
    } else {
      return (laundrySlots || []).filter((s) => s.time === slotTime);
    }
  };

  const formatSlotLabel = (slotTime) => {
    if (!slotTime) return "";
    // Handle laundry slots that may be ranges like "08:30 - 10:00"
    if (slotTime.includes(" - ")) {
      return slotTime;
    }
    const [hours, minutes] = slotTime.split(":").map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const toggleSlotSelection = (slotTime) => {
    setSelectedSlots((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(slotTime)) {
        newSet.delete(slotTime);
      } else {
        newSet.add(slotTime);
      }
      return newSet;
    });
  };

  const handleBlockSelected = async () => {
    if (selectedSlots.size === 0) {
      toast.error("Please select at least one slot to block");
      return;
    }

    // Check if any selected slots have existing bookings
    const slotsWithBookings = Array.from(selectedSlots).filter(
      (slotTime) => getSlotBookings(slotTime).length > 0
    );

    if (slotsWithBookings.length > 0) {
      const confirmed = window.confirm(
        `${slotsWithBookings.length} slot(s) have existing bookings. Blocking these slots will NOT automatically cancel existing bookings. Do you want to continue?`
      );
      if (!confirmed) return;
    }

    setIsBlocking(true);
    try {
      for (const slotTime of selectedSlots) {
        if (!blockedSlotTimes.has(slotTime)) {
          await blockSlot(serviceType, slotTime, todayString);
        }
      }
      toast.success(`Blocked ${selectedSlots.size} ${serviceLabel.toLowerCase()} slot(s)`);
      setSelectedSlots(new Set());
    } catch (err) {
      toast.error(err.message || "Failed to block slots");
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockSlot = async (slotTime) => {
    try {
      await unblockSlot(serviceType, slotTime, todayString);
      toast.success(`Unblocked ${formatSlotLabel(slotTime)}`);
    } catch (err) {
      toast.error(err.message || "Failed to unblock slot");
    }
  };

  const handleUnblockAll = async () => {
    if (blockedForToday.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to unblock all ${blockedForToday.length} slot(s)?`
    );
    if (!confirmed) return;

    try {
      for (const slot of blockedForToday) {
        await unblockSlot(serviceType, slot.slotTime, todayString);
      }
      toast.success(`Unblocked all ${serviceLabel.toLowerCase()} slots`);
    } catch (err) {
      toast.error(err.message || "Failed to unblock slots");
    }
  };

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Ban size={16} className="text-red-500" />
          <span className="text-sm font-medium text-gray-700">
            Manage Blocked {serviceLabel} Slots
          </span>
          {blockedForToday.length > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {blockedForToday.length} blocked
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-gray-500" />
        ) : (
          <ChevronDown size={18} className="text-gray-500" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 bg-white/80">
          <div className="pt-3">
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Staff Scheduling Tool</p>
                <p className="mt-1">
                  Block slots when no staff is available. Blocked slots cannot be
                  assigned to guests. This only affects today's schedule.
                </p>
              </div>
            </div>

            {/* Currently Blocked Slots */}
            {blockedForToday.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Currently Blocked
                  </h4>
                  <button
                    onClick={handleUnblockAll}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline"
                  >
                    Unblock All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {blockedForToday.map((slot) => (
                    <div
                      key={slot.slotTime}
                      className="flex items-center gap-1.5 bg-red-100 text-red-800 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      <Clock size={14} />
                      <span>{formatSlotLabel(slot.slotTime)}</span>
                      <button
                        onClick={() => handleUnblockSlot(slot.slotTime)}
                        className="ml-1 p-0.5 hover:bg-red-200 rounded transition-colors"
                        title="Unblock this slot"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Slots to Block */}
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Select Slots to Block
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {allSlots.map((slotTime) => {
                  const isBlocked = blockedSlotTimes.has(slotTime);
                  const isSelected = selectedSlots.has(slotTime);
                  const bookings = getSlotBookings(slotTime);
                  const hasBookings = bookings.length > 0;

                  if (isBlocked) return null; // Don't show already blocked slots

                  return (
                    <button
                      key={slotTime}
                      onClick={() => toggleSlotSelection(slotTime)}
                      className={`relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                        isSelected
                          ? "bg-red-100 border-red-400 text-red-800 shadow-sm"
                          : hasBookings
                            ? "bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-400"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        <span className="font-medium">{formatSlotLabel(slotTime)}</span>
                      </div>
                      {hasBookings && (
                        <span className="text-xs text-amber-600">
                          {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                          <Check size={10} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedSlots.size > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedSlots.size} slot{selectedSlots.size !== 1 ? "s" : ""} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedSlots(new Set())}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={handleBlockSelected}
                      disabled={isBlocking}
                      className={`px-4 py-1.5 text-sm text-white rounded-lg transition-colors flex items-center gap-2 ${buttonColor} disabled:opacity-50`}
                    >
                      <Ban size={14} />
                      {isBlocking ? "Blocking..." : "Block Selected"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlotBlockManager;
