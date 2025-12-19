'use client';

import React, { useMemo } from 'react';
import {
  User,
  Home,
  MapPin,
  CalendarClock,
  Utensils,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Ban,
  RotateCcw,
  Droplets,
  WashingMachine,
  Bike,
  Scissors,
  Gift,
} from 'lucide-react';
import type { Guest } from '@/lib/types';

interface ServiceRecord {
  guestId: string;
  date: string;
}

interface GuestCardProps {
  guest: Guest;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onEdit?: (guest: Guest) => void;
  onDelete?: (guestId: string) => void;
  onBan?: (guestId: string) => void;
  onClearBan?: (guestId: string) => void;
  onAddMeal?: (guestId: string) => void;
  onAddShower?: (guestId: string) => void;
  onAddLaundry?: (guestId: string) => void;
  onAddHaircut?: (guestId: string) => void;
  onAddHoliday?: (guestId: string) => void;
  onAddBicycle?: (guestId: string) => void;
  // Service records for today
  todayMealRecords?: ServiceRecord[];
  todayShowerRecords?: ServiceRecord[];
  todayLaundryRecords?: ServiceRecord[];
  todayHaircutRecords?: ServiceRecord[];
  todayHolidayRecords?: ServiceRecord[];
  todayBicycleRecords?: ServiceRecord[];
  className?: string;
  showActions?: boolean;
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDisplayName = (guest: Guest): string => {
  const fullName = `${guest.firstName} ${guest.lastName}`;
  if (guest.preferredName) {
    return `${guest.preferredName} (${fullName})`;
  }
  return fullName;
};

export function GuestCard({
  guest,
  isExpanded = false,
  onToggleExpand,
  onEdit,
  onDelete,
  onBan,
  onClearBan,
  onAddMeal,
  onAddShower,
  onAddLaundry,
  onAddHaircut,
  onAddHoliday,
  onAddBicycle,
  todayMealRecords = [],
  todayShowerRecords = [],
  todayLaundryRecords = [],
  todayHaircutRecords = [],
  todayHolidayRecords = [],
  todayBicycleRecords = [],
  className = '',
  showActions = true,
}: GuestCardProps) {
  const hasMealToday = useMemo(
    () => todayMealRecords.some((r) => r.guestId === guest.id),
    [todayMealRecords, guest.id]
  );
  const hasShowerToday = useMemo(
    () => todayShowerRecords.some((r) => r.guestId === guest.id),
    [todayShowerRecords, guest.id]
  );
  const hasLaundryToday = useMemo(
    () => todayLaundryRecords.some((r) => r.guestId === guest.id),
    [todayLaundryRecords, guest.id]
  );
  const hasHaircutToday = useMemo(
    () => todayHaircutRecords.some((r) => r.guestId === guest.id),
    [todayHaircutRecords, guest.id]
  );
  const hasHolidayToday = useMemo(
    () => todayHolidayRecords.some((r) => r.guestId === guest.id),
    [todayHolidayRecords, guest.id]
  );
  const hasBicycleToday = useMemo(
    () => todayBicycleRecords.some((r) => r.guestId === guest.id),
    [todayBicycleRecords, guest.id]
  );

  const isBanned = guest.isBanned || guest.banned === true;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border ${
        isBanned ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
      } shadow-sm transition-all ${className}`}
    >
      {/* Header - Always visible */}
      <div
        className={`p-4 ${onToggleExpand ? 'cursor-pointer' : ''}`}
        onClick={onToggleExpand}
        role={onToggleExpand ? 'button' : undefined}
        tabIndex={onToggleExpand ? 0 : undefined}
        onKeyDown={
          onToggleExpand
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleExpand();
                }
              }
            : undefined
        }
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isBanned
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
              }`}
            >
              <User size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {getDisplayName(guest)}
                {isBanned && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                    <Ban size={12} /> Banned
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Home size={14} />
                  {guest.housingStatus}
                </span>
                {guest.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {guest.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Today's services indicator */}
          <div className="flex items-center gap-2">
            {hasMealToday && (
              <span className="text-green-600 dark:text-green-400" title="Meal recorded today">
                <Utensils size={16} />
              </span>
            )}
            {hasShowerToday && (
              <span className="text-blue-600 dark:text-blue-400" title="Shower recorded today">
                <Droplets size={16} />
              </span>
            )}
            {hasLaundryToday && (
              <span className="text-purple-600 dark:text-purple-400" title="Laundry recorded today">
                <WashingMachine size={16} />
              </span>
            )}
            {hasHaircutToday && (
              <span className="text-amber-600 dark:text-amber-400" title="Haircut recorded today">
                <Scissors size={16} />
              </span>
            )}
            {hasHolidayToday && (
              <span className="text-pink-600 dark:text-pink-400" title="Holiday recorded today">
                <Gift size={16} />
              </span>
            )}
            {hasBicycleToday && (
              <span className="text-cyan-600 dark:text-cyan-400" title="Bicycle service today">
                <Bike size={16} />
              </span>
            )}
            {onToggleExpand && (
              <button
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Demographics */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
          <span>{guest.age}</span>
          <span>•</span>
          <span>{guest.gender}</span>
          {guest.visitCount !== undefined && guest.visitCount > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CalendarClock size={14} />
                {guest.visitCount} visits
              </span>
            </>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-4">
          {/* Last visit */}
          {guest.lastVisit && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Last visit:</span> {formatDate(guest.lastVisit)}
            </div>
          )}

          {/* Notes */}
          {guest.notes && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">{guest.notes}</p>
            </div>
          )}

          {/* Bicycle description */}
          {guest.bicycleDescription && (
            <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-lg">
              <p className="text-sm text-cyan-800 dark:text-cyan-300">
                <span className="font-medium">Bicycle:</span> {guest.bicycleDescription}
              </p>
            </div>
          )}

          {/* Ban reason */}
          {isBanned && guest.banReason && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">
                <span className="font-medium">Ban reason:</span> {guest.banReason}
              </p>
            </div>
          )}

          {/* Action buttons */}
          {showActions && (
            <div className="flex flex-wrap gap-2 pt-2">
              {/* Service buttons */}
              {!isBanned && (
                <>
                  {onAddMeal && !hasMealToday && (
                    <button
                      onClick={() => onAddMeal(guest.id)}
                      className="px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
                    >
                      <Utensils size={14} /> Meal
                    </button>
                  )}
                  {onAddShower && !hasShowerToday && (
                    <button
                      onClick={() => onAddShower(guest.id)}
                      className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                    >
                      <Droplets size={14} /> Shower
                    </button>
                  )}
                  {onAddLaundry && !hasLaundryToday && (
                    <button
                      onClick={() => onAddLaundry(guest.id)}
                      className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1"
                    >
                      <WashingMachine size={14} /> Laundry
                    </button>
                  )}
                  {onAddHaircut && !hasHaircutToday && (
                    <button
                      onClick={() => onAddHaircut(guest.id)}
                      className="px-3 py-1.5 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center gap-1"
                    >
                      <Scissors size={14} /> Haircut
                    </button>
                  )}
                  {onAddHoliday && !hasHolidayToday && (
                    <button
                      onClick={() => onAddHoliday(guest.id)}
                      className="px-3 py-1.5 text-sm bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors flex items-center gap-1"
                    >
                      <Gift size={14} /> Holiday
                    </button>
                  )}
                  {onAddBicycle && !hasBicycleToday && (
                    <button
                      onClick={() => onAddBicycle(guest.id)}
                      className="px-3 py-1.5 text-sm bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors flex items-center gap-1"
                    >
                      <Bike size={14} /> Bicycle
                    </button>
                  )}
                </>
              )}

              {/* Admin buttons */}
              <div className="flex-1" />
              {onEdit && (
                <button
                  onClick={() => onEdit(guest)}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                >
                  <Edit2 size={14} /> Edit
                </button>
              )}
              {isBanned && onClearBan && (
                <button
                  onClick={() => onClearBan(guest.id)}
                  className="px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={14} /> Clear Ban
                </button>
              )}
              {!isBanned && onBan && (
                <button
                  onClick={() => onBan(guest.id)}
                  className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
                >
                  <Ban size={14} /> Ban
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(guest.id)}
                  className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GuestCard;
