'use client';

import React, { useId, useRef, useState, useCallback } from 'react';
import { Bike, X, Star } from 'lucide-react';
import { Modal } from '../ui/Modal';

const REPAIR_TYPES = [
  'New Bicycle',
  'Flat Tire',
  'Brake Adjustment',
  'Gear Adjustment',
  'Chain Replacement',
  'Wheel Truing',
  'Basic Tune Up',
  'Drivetrain Cleaning',
  'Cable Replacement',
  'Headset Adjustment',
  'Seat Adjustment',
  'Kickstand',
  'Basket/Rack',
  'Bike Lights',
  'Lock',
  'New Tube',
  'New Tire',
  'Other',
] as const;

interface Guest {
  id: string;
  name: string;
  bicycleDescription?: string;
}

interface BicycleRepairBookingProps {
  guest: Guest | null;
  onClose: () => void;
  onSubmit: (guestId: string, data: { repairTypes: string[]; notes: string }) => void | Promise<void>;
}

export function BicycleRepairBooking({ guest, onClose, onSubmit }: BicycleRepairBookingProps) {
  const [selectedRepairTypes, setSelectedRepairTypes] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const bikeDescription = guest?.bicycleDescription?.trim();

  const handleClose = useCallback(() => {
    setSelectedRepairTypes([]);
    setNotes('');
    onClose();
  }, [onClose]);

  const toggleRepairType = useCallback((type: string) => {
    setSelectedRepairTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const handleCreate = useCallback(async () => {
    if (!guest) return;

    // Require bicycle description before logging repair
    if (!bikeDescription) {
      // The UI will show the warning, but we can add console warning
      console.warn('Bicycle description required');
      return;
    }

    // Require at least one repair type
    if (selectedRepairTypes.length === 0) {
      return;
    }

    // Require notes if "Other" is selected
    if (selectedRepairTypes.includes('Other') && !notes.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(guest.id, {
        repairTypes: selectedRepairTypes,
        notes,
      });
      handleClose();
    } catch (e) {
      console.error('Failed to add repair:', e);
    } finally {
      setSubmitting(false);
    }
  }, [guest, bikeDescription, selectedRepairTypes, notes, onSubmit, handleClose]);

  if (!guest) return null;

  const isSubmitDisabled =
    submitting ||
    selectedRepairTypes.length === 0 ||
    (selectedRepairTypes.includes('Other') && !notes.trim()) ||
    !bikeDescription;

  return (
    <Modal
      isOpen={Boolean(guest)}
      onClose={handleClose}
      labelledBy={titleId}
      describedBy={descriptionId}
    >
      <div className="w-full rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
          <h2
            className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"
            id={titleId}
          >
            <Bike aria-hidden="true" /> Log Bicycle Repair for {guest.name}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            aria-label="Close bicycle repair dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 pt-4" id={descriptionId}>
          {bikeDescription ? (
            <div className="text-sm text-gray-600 dark:text-gray-300 bg-sky-50 dark:bg-sky-900/30 border border-sky-100 dark:border-sky-800 rounded-lg px-3 py-2">
              <span className="font-semibold text-sky-700 dark:text-sky-300">
                Bicycle on file:
              </span>{' '}
              {bikeDescription}
            </div>
          ) : (
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              <div className="font-semibold mb-1">⚠️ No bicycle description saved</div>
              <div>
                Please add bicycle details (make, model, color, etc.) to this guest&apos;s profile
                before logging repair work.
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Repair Types{' '}
              <span className="text-gray-500 dark:text-gray-400 text-xs">(select all that apply)</span>
            </label>
            <div className="space-y-0.5 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-900/50">
              {REPAIR_TYPES.map((type) => {
                const isNewBicycle = type === 'New Bicycle';
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded transition-colors ${
                      isNewBicycle
                        ? 'bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-800/40 border border-amber-200 dark:border-amber-700'
                        : 'hover:bg-white dark:hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRepairTypes.includes(type)}
                      onChange={() => toggleRepairType(type)}
                      className={`w-4 h-4 ${
                        isNewBicycle
                          ? 'text-amber-600 border-amber-300'
                          : 'text-sky-600 border-gray-300 dark:border-gray-600'
                      } rounded focus:ring-sky-500 flex-shrink-0`}
                    />
                    <span
                      className={`text-sm flex items-center gap-1.5 ${
                        isNewBicycle
                          ? 'font-semibold text-amber-900 dark:text-amber-200'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {isNewBicycle && (
                        <Star
                          size={14}
                          className="text-amber-600 fill-amber-600"
                          aria-hidden="true"
                        />
                      )}
                      {type}
                      {isNewBicycle && (
                        <span className="inline-flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100">
                          NEW
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            {selectedRepairTypes.length > 0 && (
              <div className="mt-2 text-xs text-sky-700 dark:text-sky-300 font-medium">
                {selectedRepairTypes.length} repair type
                {selectedRepairTypes.length > 1 ? 's' : ''} selected (counts as{' '}
                {selectedRepairTypes.length} bicycle service
                {selectedRepairTypes.length > 1 ? 's' : ''})
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 flex justify-between">
              <span>Notes {selectedRepairTypes.includes('Other') && '(required)'}</span>
              <span className="text-xs text-gray-400">
                {selectedRepairTypes.includes('Other') ? 'Required' : 'Optional'}
              </span>
            </label>
            <textarea
              aria-label="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm resize-y bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Additional info or description"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitDisabled}
              onClick={handleCreate}
              type="button"
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              title={
                !bikeDescription
                  ? 'Bicycle description required in guest profile'
                  : selectedRepairTypes.length === 0
                  ? 'Please select at least one repair type'
                  : ''
              }
            >
              {submitting ? 'Saving...' : 'Log Repair'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default BicycleRepairBooking;
