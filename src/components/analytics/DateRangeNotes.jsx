import React, { useMemo } from "react";
import { useDailyNotesStore } from "../../stores/useDailyNotesStore";
import { DAILY_NOTE_SERVICE_LABELS } from "../../types/dailyNotes";
import { FileText, Calendar } from "lucide-react";
import { formatDateForDisplay } from "../../utils/date";

/**
 * DateRangeNotes - Displays daily notes for a specific date range
 * 
 * Shows all relevant notes for dates within the selected time range,
 * organized by date and service type. Useful for understanding context
 * around data anomalies in analytics views.
 * 
 * @param {Object} props
 * @param {string} props.startDate - Start date in YYYY-MM-DD format
 * @param {string} props.endDate - End date in YYYY-MM-DD format
 * @param {string[]} [props.serviceTypes] - Optional filter for specific service types (e.g., ['meals', 'showers'])
 * @param {boolean} [props.compact] - Show compact view without date headers
 */
const DateRangeNotes = ({ startDate, endDate, serviceTypes = null, compact = false }) => {
  const { getNotesForDateRange } = useDailyNotesStore();

  // Get notes for the date range
  const notes = useMemo(() => {
    const allNotes = getNotesForDateRange(startDate, endDate);
    
    // Filter by service types if provided
    if (serviceTypes && serviceTypes.length > 0) {
      return allNotes.filter(note => serviceTypes.includes(note.serviceType));
    }
    
    return allNotes;
  }, [startDate, endDate, serviceTypes, getNotesForDateRange]);

  // Group notes by date
  const notesByDate = useMemo(() => {
    const grouped = {};
    notes.forEach(note => {
      if (!grouped[note.noteDate]) {
        grouped[note.noteDate] = [];
      }
      grouped[note.noteDate].push(note);
    });
    
    // Sort dates in descending order (newest first)
    return Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, dateNotes]) => ({
        date,
        notes: dateNotes.sort((a, b) => {
          // Sort by service type order: meals, showers, laundry, general
          const order = { meals: 0, showers: 1, laundry: 2, general: 3 };
          return (order[a.serviceType] || 99) - (order[b.serviceType] || 99);
        }),
      }));
  }, [notes]);

  if (notesByDate.length === 0) {
    return null;
  }

  // Get service type badge color
  const getServiceBadgeColor = (serviceType) => {
    const colors = {
      meals: "bg-blue-100 text-blue-800 border-blue-200",
      showers: "bg-sky-100 text-sky-800 border-sky-200",
      laundry: "bg-purple-100 text-purple-800 border-purple-200",
      general: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[serviceType] || colors.general;
  };

  if (compact) {
    // Compact view: simple list without date headers
    return (
      <div className="bg-amber-50 rounded-lg border border-amber-200 p-3">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-amber-700" />
          <span className="text-sm font-medium text-amber-900">
            Daily Notes ({notes.length})
          </span>
        </div>
        <div className="space-y-2">
          {notesByDate.map(({ date, notes: dateNotes }) => (
            <div key={date} className="space-y-1">
              {dateNotes.map((note) => (
                <div key={note.id} className="text-sm bg-white rounded p-2 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">
                      {formatDateForDisplay(note.noteDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getServiceBadgeColor(note.serviceType)}`}>
                      {DAILY_NOTE_SERVICE_LABELS[note.serviceType]}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{note.noteText}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full view: organized by date with headers
  return (
    <div className="bg-amber-50 rounded-lg border border-amber-200 overflow-hidden">
      <div className="px-4 py-3 bg-amber-100 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-amber-700" />
          <h3 className="font-semibold text-amber-900">Daily Notes for this Period</h3>
          <span className="ml-auto text-sm text-amber-700">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>
        <p className="text-sm text-amber-700 mt-1">
          Operational context to help explain data patterns and anomalies
        </p>
      </div>

      <div className="p-4 space-y-4">
        {notesByDate.map(({ date, notes: dateNotes }) => (
          <div key={date} className="bg-white rounded-lg border border-amber-200 overflow-hidden">
            <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <Calendar size={14} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-900">
                {formatDateForDisplay(date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {dateNotes.map((note) => (
                <div key={note.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getServiceBadgeColor(note.serviceType)}`}>
                      {DAILY_NOTE_SERVICE_LABELS[note.serviceType]}
                    </span>
                    {note.updatedBy && (
                      <span className="text-xs text-gray-500">
                        by {note.updatedBy}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-0">
                    {note.noteText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DateRangeNotes;
