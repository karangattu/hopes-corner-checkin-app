'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { WashingMachine, CheckCircle, AlertCircle, Info, Package } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import type { Guest, LaundryType, LaundryStatus } from '@/lib/types';

interface LaundryRecord {
  id: string;
  guestId: string;
  laundryType: LaundryType;
  bagNumber: string;
  date: string;
  status: LaundryStatus;
  createdAt?: string;
}

interface LaundryBookingProps {
  isOpen: boolean;
  guest: Guest | null;
  onClose: () => void;
  onBook: (guestId: string, bagNumber: string, laundryType: LaundryType) => Promise<void>;
  laundryRecords: LaundryRecord[];
  todayDateString: string;
  maxBags?: number;
}

const LAUNDRY_TYPE_OPTIONS = [
  { value: 'onsite', label: 'On-site (wash here)' },
  { value: 'offsite', label: 'Off-site (transport to laundromat)' },
];

export function LaundryBooking({
  isOpen,
  guest,
  onClose,
  onBook,
  laundryRecords,
  todayDateString,
  maxBags = 50,
}: LaundryBookingProps) {
  const [bagNumber, setBagNumber] = useState('');
  const [laundryType, setLaundryType] = useState<LaundryType>('onsite');
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get used bag numbers today
  const usedBagNumbers = useMemo(() => {
    return laundryRecords
      .filter(
        (record) =>
          record.date === todayDateString &&
          record.status !== 'picked_up' &&
          record.status !== 'offsite_picked_up'
      )
      .map((record) => record.bagNumber);
  }, [laundryRecords, todayDateString]);

  // Suggest next available bag number
  const suggestedBagNumber = useMemo(() => {
    for (let i = 1; i <= maxBags; i++) {
      const num = i.toString();
      if (!usedBagNumbers.includes(num)) {
        return num;
      }
    }
    return '';
  }, [usedBagNumbers, maxBags]);

  // Guest's laundry history
  const guestHistory = useMemo(() => {
    if (!guest) return [];
    return laundryRecords
      .filter((record) => record.guestId === guest.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [guest, laundryRecords]);

  // Check if guest already has laundry today
  const guestHasLaundryToday = useMemo(() => {
    if (!guest) return false;
    return laundryRecords.some(
      (record) => record.guestId === guest.id && record.date === todayDateString
    );
  }, [guest, laundryRecords, todayDateString]);

  const handleBook = useCallback(async () => {
    if (!guest || !bagNumber) return;

    // Validate bag number
    if (usedBagNumbers.includes(bagNumber)) {
      setError(`Bag #${bagNumber} is already in use today`);
      return;
    }

    setIsBooking(true);
    setError(null);

    try {
      await onBook(guest.id, bagNumber, laundryType);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book laundry');
    } finally {
      setIsBooking(false);
    }
  }, [guest, bagNumber, laundryType, usedBagNumbers, onBook, onClose]);

  // Reset state when modal opens/closes
  const handleClose = useCallback(() => {
    setBagNumber('');
    setLaundryType('onsite');
    setError(null);
    onClose();
  }, [onClose]);

  // Set suggested bag number when modal opens
  React.useEffect(() => {
    if (isOpen && !bagNumber) {
      setBagNumber(suggestedBagNumber);
    }
  }, [isOpen, suggestedBagNumber, bagNumber]);

  if (!guest) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalHeader onClose={handleClose}>
        <div className="flex items-center gap-2">
          <WashingMachine size={20} className="text-purple-600" />
          <span>Book Laundry</span>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* Guest info */}
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <p className="font-medium text-purple-900 dark:text-purple-100">
            Booking for: {guest.firstName} {guest.lastName}
            {guest.preferredName && ` (${guest.preferredName})`}
          </p>
        </div>

        {/* Warning if already has laundry today */}
        {guestHasLaundryToday && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg">
            <AlertCircle size={16} />
            <span>This guest already has laundry in progress today</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Bag number input */}
        <div>
          <Input
            label="Bag Number"
            type="number"
            min={1}
            max={maxBags}
            value={bagNumber}
            onChange={(e) => setBagNumber(e.target.value)}
            placeholder="Enter bag number"
            leftIcon={<Package size={16} />}
            helperText={`Available bags: 1-${maxBags}. ${usedBagNumbers.length} bags in use today.`}
          />
        </div>

        {/* Laundry type selection */}
        <div>
          <Select
            label="Laundry Type"
            value={laundryType}
            onChange={(e) => setLaundryType(e.target.value as LaundryType)}
            options={LAUNDRY_TYPE_OPTIONS}
          />
        </div>

        {/* Guest history */}
        {guestHistory.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
              <Info size={14} />
              Recent laundry
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
                  })}{' '}
                  - Bag #{record.bagNumber}
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
        <Button
          variant="primary"
          onClick={handleBook}
          disabled={!bagNumber || isBooking}
          isLoading={isBooking}
          loadingText="Booking..."
          leftIcon={<CheckCircle size={16} />}
        >
          Book Bag #{bagNumber}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default LaundryBooking;
