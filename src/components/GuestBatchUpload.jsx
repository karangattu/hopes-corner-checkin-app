import React, { useState, useRef } from "react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Download,
  FileText,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { AGE_GROUPS, GENDERS, HOUSING_STATUSES } from "../context/constants";

// Mapping of common housing status variations to correct values
const HOUSING_STATUS_MAPPING = {
  "temp shelter": "Temp. shelter",
  "temporary shelter": "Temp. shelter",
  "shelter": "Temp. shelter",
  "rv": "RV or vehicle",
  "rv or car": "RV or vehicle",
  "vehicle": "RV or vehicle",
  "car": "RV or vehicle",
  "homeless": "Unhoused",
  "unhouse": "Unhoused",
};

// Special guest IDs that should not create guest profiles
// These represent aggregate meal types, not individual guests
const SPECIAL_GUEST_IDS = [
  "M91834859", // Extra meals
  "M94816825", // RV meals
  "M47721243", // Lunch Bag
  "M29017132", // Day Worker meals
  "M61706731", // Shelter meals
  "M65842216", // United Effort meals
];

// Normalize housing status to correct value
const normalizeHousingStatusValue = (value) => {
  if (!value) return value;
  const trimmed = value.trim();
  const mapped = HOUSING_STATUS_MAPPING[trimmed.toLowerCase()];
  if (mapped) return mapped;
  
  // Try case-insensitive match with allowed values
  const caseInsensitiveMatch = HOUSING_STATUSES.find(
    status => status.toLowerCase() === trimmed.toLowerCase()
  );
  return caseInsensitiveMatch || trimmed;
};

// Filter out special guest IDs and rows with invalid/missing/enum values
const filterValidGuests = (guests) => {
  const validGuests = [];
  const skippedInfo = {
    specialIds: [],
    invalidAge: [],
    invalidGender: [],
    invalidHousing: [],
    duplicateIds: [],
  };

  const seenGuestIds = new Set();

  guests.forEach((guest, index) => {
    const rowNumber = index + 2;

    // Skip special guest IDs
    if (SPECIAL_GUEST_IDS.includes(guest.guest_id)) {
      skippedInfo.specialIds.push({
        rowNumber,
        guestId: guest.guest_id,
      });
      return;
    }

    // Check for duplicate guest IDs in the batch
    if (guest.guest_id && seenGuestIds.has(guest.guest_id)) {
      skippedInfo.duplicateIds.push({
        rowNumber,
        guestId: guest.guest_id,
      });
      return;
    }
    if (guest.guest_id) {
      seenGuestIds.add(guest.guest_id);
    }

    // Skip rows with invalid age (only if provided AND invalid)
    // Note: Empty/NULL age is OK - will default to "Adult 18-59" later
    const age = (guest.age || "").trim();
    if (age) {
      // Try exact match first, then case-insensitive
      const validAge = AGE_GROUPS.includes(age) ||
        AGE_GROUPS.some(ag => ag.toLowerCase() === age.toLowerCase());
      if (!validAge) {
        skippedInfo.invalidAge.push({
          rowNumber,
          providedAge: age,
          name: guest.full_name || `${guest.first_name} ${guest.last_name}`,
        });
        return;
      }
    }

    // Skip rows with invalid gender
    const gender = (guest.gender || "").trim();
    if (gender) {
      // Try exact match first, then case-insensitive
      const validGender = GENDERS.includes(gender) ||
        GENDERS.some(g => g.toLowerCase() === gender.toLowerCase());
      if (!validGender) {
        skippedInfo.invalidGender.push({
          rowNumber,
          providedGender: gender,
          name: guest.full_name || `${guest.first_name} ${guest.last_name}`,
        });
        return;
      }
    }

    // Skip rows with invalid housing status
    // Note: Empty/NULL housing_status is OK - will default to "Unhoused" later
    const housing = (guest.housing_status || "").trim();
    if (housing) {
      // Normalize to correct value (handles "Temp Shelter" -> "Temp. shelter", etc)
      const normalized = normalizeHousingStatusValue(housing);
      if (!HOUSING_STATUSES.includes(normalized)) {
        skippedInfo.invalidHousing.push({
          rowNumber,
          providedHousing: housing,
          name: guest.full_name || `${guest.first_name} ${guest.last_name}`,
        });
        return;
      }
      // Store normalized value
      guest.housing_status = normalized;
    }

    validGuests.push(guest);
  });

  return { validGuests, skippedInfo };
};

