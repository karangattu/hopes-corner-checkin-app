/**
 * Daily Notes Types
 * 
 * Types for the daily notes feature that captures operational context
 * (weather, staffing, events) to explain data anomalies in analytics.
 */

/**
 * @typedef {'meals' | 'showers' | 'laundry' | 'general'} DailyNoteServiceType
 */

/**
 * @typedef {Object} DailyNote
 * @property {string} id - UUID primary key
 * @property {string} noteDate - Date in YYYY-MM-DD format
 * @property {DailyNoteServiceType} serviceType - Type of service this note applies to
 * @property {string} noteText - The note content
 * @property {string|null} createdBy - User ID/email who created the note
 * @property {string|null} updatedBy - User ID/email who last modified the note
 * @property {string} createdAt - ISO 8601 timestamp
 * @property {string} updatedAt - ISO 8601 timestamp
 */

/**
 * @typedef {Object} DailyNoteRow
 * @property {string} id
 * @property {string} note_date
 * @property {string} service_type
 * @property {string} note_text
 * @property {string|null} created_by
 * @property {string|null} updated_by
 * @property {string} created_at
 * @property {string} updated_at
 */

export const DAILY_NOTE_SERVICE_TYPES = /** @type {const} */ ([
  'meals',
  'showers',
  'laundry',
  'general',
]);

export const DAILY_NOTE_SERVICE_LABELS = /** @type {const} */ ({
  meals: 'Meals',
  showers: 'Showers',
  laundry: 'Laundry',
  general: 'General',
});

/**
 * Maps a database row to application format (snake_case to camelCase)
 * @param {DailyNoteRow} row - Database row
 * @returns {DailyNote} Mapped daily note object
 */
export const mapDailyNoteRow = (row) => ({
  id: row.id,
  noteDate: row.note_date,
  serviceType: row.service_type,
  noteText: row.note_text,
  createdBy: row.created_by || null,
  updatedBy: row.updated_by || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Maps application format to database row format (camelCase to snake_case)
 * @param {Partial<DailyNote>} note - Application note object
 * @returns {Partial<DailyNoteRow>} Database row format
 */
export const mapDailyNoteToRow = (note) => {
  const row = {};
  if (note.noteDate !== undefined) row.note_date = note.noteDate;
  if (note.serviceType !== undefined) row.service_type = note.serviceType;
  if (note.noteText !== undefined) row.note_text = note.noteText;
  if (note.createdBy !== undefined) row.created_by = note.createdBy;
  if (note.updatedBy !== undefined) row.updated_by = note.updatedBy;
  return row;
};
