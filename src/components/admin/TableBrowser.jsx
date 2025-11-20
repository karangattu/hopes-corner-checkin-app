import React, { useState, useMemo } from "react";
import { useAppContext } from "../../context/useAppContext";
import { Download, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

const TableBrowser = () => {
  const {
    exportDataAsCSV,
    guests,
    mealRecords,
    showerRecords,
    laundryRecords,
    bicycleRecords,
    donationRecords,
    itemGivenRecords,
    haircutRecords,
    holidayRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
  } = useAppContext();

  const [selectedTable, setSelectedTable] = useState("guests");

  const tables = useMemo(
    () => [
      {
        id: "guests",
        name: "Guests",
        data: guests || [],
        columns: [
          { key: "id", label: "id", map: (r) => r.id },
          { key: "external_id", label: "external_id", map: (r) => r.guestId },
          { key: "first_name", label: "first_name", map: (r) => r.firstName },
          { key: "last_name", label: "last_name", map: (r) => r.lastName },
          { key: "full_name", label: "full_name", map: (r) => r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() },
          { key: "preferred_name", label: "preferred_name", map: (r) => r.preferredName || null },
          { key: "housing_status", label: "housing_status", map: (r) => r.housingStatus || 'Unhoused' },
          { key: "age_group", label: "age_group", map: (r) => r.age || 'Adult 18-59' },
          { key: "gender", label: "gender", map: (r) => r.gender || 'Unknown' },
          { key: "location", label: "location", map: (r) => r.location || 'Mountain View' },
          { key: "notes", label: "notes", map: (r) => r.notes || null },
          { key: "bicycle_description", label: "bicycle_description", map: (r) => r.bicycleDescription || null },
          { key: "ban_reason", label: "ban_reason", map: (r) => r.banReason || null },
          { key: "banned_at", label: "banned_at", map: (r) => r.bannedAt || null },
          { key: "banned_until", label: "banned_until", map: (r) => r.bannedUntil || null },
          { key: "created_at", label: "created_at", map: (r) => r.createdAt || new Date().toISOString() },
          { key: "updated_at", label: "updated_at", map: (r) => r.updatedAt || new Date().toISOString() },
        ],
      },
      {
        id: "meal_attendance",
        name: "Meal Attendance (All Types)",
        data: [
          ...(mealRecords || []).map(r => ({ ...r, meal_type: 'guest' })),
          ...(rvMealRecords || []).map(r => ({ ...r, meal_type: 'rv' })),
          ...(shelterMealRecords || []).map(r => ({ ...r, meal_type: 'shelter' })),
          ...(unitedEffortMealRecords || []).map(r => ({ ...r, meal_type: 'united_effort' })),
          ...(extraMealRecords || []).map(r => ({ ...r, meal_type: 'extra' })),
          ...(dayWorkerMealRecords || []).map(r => ({ ...r, meal_type: 'day_worker' })),
          ...(lunchBagRecords || []).map(r => ({ ...r, meal_type: 'lunch_bag' })),
        ],
        columns: [
          { key: "id", label: "id", map: (r) => r.id },
          { key: "guest_id", label: "guest_id", map: (r) => r.guestId || null },
          { key: "meal_type", label: "meal_type", map: (r) => r.meal_type },
          { key: "quantity", label: "quantity", map: (r) => r.count || 1 },
          { key: "served_on", label: "served_on", map: (r) => r.date ? new Date(r.date).toISOString().split('T')[0] : null },
          { key: "recorded_at", label: "recorded_at", map: (r) => r.createdAt || new Date().toISOString() },
          { key: "notes", label: "notes", map: (r) => r.notes || null },
          { key: "created_at", label: "created_at", map: (r) => r.createdAt || new Date().toISOString() },
          { key: "updated_at", label: "updated_at", map: (r) => r.updatedAt || new Date().toISOString() },
        ],
      },
      {
        id: "shower_reservations",
        name: "Shower Reservations",
        data: showerRecords || [],
        columns: [
          { key: "id", label: "id", map: (r) => r.id },
          { key: "guest_id", label: "guest_id", map: (r) => r.guestId },
          { key: "scheduled_for", label: "scheduled_for", map: (r) => r.date ? new Date(r.date).toISOString().split('T')[0] : null },
          { key: "scheduled_time", label: "scheduled_time", map: (r) => r.time || null },
          { key: "status", label: "status", map: (r) => r.status || 'booked' },
          { key: "waitlist_position", label: "waitlist_position", map: (r) => r.waitlistPosition || null },
          { key: "note", label: "note", map: (r) => r.note || null },
          { key: "created_at", label: "created_at", map: (r) => r.createdAt || new Date().toISOString() },
          { key: "updated_at", label: "updated_at", map: (r) => r.updatedAt || new Date().toISOString() },
        ],
      },
      {
        id: "laundry_bookings",
        name: "Laundry Bookings",
        data: laundryRecords || [],
        columns: [
          { key: "id", label: "id", map: (r) => r.id },
          { key: "guest_id", label: "guest_id", map: (r) => r.guestId },
          { key: "scheduled_for", label: "scheduled_for", map: (r) => r.date ? new Date(r.date).toISOString().split('T')[0] : null },
          { key: "slot_label", label: "slot_label", map: (r) => r.slotLabel || r.time || null },
          { key: "laundry_type", label: "laundry_type", map: (r) => r.laundryType || 'onsite' },
          { key: "bag_number", label: "bag_number", map: (r) => r.bagNumber || null },
          { key: "status", label: "status", map: (r) => r.status || 'waiting' },
          { key: "note", label: "note", map: (r) => r.note || null },
          { key: "created_at", label: "created_at", map: (r) => r.createdAt || new Date().toISOString() },
          { key: "updated_at", label: "updated_at", map: (r) => r.updatedAt || new Date().toISOString() },
        ],
      },
      {
        id: "bicycle_repairs",
        name: "Bicycle Repairs",
        data: bicycleRecords || [],
        columns: [
          { key: "id", label: "id", map: (r) => r.id },
          { key: "guest_id", label: "guest_id", map: (r) => r.guestId || null },
          { key: "requested_at", label: "requested_at", map: (r) => r.requestedAt || r.date || new Date().toISOString() },
          { key: "repair_type", label: "repair_type", map: (r) => r.repairType || null },
          { key: "repair_types", label: "repair_types", map: (r) => JSON.stringify(r.repairTypes || [r.repairType].filter(Boolean)) },
          { key: "completed_repairs", label: "completed_repairs", map: (r) => JSON.stringify(r.completedRepairs || []) },
          { key: "notes", label: "notes", map: (r) => r.notes || null },
          { key: "status", label: "status", map: (r) => r.status || 'pending' },
          { key: "priority", label: "priority", map: (r) => r.priority || 0 },
          { key: "completed_at", label: "completed_at", map: (r) => r.completedAt || null },
          { key: "updated_at", label: "updated_at", map: (r) => r.updatedAt || new Date().toISOString() },
        ],
      },
      {
        id: "donations",
        name: "Donations",
        data: donationRecords || [],
        columns: [
          { key: "id", label: "id", map: (r) => r.id },
          { key: "donation_type", label: "donation_type", map: (r) => r.type },
          { key: "item_name", label: "item_name", map: (r) => r.itemName },
          { key: "trays", label: "trays", map: (r) => r.trays || 0 },
          { key: "weight_lbs", label: "weight_lbs", map: (r) => r.weightLbs || 0 },
          { key: "servings", label: "servings", map: (r) => r.servings || 0 },
          { key: "temperature", label: "temperature", map: (r) => r.temperature || null },
          { key: "donor", label: "donor", map: (r) => r.donor },
          { key: "donated_at", label: "donated_at", map: (r) => r.date || r.donatedAt || new Date().toISOString() },
          { key: "created_at", label: "created_at", map: (r) => r.createdAt || new Date().toISOString() },
          { key: "updated_at", label: "updated_at", map: (r) => r.updatedAt || new Date().toISOString() },
        ],
      },
      {
        id: "items_distributed",
        name: "Items Distributed",
        data: itemGivenRecords || [],
        columns: [
          { key: "id", label: "id", map: (r) => r.id },
          { key: "guest_id", label: "guest_id", map: (r) => r.guestId },
          { key: "item_key", label: "item_key", map: (r) => r.item || r.itemKey },
          { key: "distributed_at", label: "distributed_at", map: (r) => r.date || r.distributedAt || new Date().toISOString() },
          { key: "created_at", label: "created_at", map: (r) => r.createdAt || new Date().toISOString() },
        ],
      },
      {
        id: "haircut_visits",
        name: "Haircut Visits",
        data: haircutRecords || [],
        columns: [
          { key: "id", label: "id", map: (r) => r.id },
          { key: "guest_id", label: "guest_id", map: (r) => r.guestId },
          { key: "served_at", label: "served_at", map: (r) => r.date || r.servedAt || new Date().toISOString() },
          { key: "created_at", label: "created_at", map: (r) => r.createdAt || new Date().toISOString() },
        ],
      },
      {
        id: "holiday_visits",
        name: "Holiday Visits",
        data: holidayRecords || [],
        columns: [
          { key: "id", label: "id", map: (r) => r.id },
          { key: "guest_id", label: "guest_id", map: (r) => r.guestId },
          { key: "served_at", label: "served_at", map: (r) => r.date || r.servedAt || new Date().toISOString() },
          { key: "created_at", label: "created_at", map: (r) => r.createdAt || new Date().toISOString() },
        ],
      },
    ],
    [guests, mealRecords, rvMealRecords, shelterMealRecords, unitedEffortMealRecords, extraMealRecords, dayWorkerMealRecords, lunchBagRecords, showerRecords, laundryRecords, bicycleRecords, donationRecords, itemGivenRecords, haircutRecords, holidayRecords],
  );

  const currentTable = useMemo(
    () => tables.find((t) => t.id === selectedTable),
    [tables, selectedTable],
  );

  const handleDownloadCSV = () => {
    if (!currentTable || currentTable.data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvData = currentTable.data.map((row) => {
      const csvRow = {};
      currentTable.columns.forEach((col) => {
        const value = col.map ? col.map(row) : row[col.key];
        if (Array.isArray(value)) {
          csvRow[col.label] = JSON.stringify(value);
        } else if (typeof value === "object" && value !== null) {
          csvRow[col.label] = JSON.stringify(value);
        } else {
          csvRow[col.label] = value ?? "";
        }
      });
      return csvRow;
    });

    exportDataAsCSV(csvData, `${currentTable.id}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`${currentTable.name} exported to CSV`);
  };

  if (!currentTable) {
    return (
      <div className="text-center py-12 text-gray-500">
        No table selected
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Table
              </label>
              <div className="relative">
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name} ({table.data.length} rows)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
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

            <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-semibold text-blue-900 mb-1">📥 Supabase-Compatible Export</p>
              <p>Column names match the Supabase schema exactly. CSV files can be imported directly into Supabase without modification.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {currentTable.columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left font-semibold text-gray-700"
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
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                currentTable.data.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    {currentTable.columns.map((col) => {
                      const value = col.map ? col.map(row) : row[col.key];
                      let displayValue = "";

                      if (value === null || value === undefined) {
                        displayValue = "";
                      } else if (Array.isArray(value)) {
                        displayValue = value.join(", ");
                      } else if (typeof value === "object") {
                        displayValue = JSON.stringify(value);
                      } else if (typeof value === "boolean") {
                        displayValue = value ? "Yes" : "No";
                      } else {
                        displayValue = String(value);
                      }

                      return (
                        <td
                          key={`${row.id || idx}-${col.key}`}
                          className="px-4 py-3 text-gray-900 max-w-xs truncate"
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

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Total rows: <span className="font-semibold">{currentTable.data.length}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TableBrowser;
