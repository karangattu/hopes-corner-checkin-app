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

        // Validate program type
        const normalizedProgram = Object.keys(PROGRAM_TYPES).find(
          (key) => key.toLowerCase() === program.toLowerCase(),
        );

        if (!normalizedProgram) {
          throw new Error(
            `Invalid program type "${program}" on row ${rowIndex + 2}. Valid types: ${Object.keys(PROGRAM_TYPES).join(", ")}`,
          );
        }

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
            // M/D/YYYY H:MM:SS AM/PM format (e.g., "4/29/2024 11:53:58 AM")
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

        // For guest-specific programs, validate guest exists
        // Exception: Special guest IDs that map to meal types (only for Meal program)
        if (!guestId) {
          throw new Error(
            `Guest_ID is required for program "${program}" on row ${rowIndex + 2}`,
          );
        }

        // Check if this is a special guest ID (only valid for Meal program)
        const specialMapping = SPECIAL_GUEST_IDS[guestId];
        const isSpecialId = specialMapping !== undefined;

        if (isSpecialId && normalizedProgram !== "Meal") {
          throw new Error(
            `Special guest ID "${guestId}" can only be used with Meal program, not "${program}" on row ${rowIndex + 2}`,
          );
        }

        // For regular guest IDs (not special), validate guest exists
        if (!isSpecialId) {
          const guest = guests.find(
            (g) => String(g.id) === String(guestId) || g.guestId === guestId,
          );
          if (!guest) {
            throw new Error(
              `Guest with ID "${guestId}" not found on row ${rowIndex + 2}`,
            );
          }
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
        };
      });
    } catch (e) {
      throw new Error(`Failed to parse CSV: ${e.message}`);
    }
  };

  const importAttendanceRecords = (records) => {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const specialMealCounts = {}; // Track special meal types for summary

    records.forEach((record, index) => {
      try {
        const { guestId, programType, isSpecialId, specialMapping, count, dateSubmitted } = record;

        // Handle special guest IDs that map to meal types
        if (isSpecialId && specialMapping) {
          // Extract date in YYYY-MM-DD format for meal records
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
          
          // Track for summary (no individual notification to avoid fatigue)
          if (!specialMealCounts[specialMapping.label]) {
            specialMealCounts[specialMapping.label] = 0;
          }
          specialMealCounts[specialMapping.label] += count;
          successCount++;
          return;
        }

        // Handle regular guest-based records
        // Find the guest object to get the internal numeric ID
        const guest = guests.find(
          (g) => String(g.id) === String(guestId) || g.guestId === guestId,
        );
        
        if (!guest) {
          throw new Error(`Guest with ID "${guestId}" not found`);
        }

        const numericGuestId = guest.id;

        switch (programType) {
          case "meals":
            addMealRecord(numericGuestId, record.count);
            successCount++;
            break;
          case "showers":
            addShowerRecord(numericGuestId, { override: true });
            successCount++;
            break;
          case "laundry":
            addLaundryRecord(numericGuestId, { override: true });
            successCount++;
            break;
          case "bicycle":
            addBicycleRecord(numericGuestId, {
              repairType: "Legacy Import",
              notes: "Imported from legacy system",
            });
            successCount++;
            break;
          case "haircuts":
            addHaircutRecord(numericGuestId);
            successCount++;
            break;
          case "holiday":
            addHolidayRecord(numericGuestId);
            successCount++;
            break;
          default:
            errors.push(
              `Unknown program type: ${programType} on row ${index + 2}`,
            );
            errorCount++;
        }
      } catch (error) {
        errors.push(`Error processing row ${index + 2}: ${error.message}`);
        errorCount++;
      }
    });

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

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsedRecords = parseCSV(content);

        const { successCount, errorCount, errors, specialMealCounts } =
          importAttendanceRecords(parsedRecords);

        // Build message with special meal counts if any
        let specialMealsSummary = "";
        if (specialMealCounts && Object.keys(specialMealCounts).length > 0) {
          const mealDetails = Object.entries(specialMealCounts)
            .map(([label, count]) => `${count} ${label}`)
            .join(", ");
          specialMealsSummary = ` (including ${mealDetails})`;
        }

        if (errorCount === 0) {
          setUploadResult({
            success: true,
            message: `Successfully imported ${successCount} attendance records${specialMealsSummary}`,
          });
        } else if (successCount > 0) {
          setUploadResult({
            success: false,
            message: `Imported ${successCount} records${specialMealsSummary} with ${errorCount} errors: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`,
          });
        } else {
          setUploadResult({
            success: false,
            message: `Failed to import records: ${errors.slice(0, 3).join("; ")}`,
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
