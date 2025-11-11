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
          "id",
          "firstName",
          "lastName",
          "email",
          "phone",
          "dateOfBirth",
          "housingStatus",
          "notes",
          "createdAt",
        ],
      },
      {
        id: "meals",
        name: "Meal Attendance",
        data: mealRecords || [],
        columns: ["id", "guestId", "type", "date", "count", "createdAt"],
      },
      {
        id: "rv-meals",
        name: "RV Meal Attendance",
        data: rvMealRecords || [],
        columns: ["id", "guestId", "type", "date", "count", "createdAt"],
      },
      {
        id: "shelter-meals",
        name: "Shelter Meal Attendance",
        data: shelterMealRecords || [],
        columns: ["id", "guestId", "type", "date", "count", "createdAt"],
      },
      {
        id: "united-effort-meals",
        name: "United Effort Meal Attendance",
        data: unitedEffortMealRecords || [],
        columns: ["id", "guestId", "type", "date", "count", "createdAt"],
      },
      {
        id: "extra-meals",
        name: "Extra Meal Attendance",
        data: extraMealRecords || [],
        columns: ["id", "guestId", "type", "date", "count", "createdAt"],
      },
      {
        id: "day-worker-meals",
        name: "Day Worker Meal Attendance",
        data: dayWorkerMealRecords || [],
        columns: ["id", "guestId", "type", "date", "count", "createdAt"],
      },
      {
        id: "lunch-bags",
        name: "Lunch Bag Distribution",
        data: lunchBagRecords || [],
        columns: ["id", "guestId", "type", "date", "count", "createdAt"],
      },
      {
        id: "showers",
        name: "Shower Reservations",
        data: showerRecords || [],
        columns: ["id", "guestId", "date", "time", "status", "createdAt"],
      },
      {
        id: "laundry",
        name: "Laundry Bookings",
        data: laundryRecords || [],
        columns: ["id", "guestId", "date", "time", "status", "bagNumber", "createdAt"],
      },
      {
        id: "bicycles",
        name: "Bicycle Repairs",
        data: bicycleRecords || [],
        columns: ["id", "guestId", "date", "status", "repairType", "createdAt"],
      },
      {
        id: "donations",
        name: "Donations",
        data: donationRecords || [],
        columns: ["id", "donor", "type", "itemName", "trays", "weightLbs", "servings", "temperature", "date", "createdAt"],
      },
      {
        id: "items-given",
        name: "Items Given",
        data: itemGivenRecords || [],
        columns: ["id", "guestId", "item", "date", "createdAt"],
      },
      {
        id: "haircuts",
        name: "Haircuts",
        data: haircutRecords || [],
        columns: ["id", "guestId", "date", "createdAt"],
      },
      {
        id: "holidays",
        name: "Holidays",
        data: holidayRecords || [],
        columns: ["id", "guestId", "date", "createdAt"],
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
        const value = row[col];
        if (Array.isArray(value)) {
          csvRow[col] = JSON.stringify(value);
        } else if (typeof value === "object" && value !== null) {
          csvRow[col] = JSON.stringify(value);
        } else {
          csvRow[col] = value || "";
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
                Download CSV
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {currentTable.columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left font-semibold text-gray-700"
                  >
                    {col}
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
                      const value = row[col];
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
                          key={`${row.id || idx}-${col}`}
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
