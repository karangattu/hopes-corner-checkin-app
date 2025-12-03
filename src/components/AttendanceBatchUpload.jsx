import React, { useState, useRef, startTransition } from "react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Download,
  FileText,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { pacificDateStringFrom, isoFromPacificDateString } from "../utils/date";
import { BICYCLE_REPAIR_STATUS } from "../context/constants";
import {
  buildSupabaseShowerPayload,
  buildSupabaseLaundryPayload,
  buildSupabaseBicyclePayload,
  buildSupabaseHaircutPayload,
} from "./attendanceBatchSupabasePayloads";
import { withBulkOperation } from "../utils/bulkOperationContext";

const padTwo = (value) => String(value).padStart(2, "0");

const formatMdy = (month, day, year, options = {}) => {
  const leadingZero = options.leadingZero ?? false;
  const monthPart = leadingZero ? padTwo(month) : String(month);
  const dayPart = leadingZero ? padTwo(day) : String(day);
  return `${monthPart}/${dayPart}/${year}`;
};

const formatTime12Hour = (hours24, minutes, seconds) => {
  const period = hours24 >= 12 ? "PM" : "AM";
  const hour12 = ((hours24 + 11) % 12) + 1;
  return `${hour12}:${padTwo(minutes)}:${padTwo(seconds)} ${period}`;
};

const getDateFormatExamples = (year) => {
  const sampleMonth = 4;
  const sampleDay = 29;
  const iso = `${year}-${padTwo(sampleMonth)}-${padTwo(sampleDay)}`;
  const numeric = formatMdy(sampleMonth, sampleDay, year);
  const numericWithTime = `${numeric} ${formatTime12Hour(11, 53, 58)}`;
  return {
    iso,
    numeric,
    numericWithTime,
  };
};

