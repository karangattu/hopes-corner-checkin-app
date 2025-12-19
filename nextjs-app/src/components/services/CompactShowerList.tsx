'use client';

import React, { useMemo, useState } from 'react';
import {
  Droplets,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { todayPacificDateString, pacificDateStringFrom } from '@/utils/date';

interface ShowerRecord {
  id: string;
  guestId: string;
  date: string | Date;
  time?: string;
  status?: 'booked' | 'in_progress' | 'done' | 'waitlisted';
  createdAt?: string | Date;
}

interface Guest {
  id: string;
  name?: string;
  preferredName?: string;
  firstName?: string;
  lastName?: string;
}

interface ShowerSlot {
  time: string;
}

interface CompactShowerListProps {
  showerRecords: ShowerRecord[];
  guests: Guest[];
  allShowerSlots?: ShowerSlot[];
}

function formatTimeLabel(timeStr?: string): string {
  if (!timeStr) return '—';
  const [hoursStr, minutesStr] = String(timeStr).split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function toMinutes(timeStr?: string): number {
  if (!timeStr) return Number.POSITIVE_INFINITY;
  const [h, m] = String(timeStr).split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function StatusBadge({ status }: { status?: string }) {
  switch (status) {
    case 'done':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
          <CheckCircle size={12} />
          Done
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
          <Clock size={12} />
          In Progress
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          <Clock size={12} />
          Booked
        </span>
      );
  }
}

export function CompactShowerList({
  showerRecords,
  guests,
  allShowerSlots,
}: CompactShowerListProps) {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const todayString = todayPacificDateString();

  const showerData = useMemo(() => {
    const todaysRecords = (showerRecords || []).filter(
      (record) => pacificDateStringFrom(record.date) === todayString
    );

    const getGuestName = (guestId: string): string => {
      const guest = guests?.find((g) => g.id === guestId);
      return (
        guest?.name ||
        guest?.preferredName ||
        `${guest?.firstName || ''} ${guest?.lastName || ''}`.trim() ||
        'Guest'
      );
    };

    const booked = todaysRecords
      .filter((r) => r.status !== 'waitlisted')
      .sort((a, b) => {
        const timeDiff = toMinutes(a.time) - toMinutes(b.time);
        if (timeDiff !== 0) return timeDiff;
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      })
      .map((record) => ({
        id: record.id,
        guestId: record.guestId,
        name: getGuestName(record.guestId),
        time: record.time,
        timeLabel: formatTimeLabel(record.time),
        status: record.status,
        createdAt: record.createdAt,
      }));

    const waitlisted = todaysRecords
      .filter((r) => r.status === 'waitlisted')
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      })
      .map((record, index) => ({
        id: record.id,
        guestId: record.guestId,
        name: getGuestName(record.guestId),
        position: index + 1,
        createdAt: record.createdAt,
      }));

    const totalCapacity = (allShowerSlots?.length || 0) * 2;

    return { booked, waitlisted, totalCapacity };
  }, [showerRecords, guests, allShowerSlots, todayString]);

  if (showerData.booked.length === 0 && showerData.waitlisted.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Droplets size={18} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            Showers Today
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto flex items-center gap-1">
            <Eye size={12} /> Quick View
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No shower bookings yet today
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-white dark:to-gray-800 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Showers Today
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Eye size={12} /> Quick View
            </span>
            <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {showerData.booked.length}/{showerData.totalCapacity}
            </span>
          </div>
        </div>
      </div>

      {/* Compact List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
        {showerData.booked.map((booking) => (
          <div
            key={booking.id}
            className={`px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              booking.status === 'done'
                ? 'bg-emerald-50/50 dark:bg-emerald-900/20'
                : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
                {booking.timeLabel}
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                {booking.name}
              </span>
            </div>
            <StatusBadge status={booking.status} />
          </div>
        ))}
      </div>

      {/* Waitlist Section */}
      {showerData.waitlisted.length > 0 && (
        <div className="border-t border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30">
          <button
            type="button"
            onClick={() => setShowWaitlist(!showWaitlist)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={14} />
              Waitlist ({showerData.waitlisted.length})
            </span>
            {showWaitlist ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showWaitlist && (
            <div className="divide-y divide-amber-200/50 dark:divide-amber-700/50">
              {showerData.waitlisted.map((guest) => (
                <div key={guest.id} className="px-4 py-2 flex items-center gap-3">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 w-6">
                    #{guest.position}
                  </span>
                  <span className="font-medium text-amber-900 dark:text-amber-200 text-sm truncate">
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
}

export default CompactShowerList;
