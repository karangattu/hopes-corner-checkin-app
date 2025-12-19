'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Download,
  FileText,
} from 'lucide-react';
import { createClient, isSupabaseEnabled } from '@/lib/supabase/client';
import { useGuestsStore } from '@/lib/stores';
import { pacificDateStringFrom } from '@/lib/utils/date';
import type { Guest } from '@/lib/types';

// Helper functions
const padTwo = (value: number | string): string => String(value).padStart(2, '0');

const formatMdy = (month: number, day: number, year: number, leadingZero = false): string => {
  const monthPart = leadingZero ? padTwo(month) : String(month);
  const dayPart = leadingZero ? padTwo(day) : String(day);
  return `${monthPart}/${dayPart}/${year}`;
};

const formatTime12Hour = (hours24: number, minutes: number, seconds: number): string => {
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = ((hours24 + 11) % 12) + 1;
  return `${hour12}:${padTwo(minutes)}:${padTwo(seconds)} ${period}`;
};

const getDateFormatExamples = (year: number) => {
  const sampleMonth = 4;
  const sampleDay = 29;
  const iso = `${year}-${padTwo(sampleMonth)}-${padTwo(sampleDay)}`;
  const numeric = formatMdy(sampleMonth, sampleDay, year);
  const numericWithTime = `${numeric} ${formatTime12Hour(11, 53, 58)}`;
  return { iso, numeric, numericWithTime };
};

const buildAttendanceTemplateCSV = (year: number): string => {
  const januaryDay = 15;
  const januaryIso = `${year}-${padTwo(1)}-${padTwo(januaryDay)}`;
  const januaryPadded = formatMdy(1, januaryDay, year, true);
  const januaryNextPadded = formatMdy(1, januaryDay + 1, year, true);
  const { numericWithTime } = getDateFormatExamples(year);

  return [
    'Attendance_ID,Guest_ID,Count,Program,Date_Submitted',
    `ATT001,123,1,Meal,${januaryIso}`,
    `ATT002,456,1,Shower,${januaryIso}`,
    `ATT003,789,1,Laundry,${januaryPadded}`,
    `ATT004,123,1,Bicycle,${numericWithTime}`,
    `ATT005,456,1,Hair Cut,${januaryIso}`,
    `ATT006,789,1,Holiday,${januaryNextPadded}`,
    `ATT007,M94816825,10,Meal,${januaryIso}`,
    `ATT008,M61706731,8,Meal,${januaryIso}`,
    `ATT009,M29017132,15,Meal,${januaryIso}`,
  ].join('\n');
};

// Error handling
interface ImportError {
  rowNumber: number;
  guestId: string;
  program: string;
  message: string;
  details?: string;
  reference?: string;
  affectedRows?: number;
}

