'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

// CSV escape utility
function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const strValue = String(value);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
}

// Generic record types
interface BaseRecord {
  id: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface Guest extends BaseRecord {
  guestId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  preferredName?: string;
  housingStatus?: string;
  age?: string;
  gender?: string;
  location?: string;
  notes?: string;
  bicycleDescription?: string;
  banReason?: string;
  bannedAt?: string | Date;
  bannedUntil?: string | Date;
}

interface MealRecord extends BaseRecord {
  guestId?: string;
  date?: string | Date;
  count?: number;
  notes?: string;
}

interface ShowerRecord extends BaseRecord {
  guestId?: string;
  date?: string | Date;
  time?: string;
  status?: string;
  waitlistPosition?: number;
  note?: string;
}

interface LaundryRecord extends BaseRecord {
  guestId?: string;
  date?: string | Date;
  slotLabel?: string;
  time?: string;
  laundryType?: string;
  bagNumber?: string | number;
  status?: string;
  note?: string;
}

interface BicycleRecord extends BaseRecord {
  guestId?: string;
  requestedAt?: string | Date;
  date?: string | Date;
  repairType?: string;
  repairTypes?: string[];
  completedRepairs?: string[];
  notes?: string;
  status?: string;
  priority?: number;
  completedAt?: string | Date;
}

interface DonationRecord extends BaseRecord {
  type?: string;
  itemName?: string;
  trays?: number;
  weightLbs?: number;
  servings?: number;
  temperature?: string;
  donor?: string;
  date?: string | Date;
  donatedAt?: string | Date;
}

interface TableColumn<T> {
  key: string;
  label: string;
  map: (row: T) => unknown;
}

interface TableDefinition<T> {
  id: string;
  name: string;
  data: T[];
  columns: TableColumn<T>[];
}

interface TableBrowserProps {
  guests?: Guest[];
  mealRecords?: MealRecord[];
  showerRecords?: ShowerRecord[];
  laundryRecords?: LaundryRecord[];
  bicycleRecords?: BicycleRecord[];
  donationRecords?: DonationRecord[];
}

export function TableBrowser({
  guests = [],
  mealRecords = [],
  showerRecords = [],
  laundryRecords = [],
  bicycleRecords = [],
  donationRecords = [],
}: TableBrowserProps) {
  const [selectedTable, setSelectedTable] = useState('guests');

  const tables = useMemo<TableDefinition<BaseRecord>[]>(() => {
    const guestTable: TableDefinition<Guest> = {
      id: 'guests',
      name: 'Guests',
      data: guests,
      columns: [
        { key: 'id', label: 'id', map: (r) => r.id },
        { key: 'external_id', label: 'external_id', map: (r) => r.guestId },
        { key: 'first_name', label: 'first_name', map: (r) => r.firstName },
        { key: 'last_name', label: 'last_name', map: (r) => r.lastName },
        { key: 'full_name', label: 'full_name', map: (r) => r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() },
        { key: 'preferred_name', label: 'preferred_name', map: (r) => r.preferredName || null },
        { key: 'housing_status', label: 'housing_status', map: (r) => r.housingStatus || 'Unhoused' },
        { key: 'age_group', label: 'age_group', map: (r) => r.age || 'Adult 18-59' },
        { key: 'gender', label: 'gender', map: (r) => r.gender || 'Unknown' },
        { key: 'location', label: 'location', map: (r) => r.location || 'Mountain View' },
        { key: 'notes', label: 'notes', map: (r) => r.notes || null },
        { key: 'bicycle_description', label: 'bicycle_description', map: (r) => r.bicycleDescription || null },
        { key: 'created_at', label: 'created_at', map: (r) => r.createdAt || new Date().toISOString() },
      ],
    };

    const mealTable: TableDefinition<MealRecord & { meal_type: string }> = {
      id: 'meal_attendance',
      name: 'Meal Attendance',
      data: mealRecords.map((r) => ({ ...r, meal_type: 'guest' })),
      columns: [
        { key: 'id', label: 'id', map: (r) => r.id },
        { key: 'guest_id', label: 'guest_id', map: (r) => r.guestId || null },
        { key: 'meal_type', label: 'meal_type', map: (r) => r.meal_type },
        { key: 'quantity', label: 'quantity', map: (r) => r.count || 1 },
        { key: 'served_on', label: 'served_on', map: (r) => r.date ? new Date(r.date).toISOString().split('T')[0] : null },
        { key: 'notes', label: 'notes', map: (r) => r.notes || null },
        { key: 'created_at', label: 'created_at', map: (r) => r.createdAt || new Date().toISOString() },
      ],
    };

    const showerTable: TableDefinition<ShowerRecord> = {
      id: 'shower_reservations',
      name: 'Shower Reservations',
      data: showerRecords,
      columns: [
        { key: 'id', label: 'id', map: (r) => r.id },
        { key: 'guest_id', label: 'guest_id', map: (r) => r.guestId },
        { key: 'scheduled_for', label: 'scheduled_for', map: (r) => r.date ? new Date(r.date).toISOString().split('T')[0] : null },
        { key: 'scheduled_time', label: 'scheduled_time', map: (r) => r.time || null },
        { key: 'status', label: 'status', map: (r) => r.status || 'booked' },
        { key: 'note', label: 'note', map: (r) => r.note || null },
        { key: 'created_at', label: 'created_at', map: (r) => r.createdAt || new Date().toISOString() },
      ],
    };

    const laundryTable: TableDefinition<LaundryRecord> = {
      id: 'laundry_bookings',
      name: 'Laundry Bookings',
      data: laundryRecords,
      columns: [
        { key: 'id', label: 'id', map: (r) => r.id },
        { key: 'guest_id', label: 'guest_id', map: (r) => r.guestId },
        { key: 'scheduled_for', label: 'scheduled_for', map: (r) => r.date ? new Date(r.date).toISOString().split('T')[0] : null },
        { key: 'slot_label', label: 'slot_label', map: (r) => r.slotLabel || r.time || null },
        { key: 'laundry_type', label: 'laundry_type', map: (r) => r.laundryType || 'onsite' },
        { key: 'bag_number', label: 'bag_number', map: (r) => r.bagNumber || null },
        { key: 'status', label: 'status', map: (r) => r.status || 'waiting' },
        { key: 'created_at', label: 'created_at', map: (r) => r.createdAt || new Date().toISOString() },
      ],
    };

    const bicycleTable: TableDefinition<BicycleRecord> = {
      id: 'bicycle_repairs',
      name: 'Bicycle Repairs',
      data: bicycleRecords,
      columns: [
        { key: 'id', label: 'id', map: (r) => r.id },
        { key: 'guest_id', label: 'guest_id', map: (r) => r.guestId || null },
        { key: 'requested_at', label: 'requested_at', map: (r) => r.requestedAt || r.date || new Date().toISOString() },
        { key: 'repair_types', label: 'repair_types', map: (r) => JSON.stringify(r.repairTypes || [r.repairType].filter(Boolean)) },
        { key: 'notes', label: 'notes', map: (r) => r.notes || null },
        { key: 'status', label: 'status', map: (r) => r.status || 'pending' },
        { key: 'completed_at', label: 'completed_at', map: (r) => r.completedAt || null },
      ],
    };

    const donationTable: TableDefinition<DonationRecord> = {
      id: 'donations',
      name: 'Donations',
      data: donationRecords,
      columns: [
        { key: 'id', label: 'id', map: (r) => r.id },
        { key: 'donation_type', label: 'donation_type', map: (r) => r.type },
        { key: 'item_name', label: 'item_name', map: (r) => r.itemName },
        { key: 'trays', label: 'trays', map: (r) => r.trays || 0 },
        { key: 'weight_lbs', label: 'weight_lbs', map: (r) => r.weightLbs || 0 },
        { key: 'servings', label: 'servings', map: (r) => r.servings || 0 },
        { key: 'donor', label: 'donor', map: (r) => r.donor },
        { key: 'donated_at', label: 'donated_at', map: (r) => r.date || r.donatedAt || new Date().toISOString() },
      ],
    };

    // Cast all tables to the base type for the array
    return [
      guestTable,
      mealTable,
      showerTable,
      laundryTable,
      bicycleTable,
      donationTable,
    ] as unknown as TableDefinition<BaseRecord>[];
  }, [guests, mealRecords, showerRecords, laundryRecords, bicycleRecords, donationRecords]);

  const currentTable = useMemo(
    () => tables.find((t) => t.id === selectedTable),
    [tables, selectedTable]
  );

  const exportDataAsCSV = useCallback((data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.map(toCsvValue).join(','),
      ...data.map((row) =>
        headers.map((header) => toCsvValue(row[header])).join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDownloadCSV = useCallback(() => {
    if (!currentTable || currentTable.data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvData = currentTable.data.map((row) => {
      const csvRow: Record<string, unknown> = {};
      currentTable.columns.forEach((col) => {
        const value = col.map(row);
        if (Array.isArray(value)) {
          csvRow[col.label] = JSON.stringify(value);
        } else if (typeof value === 'object' && value !== null) {
          csvRow[col.label] = JSON.stringify(value);
        } else {
          csvRow[col.label] = value ?? '';
        }
      });
      return csvRow;
    });

    exportDataAsCSV(csvData, `${currentTable.id}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`${currentTable.name} exported to CSV`);
  }, [currentTable, exportDataAsCSV]);

  if (!currentTable) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No table selected
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Table
              </label>
              <div className="relative">
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name} ({table.data.length} rows)
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={20}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownloadCSV}
                disabled={!currentTable.data || currentTable.data.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Download size={16} />
                Download CSV (Supabase-ready)
              </button>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                📥 Supabase-Compatible Export
              </p>
              <p>
                Column names match the Supabase schema exactly. CSV files can be
                imported directly into Supabase without modification.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                {currentTable.columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentTable.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={currentTable.columns.length}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                currentTable.data.slice(0, 100).map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    {currentTable.columns.map((col) => {
                      const value = col.map(row);
                      let displayValue = '';

                      if (value === null || value === undefined) {
                        displayValue = '';
                      } else if (Array.isArray(value)) {
                        displayValue = value.join(', ');
                      } else if (typeof value === 'object') {
                        displayValue = JSON.stringify(value);
                      } else if (typeof value === 'boolean') {
                        displayValue = value ? 'Yes' : 'No';
                      } else {
                        displayValue = String(value);
                      }

                      return (
                        <td
                          key={`${row.id || idx}-${col.key}`}
                          className="px-4 py-3 text-gray-900 dark:text-gray-100 max-w-xs truncate"
                          title={displayValue}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total rows:{' '}
            <span className="font-semibold">{currentTable.data.length}</span>
            {currentTable.data.length > 100 && (
              <span className="text-gray-500 dark:text-gray-500 ml-2">
                (showing first 100)
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default TableBrowser;
