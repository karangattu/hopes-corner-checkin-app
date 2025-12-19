'use client';

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Download, FileText } from 'lucide-react';
import { useGuestsStore } from '@/lib/stores/useGuestsStore';
import { HOUSING_STATUSES, AGE_GROUPS, GENDERS } from '@/lib/constants';

// Mapping of common housing status variations to correct values
const HOUSING_STATUS_MAPPING: Record<string, string> = {
  'temp shelter': 'Temp. shelter',
  'temporary shelter': 'Temp. shelter',
  'shelter': 'Temp. shelter',
  'rv': 'RV or vehicle',
  'rv or car': 'RV or vehicle',
  'vehicle': 'RV or vehicle',
  'car': 'RV or vehicle',
  'homeless': 'Unhoused',
  'unhouse': 'Unhoused',
};

// Special guest IDs that should not create guest profiles
const SPECIAL_GUEST_IDS = [
  'M91834859', // Extra meals
  'M94816825', // RV meals
  'M47721243', // Lunch Bag
  'M29017132', // Day Worker meals
  'M61706731', // Shelter meals
  'M65842216', // United Effort meals
];

interface ParsedGuest {
  guest_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  city: string;
  housing_status: string;
  age: string;
  gender: string;
  notes: string;
}

interface SkippedInfo {
  specialIds: Array<{ rowNumber: number; guestId: string }>;
  missingNames: Array<{ rowNumber: number; guestId: string; reason: string }>;
  invalidAge: Array<{ rowNumber: number; providedAge: string; name: string }>;
  invalidGender: Array<{ rowNumber: number; providedGender: string; name: string }>;
  invalidHousing: Array<{ rowNumber: number; providedHousing: string; name: string }>;
  duplicateIds: Array<{ rowNumber: number; guestId: string }>;
}

interface UploadResult {
  success: boolean;
  message: string;
}

// Normalize housing status to correct value
const normalizeHousingStatusValue = (value: string): string => {
  if (!value) return value;
  const trimmed = value.trim();
  const mapped = HOUSING_STATUS_MAPPING[trimmed.toLowerCase()];
  if (mapped) return mapped;

  // Try case-insensitive match with allowed values
  const caseInsensitiveMatch = HOUSING_STATUSES.find(
    (status) => status.toLowerCase() === trimmed.toLowerCase()
  );
  return caseInsensitiveMatch || trimmed;
};

// Filter out special guest IDs and rows with invalid/missing/enum values
const filterValidGuests = (guests: ParsedGuest[]): { validGuests: ParsedGuest[]; skippedInfo: SkippedInfo } => {
  const validGuests: ParsedGuest[] = [];
  const skippedInfo: SkippedInfo = {
    specialIds: [],
    missingNames: [],
    invalidAge: [],
    invalidGender: [],
    invalidHousing: [],
    duplicateIds: [],
  };

  const seenGuestIds = new Set<string>();

  guests.forEach((guest, index) => {
    const rowNumber = index + 2;

    // Skip special guest IDs
    if (SPECIAL_GUEST_IDS.includes(guest.guest_id)) {
      skippedInfo.specialIds.push({ rowNumber, guestId: guest.guest_id });
      return;
    }

    // Check for missing names
    const firstName = (guest.first_name || '').trim();
    const fullName = (guest.full_name || '').trim();

    if (!firstName && !fullName) {
      skippedInfo.missingNames.push({
        rowNumber,
        guestId: guest.guest_id,
        reason: 'Missing first name and full name',
      });
      return;
    }

    // Check for duplicate guest IDs in the batch
    if (guest.guest_id && seenGuestIds.has(guest.guest_id)) {
      skippedInfo.duplicateIds.push({ rowNumber, guestId: guest.guest_id });
      return;
    }
    if (guest.guest_id) {
      seenGuestIds.add(guest.guest_id);
    }

    // Validate age
    const age = (guest.age || '').trim();
    if (age) {
      const validAge = AGE_GROUPS.some((ag) => ag.toLowerCase() === age.toLowerCase());
      if (!validAge) {
        skippedInfo.invalidAge.push({
          rowNumber,
          providedAge: age,
          name: guest.full_name || `${guest.first_name} ${guest.last_name}`,
        });
        return;
      }
    }

    // Validate gender
    const gender = (guest.gender || '').trim();
    if (gender) {
      const validGender = GENDERS.some((g) => g.toLowerCase() === gender.toLowerCase());
      if (!validGender) {
        skippedInfo.invalidGender.push({
          rowNumber,
          providedGender: gender,
          name: guest.full_name || `${guest.first_name} ${guest.last_name}`,
        });
        return;
      }
    }

    // Validate housing status
    const housing = (guest.housing_status || '').trim();
    if (housing) {
      const normalized = normalizeHousingStatusValue(housing);
      if (!HOUSING_STATUSES.includes(normalized as typeof HOUSING_STATUSES[number])) {
        skippedInfo.invalidHousing.push({
          rowNumber,
          providedHousing: housing,
          name: guest.full_name || `${guest.first_name} ${guest.last_name}`,
        });
        return;
      }
      guest.housing_status = normalized;
    }

    validGuests.push(guest);
  });

  return { validGuests, skippedInfo };
};

