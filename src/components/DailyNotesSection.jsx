import React, { useState, useCallback, useMemo } from 'react';
import { StickyNote, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useDailyNotesStore } from '../stores/useDailyNotesStore';
import { DAILY_NOTE_SERVICE_TYPES, DAILY_NOTE_SERVICE_LABELS } from '../types/dailyNotes';
import { todayPacificDateString } from '../utils/date';
import DailyNoteModal from './DailyNoteModal';

/** Shift a YYYY-MM-DD string by `days` (+/-) and return a new YYYY-MM-DD string. */
const shiftDate = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Human-readable label for the selected date relative to today. */
const formatDateLabel = (dateStr, todayStr) => {
  if (dateStr === todayStr) return 'Today';
  if (dateStr === shiftDate(todayStr, -1)) return 'Yesterday';
  // Format as "Mon, Jan 15"
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/**
 * Quick-add section for daily notes on the check-in page.
 * Shows notes for the selected date (defaults to today) and allows
 * navigating to past dates to add/edit notes retroactively.
 */
const DailyNotesSection = ({ userId = null, compact = false }) => {
  const { getNotesForDate, deleteNote } = useDailyNotesStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState('general');
  const [isExpanded, setIsExpanded] = useState(true);

  const today = todayPacificDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;
  const isFutureBlocked = selectedDate >= today;

  const dateNotes = useMemo(() => getNotesForDate(selectedDate), [getNotesForDate, selectedDate]);

  const handleAddNote = useCallback((serviceType = 'general') => {
    setEditingServiceType(serviceType);
    setIsModalOpen(true);
  }, []);

  const handleEditNote = useCallback((note) => {
    setEditingServiceType(note.serviceType);
    setIsModalOpen(true);
  }, []);

  const handleDeleteNote = useCallback(async (noteId) => {
    const confirmed = window.confirm('Are you sure you want to delete this note?');
    if (confirmed) {
      await deleteNote(noteId);
    }
  }, [deleteNote]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const goToPreviousDay = useCallback(() => {
    setSelectedDate((prev) => shiftDate(prev, -1));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = shiftDate(prev, 1);
      return next <= today ? next : prev;
    });
  }, [today]);

  const goToToday = useCallback(() => {
    setSelectedDate(today);
  }, [today]);

  // Get service types that don't have notes yet for the selected date
  const availableServiceTypes = useMemo(() => {
    const usedTypes = new Set(dateNotes.map((n) => n.serviceType));
    return DAILY_NOTE_SERVICE_TYPES.filter((type) => !usedTypes.has(type));
  }, [dateNotes]);

  const dateLabel = formatDateLabel(selectedDate, today);

  /** Shared date navigator used in both compact and full views */
  const DateNavigator = ({ size = 'normal' }) => {
    const isSmall = size === 'small';
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={goToPreviousDay}
          className={`${isSmall ? 'p-0.5' : 'p-1'} text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors`}
          aria-label="Previous day"
        >
          <ChevronLeft className={isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
        {!isToday && (
          <button
            onClick={goToToday}
            className={`${isSmall ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} text-amber-700 hover:bg-amber-100 rounded transition-colors`}
            title="Jump to today"
          >
            Today
          </button>
        )}
        <button
          onClick={goToNextDay}
          disabled={isFutureBlocked}
          className={`${isSmall ? 'p-0.5' : 'p-1'} text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
          aria-label="Next day"
        >
          <ChevronRight className={isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {dateLabel} ({dateNotes.length})
            </span>
            <DateNavigator size="small" />
          </div>
          <button
            onClick={() => handleAddNote('general')}
            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
        {dateNotes.length > 0 && (
          <div className="mt-2 space-y-1">
            {dateNotes.map((note) => (
              <div key={note.id} className="text-xs text-amber-700 truncate">
                <span className="font-medium">{DAILY_NOTE_SERVICE_LABELS[note.serviceType]}:</span>{' '}
                {note.noteText}
              </div>
            ))}
          </div>
        )}
        <DailyNoteModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialDate={selectedDate}
          initialServiceType={editingServiceType}
          userId={userId}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <StickyNote className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Daily Notes</h3>
            <p className="text-sm text-gray-500">
              {dateNotes.length === 0
                ? `Add context for ${isToday ? 'today\'s' : dateLabel + '\'s'} services`
                : `${dateNotes.length} note${dateNotes.length === 1 ? '' : 's'} for ${dateLabel.toLowerCase()}`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Date Navigator */}
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
            <button
              onClick={goToPreviousDay}
              className="p-1 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{dateLabel}</span>
              {!isToday && (
                <span className="text-xs text-gray-400">({selectedDate})</span>
              )}
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="text-xs text-amber-600 hover:text-amber-800 hover:underline ml-1"
                >
                  Back to today
                </button>
              )}
            </div>
            <button
              onClick={goToNextDay}
              disabled={isFutureBlocked}
              className="p-1 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next day"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Existing Notes */}
          {dateNotes.length > 0 && (
            <div className="space-y-2">
              {dateNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        {DAILY_NOTE_SERVICE_LABELS[note.serviceType]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {note.noteText}
                    </p>
                    {note.updatedBy && (
                      <p className="text-xs text-gray-400 mt-1">
                        Updated by {note.updatedBy}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEditNote(note)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-100 rounded transition-colors"
                      aria-label={`Edit ${DAILY_NOTE_SERVICE_LABELS[note.serviceType]} note`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label={`Delete ${DAILY_NOTE_SERVICE_LABELS[note.serviceType]} note`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Note Buttons */}
          {availableServiceTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableServiceTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddNote(type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add {DAILY_NOTE_SERVICE_LABELS[type]} Note
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {dateNotes.length === 0 && availableServiceTypes.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              All service types have notes for {dateLabel.toLowerCase()}.
            </p>
          )}
        </div>
      )}

      <DailyNoteModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialDate={selectedDate}
        initialServiceType={editingServiceType}
        userId={userId}
      />
    </div>
  );
};

export default DailyNotesSection;
