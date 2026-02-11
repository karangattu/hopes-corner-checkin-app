import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StickyNote, X, Save, Trash2, AlertCircle } from 'lucide-react';
import Modal from './ui/Modal';
import { useDailyNotesStore } from '../stores/useDailyNotesStore';
import { DAILY_NOTE_SERVICE_TYPES, DAILY_NOTE_SERVICE_LABELS } from '../types/dailyNotes';
import { todayPacificDateString } from '../utils/date';

const MAX_CHARS = 2000;
const WARN_CHARS = 1800;

/**
 * Modal for adding/editing daily notes for a specific date and service type.
 * Supports upsert behavior - creates new notes or updates existing ones.
 */
const DailyNoteModal = ({
  isOpen,
  onClose,
  initialDate = null,
  initialServiceType = 'general',
  userId = null,
}) => {
  const { getNoteForDateAndService, addOrUpdateNote, deleteNote } = useDailyNotesStore();
  
  const [noteDate, setNoteDate] = useState(initialDate || todayPacificDateString());
  const [serviceType, setServiceType] = useState(initialServiceType);
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  
  const textareaRef = useRef(null);
  const titleId = 'daily-note-modal-title';

  // Load existing note when date or service type changes
  const existingNote = useMemo(() => {
    return getNoteForDateAndService(noteDate, serviceType);
  }, [noteDate, serviceType, getNoteForDateAndService]);

  useEffect(() => {
    if (isOpen) {
      setNoteText(existingNote?.noteText || '');
      setError(null);
    }
  }, [isOpen, existingNote]);

  // Reset when modal opens with new props
  useEffect(() => {
    if (isOpen) {
      setNoteDate(initialDate || todayPacificDateString());
      setServiceType(initialServiceType);
    }
  }, [isOpen, initialDate, initialServiceType]);

  const charCount = noteText.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount >= WARN_CHARS && charCount <= MAX_CHARS;

  const handleSave = useCallback(async () => {
    if (!noteText.trim()) {
      setError('Note text is required');
      return;
    }
    if (isOverLimit) {
      setError(`Note exceeds maximum length of ${MAX_CHARS} characters`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await addOrUpdateNote(noteDate, serviceType, noteText.trim(), userId);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  }, [noteDate, serviceType, noteText, userId, addOrUpdateNote, onClose, isOverLimit]);

  const handleDelete = useCallback(async () => {
    if (!existingNote) return;

    const confirmed = window.confirm('Are you sure you want to delete this note?');
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteNote(existingNote.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete note');
    } finally {
      setIsDeleting(false);
    }
  }, [existingNote, deleteNote, onClose]);

  const formatAuditInfo = useCallback(() => {
    if (!existingNote) return null;

    const createdDate = new Date(existingNote.createdAt).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const lines = [];
    if (existingNote.createdBy) {
      lines.push(`Created by ${existingNote.createdBy} on ${createdDate}`);
    } else {
      lines.push(`Created on ${createdDate}`);
    }

    if (existingNote.updatedAt !== existingNote.createdAt) {
      const updatedDate = new Date(existingNote.updatedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      if (existingNote.updatedBy) {
        lines.push(`Last updated by ${existingNote.updatedBy} on ${updatedDate}`);
      } else {
        lines.push(`Last updated on ${updatedDate}`);
      }
    }

    return lines;
  }, [existingNote]);

  const auditInfo = formatAuditInfo();

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy={titleId}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <StickyNote className="h-5 w-5 text-amber-600" />
            </div>
            <h2 id={titleId} className="text-xl font-semibold text-gray-900">
              {existingNote ? 'Edit Daily Note' : 'Add Daily Note'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Date and Service Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="note-date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                id="note-date"
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label htmlFor="service-type" className="block text-sm font-medium text-gray-700 mb-1">
                Service Type
              </label>
              <select
                id="service-type"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {DAILY_NOTE_SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DAILY_NOTE_SERVICE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Note Text */}
          <div>
            <label htmlFor="note-text" className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              ref={textareaRef}
              id="note-text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add context for this day (e.g., weather conditions, staffing issues, special events)..."
              rows={5}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none ${
                isOverLimit
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : isNearLimit
                  ? 'border-amber-500'
                  : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                Explain data anomalies (e.g., "Heavy rain reduced turnout")
              </span>
              <span
                className={`text-xs ${
                  isOverLimit
                    ? 'text-red-600 font-medium'
                    : isNearLimit
                    ? 'text-amber-600'
                    : 'text-gray-400'
                }`}
              >
                {charCount}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Audit Info */}
          {auditInfo && auditInfo.length > 0 && (
            <div className="text-xs text-gray-500 space-y-0.5 pt-2 border-t border-gray-100">
              {auditInfo.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div>
            {existingNote && (
              <button
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting || isOverLimit || !noteText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : existingNote ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DailyNoteModal;
