import React, { useState, useRef } from "react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Download,
  FileText,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";

// Special guest IDs that should not create guest profiles
// These represent aggregate meal types, not individual guests
const SPECIAL_GUEST_IDS = [
  "M91834859", // Extra meals
  "M94816825", // RV meals
  "M47721243", // Lunch Bag
  "M29017132", // Day Worker meals
  "M61706731", // Shelter meals
];

const GuestBatchUpload = () => {
  const { importGuestsFromCSV } = useAppContext();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
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
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsedData = parseCSV(content);

        // Filter out special guest IDs that should not create profiles
        const validGuests = parsedData.filter(
          (guest) => !SPECIAL_GUEST_IDS.includes(guest.guest_id)
        );
        
        const skippedCount = parsedData.length - validGuests.length;

        const importedGuests = importGuestsFromCSV(validGuests);

        let message = `Successfully imported ${importedGuests.length} guests`;
        if (skippedCount > 0) {
          message += ` (skipped ${skippedCount} special meal ID${skippedCount > 1 ? "s" : ""})`;
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
          <li>Provide Age exactly matching allowed groups (e.g. 18-25).</li>
          <li>Gender must match allowed values (e.g. Male, Female).</li>
          <li>City is required (or use Location column).</li>
          <li>
            Housing_status must be one of configured statuses; invalid entries
            default to Unhoused.
          </li>
          <li className="text-amber-600 font-medium">
            Note: Special meal IDs (M91834859, M94816825, M47721243, M29017132, M61706731) 
            will be automatically skipped as they represent aggregate meal types, not individual guests.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default GuestBatchUpload;
