'use client';

import React, { useMemo, useState } from 'react';
import {
  WashingMachine,
  Clock,
  CheckCircle,
  Package,
  Wind,
  Truck,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import { todayPacificDateString, pacificDateStringFrom } from '@/utils/date';

// Laundry status constants
const LAUNDRY_STATUS = {
  WAITING: 'waiting',
  WASHER: 'washer',
  DRYER: 'dryer',
  DONE: 'done',
  PICKED_UP: 'picked_up',
  PENDING: 'pending',
  TRANSPORTED: 'transported',
  RETURNED: 'returned',
  OFFSITE_PICKED_UP: 'offsite_picked_up',
} as const;

type LaundryStatus = (typeof LAUNDRY_STATUS)[keyof typeof LAUNDRY_STATUS] | string;

interface LaundryRecord {
  id: string;
  guestId: string;
  date: string | Date;
  time?: string;
  status?: LaundryStatus;
  laundryType?: 'onsite' | 'offsite';
  bagNumber?: string | number;
  createdAt?: string | Date;
}

interface Guest {
  id: string;
  name?: string;
  preferredName?: string;
  firstName?: string;
  lastName?: string;
}

interface CompactLaundryListProps {
  laundryRecords: LaundryRecord[];
  guests: Guest[];
  viewDate?: string | null;
}

function formatLaundrySlot(slot?: string): string {
  if (!slot) return '—';
  const [start] = String(slot).split(' - ');
  const [hoursStr, minutesStr] = String(start).split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return slot;
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function parseSlotStartMinutes(slot?: string): number {
  if (!slot) return Number.POSITIVE_INFINITY;
  const [start] = String(slot).split(' - ');
  const [h, m] = String(start).split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

interface StatusConfig {
  icon: React.ElementType;
  label: string;
  className: string;
}

function getStatusConfig(status?: LaundryStatus): StatusConfig {
  const configs: Record<string, StatusConfig> = {
    [LAUNDRY_STATUS.WAITING]: {
      icon: Clock,
      label: 'Waiting',
      className: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    },
    [LAUNDRY_STATUS.WASHER]: {
      icon: WashingMachine,
      label: 'Washer',
      className: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    },
    [LAUNDRY_STATUS.DRYER]: {
      icon: Wind,
      label: 'Dryer',
      className: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    },
    [LAUNDRY_STATUS.DONE]: {
      icon: Package,
      label: 'Done',
      className: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    },
    [LAUNDRY_STATUS.PICKED_UP]: {
      icon: CheckCircle,
      label: 'Picked Up',
      className: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    },
    [LAUNDRY_STATUS.PENDING]: {
      icon: Clock,
      label: 'Pending',
      className: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    },
    [LAUNDRY_STATUS.TRANSPORTED]: {
      icon: Truck,
      label: 'Transported',
      className: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    },
    [LAUNDRY_STATUS.RETURNED]: {
      icon: Package,
      label: 'Returned',
      className: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300',
    },
    [LAUNDRY_STATUS.OFFSITE_PICKED_UP]: {
      icon: CheckCircle,
      label: 'Picked Up',
      className: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    },
  };

  return (
    configs[status || ''] || {
      icon: Clock,
      label: status || 'Unknown',
      className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    }
  );
}

function StatusBadge({ status }: { status?: LaundryStatus }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function isCompletedStatus(status?: LaundryStatus): boolean {
  const completedStatuses: string[] = [
    LAUNDRY_STATUS.DONE,
    LAUNDRY_STATUS.PICKED_UP,
    LAUNDRY_STATUS.RETURNED,
    LAUNDRY_STATUS.OFFSITE_PICKED_UP,
  ];
  return completedStatuses.includes(status || '');
}

export function CompactLaundryList({
  laundryRecords,
  guests,
  viewDate = null,
}: CompactLaundryListProps) {
  const [showOffsite, setShowOffsite] = useState(false);
  const todayString = todayPacificDateString();
  const displayDate = viewDate || todayString;

  const isViewingPastDate = displayDate !== todayString;
  const dateLabel = useMemo(() => {
    if (!isViewingPastDate) return 'Today';
    const [year, month, day] = displayDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [displayDate, isViewingPastDate]);

  const laundryData = useMemo(() => {
    const targetDayRecords = (laundryRecords || []).filter(
      (record) => pacificDateStringFrom(record.date) === displayDate
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

    const onsite = targetDayRecords
      .filter((r) => r.laundryType !== 'offsite')
      .sort((a, b) => {
        const timeDiff = parseSlotStartMinutes(a.time) - parseSlotStartMinutes(b.time);
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
        timeLabel: formatLaundrySlot(record.time),
        status: record.status,
        bagNumber: record.bagNumber,
      }));

    const offsite = targetDayRecords
      .filter((r) => r.laundryType === 'offsite')
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      })
      .map((record) => ({
        id: record.id,
        guestId: record.guestId,
        name: getGuestName(record.guestId),
        status: record.status,
        bagNumber: record.bagNumber,
      }));

    return { onsite, offsite, total: targetDayRecords.length };
  }, [laundryRecords, guests, displayDate]);

  if (laundryData.total === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <WashingMachine size={18} className="text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            Laundry {isViewingPastDate ? `(${dateLabel})` : 'Today'}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto flex items-center gap-1">
            <Eye size={12} /> Quick View
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No laundry bookings for {dateLabel.toLowerCase()}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 dark:from-purple-900/20 to-white dark:to-gray-800 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WashingMachine size={18} className="text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Laundry {isViewingPastDate ? `(${dateLabel})` : 'Today'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Eye size={12} /> Quick View
            </span>
            <span className="text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
              {laundryData.total} total
            </span>
          </div>
        </div>
      </div>

      {/* On-site List */}
      {laundryData.onsite.length > 0 && (
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
          {laundryData.onsite.map((booking) => (
            <div
              key={booking.id}
              className={`px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                isCompletedStatus(booking.status)
                  ? 'bg-emerald-50/50 dark:bg-emerald-900/20'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
                  {booking.timeLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate block">
                    {booking.name}
                  </span>
                  {booking.bagNumber && (
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      Bag #{booking.bagNumber}
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={booking.status} />
            </div>
          ))}
        </div>
      )}

      {/* Off-site Section */}
      {laundryData.offsite.length > 0 && (
        <div className="border-t border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30">
          <button
            type="button"
            onClick={() => setShowOffsite(!showOffsite)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Truck size={14} />
              Off-site ({laundryData.offsite.length})
            </span>
            {showOffsite ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showOffsite && (
            <div className="divide-y divide-blue-200/50 dark:divide-blue-700/50">
              {laundryData.offsite.map((item) => (
                <div
                  key={item.id}
                  className={`px-4 py-2.5 flex items-center justify-between gap-3 ${
                    isCompletedStatus(item.status)
                      ? 'bg-emerald-50/30 dark:bg-emerald-900/20'
                      : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-blue-900 dark:text-blue-200 text-sm truncate block">
                      {item.name}
                    </span>
                    {item.bagNumber && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Bag #{item.bagNumber}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompactLaundryList;
