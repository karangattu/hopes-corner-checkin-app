import React, { useMemo, useState, useCallback, memo } from "react";
import { ShowerHead, Clock, CheckCircle, ChevronDown, ChevronUp, AlertCircle, Eye } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";

// Memoized helper functions outside component to prevent recreation
const formatTimeLabel = (timeStr) => {
  if (!timeStr) return "—";
  const [hoursStr, minutesStr] = String(timeStr).split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const toMinutes = (timeStr) => {
  if (!timeStr) return Number.POSITIVE_INFINITY;
  const [h, m] = String(timeStr).split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
};

// Memoized status badge component
const StatusBadge = memo(({ status }) => {
  switch (status) {
    case "done":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <CheckCircle size={12} />
          Done
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <AlertCircle size={12} />
          Cancelled
        </span>
      );
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Clock size={12} />
          In Progress
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Clock size={12} />
          Booked
        </span>
      );
  }
});
StatusBadge.displayName = "StatusBadge";

// Memoized row component for better list performance
const ShowerRow = memo(({ booking, onGuestClick }) => {
  const handleClick = useCallback(() => {
    onGuestClick?.(booking.guestId, booking.id);
  }, [onGuestClick, booking.guestId, booking.id]);

  return (
    <div
      onClick={handleClick}
      className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-blue-50 cursor-pointer transition-colors duration-75 active:bg-blue-100"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">
          {booking.timeLabel}
        </span>
        <span className="font-medium text-gray-900 text-sm truncate">
          {booking.name}
        </span>
      </div>
      <StatusBadge status={booking.status} />
    </div>
  );
});
ShowerRow.displayName = "ShowerRow";

// Memoized done shower row
const DoneShowerRow = memo(({ booking, onGuestClick }) => {
  const handleClick = useCallback(() => {
    onGuestClick?.(booking.guestId, booking.id);
  }, [onGuestClick, booking.guestId, booking.id]);

  return (
    <div
      onClick={handleClick}
      className="px-4 py-2 flex items-center justify-between gap-3 hover:bg-emerald-50 cursor-pointer transition-colors duration-75 active:bg-emerald-100"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xs font-medium text-emerald-600 w-16 flex-shrink-0">
          {booking.timeLabel}
        </span>
        <span className="font-medium text-gray-700 text-sm truncate">
          {booking.name}
        </span>
      </div>
      <StatusBadge status={booking.status} />
    </div>
  );
});
DoneShowerRow.displayName = "DoneShowerRow";

// Memoized cancelled shower row
const CancelledShowerRow = memo(({ booking, onGuestClick }) => {
  const handleClick = useCallback(() => {
    onGuestClick?.(booking.guestId, booking.id);
  }, [onGuestClick, booking.guestId, booking.id]);

  return (
    <div
      onClick={handleClick}
      className="px-4 py-2 flex items-center justify-between gap-3 hover:bg-red-50 cursor-pointer transition-colors duration-75 active:bg-red-100"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xs font-medium text-red-600 w-16 flex-shrink-0">
          {booking.timeLabel}
        </span>
        <span className="font-medium text-gray-700 text-sm truncate">
          {booking.name}
        </span>
      </div>
      <StatusBadge status={booking.status} />
    </div>
  );
});
CancelledShowerRow.displayName = "CancelledShowerRow";

// Memoized waitlist row
const WaitlistRow = memo(({ guest, onGuestClick }) => {
  const handleClick = useCallback(() => {
    onGuestClick?.(guest.guestId, guest.id);
  }, [onGuestClick, guest.guestId, guest.id]);

  return (
    <div
      onClick={handleClick}
      className="px-4 py-2 flex items-center gap-3 hover:bg-amber-100 cursor-pointer transition-colors duration-75 active:bg-amber-200"
    >
      <span className="text-xs font-bold text-amber-600 w-6">
        #{guest.position}
      </span>
      <span className="font-medium text-amber-900 text-sm truncate">
        {guest.name}
      </span>
    </div>
  );
});
WaitlistRow.displayName = "WaitlistRow";

/**
 * CompactShowerList - A simplified read-only view of shower bookings
 * Shows guest name, time slot, and status in a compact format for quick reference
 * @param {Function} onGuestClick - Callback when a guest row is clicked, receives (guestId, recordId)
 * @param {string} viewDate - The date to view showers for (defaults to today)
 */
