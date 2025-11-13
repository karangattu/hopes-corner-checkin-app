import React, { useState, useRef } from "react";
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
  } = useAppContext();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [recentErrors, setRecentErrors] = useState([]);
  const [errorReportName, setErrorReportName] = useState("");
  const fileInputRef = useRef(null);
  const currentYear = new Date().getFullYear();
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

  const parseCSV = (content) => {
    try {
      const text = content.replace(/\r\n/g, "\n");
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 2)
        throw new Error("CSV needs header + at least one data row");

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

      const rawHeaders = splitCSVLine(lines[0]).map((h) =>
        h.replace(/^\uFEFF/, ""),
      );
      const norm = (h) => h.toLowerCase().replace(/\s+/g, "_");
      const headers = rawHeaders.map((h) => ({ raw: h, norm: norm(h) }));

      const headerIndex = (needle) => {
        const idx = headers.findIndex((h) => h.norm === needle);
        return idx >= 0 ? idx : -1;
      };

      // Required columns for attendance records
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

      return lines.slice(1).map((line, rowIndex) => {
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
            throw new Error(
              `Invalid date format "${dateSubmitted}" on row ${rowIndex + 2}. Supported formats: YYYY-MM-DD, M/D/YYYY, or M/D/YYYY H:MM:SS AM/PM`,
            );
          }
        } catch {
          throw new Error(
            `Invalid date format "${dateSubmitted}" on row ${rowIndex + 2}. Supported formats: YYYY-MM-DD, M/D/YYYY, or M/D/YYYY H:MM:SS AM/PM`,
          );
        }

        const normalizedDateIso =
          normalizeDateInputToISO(parsedDate) ?? parsedDate.toISOString();

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
      });
    } catch (e) {
      throw new Error(`Failed to parse CSV: ${e.message}`);
    }
  };

  const importAttendanceRecords = async (records) => {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const specialMealCounts = {}; // Track special meal types for summary

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
        errors.push({
          rowNumber: index + 2,
          guestId: record.guestId || "unknown",
          program: record.program,
          message: error.message,
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
        errors.push({
          rowNumber: record.rowIndex + 2,
          guestId: record.guestId || null,
          program: record.program,
          message: error.message,
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
          setMealRecords((prev) => [...inserted, ...prev]);
          successCount += inserted.length;
        } else {
          // Fallback to individual inserts if batch not available
          for (const record of recordsByType.meals) {
            const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
            const dateIso = isoFromPacificDateString(pacificDateStr);
            await addMealRecord(record.internalGuestId, record.count, dateIso);
            successCount++;
          }
        }
      } catch (error) {
        recordsByType.meals.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Supabase meal import failed: ${error.message}`,
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
          setShowerRecords((prev) => [...inserted, ...prev]);
          successCount += inserted.length;
        } else {
          for (const record of recordsByType.showers) {
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
          }
        }
      } catch (error) {
        recordsByType.showers.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Supabase shower import failed: ${error.message}`,
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
          setLaundryRecords((prev) => [...inserted, ...prev]);
          successCount += inserted.length;
        } else {
          for (const record of recordsByType.laundry) {
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
          }
        }
      } catch (error) {
        recordsByType.laundry.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Supabase laundry import failed: ${error.message}`,
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
          setBicycleRecords((prev) => [...inserted, ...prev]);
          successCount += inserted.length;
        } else {
          for (const record of recordsByType.bicycles) {
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
          }
        }
      } catch (error) {
        recordsByType.bicycles.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Supabase bicycle import failed: ${error.message}`,
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
          setHaircutRecords((prev) => [...inserted, ...prev]);
          successCount += inserted.length;
        } else {
          for (const record of recordsByType.haircuts) {
            const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
            const dateIso = isoFromPacificDateString(pacificDateStr);
            await addHaircutRecord(record.internalGuestId, dateIso);
            successCount++;
          }
        }
      } catch (error) {
        recordsByType.haircuts.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Supabase haircut import failed: ${error.message}`,
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
          setHolidayRecords((prev) => [...inserted, ...prev]);
          successCount += inserted.length;
        } else {
          for (const record of recordsByType.holidays) {
            const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
            const dateIso = isoFromPacificDateString(pacificDateStr);
            await addHolidayRecord(record.internalGuestId, dateIso);
            successCount++;
          }
        }
      } catch (error) {
        recordsByType.holidays.forEach((record) => {
          errors.push({
            rowNumber: record.rowIndex + 2,
            guestId: record.guestId || null,
            program: record.program,
            message: `Supabase holiday import failed: ${error.message}`,
          });
          errorCount++;
        });
      }
    }

    return { successCount, errorCount, errors, specialMealCounts };
  };

  const handleFileUpload = (event) => {
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
  setUploadProgress(null);
  setRecentErrors([]);
  setErrorReportName("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        setUploadProgress("Parsing CSV file...");
        const parsedRecords = parseCSV(content);

        // Filter out records where the guest doesn't exist (skip non-special guest IDs not in system)
        const { validRecords, skippedRecords } = filterValidAttendanceRecords(
          parsedRecords,
        );
        const skippedCount = skippedRecords.length;

        if (skippedCount > 0) {
          const skippedSummary = skippedRecords
            .map(
              (r) => {
                if (r.reason === "Guest ID missing") {
                  return `Row ${r.rowIndex + 2}: Guest ID is required for program "${r.program}"`;
                } else if (r.reason === "Invalid program type") {
                  return `Row ${r.rowIndex + 2}: Program type "${r.program}" not recognized`;
                } else if (r.reason === "Special ID only valid for Meal") {
                  return `Row ${r.rowIndex + 2}: Special ID "${r.guestId}" only works with Meal program, not "${r.program}"`;
                } else {
                  return `Row ${r.rowIndex + 2}: Guest ID "${r.guestId}" not found`;
                }
              },
            )
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

        setUploadProgress(
          `Preparing to import ${validRecords.length} records...`,
        );
        const { successCount, errorCount, errors, specialMealCounts } =
          await importAttendanceRecords(validRecords);

        // Build message with special meal counts if any
        let specialMealsSummary = "";
        if (specialMealCounts && Object.keys(specialMealCounts).length > 0) {
          const mealDetails = Object.entries(specialMealCounts)
            .map(([label, count]) => `${count} ${label}`)
            .join(", ");
          specialMealsSummary = ` (including ${mealDetails})`;
        }

        let skippedSummaryText = "";
        if (skippedCount > 0) {
          skippedSummaryText = ` (skipped ${skippedCount} record${skippedCount === 1 ? "" : "s"} with missing guest ID${skippedCount === 1 ? "" : "s"})`;
        }

        if (errorCount === 0) {
          setUploadResult({
            success: true,
            message: `Successfully imported ${successCount} attendance records${specialMealsSummary}${skippedSummaryText}`,
          });
          setRecentErrors([]);
          setErrorReportName("");
        } else {
          const firstSnippets = errors
            .slice(0, 3)
            .map((error) => formatErrorSnippet(error))
            .filter(Boolean)
            .join("; ");
          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-");
          const baseFileName = file.name.replace(/\.[^/.]+$/i, "");
          const generatedReportName = `${baseFileName || "attendance_import"}_errors_${timestamp}.csv`;

          setRecentErrors(errors);
          setErrorReportName(generatedReportName);

          if (successCount > 0) {
            const baseMessage = `Imported ${successCount} records${specialMealsSummary}${skippedSummaryText} with ${errorCount} error${errorCount === 1 ? "" : "s"}. Review the error table below.`;
            setUploadResult({
              success: false,
              message: firstSnippets
                ? `${baseMessage} First issues: ${firstSnippets}`
                : baseMessage,
            });
          } else {
            const baseMessage = `No records were imported. Encountered ${errorCount} error${errorCount === 1 ? "" : "s"}${skippedSummaryText}. Review the error table below.`;
            setUploadResult({
              success: false,
              message: firstSnippets
                ? `${baseMessage} Example issues: ${firstSnippets}`
                : baseMessage,
            });
          }

          console.error("All batch upload errors:", errors);
        }
      } catch (error) {
        setUploadResult({
          success: false,
          message: error.message,
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

    reader.onerror = () => {
      setUploadResult({
        success: false,
        message: "Failed to read the file",
      });
      setRecentErrors([]);
      setErrorReportName("");
      setIsUploading(false);
      setUploadProgress(null);
    };

    reader.readAsText(file);
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
          className={`mb-4 p-3 rounded flex items-center gap-2 ${
            uploadResult.success
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
