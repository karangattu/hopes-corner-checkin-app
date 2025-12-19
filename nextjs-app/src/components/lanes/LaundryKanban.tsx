'use client';

import React, { useState } from 'react';
import {
  WashingMachine,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Trash2,
  GripVertical,
  Wind,
  Package,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LAUNDRY_STATUS } from '@/lib/constants';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import type { LaundryRecord, Guest, LaundryStatus } from '@/lib/types';

interface LaundryKanbanProps {
  laundryRecords: LaundryRecord[];
  guests: Guest[];
  updateLaundryStatus: (recordId: string, status: LaundryStatus) => Promise<void>;
  updateLaundryBagNumber: (recordId: string, bagNumber: string) => Promise<boolean>;
  cancelLaundryRecord: (recordId: string) => Promise<void>;
  attemptLaundryStatusChange?: (record: LaundryRecord, newStatus: LaundryStatus) => Promise<void>;
}

interface Column {
  id: LaundryStatus;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconClass: string;
  badgeClass: string;
}

interface GuestNameDetails {
  guest: Guest | null;
  legalName: string;
  preferredName: string;
  hasPreferred: boolean;
  primaryName: string;
  displayName: string;
  sortKey: string;
}

const LaundryKanban: React.FC<LaundryKanbanProps> = ({
  laundryRecords,
  guests,
  updateLaundryStatus,
  updateLaundryBagNumber,
  cancelLaundryRecord,
  attemptLaundryStatusChange,
}) => {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [draggedItem, setDraggedItem] = useState<LaundryRecord | null>(null);

  const applyStatusUpdate = async (record: LaundryRecord, newStatus: LaundryStatus): Promise<boolean> => {
    if (!record) return false;
    try {
      await updateLaundryStatus(record.id, newStatus);
      toast.success('Status updated');
      return true;
    } catch {
      return false;
    }
  };

  const hasBagNumber = (record: LaundryRecord): boolean =>
    Boolean(String(record?.bagNumber ?? '').trim().length);

  const requiresBagPrompt = (record: LaundryRecord, newStatus: LaundryStatus): boolean =>
    record?.laundryType === 'onsite' &&
    record?.status === LAUNDRY_STATUS.WAITING &&
    newStatus !== LAUNDRY_STATUS.WAITING &&
    !hasBagNumber(record);

  const promptForBagNumber = async (record: LaundryRecord, newStatus: LaundryStatus): Promise<void> => {
    if (!record) return;

    if (attemptLaundryStatusChange) {
      await attemptLaundryStatusChange(record, newStatus);
      return;
    }

    const manualBag = window.prompt(
      'A bag number is required before moving out of waiting. Enter one to continue.'
    );
    const trimmedBag = (manualBag || '').trim();

    if (!trimmedBag) {
      toast.error('Please enter a bag number to continue');
      return;
    }

    const saved = await updateLaundryBagNumber(record.id, trimmedBag);
    if (!saved) return;

    toast.success('Bag number saved');
    await applyStatusUpdate(record, newStatus);
  };

  const processStatusChange = async (record: LaundryRecord, newStatus: LaundryStatus): Promise<void> => {
    if (!record) return;

    if (requiresBagPrompt(record, newStatus)) {
      await promptForBagNumber(record, newStatus);
      return;
    }

    await applyStatusUpdate(record, newStatus);
  };

  const getGuestNameDetails = (guestId: string): GuestNameDetails => {
    const guest = guests.find((g) => g.id === guestId) || null;
    const fallback = 'Unknown Guest';
    const legalName =
      guest?.name ||
      `${guest?.firstName || ''} ${guest?.lastName || ''}`.trim() ||
      fallback;
    const preferredName = (guest?.preferredName || '').trim();
    const hasPreferred =
      Boolean(preferredName) &&
      preferredName.toLowerCase() !== legalName.toLowerCase();
    const primaryName = hasPreferred ? preferredName : legalName;
    const displayName = hasPreferred ? `${preferredName} (${legalName})` : legalName;
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

  const toggleCard = (recordId: string): void => {
    setExpandedCards((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

  const handleDragStart = (e: React.DragEvent, record: LaundryRecord): void => {
    setDraggedItem(record);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LaundryStatus): Promise<void> => {
    e.preventDefault();
    if (draggedItem && draggedItem.status !== newStatus) {
      await processStatusChange(draggedItem, newStatus);
    }
    setDraggedItem(null);
  };

  // Separate on-site and off-site records
  const onsiteRecords = laundryRecords.filter((r) => r.laundryType === 'onsite');
  const offsiteRecords = laundryRecords.filter((r) => r.laundryType === 'offsite');

  const groupedOnsiteRecords: Record<LaundryStatus, LaundryRecord[]> = {
    [LAUNDRY_STATUS.WAITING]: onsiteRecords.filter((r) => r.status === LAUNDRY_STATUS.WAITING),
    [LAUNDRY_STATUS.WASHER]: onsiteRecords.filter((r) => r.status === LAUNDRY_STATUS.WASHER),
    [LAUNDRY_STATUS.DRYER]: onsiteRecords.filter((r) => r.status === LAUNDRY_STATUS.DRYER),
    [LAUNDRY_STATUS.DONE]: onsiteRecords.filter((r) => r.status === LAUNDRY_STATUS.DONE),
    [LAUNDRY_STATUS.PICKED_UP]: onsiteRecords.filter((r) => r.status === LAUNDRY_STATUS.PICKED_UP),
    [LAUNDRY_STATUS.PENDING]: [],
    [LAUNDRY_STATUS.TRANSPORTED]: [],
    [LAUNDRY_STATUS.RETURNED]: [],
    [LAUNDRY_STATUS.OFFSITE_PICKED_UP]: [],
  };

  const groupedOffsiteRecords: Record<LaundryStatus, LaundryRecord[]> = {
    [LAUNDRY_STATUS.PENDING]: offsiteRecords.filter((r) => r.status === LAUNDRY_STATUS.PENDING),
    [LAUNDRY_STATUS.TRANSPORTED]: offsiteRecords.filter((r) => r.status === LAUNDRY_STATUS.TRANSPORTED),
    [LAUNDRY_STATUS.RETURNED]: offsiteRecords.filter((r) => r.status === LAUNDRY_STATUS.RETURNED),
    [LAUNDRY_STATUS.OFFSITE_PICKED_UP]: offsiteRecords.filter((r) => r.status === LAUNDRY_STATUS.OFFSITE_PICKED_UP),
    [LAUNDRY_STATUS.WAITING]: [],
    [LAUNDRY_STATUS.WASHER]: [],
    [LAUNDRY_STATUS.DRYER]: [],
    [LAUNDRY_STATUS.DONE]: [],
    [LAUNDRY_STATUS.PICKED_UP]: [],
  };

  const onsiteColumns: Column[] = [
    {
      id: LAUNDRY_STATUS.WAITING as LaundryStatus,
      title: 'Waiting',
      icon: Clock,
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
      textClass: 'text-amber-700',
      iconClass: 'text-amber-600',
      badgeClass: 'bg-amber-100 text-amber-700',
    },
    {
      id: LAUNDRY_STATUS.WASHER as LaundryStatus,
      title: 'In Washer',
      icon: WashingMachine,
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      textClass: 'text-blue-700',
      iconClass: 'text-blue-600',
      badgeClass: 'bg-blue-100 text-blue-700',
    },
    {
      id: LAUNDRY_STATUS.DRYER as LaundryStatus,
      title: 'In Dryer',
      icon: Wind,
      bgClass: 'bg-purple-50',
      borderClass: 'border-purple-200',
      textClass: 'text-purple-700',
      iconClass: 'text-purple-600',
      badgeClass: 'bg-purple-100 text-purple-700',
    },
    {
      id: LAUNDRY_STATUS.DONE as LaundryStatus,
      title: 'Done',
      icon: Package,
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      textClass: 'text-emerald-700',
      iconClass: 'text-emerald-600',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: LAUNDRY_STATUS.PICKED_UP as LaundryStatus,
      title: 'Picked Up',
      icon: CheckCircle2,
      bgClass: 'bg-green-50',
      borderClass: 'border-green-200',
      textClass: 'text-green-700',
      iconClass: 'text-green-600',
      badgeClass: 'bg-green-100 text-green-700',
    },
  ];

  const offsiteColumns: Column[] = [
    {
      id: LAUNDRY_STATUS.PENDING as LaundryStatus,
      title: 'Pending',
      icon: Clock,
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
      textClass: 'text-amber-700',
      iconClass: 'text-amber-600',
      badgeClass: 'bg-amber-100 text-amber-700',
    },
    {
      id: LAUNDRY_STATUS.TRANSPORTED as LaundryStatus,
      title: 'Transported',
      icon: Package,
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      textClass: 'text-blue-700',
      iconClass: 'text-blue-600',
      badgeClass: 'bg-blue-100 text-blue-700',
    },
    {
      id: LAUNDRY_STATUS.RETURNED as LaundryStatus,
      title: 'Returned',
      icon: CheckCircle2,
      bgClass: 'bg-purple-50',
      borderClass: 'border-purple-200',
      textClass: 'text-purple-700',
      iconClass: 'text-purple-600',
      badgeClass: 'bg-purple-100 text-purple-700',
    },
    {
      id: LAUNDRY_STATUS.OFFSITE_PICKED_UP as LaundryStatus,
      title: 'Picked Up',
      icon: CheckCircle2,
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      textClass: 'text-emerald-700',
      iconClass: 'text-emerald-600',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    },
  ];

  const renderCard = (record: LaundryRecord, isOffsite = false): React.ReactElement => {
    const nameDetails = getGuestNameDetails(record.guestId);
    const isExpanded = expandedCards[record.id];
    const isCompleted =
      record.status === LAUNDRY_STATUS.PICKED_UP ||
      record.status === LAUNDRY_STATUS.OFFSITE_PICKED_UP;

    const statusOptions = isOffsite
      ? [
          { value: LAUNDRY_STATUS.PENDING, label: 'Pending' },
          { value: LAUNDRY_STATUS.TRANSPORTED, label: 'Transported' },
          { value: LAUNDRY_STATUS.RETURNED, label: 'Returned' },
          { value: LAUNDRY_STATUS.OFFSITE_PICKED_UP, label: 'Picked Up' },
        ]
      : [
          { value: LAUNDRY_STATUS.WAITING, label: 'Waiting' },
          { value: LAUNDRY_STATUS.WASHER, label: 'In Washer' },
          { value: LAUNDRY_STATUS.DRYER, label: 'In Dryer' },
          { value: LAUNDRY_STATUS.DONE, label: 'Done' },
          { value: LAUNDRY_STATUS.PICKED_UP, label: 'Picked Up' },
        ];

    return (
      <div
        key={record.id}
        draggable
        onDragStart={(e) => handleDragStart(e, record)}
        data-testid={`laundry-card-${record.id}`}
        className={`bg-white rounded-lg border-2 shadow-sm p-3 cursor-move transition-all hover:shadow-md ${
          draggedItem?.id === record.id ? 'opacity-50' : ''
        } ${
          isCompleted
            ? 'border-emerald-200 hover:border-emerald-300'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <GripVertical size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div
                className="font-medium text-xs text-gray-900 leading-tight"
                title={nameDetails.displayName}
              >
                {nameDetails.primaryName}
              </div>
              {nameDetails.hasPreferred && (
                <div className="text-[9px] text-gray-500 truncate">
                  {nameDetails.legalName}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!isCompleted && (
              <CompactWaiverIndicator guestId={record.guestId} serviceType="laundry" />
            )}
            <button
              type="button"
              onClick={() => toggleCard(record.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} laundry details for ${nameDetails.primaryName}`}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {record.bagNumber && (
            <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-purple-50 border border-purple-100 rounded px-2 py-1.5">
              <Package size={12} className="text-purple-600 flex-shrink-0 mt-0.5" />
              <span>Bag #{record.bagNumber}</span>
            </div>
          )}

          {isOffsite && (
            <div className="text-xs bg-blue-50 border border-blue-100 rounded px-2 py-1">
              <span className="font-semibold text-blue-700">Off-site laundry</span>
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
                  value={record.bagNumber || ''}
                  onChange={(e) => updateLaundryBagNumber(record.id, e.target.value)}
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
                  onChange={(e) => processStatusChange(record, e.target.value as LaundryStatus)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  aria-label={`Update laundry status for ${nameDetails.primaryName}`}
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
                  if (window.confirm(`Cancel laundry booking for ${nameDetails.primaryName}?`)) {
                    cancelLaundryRecord(record.id);
                    toast.success('Laundry booking cancelled');
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
    <div className="space-y-6">
      {/* On-site Laundry Kanban */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <WashingMachine className="text-purple-600" size={22} />
              On-site Laundry - Kanban Board
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Drag and drop cards between columns to update status
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-gray-100 text-gray-700 font-medium px-3 py-1 rounded-full">
              {onsiteRecords.length} total
            </span>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 min-w-0">
          {onsiteColumns.map((column) => {
            const records = groupedOnsiteRecords[column.id];
            const Icon = column.icon;

            return (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                data-testid={`onsite-column-${column.id}`}
                className={`${column.bgClass} ${column.borderClass} border-2 rounded-xl p-4 min-h-[400px] transition-colors flex-shrink-0 w-[240px] md:w-[220px] lg:flex-1 lg:min-w-[180px] ${
                  draggedItem?.status !== column.id ? 'hover:border-opacity-75' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className={column.iconClass} />
                    <h3 className={`font-semibold text-sm ${column.textClass}`}>
                      {column.title}
                    </h3>
                  </div>
                  <span className={`${column.badgeClass} text-xs font-bold px-2.5 py-1 rounded-full`}>
                    {records.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {records.length === 0 ? (
                    <div className="text-center py-12 text-xs text-gray-400">
                      <Icon size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No laundry in this stage</p>
                      <p className="mt-1 text-[10px]">Drag cards here to update</p>
                    </div>
                  ) : (
                    records.map((record) => renderCard(record, false))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Off-site Laundry Kanban */}
      {offsiteRecords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="text-blue-600" size={22} />
                Off-site Laundry - Kanban Board
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Track laundry sent to external facility
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-gray-100 text-gray-700 font-medium px-3 py-1 rounded-full">
                {offsiteRecords.length} total
              </span>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 min-w-0">
            {offsiteColumns.map((column) => {
              const records = groupedOffsiteRecords[column.id];
              const Icon = column.icon;

              return (
                <div
                  key={column.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                  data-testid={`offsite-column-${column.id}`}
                  className={`${column.bgClass} ${column.borderClass} border-2 rounded-xl p-4 min-h-[400px] transition-colors flex-shrink-0 w-[240px] md:w-[220px] lg:flex-1 lg:min-w-[200px] ${
                    draggedItem?.status !== column.id ? 'hover:border-opacity-75' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon size={18} className={column.iconClass} />
                      <h3 className={`font-semibold text-sm ${column.textClass}`}>
                        {column.title}
                      </h3>
                    </div>
                    <span className={`${column.badgeClass} text-xs font-bold px-2.5 py-1 rounded-full`}>
                      {records.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {records.length === 0 ? (
                      <div className="text-center py-12 text-xs text-gray-400">
                        <Icon size={32} className="mx-auto mb-2 opacity-30" />
                        <p>No laundry in this stage</p>
                        <p className="mt-1 text-[10px]">Drag cards here to update</p>
                      </div>
                    ) : (
                      records.map((record) => renderCard(record, true))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LaundryKanban;