const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const needsQuotes = /[",\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

const downloadErrorReport = (errors: ImportError[], fileName: string): void => {
  if (!errors || errors.length === 0) return;

  const header = ['Row', 'Guest ID', 'Program', 'Message', 'Notes'].join(',');
  const rows = errors.map((error) => {
    const notes: string[] = [];
    if (error.details) notes.push(error.details);
    if (error.affectedRows) {
      notes.push(`Affects ${error.affectedRows} row${error.affectedRows === 1 ? '' : 's'}`);
    }
    if (error.reference) notes.push(error.reference);

    return [
      escapeCsvValue(error.rowNumber ?? ''),
      escapeCsvValue(error.guestId ?? ''),
      escapeCsvValue(error.program ?? ''),
      escapeCsvValue(error.message ?? ''),
      escapeCsvValue(notes.join(' | ')),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const MAX_INLINE_ERRORS = 25;

const formatErrorSnippet = (error: ImportError): string => {
  if (!error) return '';
  const parts: string[] = [];
  if (error.rowNumber) parts.push(`Row ${error.rowNumber}`);
  if (error.program) parts.push(error.program);
  if (error.guestId) parts.push(`Guest ${error.guestId}`);
  const context = parts.length > 0 ? `${parts.join(' | ')}: ` : '';
  return `${context}${error.message}`;
};

// Types
interface UploadResult {
  success: boolean;
  message: string;
}

interface ParsedRecord {
  attendanceId: string;
  guestId: string;
  count: number;
  program: string;
  programType: string;
  dateSubmitted: string;
  originalDate: string;
  rawCount: string;
  isSpecialId: boolean;
  specialMapping: SpecialMapping | null;
  guestExists: boolean;
  programValid: boolean;
  specialIdValid: boolean;
  guestIdProvided: boolean;
  rowIndex: number;
  internalGuestId?: string;
  guest?: Guest;
}

interface SpecialMapping {
  type: string;
  label: string;
}

// Special guest IDs that map to specific meal types (no guest profile created)
const SPECIAL_GUEST_IDS: Record<string, SpecialMapping> = {
  M91834859: { type: 'extra', label: 'Extra meals' },
  M94816825: { type: 'rv', label: 'RV meals' },
  M47721243: { type: 'lunch_bag', label: 'Lunch bags' },
  M29017132: { type: 'day_worker', label: 'Day Worker Center meals' },
  M61706731: { type: 'shelter', label: 'Shelter meals' },
  M65842216: { type: 'united_effort', label: 'United Effort meals' },
};

// Program type mapping for CSV import
const PROGRAM_TYPES: Record<string, string> = {
  Meal: 'meals',
  Shower: 'showers',
  Laundry: 'laundry',
  Bicycle: 'bicycles',
  'Hair Cut': 'haircuts',
  Holiday: 'holidays',
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateInputToISO = (value: Date | string | null): string | null => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (DATE_ONLY_REGEX.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    if ([year, month, day].some((n) => Number.isNaN(n))) return null;
    const isoDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return Number.isNaN(isoDate.getTime()) ? null : isoDate.toISOString();
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return null;
};

const splitCSVLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
};

export default function AttendanceBatchUpload() {
  const guests = useGuestsStore((state) => state.guests);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [recentErrors, setRecentErrors] = useState<ImportError[]>([]);
  const [errorReportName, setErrorReportName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();

  // Date range filter state
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const dateFormatExamples = getDateFormatExamples(currentYear);
  const displayedErrors = recentErrors.slice(0, MAX_INLINE_ERRORS);
  const hasMoreErrors = recentErrors.length > MAX_INLINE_ERRORS;

  const isDateInRange = (dateStr: string): boolean => {
    if (!useDateFilter || !startDate || !endDate) return true;

    try {
      const recordDate = new Date(dateStr);
      const filterStart = new Date(startDate);
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);

      return recordDate >= filterStart && recordDate <= filterEnd;
    } catch {
      return true;
    }
  };

  const parseCSVRow = (
    line: string,
    rowIndex: number,
    headerIndex: (key: string) => number
  ): ParsedRecord | { _dateFiltered: true } | null => {
    const values = splitCSVLine(line);
    const get = (key: string): string => {
      const i = headerIndex(key);
      return i === -1 ? '' : (values[i] || '').trim();
    };

    const attendanceId = get('attendance_id');
    const guestId = get('guest_id');
    const rawCount = get('count');
    const parsedCount = parseInt(rawCount, 10);
    const count = Number.isNaN(parsedCount) ? 1 : Math.max(parsedCount, 1);
    const program = get('program').trim();
    const dateSubmitted = get('date_submitted').trim();

    // Validate program type
    const normalizedProgram = Object.keys(PROGRAM_TYPES).find(
      (key) => key.toLowerCase() === program.toLowerCase()
    );

    const programValid = normalizedProgram !== undefined;

    // Validate and parse date format
    let parsedDate: Date;
    try {
      if (dateSubmitted.match(/^\d{4}-\d{2}-\d{2}$/)) {
        parsedDate = new Date(`${dateSubmitted}T12:00:00`);
      } else if (dateSubmitted.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [month, day, year] = dateSubmitted.split('/');
        parsedDate = new Date(
          `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`
        );
      } else if (
        dateSubmitted.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(AM|PM)$/i)
      ) {
        parsedDate = new Date(dateSubmitted);
      } else {
        parsedDate = new Date(dateSubmitted);
      }

      if (isNaN(parsedDate.getTime())) {
        console.warn(
          `Skipping row ${rowIndex + 2}: Invalid date format "${dateSubmitted}".`
        );
        return null;
      }
    } catch {
      console.warn(
        `Skipping row ${rowIndex + 2}: Invalid date format "${dateSubmitted}".`
      );
      return null;
    }

    const normalizedDateIso =
      normalizeDateInputToISO(parsedDate) ?? parsedDate.toISOString();

    if (!isDateInRange(normalizedDateIso)) {
      return { _dateFiltered: true };
    }

    const guestIdProvided = !!guestId;
    const specialMapping = SPECIAL_GUEST_IDS[guestId] || null;
    const isSpecialId = specialMapping !== null;
    const specialIdValid = !isSpecialId || normalizedProgram === 'Meal';

    let guestExists = true;
    if (!isSpecialId && guestIdProvided) {
      const guest = guests.find(
        (g) => String(g.id) === String(guestId) || g.guestId === guestId
      );
      guestExists = guest !== undefined;
    }

    return {
      attendanceId,
      guestId,
      count,
      program: normalizedProgram || program,
      programType: normalizedProgram ? PROGRAM_TYPES[normalizedProgram] : '',
      dateSubmitted: normalizedDateIso,
      originalDate: dateSubmitted,
      rawCount,
      isSpecialId,
      specialMapping,
      guestExists,
      programValid,
      specialIdValid,
      guestIdProvided,
      rowIndex,
    };
  };

  const importAttendanceRecords = async (
    records: ParsedRecord[]
  ): Promise<{
    successCount: number;
    errorCount: number;
    errors: ImportError[];
    specialMealCounts: Record<string, number>;
  }> => {
    if (!isSupabaseEnabled()) {
      return {
        successCount: 0,
        errorCount: records.length,
        errors: records.map((r, i) => ({
          rowNumber: i + 2,
          guestId: r.guestId,
          program: r.program,
          message: 'Supabase is not enabled',
        })),
        specialMealCounts: {},
      };
    }

    const supabase = createClient();
    let successCount = 0;
    let errorCount = 0;
    const errors: ImportError[] = [];
    const specialMealCounts: Record<string, number> = {};

    // Group records by type
    const recordsByType: Record<string, ParsedRecord[]> = {
      meals: [],
      showers: [],
      laundry: [],
      bicycles: [],
      haircuts: [],
      holidays: [],
      specialMeals: [],
    };

    // Pre-validate and group records
    for (const record of records) {
      try {
        const { guestId, programType, isSpecialId, specialMapping } = record;

        if (isSpecialId && specialMapping) {
          recordsByType.specialMeals.push(record);
          continue;
        }

        const guest = guests.find(
          (g) => String(g.id) === String(guestId) || g.guestId === guestId
        );

        if (!guest) {
          throw new Error(`Guest with ID "${guestId}" not found`);
        }

        record.internalGuestId = guest.id;
        record.guest = guest;
        
        if (recordsByType[programType]) {
          recordsByType[programType].push(record);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          rowNumber: record.rowIndex + 2,
          guestId: record.guestId || 'unknown',
          program: record.program,
          message: errorMessage,
        });
        errorCount++;
      }
    }

    // Process special meals
    for (const record of recordsByType.specialMeals) {
      try {
        const { specialMapping, count, dateSubmitted } = record;
        if (!specialMapping) continue;
        
        const pacificDateStr = pacificDateStringFrom(dateSubmitted);
        
        const { error } = await supabase.from('meal_attendance').insert({
          meal_type: specialMapping.type,
          guest_id: null,
          quantity: count,
          served_on: pacificDateStr,
          recorded_at: dateSubmitted,
        });

        if (error) throw error;

        if (!specialMealCounts[specialMapping.label]) {
          specialMealCounts[specialMapping.label] = 0;
        }
        specialMealCounts[specialMapping.label] += count;
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          rowNumber: record.rowIndex + 2,
          guestId: record.guestId || '',
          program: record.program,
          message: errorMessage,
        });
        errorCount++;
      }
    }

    // Process regular meals
    if (recordsByType.meals.length > 0) {
      setUploadProgress(`Processing ${recordsByType.meals.length} meal records...`);
      
      const mealPayloads = recordsByType.meals.map((r) => ({
        meal_type: 'guest',
        guest_id: r.internalGuestId!,
        quantity: r.count,
        served_on: pacificDateStringFrom(r.dateSubmitted),
        recorded_at: r.dateSubmitted,
      }));

      const { data, error } = await supabase
        .from('meal_attendance')
        .insert(mealPayloads)
        .select();

      if (error) {
        recordsByType.meals.forEach((r) => {
          errors.push({
            rowNumber: r.rowIndex + 2,
            guestId: r.guestId,
            program: r.program,
            message: `Meal import failed: ${error.message}`,
          });
          errorCount++;
        });
      } else {
        successCount += data?.length || 0;
      }
    }

    // Process showers
    if (recordsByType.showers.length > 0) {
      setUploadProgress(`Processing ${recordsByType.showers.length} shower records...`);
      
      const showerPayloads = recordsByType.showers.map((r) => ({
        guest_id: r.internalGuestId!,
        scheduled_time: null,
        scheduled_for: pacificDateStringFrom(r.dateSubmitted),
        status: 'done',
      }));

      const { data, error } = await supabase
        .from('shower_reservations')
        .insert(showerPayloads)
        .select();

      if (error) {
        recordsByType.showers.forEach((r) => {
          errors.push({
            rowNumber: r.rowIndex + 2,
            guestId: r.guestId,
            program: r.program,
            message: `Shower import failed: ${error.message}`,
          });
          errorCount++;
        });
      } else {
        successCount += data?.length || 0;
      }
    }

    // Process laundry
    if (recordsByType.laundry.length > 0) {
      setUploadProgress(`Processing ${recordsByType.laundry.length} laundry records...`);
      
      const laundryPayloads = recordsByType.laundry.map((r) => ({
        guest_id: r.internalGuestId!,
        slot_label: null,
        laundry_type: 'offsite',
        bag_number: null,
        scheduled_for: pacificDateStringFrom(r.dateSubmitted),
        status: 'done',
      }));

      const { data, error } = await supabase
        .from('laundry_bookings')
        .insert(laundryPayloads)
        .select();

      if (error) {
        recordsByType.laundry.forEach((r) => {
          errors.push({
            rowNumber: r.rowIndex + 2,
            guestId: r.guestId,
            program: r.program,
            message: `Laundry import failed: ${error.message}`,
          });
          errorCount++;
        });
      } else {
        successCount += data?.length || 0;
      }
    }

    // Process bicycles
    if (recordsByType.bicycles.length > 0) {
      setUploadProgress(`Processing ${recordsByType.bicycles.length} bicycle records...`);
      
      const bicyclePayloads = recordsByType.bicycles.map((r) => ({
        guest_id: r.internalGuestId!,
        repair_type: 'Legacy Import',
        repair_types: ['Legacy Import'],
        completed_repairs: [],
        notes: 'Imported from legacy system',
        status: 'done',
        priority: 0,
        requested_at: r.dateSubmitted,
        completed_at: r.dateSubmitted,
      }));

      const { data, error } = await supabase
        .from('bicycle_repairs')
        .insert(bicyclePayloads)
        .select();

      if (error) {
        recordsByType.bicycles.forEach((r) => {
          errors.push({
            rowNumber: r.rowIndex + 2,
            guestId: r.guestId,
            program: r.program,
            message: `Bicycle import failed: ${error.message}`,
          });
          errorCount++;
        });
      } else {
        successCount += data?.length || 0;
      }
    }

    // Process haircuts
    if (recordsByType.haircuts.length > 0) {
      setUploadProgress(`Processing ${recordsByType.haircuts.length} haircut records...`);
      
      const haircutPayloads = recordsByType.haircuts.map((r) => ({
        guest_id: r.internalGuestId!,
        served_at: r.dateSubmitted,
      }));

      const { data, error } = await supabase
        .from('haircut_visits')
        .insert(haircutPayloads)
        .select();

      if (error) {
        recordsByType.haircuts.forEach((r) => {
          errors.push({
            rowNumber: r.rowIndex + 2,
            guestId: r.guestId,
            program: r.program,
            message: `Haircut import failed: ${error.message}`,
          });
          errorCount++;
        });
      } else {
        successCount += data?.length || 0;
      }
    }

    // Process holidays
    if (recordsByType.holidays.length > 0) {
      setUploadProgress(`Processing ${recordsByType.holidays.length} holiday records...`);
      
      const holidayPayloads = recordsByType.holidays.map((r) => ({
        guest_id: r.internalGuestId!,
        served_at: r.dateSubmitted,
      }));

      const { data, error } = await supabase
        .from('holiday_visits')
        .insert(holidayPayloads)
        .select();

      if (error) {
        recordsByType.holidays.forEach((r) => {
          errors.push({
            rowNumber: r.rowIndex + 2,
            guestId: r.guestId,
            program: r.program,
            message: `Holiday import failed: ${error.message}`,
          });
          errorCount++;
        });
      } else {
        successCount += data?.length || 0;
      }
    }

    return { successCount, errorCount, errors, specialMealCounts };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setUploadResult({
        success: false,
        message: 'Please upload a valid CSV file',
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setUploadProgress('Reading file...');
    setRecentErrors([]);
    setErrorReportName('');

    try {
      const content = await file.text();
      const text = content.replace(/\r\n/g, '\n');
      const linesSet = new Set(text.split('\n').filter((l) => l.trim().length > 0));
      const lines = Array.from(linesSet);

      if (lines.length < 2) {
        throw new Error('CSV needs header + at least one data row');
      }

      // Parse headers
      const rawHeaders = splitCSVLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ''));
      const norm = (h: string) => h.toLowerCase().replace(/\s+/g, '_');
      const headers = rawHeaders.map((h) => ({ raw: h, norm: norm(h) }));

      const headerIndex = (needle: string): number => {
        const idx = headers.findIndex((h) => h.norm === needle);
        return idx >= 0 ? idx : -1;
      };

      // Validate headers
      const requiredNorm = ['attendance_id', 'count', 'program', 'date_submitted'];
      const missing = requiredNorm.filter((r) => headerIndex(r) === -1);

      if (missing.length) {
        throw new Error(
          `Missing required column(s): ${missing.map((m) => m.replace('_', ' ')).join(', ')}`
        );
      }

      // Process records
      const CHUNK_SIZE = 500;
      const MAX_LOGGED_ERRORS = 1000;
      const totalLines = lines.length - 1;
      let totalSuccess = 0;
      let totalErrors = 0;
      const sampledErrors: ImportError[] = [];
      let totalSkippedCount = 0;
      const allSpecialMealCounts: Record<string, number> = {};

      for (let i = 1; i < lines.length; i += CHUNK_SIZE) {
        const chunkLines = lines.slice(i, i + CHUNK_SIZE);
        const startIndex = i - 1;
        const progress = ((i / totalLines) * 100).toFixed(1);

        const filterInfo = useDateFilter ? ` (filtering ${startDate} to ${endDate})` : '';
        setUploadProgress(
          `Processing records ${i} to ${Math.min(i + CHUNK_SIZE - 1, totalLines)} of ${totalLines} (${progress}%)${filterInfo}...`
        );

        await new Promise((resolve) => setTimeout(resolve, 0));

        // Parse chunk
        const parsedChunk: ParsedRecord[] = [];
        for (let idx = 0; idx < chunkLines.length; idx++) {
          const rowIndex = startIndex + idx;
          const result = parseCSVRow(chunkLines[idx], rowIndex, headerIndex);
          if (!result) continue;
          if ('_dateFiltered' in result) continue;
          parsedChunk.push(result);
        }

        // Filter valid records
        const validRecords: ParsedRecord[] = [];
        for (const record of parsedChunk) {
          if (!record.guestIdProvided || !record.programValid || !record.specialIdValid) {
            totalSkippedCount++;
            continue;
          }
          if (!record.isSpecialId && !record.guestExists) {
            totalSkippedCount++;
            continue;
          }
          validRecords.push(record);
        }

        // Import chunk
        if (validRecords.length > 0) {
          const { successCount, errorCount, errors, specialMealCounts } =
            await importAttendanceRecords(validRecords);

          totalSuccess += successCount;
          totalErrors += errorCount;

          if (sampledErrors.length < MAX_LOGGED_ERRORS && errors.length) {
            const available = MAX_LOGGED_ERRORS - sampledErrors.length;
            sampledErrors.push(...errors.slice(0, available));
          }

          // Merge special meal counts
          Object.entries(specialMealCounts).forEach(([key, val]) => {
            allSpecialMealCounts[key] = (allSpecialMealCounts[key] || 0) + val;
          });
        }
      }

      // Build result message
      let specialMealsSummary = '';
      if (Object.keys(allSpecialMealCounts).length > 0) {
        const mealDetails = Object.entries(allSpecialMealCounts)
          .map(([label, count]) => `${count} ${label}`)
          .join(', ');
        specialMealsSummary = ` (including ${mealDetails})`;
      }

      let skippedSummaryText = '';
      if (totalSkippedCount > 0) {
        skippedSummaryText = ` (skipped ${totalSkippedCount} record${totalSkippedCount === 1 ? '' : 's'})`;
      }

      if (totalErrors === 0) {
        setUploadResult({
          success: true,
          message: `Successfully imported ${totalSuccess} attendance records${specialMealsSummary}${skippedSummaryText}`,
        });
        setRecentErrors([]);
        setErrorReportName('');
      } else {
        const firstSnippets = sampledErrors
          .slice(0, 3)
          .map((error) => formatErrorSnippet(error))
          .filter(Boolean)
          .join('; ');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseFileName = file.name.replace(/\.[^/.]+$/i, '');
        const generatedReportName = `${baseFileName || 'attendance_import'}_errors_${timestamp}.csv`;

        setRecentErrors(sampledErrors);
        setErrorReportName(generatedReportName);

        if (totalSuccess > 0) {
          const baseMessage = `Imported ${totalSuccess} records${specialMealsSummary}${skippedSummaryText} with ${totalErrors} error${totalErrors === 1 ? '' : 's'}. Review the error table below.`;
          setUploadResult({
            success: false,
            message: firstSnippets ? `${baseMessage} First issues: ${firstSnippets}` : baseMessage,
          });
        } else {
          const baseMessage = `No records were imported. Encountered ${totalErrors} error${totalErrors === 1 ? '' : 's'}${skippedSummaryText}. Review the error table below.`;
          setUploadResult({
            success: false,
            message: firstSnippets ? `${baseMessage} Example issues: ${firstSnippets}` : baseMessage,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setUploadResult({
        success: false,
        message: errorMessage,
      });
      setRecentErrors([]);
      setErrorReportName('');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplateCSV = () => {
    const templateContent = buildAttendanceTemplateCSV(currentYear);
    const blob = new Blob([templateContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'attendance_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
      <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
        <FileText size={20} /> Batch Import Attendance Records
      </h2>

      {uploadProgress && (
        <div className="mb-4 p-3 rounded flex items-center gap-2 bg-blue-100 text-blue-700 border border-blue-200">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          {uploadProgress}
        </div>
      )}

      {uploadResult && (
        <div
          className={`mb-4 p-3 rounded flex items-center gap-2 ${
            uploadResult.success
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {uploadResult.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {uploadResult.message}
        </div>
      )}

      {recentErrors.length > 0 && (
        <div className="mb-4 border border-red-200 rounded-md overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-red-50 text-red-800 px-3 py-2 border-b border-red-200">
            <span className="text-sm font-medium">
              Found {recentErrors.length} validation error{recentErrors.length === 1 ? '' : 's'}.
              Showing first {displayedErrors.length}.
            </span>
            <button
              type="button"
              onClick={() =>
                downloadErrorReport(recentErrors, errorReportName || 'attendance_import_errors.csv')
              }
              className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
            >
              <Download size={14} />
              Download error CSV
            </button>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-red-100 text-red-800 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 font-semibold">Row</th>
                  <th className="px-3 py-2 font-semibold">Guest ID</th>
                  <th className="px-3 py-2 font-semibold">Program</th>
                  <th className="px-3 py-2 font-semibold">Message</th>
                </tr>
              </thead>
              <tbody>
                {displayedErrors.map((error, index) => (
                  <tr
                    key={`${error.rowNumber || 'row'}-${error.guestId || 'guest'}-${index}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-red-50'}
                  >
                    <td className="px-3 py-2 text-sm text-gray-700">{error.rowNumber ?? 'N/A'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{error.guestId ?? 'N/A'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{error.program ?? 'N/A'}</td>
                    <td className="px-3 py-2 text-sm text-red-800">
                      <div>{error.message}</div>
                      {error.details && (
                        <div className="mt-1 text-xs text-red-600">Details: {error.details}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMoreErrors && (
            <div className="bg-red-50 px-3 py-2 text-xs text-red-700 border-t border-red-200">
              Showing the first {displayedErrors.length} errors. Download the CSV to review all
              rows.
            </div>
          )}
        </div>
      )}

      {/* Date Range Filter */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="use-date-filter"
            checked={useDateFilter}
            onChange={(e) => setUseDateFilter(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="use-date-filter" className="font-semibold text-gray-700">
            Filter by Date Range (Recommended for Large Files)
          </label>
        </div>

        {useDateFilter && (
          <div className="ml-6 flex flex-wrap gap-4 items-end">
            <div>
              <label
                htmlFor="start-date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {startDate && endDate && (
              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded">
                Will import records from {new Date(startDate).toLocaleDateString()} to{' '}
                {new Date(endDate).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 mt-2 ml-6">
          Enable date filtering to import only records within a specific date range. This prevents
          browser crashes when working with very large CSV files (33k+ records).
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label
            htmlFor="attendance-csv-upload"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload size={18} />
            {isUploading ? 'Uploading...' : 'Upload Attendance CSV'}
          </label>
          <input
            id="attendance-csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
            disabled={isUploading}
          />
        </div>

        <button
          onClick={downloadTemplateCSV}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded flex items-center gap-2 transition-colors"
        >
          <Download size={18} />
          Download Template
        </button>
      </div>

      <div className="text-sm text-gray-600">
        <p className="mb-2 font-semibold">CSV Template Columns:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
          {['Attendance_ID', 'Guest_ID', 'Count', 'Program', 'Date_Submitted'].map((col) => (
            <span key={col} className="bg-gray-100 px-2 py-1 rounded text-xs">
              {col}
            </span>
          ))}
        </div>

        <p className="mb-2 font-semibold">Supported Program Types:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mb-3">
          {Object.keys(PROGRAM_TYPES).map((program) => (
            <span key={program} className="bg-blue-100 px-2 py-1 rounded text-xs">
              {program}
            </span>
          ))}
        </div>

        <p className="mb-2 font-semibold">Supported Date Formats:</p>
        <div className="bg-gray-50 p-3 rounded mb-3 text-xs">
          <div className="grid grid-cols-1 gap-1">
            <span>
              <strong>YYYY-MM-DD:</strong> {dateFormatExamples.iso}
            </span>
            <span>
              <strong>M/D/YYYY:</strong> {dateFormatExamples.numeric}
            </span>
            <span>
              <strong>M/D/YYYY H:MM:SS AM/PM:</strong> {dateFormatExamples.numericWithTime}
            </span>
          </div>
        </div>

        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Attendance_ID:</strong> Unique identifier for the record
          </li>
          <li>
            <strong>Guest_ID:</strong> Required - must match an existing guest in the system
          </li>
          <li>
            <strong>Count:</strong> Number of items/services (default: 1)
          </li>
          <li>
            <strong>Program:</strong> Must match one of the supported program types above
          </li>
          <li>
            <strong>Date_Submitted:</strong> Supports YYYY-MM-DD, M/D/YYYY, or M/D/YYYY H:MM:SS AM/PM
            formats
          </li>
          <li>All programs require a valid Guest_ID for individual tracking</li>
        </ul>
      </div>
    </div>
  );
}
