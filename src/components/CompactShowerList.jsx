import React, { useMemo, useState } from "react";
import { ShowerHead, Clock, CheckCircle, ChevronDown, ChevronUp, AlertCircle, Eye } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";

/**
 * CompactShowerList - A simplified read-only view of today's shower bookings
 * Shows guest name, time slot, and status in a compact format for quick reference
 */
const CompactShowerList = () => {
  const {
    showerRecords,
    guests,
    allShowerSlots,
  } = useAppContext();

  const [showWaitlist, setShowWaitlist] = useState(false);
  const todayString = todayPacificDateString();

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

  // Group bookings by time slot and sort by creation time within each slot
  const showerData = useMemo(() => {
    const todaysRecords = (showerRecords || []).filter(
      (record) => pacificDateStringFrom(record.date) === todayString
    );
    
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
      .map(record => {
        const guest = guests?.find(g => g.id === record.guestId);
        return {
          id: record.id,
          guestId: record.guestId,
          name: guest?.name || guest?.preferredName || `${guest?.firstName || ""} ${guest?.lastName || ""}`.trim() || "Guest",
          time: record.time,
          timeLabel: formatTimeLabel(record.time),
          status: record.status,
          createdAt: record.createdAt,
        };
      });

    const waitlisted = todaysRecords
      .filter(r => r.status === "waitlisted")
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      })
      .map((record, index) => {
        const guest = guests?.find(g => g.id === record.guestId);
        return {
          id: record.id,
          guestId: record.guestId,
          name: guest?.name || guest?.preferredName || `${guest?.firstName || ""} ${guest?.lastName || ""}`.trim() || "Guest",
          position: index + 1,
          createdAt: record.createdAt,
        };
      });

    const totalCapacity = (allShowerSlots?.length || 0) * 2;
    
    return { booked, waitlisted, totalCapacity };
  }, [showerRecords, guests, allShowerSlots, todayString]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "done":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle size={12} />
            Done
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
  };

  if (showerData.booked.length === 0 && showerData.waitlisted.length === 0) {
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
              {showerData.booked.length}/{showerData.totalCapacity}
            </span>
          </div>
        </div>
      </div>

      {/* Compact List */}
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {showerData.booked.map((booking) => (
          <div 
            key={booking.id}
            className={`px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 ${
              booking.status === "done" ? "bg-emerald-50/50" : ""
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-xs font-medium text-gray-500 w-16 flex-shrink-0">
                {booking.timeLabel}
              </span>
              <span className="font-medium text-gray-900 text-sm truncate">
                {booking.name}
              </span>
            </div>
            {getStatusBadge(booking.status)}
          </div>
        ))}
      </div>

      {/* Waitlist Section */}
      {showerData.waitlisted.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50">
          <button
            type="button"
            onClick={() => setShowWaitlist(!showWaitlist)}
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
                <div 
                  key={guest.id}
                  className="px-4 py-2 flex items-center gap-3"
                >
                  <span className="text-xs font-bold text-amber-600 w-6">
                    #{guest.position}
                  </span>
                  <span className="font-medium text-amber-900 text-sm truncate">
                    {guest.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompactShowerList;
