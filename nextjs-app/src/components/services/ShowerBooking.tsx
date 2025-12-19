'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Droplets, Users, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Guest } from '@/lib/types';

// Shower slot configuration
const DEFAULT_SHOWER_SLOTS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
];

const MAX_PER_SLOT = 2;

interface ShowerRecord {
  id: string;
  guestId: string;
  time: string;
  date: string;
  status: 'booked' | 'done' | 'cancelled' | 'waitlisted';
  createdAt?: string;
}

interface ShowerBookingProps {
  isOpen: boolean;
  guest: Guest | null;
  onClose: () => void;
  onBook: (guestId: string, slotTime: string) => Promise<void>;
  onWaitlist?: (guestId: string) => Promise<void>;
  showerRecords: ShowerRecord[];
  todayDateString: string;
  slots?: string[];
}

const formatSlotLabel = (slotTime: string): string => {
  if (!slotTime) return '';
  const [hours, minutes] = slotTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const toMinutes = (slotTime: string): number => {
  const [hours, minutes] = slotTime.split(':').map(Number);
  return hours * 60 + minutes;
};

interface SlotInfo {
  slotTime: string;
  label: string;
  count: number;
  isFull: boolean;
  isNearlyFull: boolean;
  sortKey: number;
}

export function ShowerBooking({
  isOpen,
  guest,
  onClose,
  onBook,
  onWaitlist,
  showerRecords,
  todayDateString,
  slots = DEFAULT_SHOWER_SLOTS,
}: ShowerBookingProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate slot details
  const slotsWithDetails = useMemo((): SlotInfo[] => {
    return slots
      .map((slotTime) => {
        const todaysRecords = showerRecords.filter(
          (record) =>
            record.time === slotTime &&
            record.date === todayDateString &&
            record.status !== 'waitlisted' &&
            record.status !== 'cancelled'
        );
        const count = todaysRecords.length;
        return {
          slotTime,
          label: formatSlotLabel(slotTime),
          count,
          isFull: count >= MAX_PER_SLOT,
          isNearlyFull: count === MAX_PER_SLOT - 1,
          sortKey: toMinutes(slotTime),
        };
      })
      .sort((a, b) => {
        // Show available slots first, then by time
        if (a.isFull !== b.isFull) return a.isFull ? 1 : -1;
        return a.sortKey - b.sortKey;
      });
  }, [slots, showerRecords, todayDateString]);

  // Capacity stats
  const totalCapacity = slots.length * MAX_PER_SLOT;
  const occupied = slotsWithDetails.reduce((sum, slot) => sum + slot.count, 0);
  const available = totalCapacity - occupied;
  const allSlotsFull = slotsWithDetails.every((slot) => slot.isFull);

  // Guest's shower history
  const guestHistory = useMemo(() => {
    if (!guest) return [];
    return showerRecords
      .filter((record) => record.guestId === guest.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [guest, showerRecords]);

  const handleBook = useCallback(async () => {
    if (!guest || !selectedSlot) return;

    setIsBooking(true);
    setError(null);

    try {
      await onBook(guest.id, selectedSlot);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book shower');
    } finally {
      setIsBooking(false);
    }
  }, [guest, selectedSlot, onBook, onClose]);

  const handleWaitlist = useCallback(async () => {
    if (!guest || !onWaitlist) return;

    setIsBooking(true);
    setError(null);

    try {
      await onWaitlist(guest.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to waitlist');
    } finally {
      setIsBooking(false);
    }
  }, [guest, onWaitlist, onClose]);

  // Reset state when modal opens/closes
  const handleClose = useCallback(() => {
    setSelectedSlot(null);
    setError(null);
    onClose();
  }, [onClose]);

  if (!guest) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalHeader onClose={handleClose}>
        <div className="flex items-center gap-2">
          <Droplets size={20} className="text-blue-600" />
          <span>Book Shower</span>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* Guest info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="font-medium text-blue-900 dark:text-blue-100">
            Booking for: {guest.firstName} {guest.lastName}
            {guest.preferredName && ` (${guest.preferredName})`}
          </p>
        </div>

        {/* Capacity overview */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Users size={16} />
            <span>{available} of {totalCapacity} slots available</span>
          </div>
          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(occupied / totalCapacity) * 100}%` }}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Slot grid */}
        {!allSlotsFull ? (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select a time slot:
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slotsWithDetails.map((slot) => (
                <button
                  key={slot.slotTime}
                  onClick={() => !slot.isFull && setSelectedSlot(slot.slotTime)}
                  disabled={slot.isFull}
                  className={`
                    p-3 rounded-lg text-sm font-medium transition-all
                    ${slot.isFull
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : selectedSlot === slot.slotTime
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                        : slot.isNearlyFull
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                    }
                  `}
                >
                  <div>{slot.label}</div>
                  <div className="text-xs opacity-75">
                    {slot.isFull ? 'Full' : `${slot.count}/${MAX_PER_SLOT}`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              All shower slots are full for today
            </p>
            {onWaitlist && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                You can add this guest to the waitlist
              </p>
            )}
          </div>
        )}

        {/* Guest history */}
        {guestHistory.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
              <Info size={14} />
              Recent showers
            </p>
            <div className="flex flex-wrap gap-2">
              {guestHistory.map((record) => (
                <span
                  key={record.id}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                >
                  {new Date(record.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              ))}
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isBooking}>
          Cancel
        </Button>
        {allSlotsFull && onWaitlist ? (
          <Button
            variant="primary"
            onClick={handleWaitlist}
            isLoading={isBooking}
            loadingText="Adding..."
          >
            Add to Waitlist
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleBook}
            disabled={!selectedSlot}
            isLoading={isBooking}
            loadingText="Booking..."
            leftIcon={<CheckCircle size={16} />}
          >
            Book {selectedSlot && `at ${formatSlotLabel(selectedSlot)}`}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

export default ShowerBooking;
