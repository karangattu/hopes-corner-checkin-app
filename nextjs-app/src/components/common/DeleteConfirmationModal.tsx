'use client';

import React, { useState, useCallback } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  itemName: string;
  itemType?: string;
  warningMessage?: string;
  requireConfirmation?: boolean;
  confirmationText?: string;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Confirmation',
  itemName,
  itemType = 'item',
  warningMessage,
  requireConfirmation = false,
  confirmationText = 'DELETE',
}: DeleteConfirmationModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = !requireConfirmation || confirmInput === confirmationText;

  const handleConfirm = useCallback(async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  }, [isConfirmed, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    setConfirmInput('');
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <ModalHeader onClose={handleClose}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle size={20} />
          <span>{title}</span>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete{' '}
          <span className="font-semibold">{itemName}</span>?
        </p>

        {warningMessage && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
            {warningMessage}
          </div>
        )}

        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-300">
          <strong>Warning:</strong> This action cannot be undone. This will permanently delete the{' '}
          {itemType} and all associated data.
        </div>

        {requireConfirmation && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="font-mono font-bold">{confirmationText}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white"
              placeholder={confirmationText}
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={!isConfirmed || isDeleting}
          isLoading={isDeleting}
          loadingText="Deleting..."
          leftIcon={<Trash2 size={16} />}
        >
          Delete {itemType}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default DeleteConfirmationModal;
