import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { todayPacificDateString, isoFromPacificDateString } from "../utils/date";
import { ChevronLeft, ChevronRight, Save, Package } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { sanitizeString, isValidNumber } from "../utils/validation";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const LaPlazaDonations = () => {
  const { laPlazaDonations, addLaPlazaDonation, LA_PLAZA_CATEGORIES = [] } = useAppContext();
  const todayKey = todayPacificDateString();
  const [selectedDate, setSelectedDate] = useState(() => todayKey);
  const [form, setForm] = useState({ category: LA_PLAZA_CATEGORIES?.[0] || "Produce", weightLbs: "", notes: "" });

  const selectedDayRecords = useMemo(() => {
    if (!selectedDate) return [];
    return (laPlazaDonations || []).filter((r) => r.dateKey === selectedDate);
  }, [laPlazaDonations, selectedDate]);

  const shiftDate = (offset) => {
    if (!selectedDate || !DATE_ONLY_REGEX.test(selectedDate)) return;
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    date.setUTCDate(date.getUTCDate() + offset);
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const category = sanitizeString(form.category || LA_PLAZA_CATEGORIES[0]);
      const weightLbs = Number(form.weightLbs || 0);
      const notes = sanitizeString(form.notes || "");
      if (!LA_PLAZA_CATEGORIES.includes(category)) throw new Error("Invalid category");
      if (!isValidNumber(weightLbs, { min: 0.0001 })) throw new Error("Weight must be a positive number");

      // Convert Pacific date to ISO timestamp and pass the dateKey explicitly
      const receivedAt = isoFromPacificDateString(selectedDate);
      const dateKey = selectedDate; // This is already a Pacific date string (YYYY-MM-DD)
      await addLaPlazaDonation({ category, weightLbs, notes, receivedAt, dateKey });
      setForm({ category: LA_PLAZA_CATEGORIES[0] || "Produce", weightLbs: "", notes: "" });
    } catch (err) {
      toast.error(err?.message || "Failed to add donation");
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <h3 className="text-base sm:text-lg font-semibold">La Plaza Market donations</h3>
        <div className="flex items-center gap-2 justify-between sm:justify-start">
          <button aria-label="prev-day" type="button" onClick={() => shiftDate(-1)} className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-rose-100 text-rose-700 transition hover:bg-rose-200 hover:scale-110 active:scale-95">
            <ChevronLeft size={20} className="sm:hidden" strokeWidth={2.5} />
            <ChevronLeft size={24} className="hidden sm:block" strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2">
            <div className="text-xs sm:text-sm font-medium text-gray-700">{selectedDate}</div>
            <input 
              aria-label="select-date" 
              type="date" 
              value={selectedDate} 
              onChange={(e)=> setSelectedDate(e.target.value)} 
              className="p-1.5 sm:p-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition" 
            />
          </div>
          <button aria-label="next-day" type="button" onClick={() => shiftDate(1)} className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-rose-100 text-rose-700 transition hover:bg-rose-200 hover:scale-110 active:scale-95">
            <ChevronRight size={20} className="sm:hidden" strokeWidth={2.5} />
            <ChevronRight size={24} className="hidden sm:block" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] sm:text-xs text-gray-500">Add donation for selected day</div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:gap-3">
          <select 
            value={form.category} 
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} 
            className="p-2.5 sm:p-3 border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition"
          >
            {LA_PLAZA_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input 
            type="number" 
            min="0" 
            step="0.01" 
            placeholder="Weight (lbs)" 
            value={form.weightLbs} 
            onChange={(e)=> setForm((f)=> ({ ...f, weightLbs: e.target.value }))} 
            className="p-2.5 sm:p-3 border-2 border-gray-300 rounded-lg text-sm font-medium placeholder-gray-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition" 
          />
          <div className="flex gap-2">
            <input 
              placeholder="Notes (optional)" 
              value={form.notes} 
              onChange={(e)=> setForm((f)=> ({ ...f, notes: e.target.value }))} 
              className="p-2.5 sm:p-3 border-2 border-gray-300 rounded-lg text-sm font-medium placeholder-gray-400 flex-1 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition" 
            />
            <button 
              className="px-3 sm:px-4 py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1.5 sm:gap-2 shadow-md transition active:scale-95" 
              type="submit"
            >
              <Save size={16} className="sm:hidden" /> 
              <Save size={18} className="hidden sm:block" />
              <span className="text-xs sm:text-sm">Save</span>
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-2">
        <div className="text-xs sm:text-sm font-medium text-gray-700">Donations on {selectedDate}</div>
        <ul className="space-y-2">
          {selectedDayRecords.length === 0 && (
            <li className="text-xs text-gray-500 text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
              No records for this day.
            </li>
          )}
          {selectedDayRecords.map((r) => (
            <li key={r.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg sm:rounded-xl bg-gray-50 hover:bg-gray-100 transition">
              <div className="flex gap-2 sm:gap-3 items-center flex-1 min-w-0">
                <Package size={18} className="sm:hidden text-rose-600 flex-shrink-0" />
                <Package size={20} className="hidden sm:block text-rose-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm sm:text-base text-gray-900 truncate">{r.category}</div>
                  {r.notes && <div className="text-[10px] sm:text-xs text-gray-500 truncate">{r.notes}</div>}
                </div>
              </div>
              <div className="text-xs sm:text-sm font-bold text-rose-600 flex-shrink-0 ml-2">
                {Number(r.weightLbs || 0).toFixed(2)} lbs
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LaPlazaDonations;
