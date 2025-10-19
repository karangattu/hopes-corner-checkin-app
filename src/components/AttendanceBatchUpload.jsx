import React, { useState, useRef } from "react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Download,
  FileText,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";

const AttendanceBatchUpload = () => {
  const {
    guests,
    addMealRecord,
    addRvMealRecord,
    addShelterMealRecord,
    addExtraMealRecord,
    addDayWorkerMealRecord,
    addLunchBagRecord,
    addShowerRecord,
    addLaundryRecord,
    addBicycleRecord,
    addHaircutRecord,
    addHolidayRecord,
  } = useAppContext();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  // Special guest IDs that map to specific meal types (no guest profile created)
  const SPECIAL_GUEST_IDS = {
    M91834859: { type: "extra", handler: "addExtraMealRecord", label: "Extra meals" },
    M94816825: { type: "rv", handler: "addRvMealRecord", label: "RV meals" },
    M47721243: { type: "lunch_bag", handler: "addLunchBagRecord", label: "Lunch bags" },
    M29017132: { type: "day_worker", handler: "addDayWorkerMealRecord", label: "Day Worker Center meals" },
    M61706731: { type: "shelter", handler: "addShelterMealRecord", label: "Shelter meals" },
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
        const count = parseInt(get("count")) || 1;
        const program = get("program").trim();
        const dateSubmitted = get("date_submitted").trim();

        const csvRowNumber = rowIndex + 2;

        // Validate program type
        const normalizedProgram = Object.keys(PROGRAM_TYPES).find(
          (key) => key.toLowerCase() === program.toLowerCase(),
        );

        if (!normalizedProgram) {
          throw new Error(
            `Invalid program type "${program}" (Row: ${csvRowNumber}). Valid types: ${Object.keys(PROGRAM_TYPES).join(", ")}`,
          );
        }

        // Validate and parse date format
        let parsedDate;
        try {
          if (dateSubmitted.match(/^\d{4}-\d{2}-\d{2}$/)) {
            parsedDate = new Date(`${dateSubmitted}T12:00:00`);
          } else if (dateSubmitted.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const [month, day, year] = dateSubmitted.split("/");
            parsedDate = new Date(
              `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00`,
            );
          } else if (
            dateSubmitted.match(
              /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(AM|PM)$/i,
            )
          ) {
            parsedDate = new Date(dateSubmitted);
          } else {
            parsedDate = new Date(dateSubmitted);
          }

          if (isNaN(parsedDate.getTime())) {
            throw new Error(
              `Invalid date format "${dateSubmitted}" (Row: ${csvRowNumber}). Supported formats: YYYY-MM-DD, M/D/YYYY, or M/D/YYYY H:MM:SS AM/PM`,
            );
          }
        } catch {
          throw new Error(
            `Invalid date format "${dateSubmitted}" (Row: ${csvRowNumber}). Supported formats: YYYY-MM-DD, M/D/YYYY, or M/D/YYYY H:MM:SS AM/PM`,
          );
        }

        if (!guestId) {
          throw new Error(
            `Guest_ID is required for program "${program}" (Row: ${csvRowNumber})`,
          );
        }

        const specialMapping = SPECIAL_GUEST_IDS[guestId];
        const isSpecialId = specialMapping !== undefined && normalizedProgram === "Meal";

        if (SPECIAL_GUEST_IDS[guestId] && normalizedProgram !== "Meal") {
          throw new Error(
            `Guest ID "${guestId}" is reserved for special meal tracking (${SPECIAL_GUEST_IDS[guestId].label}) and cannot be used for "${program}" (Row: ${csvRowNumber}). Please use a different guest ID or import this as a Meal record.`,
          );
        }

        let guestFound = true;
        if (!isSpecialId) {
          const guest = guests.find(
            (g) => String(g.id) === String(guestId) || g.guestId === guestId,
          );
          guestFound = !!guest;
        }

        return {
          attendanceId,
          guestId,
          count,
          program: normalizedProgram,
          programType: PROGRAM_TYPES[normalizedProgram],
          dateSubmitted: parsedDate.toISOString(),
          originalDate: dateSubmitted,
          isSpecialId,
          specialMapping,
          guestFound,
          csvRowNumber,
        };
      });
    } catch (e) {
      throw new Error(`Failed to parse CSV: ${e.message}`);
    }
  };

  const importAttendanceRecords = (records) => {
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors = [];
    const skippedGuests = [];
    const specialMealCounts = {};

    records.forEach((record, index) => {
      try {
        const { guestId, programType, isSpecialId, specialMapping, count, dateSubmitted, guestFound, csvRowNumber } = record;

        if (!guestFound && !isSpecialId) {
          skippedCount++;
          skippedGuests.push({
            guestId,
            program: record.program,
            row: csvRowNumber,
          });
          return;
        }

        if (isSpecialId && specialMapping) {
          const dateOnly = dateSubmitted.slice(0, 10);
          
          switch (specialMapping.type) {
            case "extra":
              addExtraMealRecord(count, dateOnly);
              break;
            case "rv":
              addRvMealRecord(count, dateOnly);
              break;
            case "lunch_bag":
              addLunchBagRecord(count, dateOnly);
              break;
            case "day_worker":
              addDayWorkerMealRecord(count, dateOnly);
              break;
            case "shelter":
              addShelterMealRecord(count, dateOnly);
              break;
            default:
              throw new Error(`Unknown special meal type: ${specialMapping.type}`);
          }
          
          if (!specialMealCounts[specialMapping.label]) {
            specialMealCounts[specialMapping.label] = 0;
          }
          specialMealCounts[specialMapping.label] += count;
          successCount++;
          return;
        }

        const guest = guests.find(
          (g) => String(g.id) === String(guestId) || g.guestId === guestId,
        );
        
        if (!guest) {
          skippedCount++;
          skippedGuests.push({
            guestId,
            program: record.program,
            row: csvRowNumber,
          });
          return;
        }

        const numericGuestId = guest.id;

        switch (programType) {
          case "meals":
            addMealRecord(numericGuestId, record.count, dateSubmitted);
            successCount++;
            break;
          case "showers":
            addShowerRecord(numericGuestId, "12:00 PM", dateSubmitted);
            successCount++;
            break;
          case "laundry":
            addLaundryRecord(numericGuestId, "Drop-off", "dropoff", "", dateSubmitted);
            successCount++;
            break;
          case "bicycle":
            addBicycleRecord(numericGuestId, {
              repairType: "Legacy Import",
              notes: "Imported from legacy system",
              dateOverride: dateSubmitted,
            });
            successCount++;
            break;
          case "haircuts":
            addHaircutRecord(numericGuestId, dateSubmitted);
            successCount++;
            break;
          case "holiday":
            addHolidayRecord(numericGuestId, dateSubmitted);
            successCount++;
            break;
          default:
            errors.push(
              `Unknown program type: ${programType} (Row: ${csvRowNumber})`,
            );
            errorCount++;
        }
      } catch (error) {
        errors.push(`Error processing Row ${record.csvRowNumber || index + 2}: ${error.message}`);
        errorCount++;
      }
    });

    return { successCount, errorCount, skippedCount, errors, skippedGuests, specialMealCounts };
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

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsedRecords = parseCSV(content);

        const { successCount, errorCount, skippedCount, errors, skippedGuests, specialMealCounts } =
          importAttendanceRecords(parsedRecords);

        let specialMealsSummary = "";
        if (specialMealCounts && Object.keys(specialMealCounts).length > 0) {
          const mealDetails = Object.entries(specialMealCounts)
            .map(([label, count]) => `${count} ${label}`)
            .join(", ");
          specialMealsSummary = ` (including ${mealDetails})`;
        }

        let skippedSummary = "";
        if (skippedCount > 0) {
          const uniqueGuestIds = [...new Set(skippedGuests.map(g => g.guestId))];
          const guestIdsList = uniqueGuestIds.slice(0, 3).join(", ");
          const moreCount = uniqueGuestIds.length > 3 ? ` and ${uniqueGuestIds.length - 3} more` : "";
          skippedSummary = `. Skipped ${skippedCount} record${skippedCount > 1 ? 's' : ''} for guest${uniqueGuestIds.length > 1 ? 's' : ''} not in system: ${guestIdsList}${moreCount}`;
        }

        if (errorCount === 0 && skippedCount === 0) {
          setUploadResult({
            success: true,
            message: `Successfully imported ${successCount} attendance records${specialMealsSummary}`,
          });
        } else if (successCount > 0) {
          setUploadResult({
            success: skippedCount > 0 && errorCount === 0,
            message: `Imported ${successCount} records${specialMealsSummary}${skippedSummary}${errorCount > 0 ? `. ${errorCount} error${errorCount > 1 ? 's' : ''}: ${errors.slice(0, 2).join("; ")}${errors.length > 2 ? "..." : ""}` : ""}`,
            warnings: skippedCount > 0 ? skippedGuests : undefined,
          });
        } else {
          setUploadResult({
            success: false,
            message: `Failed to import records${skippedSummary}${errorCount > 0 ? `. Errors: ${errors.slice(0, 3).join("; ")}` : ""}`,
          });
        }
      } catch (error) {
        setUploadResult({
          success: false,
          message: error.message,
        });
      } finally {
        setIsUploading(false);
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
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  const downloadTemplateCSV = () => {
    const templateContent = `Attendance_ID,Guest_ID,Count,Program,Date_Submitted
ATT001,123,1,Meal,2024-01-15
ATT002,456,1,Shower,2024-01-15
ATT003,789,1,Laundry,01/15/2024
ATT004,123,1,Bicycle,4/29/2024 11:53:58 AM
ATT005,456,1,Hair Cut,2024-01-15
ATT006,789,1,Holiday,01/16/2024
ATT007,M94816825,10,Meal,2024-01-15
ATT008,M61706731,8,Meal,2024-01-15
ATT009,M29017132,15,Meal,2024-01-15`;

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

      {uploadResult && (
        <div>
          <div
            className={`mb-2 p-3 rounded flex items-start gap-2 ${
              uploadResult.success
                ? "bg-green-100 text-green-700 border border-green-200"
                : uploadResult.warnings
                ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            <div className="mt-0.5">
              {uploadResult.success ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
            </div>
            <div className="flex-1">
              <p>{uploadResult.message}</p>
              {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium hover:underline">
                    View skipped records ({uploadResult.warnings.length})
                  </summary>
                  <div className="mt-2 pl-2 border-l-2 border-yellow-400">
                    <p className="text-xs mb-2 font-semibold">
                      These guests were not found in the system. Please add them via Batch Import Guests first:
                    </p>
                    <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                      {uploadResult.warnings.map((warning, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="font-mono">{warning.guestId}</span>
                          <span className="text-gray-600">
                            ({warning.program}, Row: {warning.row})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}
            </div>
          </div>
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
              <strong>YYYY-MM-DD:</strong> 2024-04-29
            </span>
            <span>
              <strong>M/D/YYYY:</strong> 4/29/2024
            </span>
            <span>
              <strong>M/D/YYYY H:MM:SS AM/PM:</strong> 4/29/2024 11:53:58 AM
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