const GuestBatchUpload = () => {
  const { importGuestsFromCSV } = useAppContext();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);

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

      const requiredNorm = [
        "first_name",
        "last_name",
        "housing_status",
        "age",
        "gender",
      ];
      const missing = requiredNorm.filter((r) => headerIndex(r) === -1);
      const cityIdx = headerIndex("city");
      const locationIdx = headerIndex("location");
      if (missing.length || (cityIdx === -1 && locationIdx === -1)) {
        const missingList = [
          ...missing.map((m) => m.replace("_", " ")),
          ...(cityIdx === -1 && locationIdx === -1
            ? ["city (or location)"]
            : []),
        ];
        throw new Error(
          `Missing required column(s): ${missingList.join(", ")}`,
        );
      }

      return lines.slice(1).map((line) => {
        const values = splitCSVLine(line);
        const get = (key) => {
          const i = headerIndex(key);
          return i === -1 ? "" : (values[i] || "").trim();
        };
        const first = get("first_name");
        const last = get("last_name");
        const full = get("full_name") || `${first} ${last}`.trim();
        const city =
          cityIdx !== -1
            ? (values[cityIdx] || "").trim()
            : (values[locationIdx] || "").trim();
        return {
          guest_id: get("guest_id"),
          first_name: first,
          last_name: last,
          full_name: full,
          city,
          housing_status: get("housing_status"),
          age: get("age"),
          gender: get("gender"),
          notes: get("notes"),
        };
      });
    } catch (e) {
      throw new Error(`Failed to parse CSV: ${e.message}`);
    }
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
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        setUploadProgress("Parsing CSV file...");
        const parsedData = parseCSV(content);

        // Filter out special guest IDs and invalid/missing age values
        const { validGuests, skippedInfo } = filterValidGuests(parsedData);

        // Check if all rows were filtered out
        if (validGuests.length === 0) {
          const reasons = [];
          if (skippedInfo.specialIds.length > 0) {
            reasons.push(`${skippedInfo.specialIds.length} special meal ID${skippedInfo.specialIds.length === 1 ? "" : "s"}`);
          }
          if (skippedInfo.invalidAge.length > 0) {
            const samples = skippedInfo.invalidAge.slice(0, 2).map(a => `"${a.providedAge}"`).join(", ");
            reasons.push(`${skippedInfo.invalidAge.length} row${skippedInfo.invalidAge.length === 1 ? "" : "s"} with invalid age (samples: ${samples})`);
          }
          if (skippedInfo.invalidGender.length > 0) {
            const samples = skippedInfo.invalidGender.slice(0, 2).map(g => `"${g.providedGender}"`).join(", ");
            reasons.push(`${skippedInfo.invalidGender.length} row${skippedInfo.invalidGender.length === 1 ? "" : "s"} with invalid gender (samples: ${samples})`);
          }
          if (skippedInfo.invalidHousing.length > 0) {
            const samples = skippedInfo.invalidHousing.slice(0, 2).map(h => `"${h.providedHousing}"`).join(", ");
            reasons.push(`${skippedInfo.invalidHousing.length} row${skippedInfo.invalidHousing.length === 1 ? "" : "s"} with invalid housing status (samples: ${samples})`);
          }
          if (skippedInfo.duplicateIds.length > 0) {
            reasons.push(`${skippedInfo.duplicateIds.length} duplicate guest ID${skippedInfo.duplicateIds.length === 1 ? "" : "s"}`);
          }
          setUploadResult({
            success: false,
            message: `No valid guests to import. Skipped all ${parsedData.length} row${parsedData.length === 1 ? "" : "s"}: ${reasons.join(" and ")}.`,
          });
          return;
        }

        setUploadProgress(`Importing ${validGuests.length} guests...`);
        const {
          importedGuests,
          failedCount,
          partialFailure,
          error: importError,
        } = await importGuestsFromCSV(validGuests);

        const successCount = importedGuests.length;
        setUploadProgress(null);

        if (importError) {
          let message = importError;
          if (successCount > 0) {
            message += ` ${successCount} guest${successCount === 1 ? "" : "s"} imported successfully.`;
          }
          if (skippedInfo.specialIds.length > 0) {
            message += ` Skipped ${skippedInfo.specialIds.length} special meal ID${skippedInfo.specialIds.length === 1 ? "" : "s"}.`;
          }
          if (skippedInfo.invalidAge.length > 0) {
            const samples = skippedInfo.invalidAge.slice(0, 3).map(a => `"${a.providedAge}"`).join(", ");
            message += ` Skipped ${skippedInfo.invalidAge.length} row${skippedInfo.invalidAge.length === 1 ? "" : "s"} with invalid age (samples: ${samples}).`;
          }
          if (skippedInfo.invalidGender.length > 0) {
            const samples = skippedInfo.invalidGender.slice(0, 3).map(g => `"${g.providedGender}"`).join(", ");
            message += ` Skipped ${skippedInfo.invalidGender.length} row${skippedInfo.invalidGender.length === 1 ? "" : "s"} with invalid gender (samples: ${samples}).`;
          }
          if (skippedInfo.invalidHousing.length > 0) {
            const samples = skippedInfo.invalidHousing.slice(0, 3).map(h => `"${h.providedHousing}"`).join(", ");
            message += ` Skipped ${skippedInfo.invalidHousing.length} row${skippedInfo.invalidHousing.length === 1 ? "" : "s"} with invalid housing status (samples: ${samples}).`;
          }
          if (skippedInfo.duplicateIds.length > 0) {
            message += ` Skipped ${skippedInfo.duplicateIds.length} row${skippedInfo.duplicateIds.length === 1 ? "" : "s"} with duplicate guest ID.`;
          }

          setUploadResult({
            success: false,
            message,
          });
          return;
        }

        let message = `Successfully processed ${successCount} guest${successCount === 1 ? "" : "s"} (new or updated)`;
        if (skippedInfo.specialIds.length > 0) {
          message += ` (skipped ${skippedInfo.specialIds.length} special meal ID${skippedInfo.specialIds.length > 1 ? "s" : ""})`;
        }
        if (skippedInfo.invalidAge.length > 0) {
          message += ` (skipped ${skippedInfo.invalidAge.length} row${skippedInfo.invalidAge.length > 1 ? "s" : ""} with invalid/missing age)`;
        }
        if (skippedInfo.invalidGender.length > 0) {
          message += ` (skipped ${skippedInfo.invalidGender.length} row${skippedInfo.invalidGender.length > 1 ? "s" : ""} with invalid gender)`;
        }
        if (skippedInfo.invalidHousing.length > 0) {
          message += ` (skipped ${skippedInfo.invalidHousing.length} row${skippedInfo.invalidHousing.length > 1 ? "s" : ""} with invalid housing status)`;
        }
        if (skippedInfo.duplicateIds.length > 0) {
          message += ` (skipped ${skippedInfo.duplicateIds.length} duplicate ID${skippedInfo.duplicateIds.length > 1 ? "s" : ""})`;
        }
        if (partialFailure && failedCount > 0) {
          message += ` (${failedCount} guest${failedCount === 1 ? "" : "s"} could not be synced)`;
        }

        setUploadResult({
          success: true,
          message,
        });
      } catch (error) {
        setUploadResult({
          success: false,
          message: error.message,
        });
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
      setIsUploading(false);
      setUploadProgress(null);
    };

    reader.readAsText(file);
  };

  const downloadTemplateCSV = () => {
    const link = document.createElement("a");
    link.href = "/guest_template.csv";
    link.setAttribute("download", "guest_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
      <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
        <FileText size={20} /> Batch Import Guests
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

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label
            htmlFor="csv-upload"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload size={18} />
            {isUploading ? "Uploading..." : "Upload CSV File"}
          </label>
          <input
            id="csv-upload"
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
            "Guest_ID (optional)",
            "First_Name",
            "Last_Name",
            "Full_Name (optional)",
            "City",
            "Housing_status",
            "Age",
            "Gender",
            "Notes (optional)",
          ].map((col) => (
            <span key={col} className="bg-gray-100 px-2 py-1 rounded text-xs">
              {col}
            </span>
          ))}
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide Age exactly matching allowed groups: {AGE_GROUPS.join(", ")}.</li>
          <li>Gender must match allowed values (e.g. Male, Female).</li>
          <li>City is required (or use Location column).</li>
          <li>
            Housing_status must be one of configured statuses; invalid entries
            default to Unhoused.
          </li>
          <li className="text-amber-600 font-medium">
            Note: Special meal IDs (M91834859, M94816825, M47721243, M29017132,
            M61706731) will be automatically skipped as they represent aggregate
            meal types, not individual guests.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default GuestBatchUpload;
