'use client';

import React, { useState } from 'react';
import {
  Bike,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Wrench,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BICYCLE_REPAIR_STATUS } from '@/lib/constants';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import type { BicycleRepair, Guest, BicycleRepairStatus } from '@/lib/types';

interface BicycleKanbanProps {
  bicycleRecords: BicycleRepair[];
  guests: Guest[];
  updateBicycleRecord: (recordId: string, updates: Partial<BicycleRepair>) => Promise<void>;
  deleteBicycleRecord: (recordId: string) => Promise<void>;
  setBicycleStatus: (recordId: string, status: BicycleRepairStatus) => Promise<void>;
}

interface Column {
  id: BicycleRepairStatus;
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

const BicycleKanban: React.FC<BicycleKanbanProps> = ({
  bicycleRecords,
  guests,
  updateBicycleRecord,
  deleteBicycleRecord,
  setBicycleStatus,
}) => {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [draggedItem, setDraggedItem] = useState<BicycleRepair | null>(null);

  const getGuestNameDetails = (guestId: string | null): GuestNameDetails => {
    if (!guestId) {
      return {
        guest: null,
        legalName: 'Unknown Guest',
        preferredName: '',
        hasPreferred: false,
        primaryName: 'Unknown Guest',
        displayName: 'Unknown Guest',
        sortKey: 'unknown guest',
      };
    }
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

  const handleDragStart = (e: React.DragEvent, record: BicycleRepair): void => {
    setDraggedItem(record);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: BicycleRepairStatus): void => {
    e.preventDefault();
    if (draggedItem && draggedItem.status !== newStatus) {
      setBicycleStatus(draggedItem.id, newStatus);
      toast.success('Status updated');
    }
    setDraggedItem(null);
  };

  const groupedRecords: Record<BicycleRepairStatus, BicycleRepair[]> = {
    [BICYCLE_REPAIR_STATUS.PENDING]: bicycleRecords.filter(
      (r) => r.status === BICYCLE_REPAIR_STATUS.PENDING
    ),
    [BICYCLE_REPAIR_STATUS.IN_PROGRESS]: bicycleRecords.filter(
      (r) => r.status === BICYCLE_REPAIR_STATUS.IN_PROGRESS
    ),
    [BICYCLE_REPAIR_STATUS.DONE]: bicycleRecords.filter(
      (r) => r.status === BICYCLE_REPAIR_STATUS.DONE
    ),
  };

  const columns: Column[] = [
    {
      id: BICYCLE_REPAIR_STATUS.PENDING,
      title: 'Pending',
      icon: Clock,
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
      textClass: 'text-amber-700',
      iconClass: 'text-amber-600',
      badgeClass: 'bg-amber-100 text-amber-700',
    },
    {
      id: BICYCLE_REPAIR_STATUS.IN_PROGRESS,
      title: 'In Progress',
      icon: Wrench,
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      textClass: 'text-blue-700',
      iconClass: 'text-blue-600',
      badgeClass: 'bg-blue-100 text-blue-700',
    },
    {
      id: BICYCLE_REPAIR_STATUS.DONE,
      title: 'Done',
      icon: CheckCircle2,
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      textClass: 'text-emerald-700',
      iconClass: 'text-emerald-600',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    },
  ];

  const renderCard = (record: BicycleRepair): React.ReactElement => {
    const nameDetails = getGuestNameDetails(record.guestId);
    const guestBikeDescription = nameDetails.guest?.bicycleDescription?.trim();
    const isExpanded = expandedCards[record.id];
    const isDone = record.status === BICYCLE_REPAIR_STATUS.DONE;

    return (
      <div
        key={record.id}
        draggable
        onDragStart={(e) => handleDragStart(e, record)}
        className={`bg-white rounded-lg border-2 shadow-sm p-3 cursor-move transition-all hover:shadow-md ${
          draggedItem?.id === record.id ? 'opacity-50' : ''
        } ${
          isDone
            ? 'border-emerald-200 hover:border-emerald-300'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <GripVertical size={16} className="text-gray-400 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 truncate">
                {nameDetails.primaryName}
              </div>
              {nameDetails.hasPreferred && (
                <div className="text-[10px] text-gray-500 truncate">
                  Legal: {nameDetails.legalName}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isDone && record.guestId && (
              <CompactWaiverIndicator guestId={record.guestId} serviceType="bicycle" />
            )}
            <button
              type="button"
              onClick={() => toggleCard(record.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {guestBikeDescription && (
            <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-sky-50 border border-sky-100 rounded px-2 py-1.5">
              <Bike size={12} className="text-sky-600 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{guestBikeDescription}</span>
            </div>
          )}

          {/* Repair types checklist */}
          {record.repairTypes && record.repairTypes.length > 0 ? (
            <div className="space-y-0.5 bg-gray-50 rounded-lg p-2 border border-gray-200">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1.5 mb-1">
                Repairs ({record.completedRepairs?.length || 0}/{record.repairTypes.length})
              </div>
              {record.repairTypes.map((type, index) => {
                const isCompleted = record.completedRepairs?.includes(type) || false;
                return (
                  <label
                    key={`${record.id}-${type}-${index}`}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white px-2 py-1.5 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentCompleted = record.completedRepairs || [];
                      const newCompleted = isCompleted
                        ? currentCompleted.filter((t) => t !== type)
                        : [...currentCompleted, type];

                      // Determine new status based on completion
                      let newStatus: BicycleRepairStatus = record.status;
                      if (newCompleted.length === 0) {
                        newStatus = BICYCLE_REPAIR_STATUS.PENDING;
                      } else if (newCompleted.length === record.repairTypes.length) {
                        newStatus = BICYCLE_REPAIR_STATUS.DONE;
                      } else if (newCompleted.length > 0) {
                        newStatus = BICYCLE_REPAIR_STATUS.IN_PROGRESS;
                      }

                      updateBicycleRecord(record.id, { completedRepairs: newCompleted });

                      // Auto-move if status changed
                      if (newStatus !== record.status) {
                        setBicycleStatus(record.id, newStatus);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 text-sky-600 border-gray-300 rounded focus:ring-sky-500 flex-shrink-0"
                    />
                    <span
                      className={isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}
                    >
                      {type}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="text-xs">
              <span className="font-semibold text-gray-700">Repair: </span>
              <span className="text-gray-600">{record.repairType || '—'}</span>
            </div>
          )}

          {record.notes && (
            <div className="text-xs">
              <span className="font-semibold text-gray-700">Notes: </span>
              <span className="text-gray-600 line-clamp-2">{record.notes}</span>
            </div>
          )}

          {isExpanded && (
            <div className="pt-2 mt-2 border-t border-gray-100 space-y-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Status
                </label>
                <select
                  value={record.status || BICYCLE_REPAIR_STATUS.PENDING}
                  onChange={(e) => setBicycleStatus(record.id, e.target.value as BicycleRepairStatus)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                >
                  <option value={BICYCLE_REPAIR_STATUS.PENDING}>Pending</option>
                  <option value={BICYCLE_REPAIR_STATUS.IN_PROGRESS}>In Progress</option>
                  <option value={BICYCLE_REPAIR_STATUS.DONE}>Done</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Notes {record.repairType === 'Other' && '(required)'}
                </label>
                <textarea
                  value={record.notes || ''}
                  onChange={(e) => updateBicycleRecord(record.id, { notes: e.target.value })}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 resize-none"
                  rows={2}
                  placeholder="Optional notes"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete repair record for ${nameDetails.primaryName}?`)) {
                    deleteBicycleRecord(record.id);
                    toast.success('Repair record deleted');
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded px-3 py-1.5 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bike className="text-sky-600" size={22} />
            Bicycle Repairs - Kanban Board
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Drag and drop cards between columns to update status
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-gray-100 text-gray-700 font-medium px-3 py-1 rounded-full">
            {bicycleRecords.length} total
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map((column) => {
          const records = groupedRecords[column.id];
          const Icon = column.icon;

          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`${column.bgClass} ${column.borderClass} border-2 rounded-xl p-4 min-h-[400px] transition-colors ${
                draggedItem?.status !== column.id ? 'hover:border-opacity-75' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon size={18} className={column.iconClass} />
                  <h3 className={`font-semibold text-sm ${column.textClass}`}>{column.title}</h3>
                </div>
                <span className={`${column.badgeClass} text-xs font-bold px-2.5 py-1 rounded-full`}>
                  {records.length}
                </span>
              </div>

              <div className="space-y-3">
                {records.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400">
                    <Icon size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No repairs in this stage</p>
                    <p className="mt-1 text-[10px]">Drag cards here to update</p>
                  </div>
                ) : (
                  records.map((record) => renderCard(record))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BicycleKanban;