const buildAttendanceTemplateCSV = (year) => {
  const januaryDay = 15;
  const januaryIso = `${year}-${padTwo(1)}-${padTwo(januaryDay)}`;
  const januaryPadded = formatMdy(1, januaryDay, year, { leadingZero: true });
  const januaryNextPadded = formatMdy(1, januaryDay + 1, year, {
    leadingZero: true,
  });
  const { numericWithTime } = getDateFormatExamples(year);

  return [
    "Attendance_ID,Guest_ID,Count,Program,Date_Submitted",
    `ATT001,123,1,Meal,${januaryIso}`,
    `ATT002,456,1,Shower,${januaryIso}`,
    `ATT003,789,1,Laundry,${januaryPadded}`,
    `ATT004,123,1,Bicycle,${numericWithTime}`,
    `ATT005,456,1,Hair Cut,${januaryIso}`,
    `ATT006,789,1,Holiday,${januaryNextPadded}`,
    `ATT007,M94816825,10,Meal,${januaryIso}`,
    `ATT008,M61706731,8,Meal,${januaryIso}`,
    `ATT009,M29017132,15,Meal,${januaryIso}`,
  ].join("\n");
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const needsQuotes = /[",\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

const downloadErrorReport = (errors, fileName) => {
  if (!errors || errors.length === 0) return;

  const header = ["Row", "Guest ID", "Program", "Message", "Notes"].join(",");
  const rows = errors.map((error) => {
    const notes = [];
    if (error.details) notes.push(error.details);
    if (error.affectedRows) {
      notes.push(
        `Affects ${error.affectedRows} row${error.affectedRows === 1 ? "" : "s"}`,
      );
    }
    if (error.reference) notes.push(error.reference);

    return [
      escapeCsvValue(error.rowNumber ?? ""),
      escapeCsvValue(error.guestId ?? ""),
      escapeCsvValue(error.program ?? ""),
      escapeCsvValue(error.message ?? ""),
      escapeCsvValue(notes.join(" | ")),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const MAX_INLINE_ERRORS = 25;

const formatErrorSnippet = (error) => {
  if (!error) return "";
  const parts = [];
  if (error.rowNumber) parts.push(`Row ${error.rowNumber}`);
  if (error.program) parts.push(error.program);
  if (error.guestId) parts.push(`Guest ${error.guestId}`);
  const context = parts.length > 0 ? `${parts.join(" | ")}: ` : "";
  return `${context}${error.message}`;
};

// Filter attendance records: skip rows where guest doesn't exist (for non-special IDs)
const filterValidAttendanceRecords = (records) => {
  const validRecords = [];
  const skippedRecords = [];

  records.forEach((record) => {
    // Check if guest ID is provided
    if (!record.guestIdProvided) {
      skippedRecords.push({
        guestId: record.guestId || "missing",
        program: record.program,
        rowIndex: record.rowIndex,
        reason: "Guest ID missing",
      });
      return;
    }

    // Check if program type is valid
    if (!record.programValid) {
      skippedRecords.push({
        guestId: record.guestId,
        program: record.program,
        rowIndex: record.rowIndex,
        reason: "Invalid program type",
      });
      return;
    }

    // Check if special ID is being used with non-Meal program
    if (!record.specialIdValid) {
      skippedRecords.push({
        guestId: record.guestId,
        program: record.program,
        rowIndex: record.rowIndex,
        reason: "Special ID only valid for Meal",
      });
      return;
    }

    // Keep special IDs (they don't require a guest to exist)
    if (record.isSpecialId) {
      validRecords.push(record);
      return;
    }

    // For regular guest IDs, only keep if guestExists is true
    if (record.guestExists) {
      validRecords.push(record);
    } else {
      skippedRecords.push({
        guestId: record.guestId,
        program: record.program,
        rowIndex: record.rowIndex,
        reason: "Guest not found",
      });
    }
  });

  return { validRecords, skippedRecords };
};

const AttendanceBatchUpload = () => {
  const {
    guests,
    addMealRecord,
    addRvMealRecord,
    addShelterMealRecord,
    addUnitedEffortMealRecord,
    addExtraMealRecord,
    addDayWorkerMealRecord,
    addLunchBagRecord,
    importShowerAttendanceRecord,
    importLaundryAttendanceRecord,
    addBicycleRecord,
    addHaircutRecord,
    addHolidayRecord,
    supabaseEnabled,
    insertMealAttendanceBatch,
    insertShowerReservationsBatch,
    insertLaundryBookingsBatch,
    insertBicycleRepairsBatch,
    insertHaircutVisitsBatch,
    insertHolidayVisitsBatch,
    setMealRecords,
    setShowerRecords,
    setLaundryRecords,
    setBicycleRecords,
    setHaircutRecords,
    setHolidayRecords,
    withPersistencePaused = async (fn) => fn(),
  } = useAppContext();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [recentErrors, setRecentErrors] = useState([]);
  const [errorReportName, setErrorReportName] = useState("");
  const fileInputRef = useRef(null);
  const currentYear = new Date().getFullYear();

  // Date range filter state
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const dateFormatExamples = getDateFormatExamples(currentYear);
  const displayedErrors = recentErrors.slice(0, MAX_INLINE_ERRORS);
  const hasMoreErrors = recentErrors.length > MAX_INLINE_ERRORS;

  // Special guest IDs that map to specific meal types (no guest profile created)
  const SPECIAL_GUEST_IDS = {
    M91834859: {
      type: "extra",
      handler: "addExtraMealRecord",
      label: "Extra meals",
    },
    M94816825: { type: "rv", handler: "addRvMealRecord", label: "RV meals" },
    M47721243: {
      type: "lunch_bag",
      handler: "addLunchBagRecord",
      label: "Lunch bags",
    },
    M29017132: {
      type: "day_worker",
      handler: "addDayWorkerMealRecord",
      label: "Day Worker Center meals",
    },
    M61706731: {
      type: "shelter",
      handler: "addShelterMealRecord",
      label: "Shelter meals",
    },
    M65842216: {
      type: "united_effort",
      handler: "addUnitedEffortMealRecord",
      label: "United Effort meals",
    },
  };

  // Program type mapping for CSV import
  const PROGRAM_TYPES = {
    Meal: "meals",
    Shower: "showers",
    Laundry: "laundry",
    Bicycle: "bicycle",
    "Hair Cut": "haircuts",
    Holiday: "holiday",
  };

  const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  const normalizeDateInputToISO = (value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }

    const raw = String(value).trim();
    if (!raw) return null;

    if (DATE_ONLY_REGEX.test(raw)) {
      const [year, month, day] = raw.split("-").map(Number);
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

  // Date filtering helper - needs to be accessible by parseCSVRow
  const isDateInRange = (dateStr) => {
    if (!useDateFilter || !startDate || !endDate) return true;

    try {
      const recordDate = new Date(dateStr);
      const filterStart = new Date(startDate);
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999); // Include end of day

      return recordDate >= filterStart && recordDate <= filterEnd;
    } catch {
      return true; // If date parsing fails, include the record
    }
  };

  const splitCSVLine = (line) => {
    const out = [];
    let cur = "";
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
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const parseCSVRow = (line, rowIndex, headerIndex) => {
    const values = splitCSVLine(line);
    const get = (key) => {
      const i = headerIndex(key);
      return i === -1 ? "" : (values[i] || "").trim();
    };

    const attendanceId = get("attendance_id");
    const guestId = get("guest_id");
    const rawCount = get("count");
    const parsedCount = Number.parseInt(rawCount, 10);
    const count = Number.isNaN(parsedCount) ? 1 : Math.max(parsedCount, 1);
    const program = get("program").trim();
    const dateSubmitted = get("date_submitted").trim();

    // Validate program type
    const normalizedProgram = Object.keys(PROGRAM_TYPES).find(
      (key) => key.toLowerCase() === program.toLowerCase(),
    );

    const programValid = normalizedProgram !== undefined;

    // Validate and parse date format
    let parsedDate;
    try {
      if (dateSubmitted.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format
        parsedDate = new Date(`${dateSubmitted}T12:00:00`);
      } else if (dateSubmitted.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        // M/D/YYYY or MM/DD/YYYY format
        const [month, day, year] = dateSubmitted.split("/");
        parsedDate = new Date(
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00`,
        );
      } else if (
        dateSubmitted.match(
          /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(AM|PM)$/i,
        )
      ) {
        // M/D/YYYY H:MM:SS AM/PM format (e.g., "4/29/YYYY 11:53:58 AM")
        parsedDate = new Date(dateSubmitted);
      } else {
        // Try generic Date parsing as fallback
        parsedDate = new Date(dateSubmitted);
      }

      if (isNaN(parsedDate.getTime())) {
        console.warn(
          `Skipping row ${rowIndex + 2}: Invalid date format "${dateSubmitted}". Supported formats: YYYY-MM-DD, M/D/YYYY, or M/D/YYYY H:MM:SS AM/PM`,
        );
        return null;
      }
    } catch {
      console.warn(
        `Skipping row ${rowIndex + 2}: Invalid date format "${dateSubmitted}". Supported formats: YYYY-MM-DD, M/D/YYYY, or M/D/YYYY H:MM:SS AM/PM`,
      );
      return null;
    }

    const normalizedDateIso =
      normalizeDateInputToISO(parsedDate) ?? parsedDate.toISOString();

    // Return marker object for date-filtered records (don't count as error)
    // The caller will skip these silently
    if (!isDateInRange(normalizedDateIso)) {
      return { _dateFiltered: true };
    }

    // Check if guest ID is provided
    const guestIdProvided = !!guestId;

    // Check if this is a special guest ID (only valid for Meal program)
    const specialMapping = SPECIAL_GUEST_IDS[guestId];
    const isSpecialId = specialMapping !== undefined;

    // Check if special ID is being used with non-Meal program
    const specialIdValid = !isSpecialId || normalizedProgram === "Meal";

    // For regular guest IDs (not special), check if guest exists
    // Don't throw error here - mark for validation during import
    let guestExists = true;
    if (!isSpecialId && guestIdProvided) {
      const guest = guests.find(
        (g) => String(g.id) === String(guestId) || g.guestId === guestId,
      );
      guestExists = guest !== undefined;
    }

    return {
      attendanceId,
      guestId,
      count,
      program: normalizedProgram,
      programType: PROGRAM_TYPES[normalizedProgram],
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



  const importAttendanceRecords = async (records) => {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const specialMealCounts = {}; // Track special meal types for summary

    // Collections for state updates at the end
    const allNewMealRecords = [];
    const allNewShowerRecords = [];
    const allNewLaundryRecords = [];
    const allNewBicycleRecords = [];
    const allNewHaircutRecords = [];
    const allNewHolidayRecords = [];

    // Group records by type for batch processing
    const recordsByType = {
      meals: [],
      showers: [],
      laundry: [],
      bicycles: [],
      haircuts: [],
      holidays: [],
      specialMeals: [],
    };

    // Pre-validate and group records
    records.forEach((record, index) => {
      try {
        const { guestId, programType, isSpecialId, specialMapping } = record;

        // Handle special guest IDs that map to meal types
        if (isSpecialId && specialMapping) {
          recordsByType.specialMeals.push({
            ...record,
            rowIndex: index,
          });
          return;
        }

        // Handle regular guest-based records
        const guest = guests.find(
          (g) => String(g.id) === String(guestId) || g.guestId === guestId,
        );

        if (!guest) {
          throw new Error(`Guest with ID "${guestId}" not found`);
        }

        const internalGuestId = guest.id;

        // Validate that if Supabase is being used, the guest has a valid UUID
        if (
          supabaseEnabled &&
          internalGuestId &&
          String(internalGuestId).startsWith("local-")
        ) {
          throw new Error(
            `Guest "${guest.name}" (${guest.guestId}) was created locally and cannot be synced to Supabase. Please re-register this guest in the system first.`,
          );
        }

        // Add to appropriate group with enriched data
        recordsByType[programType]?.push({
          ...record,
          internalGuestId,
          guest,
          rowIndex: index,
        });
      } catch (error) {
        const errorMessage = error?.message || error?.details || error?.hint || String(error);
        errors.push({
          rowNumber: index + 2,
          guestId: record.guestId || "unknown",
          program: record.program,
          message: errorMessage,
        });
        errorCount++;
      }
    });

    // Process special meals (non-batched as they use different handlers)
    for (const record of recordsByType.specialMeals) {
      try {
        const { specialMapping, count, dateSubmitted } = record;
        const pacificDateStr = pacificDateStringFrom(dateSubmitted);
        const dateIso = isoFromPacificDateString(pacificDateStr);

        switch (specialMapping.type) {
          case "extra":
            await addExtraMealRecord(null, count, dateIso);
            break;
          case "rv":
            await addRvMealRecord(count, dateIso);
            break;
          case "lunch_bag":
            await addLunchBagRecord(count, dateIso);
            break;
          case "day_worker":
            await addDayWorkerMealRecord(count, dateIso);
            break;
          case "shelter":
            await addShelterMealRecord(count, dateIso);
            break;
          case "united_effort":
            await addUnitedEffortMealRecord(count, dateIso);
            break;
          default:
            throw new Error(
              `Unknown special meal type: ${specialMapping.type}`,
            );
        }

        if (!specialMealCounts[specialMapping.label]) {
          specialMealCounts[specialMapping.label] = 0;
        }
        specialMealCounts[specialMapping.label] += count;
        successCount++;
      } catch (error) {
        const errorMessage = error?.message || error?.details || error?.hint || String(error);
        errors.push({
          rowNumber: record.rowIndex + 2,
          guestId: record.guestId || null,
          program: record.program,
          message: errorMessage,
        });
        errorCount++;
      }
    }

    // Batch process meals
    if (recordsByType.meals.length > 0) {
      setUploadProgress(
        `Processing ${recordsByType.meals.length} meal records...`,
      );
      try {
        if (supabaseEnabled && insertMealAttendanceBatch) {
          const mealPayloads = recordsByType.meals.map((record) => {
            const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
            const dateIso = isoFromPacificDateString(pacificDateStr);
            return {
              meal_type: "guest",
              guest_id: record.internalGuestId,
              quantity: record.count,
              served_on: dateIso.slice(0, 10),
              recorded_at: dateIso,
            };
          });

          const inserted = await insertMealAttendanceBatch(mealPayloads);
          // Don't update state here; collect results and update once at end
          allNewMealRecords.push(...inserted);
          successCount += inserted.length;
        } else {
          // Fallback to individual inserts if batch not available (local mode)
          for (const record of recordsByType.meals) {
            try {
              const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
              const dateIso = isoFromPacificDateString(pacificDateStr);
              const result = await addMealRecord(record.internalGuestId, record.count, dateIso);
              // addMealRecord returns null for duplicates, which is okay
              if (result !== null) {
                successCount++;
              }
            } catch (recordError) {
              const errorMessage = recordError?.message || String(recordError);
              errors.push({
                rowNumber: record.rowIndex + 2,
                guestId: record.guestId || null,
                program: record.program,
                message: `Local meal import failed: ${errorMessage}`,
              });
              errorCount++;
            }
          }
        }
      } catch (error) {
        const errorMessage = error?.message || error?.details || error?.hint || String(error);
        recordsByType.meals.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Meal import failed: ${errorMessage}`,
          });
          errorCount++;
        });
      }
    }

    // Batch process showers
    if (recordsByType.showers.length > 0) {
      setUploadProgress(
        `Processing ${recordsByType.showers.length} shower records...`,
      );
      try {
        if (supabaseEnabled && insertShowerReservationsBatch) {
          const showerPayloads = recordsByType.showers.map((record) =>
            buildSupabaseShowerPayload(record),
          );

          const inserted = await insertShowerReservationsBatch(showerPayloads);
          allNewShowerRecords.push(...inserted);
          successCount += inserted.length;
        } else {
          // Fallback to individual inserts if batch not available (local mode)
          for (const record of recordsByType.showers) {
            try {
              const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
              const dateIso = isoFromPacificDateString(pacificDateStr);
              const imported = importShowerAttendanceRecord(
                record.internalGuestId,
                {
                  dateSubmitted: dateIso,
                  count: record.count,
                },
              );
              successCount += imported.length;
            } catch (recordError) {
              const errorMessage = recordError?.message || String(recordError);
              errors.push({
                rowNumber: record.rowIndex + 2,
                guestId: record.guestId || null,
                program: record.program,
                message: `Local shower import failed: ${errorMessage}`,
              });
              errorCount++;
            }
          }
        }
      } catch (error) {
        const errorMessage = error?.message || error?.details || error?.hint || String(error);
        recordsByType.showers.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Shower import failed: ${errorMessage}`,
          });
          errorCount++;
        });
      }
    }

    // Batch process laundry
    if (recordsByType.laundry.length > 0) {
      setUploadProgress(
        `Processing ${recordsByType.laundry.length} laundry records...`,
      );
      try {
        if (supabaseEnabled && insertLaundryBookingsBatch) {
          const laundryPayloads = recordsByType.laundry.map((record) =>
            buildSupabaseLaundryPayload(record),
          );

          const inserted = await insertLaundryBookingsBatch(laundryPayloads);
          allNewLaundryRecords.push(...inserted);
          successCount += inserted.length;
        } else {
          // Fallback to individual inserts if batch not available (local mode)
          for (const record of recordsByType.laundry) {
            try {
              const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
              const dateIso = isoFromPacificDateString(pacificDateStr);
              const imported = importLaundryAttendanceRecord(
                record.internalGuestId,
                {
                  dateSubmitted: dateIso,
                  count: record.count,
                },
              );
              successCount += imported.length;
            } catch (recordError) {
              const errorMessage = recordError?.message || String(recordError);
              errors.push({
                rowNumber: record.rowIndex + 2,
                guestId: record.guestId || null,
                program: record.program,
                message: `Local laundry import failed: ${errorMessage}`,
              });
              errorCount++;
            }
          }
        }
      } catch (error) {
        const errorMessage = error?.message || error?.details || error?.hint || String(error);
        recordsByType.laundry.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Laundry import failed: ${errorMessage}`,
          });
          errorCount++;
        });
      }
    }

    // Batch process bicycles
    if (recordsByType.bicycles.length > 0) {
      setUploadProgress(
        `Processing ${recordsByType.bicycles.length} bicycle records...`,
      );
      try {
        if (supabaseEnabled && insertBicycleRepairsBatch) {
          const bicyclePayloads = recordsByType.bicycles.map((record) =>
            buildSupabaseBicyclePayload(record),
          );

          const inserted = await insertBicycleRepairsBatch(bicyclePayloads);
          allNewBicycleRecords.push(...inserted);
          successCount += inserted.length;
        } else {
          // Fallback to individual inserts if batch not available (local mode)
          for (const record of recordsByType.bicycles) {
            try {
              const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
              const dateIso = isoFromPacificDateString(pacificDateStr);
              await addBicycleRecord(record.internalGuestId, {
                repairType: "Legacy Import",
                notes: "Imported from legacy system",
                dateOverride: dateIso,
                statusOverride: BICYCLE_REPAIR_STATUS.DONE,
                completedAtOverride: dateIso,
              });
              successCount++;
            } catch (recordError) {
              const errorMessage = recordError?.message || String(recordError);
              errors.push({
                rowNumber: record.rowIndex + 2,
                guestId: record.guestId || null,
                program: record.program,
                message: `Local bicycle import failed: ${errorMessage}`,
              });
              errorCount++;
            }
          }
        }
      } catch (error) {
        const errorMessage = error?.message || error?.details || error?.hint || String(error);
        recordsByType.bicycles.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Bicycle import failed: ${errorMessage}`,
          });
          errorCount++;
        });
      }
    }

    // Batch process haircuts
    if (recordsByType.haircuts.length > 0) {
      setUploadProgress(
        `Processing ${recordsByType.haircuts.length} haircut records...`,
      );
      try {
        if (supabaseEnabled && insertHaircutVisitsBatch) {
          const haircutPayloads = recordsByType.haircuts.map((record) =>
            buildSupabaseHaircutPayload(record),
          );

          const inserted = await insertHaircutVisitsBatch(haircutPayloads);
          allNewHaircutRecords.push(...inserted);
          successCount += inserted.length;
        } else {
          // Fallback to individual inserts if batch not available (local mode)
          for (const record of recordsByType.haircuts) {
            try {
              const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
              const dateIso = isoFromPacificDateString(pacificDateStr);
              await addHaircutRecord(record.internalGuestId, dateIso);
              successCount++;
            } catch (recordError) {
              const errorMessage = recordError?.message || String(recordError);
              errors.push({
                rowNumber: record.rowIndex + 2,
                guestId: record.guestId || null,
                program: record.program,
                message: `Local haircut import failed: ${errorMessage}`,
              });
              errorCount++;
            }
          }
        }
      } catch (error) {
        const errorMessage = error?.message || error?.details || error?.hint || String(error);
        recordsByType.haircuts.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Haircut import failed: ${errorMessage}`,
          });
          errorCount++;
        });
      }
    }

    // Batch process holidays
    if (recordsByType.holidays.length > 0) {
      setUploadProgress(
        `Processing ${recordsByType.holidays.length} holiday records...`,
      );
      try {
        if (supabaseEnabled && insertHolidayVisitsBatch) {
          const holidayPayloads = recordsByType.holidays.map((record) => {
            const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
            const dateIso = isoFromPacificDateString(pacificDateStr);
            return {
              guest_id: record.internalGuestId,
              served_at: dateIso,
            };
          });

          const inserted = await insertHolidayVisitsBatch(holidayPayloads);
          allNewHolidayRecords.push(...inserted);
          successCount += inserted.length;
        } else {
          // Fallback to individual inserts if batch not available (local mode)
          for (const record of recordsByType.holidays) {
            try {
              const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
              const dateIso = isoFromPacificDateString(pacificDateStr);
              await addHolidayRecord(record.internalGuestId, dateIso);
              successCount++;
            } catch (recordError) {
              const errorMessage = recordError?.message || String(recordError);
              errors.push({
                rowNumber: record.rowIndex + 2,
                guestId: record.guestId || null,
                program: record.program,
                message: `Local holiday import failed: ${errorMessage}`,
              });
              errorCount++;
            }
          }
        }
      } catch (error) {
        const errorMessage = error?.message || error?.details || error?.hint || String(error);
        recordsByType.holidays.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Holiday import failed: ${errorMessage}`,
          });
          errorCount++;
        });
      }
    }

    return {
      successCount,
      errorCount,
      errors,
      specialMealCounts,
      newRecords: {
        meals: allNewMealRecords,
        showers: allNewShowerRecords,
        laundry: allNewLaundryRecords,
        bicycles: allNewBicycleRecords,
        haircuts: allNewHaircutRecords,
        holidays: allNewHolidayRecords,
      },
    };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setUploadResult({
        success: false,
        message: "Please upload a valid CSV file",
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setUploadProgress("Reading file...");
    setRecentErrors([]);
    setErrorReportName("");

    const processUpload = async () => {
      try {
        const content = await file.text();
        const text = content.replace(/\r\n/g, "\n");
        // Use Set for deduplication, then convert back to array
        const linesSet = new Set(text.split("\n").filter((l) => l.trim().length > 0));
        const lines = Array.from(linesSet);

        if (lines.length < 2) {
          throw new Error("CSV needs header + at least one data row");
        }

        // Parse headers
        const rawHeaders = splitCSVLine(lines[0]).map((h) =>
          h.replace(/^\uFEFF/, ""),
        );
        const norm = (h) => h.toLowerCase().replace(/\s+/g, "_");
        const headers = rawHeaders.map((h) => ({ raw: h, norm: norm(h) }));

        const headerIndex = (needle) => {
          const idx = headers.findIndex((h) => h.norm === needle);
          return idx >= 0 ? idx : -1;
        };

        // Validate headers
        const requiredNorm = [
          "attendance_id",
          "count",
          "program",
          "date_submitted",
        ];
        const missing = requiredNorm.filter((r) => headerIndex(r) === -1);

        if (missing.length) {
          throw new Error(
            `Missing required column(s): ${missing.map((m) => m.replace("_", " ")).join(", ")}`,
          );
        }

        // Chunk processing with optimized memory usage
        const CHUNK_SIZE = 500;
        const MAX_LOGGED_ERRORS = 1000;
        const MAX_LOGGED_SKIPPED = 1000;
        const totalLines = lines.length - 1;
        let totalSuccess = 0;
        let totalErrors = 0;
        let sampledErrors = [];
        let sampledSkipped = [];
        let totalSkippedCount = 0;
        let allSpecialMealCounts = {};

        // Use arrays to accumulate records incrementally
        const recordCollections = {
          meals: [],
          showers: [],
          laundry: [],
          bicycles: [],
          haircuts: [],
          holidays: [],
        };

        for (let i = 1; i < lines.length; i += CHUNK_SIZE) {
          const chunkLines = lines.slice(i, i + CHUNK_SIZE);
          const startIndex = i - 1; // 0-based index relative to data rows
          const progress = ((i / totalLines) * 100).toFixed(1);

          const filterInfo = useDateFilter ? ` (filtering ${startDate} to ${endDate})` : '';
          setUploadProgress(
            `Processing records ${i} to ${Math.min(i + CHUNK_SIZE - 1, totalLines)} of ${totalLines} (${progress}%)${filterInfo}...`,
          );

          // Yield to UI to prevent freezing
          await new Promise((resolve) => setTimeout(resolve, 0));

          // Parse chunk
          const parsedChunk = chunkLines
            .map((line, idx) => {
              const rowIndex = startIndex + idx;
              return parseCSVRow(line, rowIndex, headerIndex);
            })
            .filter((record) => {
              // Filter out null/undefined and date-filtered records
              if (!record) return false;
              if (record._dateFiltered) return false;
              return true;
            });

          // Validate chunk
          const { validRecords, skippedRecords } =
            filterValidAttendanceRecords(parsedChunk);

          totalSkippedCount += skippedRecords.length;
          if (sampledSkipped.length < MAX_LOGGED_SKIPPED && skippedRecords.length) {
            const available = MAX_LOGGED_SKIPPED - sampledSkipped.length;
            sampledSkipped.push(...skippedRecords.slice(0, available));
          }

          // Import chunk
          if (validRecords.length > 0) {
            const {
              successCount,
              errorCount,
              errors,
              specialMealCounts,
              newRecords,
            } = await importAttendanceRecords(validRecords);

            totalSuccess += successCount;
            totalErrors += errorCount;

            if (sampledErrors.length < MAX_LOGGED_ERRORS && errors.length) {
              const available = MAX_LOGGED_ERRORS - sampledErrors.length;
              sampledErrors.push(...errors.slice(0, available));
            }

            // Collect new records incrementally  
            if (newRecords) {
              if (newRecords.meals.length > 0) recordCollections.meals.push(...newRecords.meals);
              if (newRecords.showers.length > 0) recordCollections.showers.push(...newRecords.showers);
              if (newRecords.laundry.length > 0) recordCollections.laundry.push(...newRecords.laundry);
              if (newRecords.bicycles.length > 0) recordCollections.bicycles.push(...newRecords.bicycles);
              if (newRecords.haircuts.length > 0) recordCollections.haircuts.push(...newRecords.haircuts);
              if (newRecords.holidays.length > 0) recordCollections.holidays.push(...newRecords.holidays);
            }

            // Merge special meal counts
            if (specialMealCounts) {
              Object.entries(specialMealCounts).forEach(([key, val]) => {
                allSpecialMealCounts[key] =
                  (allSpecialMealCounts[key] || 0) + val;
              });
            }
          }
        }

        // Finalize results
        const skippedCount = totalSkippedCount;

        // Batch update all state records at once (avoid per-chunk re-renders)
        // Use startTransition to make these updates non-blocking for better UX
        startTransition(() => {
          // Use functional updates to ensure consistency
          if (recordCollections.meals.length > 0) {
            setMealRecords((prev) => [...recordCollections.meals, ...prev]);
          }
          if (recordCollections.showers.length > 0) {
            setShowerRecords((prev) => [...recordCollections.showers, ...prev]);
          }
          if (recordCollections.laundry.length > 0) {
            setLaundryRecords((prev) => [...recordCollections.laundry, ...prev]);
          }
          if (recordCollections.bicycles.length > 0) {
            setBicycleRecords((prev) => [...recordCollections.bicycles, ...prev]);
          }
          if (recordCollections.haircuts.length > 0) {
            setHaircutRecords((prev) => [...recordCollections.haircuts, ...prev]);
          }
          if (recordCollections.holidays.length > 0) {
            setHolidayRecords((prev) => [...recordCollections.holidays, ...prev]);
          }
        });

        if (skippedCount > 0) {
          const skippedSummary = sampledSkipped
            .map((r) => {
              if (r.reason === "Guest ID missing") {
                return `Row ${r.rowIndex + 2}: Guest ID is required for program "${r.program}"`;
              } else if (r.reason === "Invalid program type") {
                return `Row ${r.rowIndex + 2}: Program type "${r.program}" not recognized`;
              } else if (r.reason === "Special ID only valid for Meal") {
                return `Row ${r.rowIndex + 2}: Special ID "${r.guestId}" only works with Meal program, not "${r.program}"`;
              } else {
                return `Row ${r.rowIndex + 2}: Guest ID "${r.guestId}" not found`;
              }
            })
            .slice(0, 3)
            .join("; ");
          const moreText =
            skippedCount > 3
              ? `; and ${skippedCount - 3} more row${skippedCount - 3 === 1 ? "" : "s"}`
              : "";
          console.info(
            `Skipped ${skippedCount} attendance record${skippedCount === 1 ? "" : "s"}: ${skippedSummary}${moreText}`,
          );
        }

        // Build message with special meal counts if any
        let specialMealsSummary = "";
        if (Object.keys(allSpecialMealCounts).length > 0) {
          const mealDetails = Object.entries(allSpecialMealCounts)
            .map(([label, count]) => `${count} ${label}`)
            .join(", ");
          specialMealsSummary = ` (including ${mealDetails})`;
        }

        let skippedSummaryText = "";
        if (skippedCount > 0) {
          skippedSummaryText = ` (skipped ${skippedCount} record${skippedCount === 1 ? "" : "s"} with missing guest ID${skippedCount === 1 ? "" : "s"})`;
        }

        if (totalErrors === 0) {
          setUploadResult({
            success: true,
            message: `Successfully imported ${totalSuccess} attendance records${specialMealsSummary}${skippedSummaryText}`,
          });
          setRecentErrors([]);
          setErrorReportName("");
        } else {
          const firstSnippets = sampledErrors
            .slice(0, 3)
            .map((error) => formatErrorSnippet(error))
            .filter(Boolean)
            .join("; ");
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const baseFileName = file.name.replace(/\.[^/.]+$/i, "");
          const generatedReportName = `${baseFileName || "attendance_import"}_errors_${timestamp}.csv`;

          setRecentErrors(sampledErrors);
          setErrorReportName(generatedReportName);

          if (totalSuccess > 0) {
            const baseMessage = `Imported ${totalSuccess} records${specialMealsSummary}${skippedSummaryText} with ${totalErrors} error${totalErrors === 1 ? "" : "s"}. Review the error table below.`;
            setUploadResult({
              success: false,
              message: firstSnippets
                ? `${baseMessage} First issues: ${firstSnippets}`
                : baseMessage,
            });
          } else {
            const baseMessage = `No records were imported. Encountered ${totalErrors} error${totalErrors === 1 ? "" : "s"}${skippedSummaryText}. Review the error table below.`;
            setUploadResult({
              success: false,
              message: firstSnippets
                ? `${baseMessage} Example issues: ${firstSnippets}`
                : baseMessage,
            });
          }

          console.error("All batch upload errors (sampled):", sampledErrors);
        }
      } catch (error) {
        const errorMessage = error?.message || error?.details || error?.hint || String(error);
        setUploadResult({
          success: false,
          message: errorMessage,
        });
        setRecentErrors([]);
        setErrorReportName("");
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    // Wrap in both persistence pause AND bulk operation context to suppress toasts
    await withBulkOperation(async () => {
      await withPersistencePaused(processUpload);
    });
  };

  const downloadTemplateCSV = () => {
    const templateContent = buildAttendanceTemplateCSV(currentYear);
    const blob = new Blob([templateContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "attendance_template.csv");
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
          className={`mb-4 p-3 rounded flex items-center gap-2 ${uploadResult.success
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-red-100 text-red-700 border border-red-200"
            }`}
        >
          {uploadResult.success ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {uploadResult.message}
        </div>
      )}

      {recentErrors.length > 0 && (
        <div className="mb-4 border border-red-200 rounded-md overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-red-50 text-red-800 px-3 py-2 border-b border-red-200">
            <span className="text-sm font-medium">
              Found {recentErrors.length} validation error
              {recentErrors.length === 1 ? "" : "s"}. Showing first {displayedErrors.length}.
            </span>
            <button
              type="button"
              onClick={() =>
                downloadErrorReport(
                  recentErrors,
                  errorReportName || "attendance_import_errors.csv",
                )
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
                    key={`${error.rowNumber || "row"}-${error.guestId || "guest"}-${index}`}
                    className={index % 2 === 0 ? "bg-white" : "bg-red-50"}
                  >
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {error.rowNumber ?? "N/A"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {error.guestId ?? "N/A"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {error.program ?? "N/A"}
                    </td>
                    <td className="px-3 py-2 text-sm text-red-800">
                      <div>{error.message}</div>
                      {error.details && (
                        <div className="mt-1 text-xs text-red-600">
                          Details: {error.details}
                        </div>
                      )}
                      {error.reference && (
                        <div className="mt-1 text-xs text-red-600">
                          Reference: {error.reference}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMoreErrors && (
            <div className="bg-red-50 px-3 py-2 text-xs text-red-700 border-t border-red-200">
              Showing the first {displayedErrors.length} errors. Download the
              CSV to review all rows.
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
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
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
                Will import records from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 mt-2 ml-6">
          Enable date filtering to import only records within a specific date range.
          This prevents browser crashes when working with very large CSV files (33k+ records).
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label
            htmlFor="attendance-csv-upload"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload size={18} />
            {isUploading ? "Uploading..." : "Upload Attendance CSV"}
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
          {[
            "Attendance_ID",
            "Guest_ID",
            "Count",
            "Program",
            "Date_Submitted",
          ].map((col) => (
            <span key={col} className="bg-gray-100 px-2 py-1 rounded text-xs">
              {col}
            </span>
          ))}
        </div>

        <p className="mb-2 font-semibold">Supported Program Types:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mb-3">
          {Object.keys(PROGRAM_TYPES).map((program) => (
            <span
              key={program}
              className="bg-blue-100 px-2 py-1 rounded text-xs"
            >
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
            <strong>Guest_ID:</strong> Required - must match an existing guest
            in the system
          </li>
          <li>
            <strong>Count:</strong> Number of items/services (default: 1)
          </li>
          <li>
            <strong>Program:</strong> Must match one of the supported program
            types above
          </li>
          <li>
            <strong>Date_Submitted:</strong> Supports YYYY-MM-DD, M/D/YYYY, or
            M/D/YYYY H:MM:SS AM/PM formats
          </li>
          <li>All programs require a valid Guest_ID for individual tracking</li>
        </ul>
      </div>
    </div>
  );
};

export default AttendanceBatchUpload;
