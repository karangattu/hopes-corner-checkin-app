import React, { useMemo, useState, useCallback, memo } from "react";
import { WashingMachine, Clock, CheckCircle, Package, Wind, Truck, ChevronDown, ChevronUp, Eye, AlertTriangle } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { useGuestsStore } from "../stores/useGuestsStore";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";
import { CompactWaiverIndicator } from "./ui/CompactWaiverIndicator";

// Memoized helper functions outside component to prevent recreation
const formatLaundrySlot = (slot) => {
  if (!slot) return "—";
  // Slot can be a range like "8:30 - 9:30"
  const [start] = String(slot).split(" - ");
  const [hoursStr, minutesStr] = String(start).split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return slot;
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const parseSlotStartMinutes = (slot) => {
  if (!slot) return Number.POSITIVE_INFINITY;
  const [start] = String(slot).split(" - ");
  const [h, m] = String(start).split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
};

// Memoized status badge component
const LaundryStatusBadge = memo(({ status, LAUNDRY_STATUS }) => {
  const statusConfig = {
    [LAUNDRY_STATUS?.WAITING]: { 
      icon: Clock, 
      label: "Waiting", 
      className: "bg-amber-100 text-amber-700" 
    },
    [LAUNDRY_STATUS?.WASHER]: { 
      icon: WashingMachine, 
      label: "Washer", 
      className: "bg-blue-100 text-blue-700" 
    },
    [LAUNDRY_STATUS?.DRYER]: { 
      icon: Wind, 
      label: "Dryer", 
      className: "bg-purple-100 text-purple-700" 
    },
    [LAUNDRY_STATUS?.DONE]: { 
      icon: Package, 
      label: "Done", 
      className: "bg-emerald-100 text-emerald-700" 
    },
    [LAUNDRY_STATUS?.PICKED_UP]: { 
      icon: CheckCircle, 
      label: "Picked Up", 
      className: "bg-green-100 text-green-700" 
    },
    [LAUNDRY_STATUS?.PENDING]: { 
      icon: Clock, 
      label: "Pending", 
      className: "bg-amber-100 text-amber-700" 
    },
    [LAUNDRY_STATUS?.TRANSPORTED]: { 
      icon: Truck, 
      label: "Transported", 
      className: "bg-blue-100 text-blue-700" 
    },
    [LAUNDRY_STATUS?.RETURNED]: { 
      icon: Package, 
      label: "Returned", 
      className: "bg-teal-100 text-teal-700" 
    },
    [LAUNDRY_STATUS?.OFFSITE_PICKED_UP]: { 
      icon: CheckCircle, 
      label: "Picked Up", 
      className: "bg-green-100 text-green-700" 
    },
  };

  const config = statusConfig[status] || { 
    icon: Clock, 
    label: status || "Unknown", 
    className: "bg-gray-100 text-gray-600" 
  };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
});
LaundryStatusBadge.displayName = "LaundryStatusBadge";

// Memoized active laundry row
const ActiveLaundryRow = memo(({ booking, onGuestClick, LAUNDRY_STATUS, hasWarning = false }) => {
  const handleClick = useCallback(() => {
    onGuestClick?.(booking.guestId, booking.id);
  }, [onGuestClick, booking.guestId, booking.id]);

  return (
    <div 
      onClick={handleClick}
      className={`px-4 py-2.5 flex items-center justify-between gap-3 ${onGuestClick ? "hover:bg-purple-50 cursor-pointer active:bg-purple-100" : "hover:bg-gray-50"} transition-colors duration-75`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">
          {booking.timeLabel}
        </span>
        <div className="min-w-0 flex-1">
          <span className="font-medium text-gray-900 text-sm truncate block">
            {booking.name}
          </span>
          {booking.bagNumber && (
            <span className="text-xs text-purple-600">Bag #{booking.bagNumber}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {hasWarning && (
          <div className="text-red-600 flex-shrink-0" title="⚠️ Guest has warning">
            <AlertTriangle size={14} />
          </div>
        )}
        <CompactWaiverIndicator guestId={booking.guestId} serviceType="laundry" />
        <LaundryStatusBadge status={booking.status} LAUNDRY_STATUS={LAUNDRY_STATUS} />
      </div>
    </div>
  );
});
ActiveLaundryRow.displayName = "ActiveLaundryRow";

// Memoized done laundry row
const DoneLaundryRow = memo(({ booking, onGuestClick, LAUNDRY_STATUS, hasWarning = false }) => {
  const handleClick = useCallback(() => {
    onGuestClick?.(booking.guestId, booking.id);
  }, [onGuestClick, booking.guestId, booking.id]);

  return (
    <div 
      onClick={handleClick}
      className={`px-4 py-2.5 flex items-center justify-between gap-3 ${onGuestClick ? "hover:bg-emerald-100 cursor-pointer active:bg-emerald-200" : "hover:bg-emerald-50"} transition-colors duration-75`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xs font-medium text-emerald-600 w-16 flex-shrink-0">
          {booking.timeLabel}
        </span>
        <div className="min-w-0 flex-1">
          <span className="font-medium text-gray-700 text-sm truncate block">
            {booking.name}
          </span>
          {booking.bagNumber && (
            <span className="text-xs text-emerald-600">Bag #{booking.bagNumber}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {hasWarning && (<div className="text-red-600 flex-shrink-0" title="⚠️ Guest has warning"><AlertTriangle size={14} /></div>)}
        <LaundryStatusBadge status={booking.status} LAUNDRY_STATUS={LAUNDRY_STATUS} />
      </div>
    </div>
  );
});
DoneLaundryRow.displayName = "DoneLaundryRow";

// Memoized offsite laundry row (active)
const OffsiteActiveRow = memo(({ item, onGuestClick, LAUNDRY_STATUS }) => {
  const handleClick = useCallback(() => {
    onGuestClick?.(item.guestId, item.id);
  }, [onGuestClick, item.guestId, item.id]);

  return (
    <div 
      onClick={handleClick}
      className={`px-4 py-2.5 flex items-center justify-between gap-3 ${onGuestClick ? "hover:bg-blue-100 cursor-pointer active:bg-blue-200" : ""} transition-colors duration-75`}
    >
      <div className="min-w-0 flex-1">
        <span className="font-medium text-blue-900 text-sm truncate block">
          {item.name}
        </span>
        {item.bagNumber && (
          <span className="text-xs text-blue-600">Bag #{item.bagNumber}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <CompactWaiverIndicator guestId={item.guestId} serviceType="laundry" />
        <LaundryStatusBadge status={item.status} LAUNDRY_STATUS={LAUNDRY_STATUS} />
      </div>
    </div>
  );
});
OffsiteActiveRow.displayName = "OffsiteActiveRow";

// Memoized offsite laundry row (done)
const OffsiteDoneRow = memo(({ item, onGuestClick, LAUNDRY_STATUS }) => {
  const handleClick = useCallback(() => {
    onGuestClick?.(item.guestId, item.id);
  }, [onGuestClick, item.guestId, item.id]);

  return (
    <div 
      onClick={handleClick}
      className={`px-4 py-2.5 flex items-center justify-between gap-3 bg-emerald-50/30 ${onGuestClick ? "hover:bg-emerald-100 cursor-pointer active:bg-emerald-200" : ""} transition-colors duration-75`}
    >
      <div className="min-w-0 flex-1">
        <span className="font-medium text-emerald-900 text-sm truncate block">
          {item.name}
        </span>
        {item.bagNumber && (
          <span className="text-xs text-emerald-600">Bag #{item.bagNumber}</span>
        )}
      </div>
      <LaundryStatusBadge status={item.status} LAUNDRY_STATUS={LAUNDRY_STATUS} />
    </div>
  );
});
OffsiteDoneRow.displayName = "OffsiteDoneRow";

/**
 * CompactLaundryList - A simplified read-only view of laundry bookings for a specific date
 * Shows guest name, time slot, and status in a compact format for quick reference
 * Can view today's laundry or travel back in time to see laundry from past dates
 * @param {string} viewDate - Optional date to view (YYYY-MM-DD format), defaults to today
 * @param {Function} onGuestClick - Optional callback when a guest row is clicked, receives (guestId, recordId)
 */
const CompactLaundryList = memo(({ viewDate = null, onGuestClick }) => {
  const getWarningsForGuest = useGuestsStore((state) => state.getWarningsForGuest);
  const {
    laundryRecords,
    guests,
    LAUNDRY_STATUS,
  } = useAppContext();

  const [showOffsite, setShowOffsite] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const todayString = todayPacificDateString();
  
  // Use provided viewDate or default to today
  const displayDate = viewDate || todayString;

  // Create completed status set for efficient lookup
  const completedStatuses = useMemo(() => new Set([
    LAUNDRY_STATUS?.DONE,
    LAUNDRY_STATUS?.PICKED_UP,
    LAUNDRY_STATUS?.RETURNED,
    LAUNDRY_STATUS?.OFFSITE_PICKED_UP,
  ]), [LAUNDRY_STATUS]);

  const isCompletedStatus = useCallback((status) => {
    return completedStatuses.has(status);
  }, [completedStatuses]);

  // Create a stable guest lookup map for efficient name resolution
  const guestMap = useMemo(() => {
    const map = new Map();
    (guests || []).forEach(g => map.set(g.id, g));
    return map;
  }, [guests]);

  // Helper function to get guest name - uses memoized map for performance
  const getGuestName = useCallback((guestId) => {
    const guest = guestMap.get(guestId);
    if (!guest) return "Guest";
    return guest.name || guest.preferredName || `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || "Guest";
  }, [guestMap]);

  // Filter target day records - lightweight first pass
  const targetDayRecords = useMemo(() => {
    return (laundryRecords || []).filter(
      (record) => pacificDateStringFrom(record.date) === displayDate
    );
  }, [laundryRecords, displayDate]);

  // Group laundry records by type and status
  const laundryData = useMemo(() => {
    const onsite = targetDayRecords
      .filter(r => r.laundryType !== "offsite")
      .sort((a, b) => {
        // First sort by time slot
        const timeDiff = parseSlotStartMinutes(a.time) - parseSlotStartMinutes(b.time);
        if (timeDiff !== 0) return timeDiff;
        // Within same slot, sort by createdAt
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      })
      .map(record => ({
        id: record.id,
        guestId: record.guestId,
        name: getGuestName(record.guestId),
        time: record.time,
        timeLabel: formatLaundrySlot(record.time),
        status: record.status,
        bagNumber: record.bagNumber,
      }));

    const onsiteActive = onsite.filter(item => !isCompletedStatus(item.status));
    const onsiteDone = onsite.filter(item => isCompletedStatus(item.status));

    const offsite = targetDayRecords
      .filter(r => r.laundryType === "offsite")
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      })
      .map(record => ({
        id: record.id,
        guestId: record.guestId,
        name: getGuestName(record.guestId),
        status: record.status,
        bagNumber: record.bagNumber,
      }));

    const offsiteActive = offsite.filter(item => !isCompletedStatus(item.status));
    const offsiteDone = offsite.filter(item => isCompletedStatus(item.status));

    return { onsiteActive, onsiteDone, offsiteActive, offsiteDone, total: targetDayRecords.length };
  }, [targetDayRecords, getGuestName, isCompletedStatus]);

  // Memoized toggle handlers
  const toggleOffsite = useCallback(() => setShowOffsite(prev => !prev), []);
  const toggleDone = useCallback(() => setShowDone(prev => !prev), []);

  // Determine if viewing a past date
  const isViewingPastDate = displayDate !== todayString;
  const dateLabel = isViewingPastDate
    ? (() => {
        const [year, month, day] = displayDate.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      })()
    : "Today";

  if (laundryData.total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <WashingMachine size={18} className="text-purple-600" />
          <h3 className="font-semibold text-gray-900 text-sm">
            Laundry {isViewingPastDate ? `(${dateLabel})` : "Today"}
          </h3>
          <span className="text-xs text-gray-500 ml-auto flex items-center gap-1">
            <Eye size={12} /> Quick View
          </span>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">
          No laundry bookings for {dateLabel.toLowerCase()}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-white px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WashingMachine size={18} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Laundry {isViewingPastDate ? `(${dateLabel})` : "Today"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Eye size={12} /> Quick View
            </span>
            <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {laundryData.total} total
            </span>
          </div>
        </div>
      </div>

      {/* On-site List */}
      {(laundryData.onsiteActive.length > 0 || laundryData.onsiteDone.length > 0) && (
        <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {laundryData.onsiteActive.length === 0 && laundryData.onsiteDone.length > 0 && (
            <div className="px-4 py-8 text-center">
              <CheckCircle size={24} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm text-gray-500">All on-site laundry completed</p>
            </div>
          )}
          {laundryData.onsiteActive.map((booking) => (
            <ActiveLaundryRow 
              key={booking.id} 
              booking={booking} 
              onGuestClick={onGuestClick} 
              LAUNDRY_STATUS={LAUNDRY_STATUS}
              hasWarning={getWarningsForGuest(booking.guestId)?.length > 0}
            />
          ))}
        </div>
      )}

      {/* Done Laundry Section */}
      {laundryData.onsiteDone.length > 0 && (
        <div className="border-t border-emerald-200 bg-emerald-50">
          <button
            type="button"
            onClick={toggleDone}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={14} />
              Done Laundry ({laundryData.onsiteDone.length})
            </span>
            {showDone ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showDone && (
            <div className="divide-y divide-emerald-200/50 bg-white">
              {laundryData.onsiteDone.map((booking) => (
                <DoneLaundryRow 
                  key={booking.id} 
                  booking={booking} 
                  onGuestClick={onGuestClick}
                  LAUNDRY_STATUS={LAUNDRY_STATUS}
                  hasWarning={getWarningsForGuest(booking.guestId)?.length > 0}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Off-site Section */}
      {(laundryData.offsiteActive.length > 0 || laundryData.offsiteDone.length > 0) && (
        <div className="border-t border-blue-200 bg-blue-50">
          <button
            type="button"
            onClick={toggleOffsite}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Truck size={14} />
              Off-site ({laundryData.offsiteActive.length + laundryData.offsiteDone.length})
            </span>
            {showOffsite ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showOffsite && (
            <div className="divide-y divide-blue-200/50">
              {laundryData.offsiteActive.map((item) => (
                <OffsiteActiveRow 
                  key={item.id} 
                  item={item} 
                  onGuestClick={onGuestClick}
                  LAUNDRY_STATUS={LAUNDRY_STATUS}
                />
              ))}
              {laundryData.offsiteDone.map((item) => (
                <OffsiteDoneRow 
                  key={item.id} 
                  item={item} 
                  onGuestClick={onGuestClick}
                  LAUNDRY_STATUS={LAUNDRY_STATUS}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CompactLaundryList.displayName = "CompactLaundryList";

export default CompactLaundryList;