const CompactShowerList = memo(({ onGuestClick, viewDate }) => {
  const {
    showerRecords,
    guests,
    allShowerSlots,
  } = useAppContext();

  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const todayString = viewDate || todayPacificDateString();

  // Create a stable guest lookup map for efficient name resolution
  const guestMap = useMemo(() => {
    const map = new Map();
    (guests || []).forEach(g => map.set(g.id, g));
    return map;
  }, [guests]);

  // Helper function to get guest name - uses memoized map for performance
  const getGuestDisplayName = useCallback((guestId) => {
    const guest = guestMap.get(guestId);
    if (!guest) return "Unknown Guest";

    const fallback = "Unknown Guest";
    const legalName =
      guest.name ||
      `${guest.firstName || ""} ${guest.lastName || ""}`.trim() ||
      fallback;
    const preferredName = (guest.preferredName || "").trim();
    const hasPreferred =
      Boolean(preferredName) &&
      preferredName.toLowerCase() !== legalName.toLowerCase();
    const primaryName = hasPreferred ? preferredName : legalName;

    return primaryName;
  }, [guestMap]);

  // Filter today's records first - this is a lightweight operation
  const todaysRecords = useMemo(() => {
    return (showerRecords || []).filter(
      (record) => pacificDateStringFrom(record.date) === todayString
    );
  }, [showerRecords, todayString]);

  // Group bookings by time slot and sort by creation time within each slot
  // Separate useMemo for processed data to minimize recalculation
  const showerData = useMemo(() => {
    const booked = todaysRecords
      .filter(r => r.status !== "waitlisted")
      .sort((a, b) => {
        // First sort by time slot
        const timeDiff = toMinutes(a.time) - toMinutes(b.time);
        if (timeDiff !== 0) return timeDiff;
        // Within same slot, sort by createdAt (earlier first)
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      })
      .map(record => ({
        id: record.id,
        guestId: record.guestId,
        name: getGuestDisplayName(record.guestId),
        time: record.time,
        timeLabel: formatTimeLabel(record.time),
        status: record.status,
        createdAt: record.createdAt,
        lastUpdated: record.lastUpdated,
      }));

    const active = booked.filter(b => b.status !== "done" && b.status !== "cancelled");
    
    // Sort done showers by when they were actually completed (lastUpdated timestamp)
    // This maintains the order they were completed in the default view
    const done = todaysRecords
      .filter(r => r.status === "done")
      .sort((a, b) => {
        const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return aTime - bTime;
      })
      .map(record => ({
        id: record.id,
        guestId: record.guestId,
        name: getGuestDisplayName(record.guestId),
        time: record.time,
        timeLabel: formatTimeLabel(record.time),
        status: record.status,
        createdAt: record.createdAt,
        lastUpdated: record.lastUpdated,
      }));
    
    const cancelled = booked.filter(b => b.status === "cancelled");

    const waitlisted = todaysRecords
      .filter(r => r.status === "waitlisted")
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      })
      .map((record, index) => ({
        id: record.id,
        guestId: record.guestId,
        name: getGuestDisplayName(record.guestId),
        position: index + 1,
        createdAt: record.createdAt,
      }));

    const totalCapacity = (allShowerSlots?.length || 0) * 2;

    return { active, done, cancelled, waitlisted, totalCapacity };
  }, [todaysRecords, getGuestDisplayName, allShowerSlots]);

  // Memoized toggle handlers
  const toggleWaitlist = useCallback(() => setShowWaitlist(prev => !prev), []);
  const toggleDone = useCallback(() => setShowDone(prev => !prev), []);
  const toggleCancelled = useCallback(() => setShowCancelled(prev => !prev), []);

  if (showerData.active.length === 0 && showerData.done.length === 0 && showerData.cancelled.length === 0 && showerData.waitlisted.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShowerHead size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Showers Today</h3>
          <span className="text-xs text-gray-500 ml-auto flex items-center gap-1">
            <Eye size={12} /> Quick View
          </span>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">No shower bookings yet today</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-white px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShowerHead size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Showers Today</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Eye size={12} /> Quick View
            </span>
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {showerData.done.length}
            </span>
          </div>
        </div>
      </div>

      {/* Compact List */}
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {showerData.active.length === 0 && showerData.done.length > 0 && (
          <div className="px-4 py-8 text-center">
            <CheckCircle size={24} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-sm text-gray-500">All scheduled showers completed</p>
          </div>
        )}
        {showerData.active.map((booking) => (
          <ShowerRow key={booking.id} booking={booking} onGuestClick={onGuestClick} />
        ))}
      </div>

      {/* Done Showers Section */}
      {showerData.done.length > 0 && (
        <div className="border-t border-emerald-200 bg-emerald-50">
          <button
            type="button"
            onClick={toggleDone}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={14} />
              Done Showers ({showerData.done.length})
            </span>
            {showDone ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showDone && (
            <div className="divide-y divide-emerald-200/50 bg-white">
              {showerData.done.map((booking) => (
                <DoneShowerRow key={booking.id} booking={booking} onGuestClick={onGuestClick} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancelled Showers Section */}
      {showerData.cancelled.length > 0 && (
        <div className="border-t border-red-200 bg-red-50">
          <button
            type="button"
            onClick={toggleCancelled}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={14} />
              Cancelled ({showerData.cancelled.length})
            </span>
            {showCancelled ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showCancelled && (
            <div className="divide-y divide-red-200/50 bg-white">
              {showerData.cancelled.map((booking) => (
                <CancelledShowerRow key={booking.id} booking={booking} onGuestClick={onGuestClick} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Waitlist Section */}
      {showerData.waitlisted.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50">
          <button
            type="button"
            onClick={toggleWaitlist}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={14} />
              Waitlist ({showerData.waitlisted.length})
            </span>
            {showWaitlist ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showWaitlist && (
            <div className="divide-y divide-amber-200/50">
              {showerData.waitlisted.map((guest) => (
                <WaitlistRow key={guest.id} guest={guest} onGuestClick={onGuestClick} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CompactShowerList.displayName = "CompactShowerList";

export default CompactShowerList;