const GuestBatchUpload: React.FC = () => {
  const { addGuest } = useGuestsStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): ParsedGuest[] => {
    try {
      const text = content.replace(/\r\n/g, '\n');
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) throw new Error('CSV needs header + at least one data row');

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

      const rawHeaders = splitCSVLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ''));
      const norm = (h: string): string => h.toLowerCase().replace(/\s+/g, '_');
      const headers = rawHeaders.map((h) => ({ raw: h, norm: norm(h) }));

      const headerIndex = (needle: string): number => {
        const idx = headers.findIndex((h) => h.norm === needle);
        return idx >= 0 ? idx : -1;
      };

      const requiredNorm = ['first_name', 'last_name', 'housing_status', 'age', 'gender'];
      const missing = requiredNorm.filter((r) => headerIndex(r) === -1);
      const cityIdx = headerIndex('city');
      const locationIdx = headerIndex('location');
      if (missing.length || (cityIdx === -1 && locationIdx === -1)) {
        const missingList = [
          ...missing.map((m) => m.replace('_', ' ')),
          ...(cityIdx === -1 && locationIdx === -1 ? ['city (or location)'] : []),
        ];
        throw new Error(`Missing required column(s): ${missingList.join(', ')}`);
      }

      return lines.slice(1).map((line) => {
        const values = splitCSVLine(line);
        const get = (key: string): string => {
          const i = headerIndex(key);
          return i === -1 ? '' : (values[i] || '').trim();
        };
        const first = get('first_name');
        const last = get('last_name');
        const full = get('full_name') || `${first} ${last}`.trim();
        const city = cityIdx !== -1 ? (values[cityIdx] || '').trim() : (values[locationIdx] || '').trim();
        return {
          guest_id: get('guest_id'),
          first_name: first,
          last_name: last,
          full_name: full,
          city,
          housing_status: get('housing_status'),
          age: get('age'),
          gender: get('gender'),
          notes: get('notes'),
        };
      });
    } catch (e) {
      throw new Error(`Failed to parse CSV: ${(e as Error).message}`);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setUploadResult({ success: false, message: 'Please upload a valid CSV file' });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        setUploadProgress('Parsing CSV file...');
        const parsedData = parseCSV(content);

        // Filter out special guest IDs and invalid data
        const { validGuests, skippedInfo } = filterValidGuests(parsedData);

        // Check if all rows were filtered out
        if (validGuests.length === 0) {
          const reasons: string[] = [];
          if (skippedInfo.specialIds.length > 0) {
            reasons.push(`${skippedInfo.specialIds.length} special meal ID(s)`);
          }
          if (skippedInfo.missingNames.length > 0) {
            reasons.push(`${skippedInfo.missingNames.length} row(s) with missing names`);
          }
          if (skippedInfo.invalidAge.length > 0) {
            reasons.push(`${skippedInfo.invalidAge.length} row(s) with invalid age`);
          }
          if (skippedInfo.invalidGender.length > 0) {
            reasons.push(`${skippedInfo.invalidGender.length} row(s) with invalid gender`);
          }
          if (skippedInfo.invalidHousing.length > 0) {
            reasons.push(`${skippedInfo.invalidHousing.length} row(s) with invalid housing status`);
          }
          if (skippedInfo.duplicateIds.length > 0) {
            reasons.push(`${skippedInfo.duplicateIds.length} duplicate guest ID(s)`);
          }
          setUploadResult({
            success: false,
            message: `No valid guests to import. Skipped all ${parsedData.length} row(s): ${reasons.join(' and ')}.`,
          });
          return;
        }

        setUploadProgress(`Importing ${validGuests.length} guests...`);

        // Import guests one by one
        let successCount = 0;
        let failedCount = 0;

        for (const guest of validGuests) {
          try {
            await addGuest({
              firstName: guest.first_name,
              lastName: guest.last_name,
              name: guest.full_name,
              preferredName: '',
              housingStatus: (guest.housing_status || 'Unhoused') as 'Unhoused' | 'Housed' | 'Temp. shelter' | 'RV or vehicle',
              age: (guest.age || 'Adult 18-59') as 'Adult 18-59' | 'Senior 60+' | 'Child 0-17',
              gender: (guest.gender || 'Unknown') as 'Male' | 'Female' | 'Unknown' | 'Non-binary',
              location: guest.city,
              notes: guest.notes,
            });
            successCount++;
          } catch {
            failedCount++;
          }
        }

        setUploadProgress(null);

        let message = `Successfully imported ${successCount} guest${successCount === 1 ? '' : 's'}`;
        if (failedCount > 0) {
          message += ` (${failedCount} failed)`;
        }
        if (skippedInfo.specialIds.length > 0) {
          message += ` (skipped ${skippedInfo.specialIds.length} special meal ID(s))`;
        }

        setUploadResult({ success: true, message });
      } catch (error) {
        setUploadResult({ success: false, message: (error as Error).message });
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setUploadResult({ success: false, message: 'Failed to read the file' });
      setIsUploading(false);
      setUploadProgress(null);
    };

    reader.readAsText(file);
  };

  const downloadTemplateCSV = (): void => {
    const link = document.createElement('a');
    link.href = '/guest_template.csv';
    link.setAttribute('download', 'guest_template.csv');
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
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {uploadResult.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
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
            {isUploading ? 'Uploading...' : 'Upload CSV File'}
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
            'Guest_ID (optional)',
            'First_Name',
            'Last_Name',
            'Full_Name (optional)',
            'City',
            'Housing_status',
            'Age',
            'Gender',
            'Notes (optional)',
          ].map((col) => (
            <span key={col} className="bg-gray-100 px-2 py-1 rounded text-xs">
              {col}
            </span>
          ))}
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide Age exactly matching allowed groups: {AGE_GROUPS.join(', ')}.</li>
          <li>Gender must match allowed values (e.g. Male, Female).</li>
          <li>City is required (or use Location column).</li>
          <li>Housing_status must be one of configured statuses.</li>
        </ul>
      </div>
    </div>
  );
};

export default GuestBatchUpload;
