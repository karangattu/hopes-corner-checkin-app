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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">La Plaza Market donations</h3>
        <div className="flex items-center gap-2">
            <button aria-label="prev-day" type="button" onClick={() => shiftDate(-1)} className="px-2 py-1 rounded border border-gray-200"><ChevronLeft /></button>
            <div className="text-sm">{selectedDate}</div>
            <input aria-label="select-date" type="date" value={selectedDate} onChange={(e)=> setSelectedDate(e.target.value)} className="ml-2 p-1 border rounded" />
            <button aria-label="next-day" type="button" onClick={() => shiftDate(1)} className="px-2 py-1 rounded border border-gray-200"><ChevronRight /></button>
          </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-500">Add donation (date defaults to selected day)</div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="p-2 border rounded">
            {LA_PLAZA_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input type="number" min="0" step="0.01" placeholder="Weight (lbs)" value={form.weightLbs} onChange={(e)=> setForm((f)=> ({ ...f, weightLbs: e.target.value }))} className="p-2 border rounded" />
          <div className="flex gap-2">
            <input placeholder="Notes" value={form.notes} onChange={(e)=> setForm((f)=> ({ ...f, notes: e.target.value }))} className="p-2 border rounded flex-1" />
            <button className="px-4 py-2 bg-rose-600 text-white rounded" type="submit"><Save size={16} /> Save</button>
          </div>
        </form>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Donations on {selectedDate}</div>
        <ul className="space-y-1">
          {selectedDayRecords.length === 0 && <li className="text-xs text-gray-500">No records for this day.</li>}
          {selectedDayRecords.map((r) => (
            <li key={r.id} className="flex items-center justify-between p-2 border rounded bg-gray-50">
              <div className="flex gap-3 items-center">
                <Package />
                <div>
                  <div className="font-medium">{r.category}</div>
                  <div className="text-xs text-gray-500">{r.notes}</div>
                </div>
              </div>
              <div className="text-sm font-semibold">{Number(r.weightLbs || 0).toFixed(2)} lbs</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LaPlazaDonations;
