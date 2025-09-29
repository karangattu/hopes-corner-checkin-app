import { Bike, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAppContext } from "../context/useAppContext";

const repairTypes = [
  "Flat Tire",
  "Brake Adjustment",
  "Gear Adjustment",
  "Chain Replacement",
  "Wheel Truing",
  "Basic Tune Up",
  "Drivetrain Cleaning",
  "Cable Replacement",
  "Headset Adjustment",
  "New Bicycle",
  "Other",
];

const BicycleRepairBooking = () => {
  const { bicyclePickerGuest, setBicyclePickerGuest, addBicycleRecord } =
    useAppContext();
  const [repairType, setRepairType] = useState(repairTypes[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!bicyclePickerGuest) return null;

  const handleCreate = () => {
    if (!bicyclePickerGuest) return;

    // Require bicycle description before logging repair
    if (!bikeDescription) {
      toast.error("Please add a bicycle description to this guest's profile before logging repairs.");
      return;
    }

    try {
      setSubmitting(true);
      addBicycleRecord(bicyclePickerGuest.id, { repairType, notes });
      setBicyclePickerGuest(null);
    } catch (e) {
      toast.error(e.message || "Failed to add repair");
    } finally {
      setSubmitting(false);
    }
  };

  const bikeDescription = bicyclePickerGuest?.bicycleDescription?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setBicyclePickerGuest(null)}
      />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bike /> Log Bicycle Repair for {bicyclePickerGuest.name}
          </h2>
          <button
            onClick={() => setBicyclePickerGuest(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          {bikeDescription ? (
            <div className="text-sm text-gray-600 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
              <span className="font-semibold text-sky-700">
                Bicycle on file:
              </span>{" "}
              {bikeDescription}
            </div>
          ) : (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <div className="font-semibold mb-1">⚠️ Bicycle Description Required</div>
              <div>This guest needs a bicycle description in their profile before repairs can be logged. Please edit their profile and add bike details (make, model, color, etc.) to proceed.</div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">
              Repair Type
            </label>
            <select
              aria-label="repair type"
              value={repairType}
              onChange={(e) => setRepairType(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {repairTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex justify-between">
              <span>Notes {repairType === "Other" && "(required)"}</span>
              <span className="text-xs text-gray-400">Optional</span>
            </label>
            <textarea
              aria-label="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm resize-y"
              placeholder="Additional info or description"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setBicyclePickerGuest(null)}
              className="px-3 py-2 text-sm rounded border"
            >
              Cancel
            </button>
            <button
              disabled={submitting || (repairType === "Other" && !notes.trim()) || !bikeDescription}
              onClick={handleCreate}
              className="px-4 py-2 text-sm rounded bg-sky-600 text-white disabled:opacity-50 hover:bg-sky-700"
              title={!bikeDescription ? "Bicycle description required in guest profile" : ""}
            >
              {submitting ? "Saving..." : "Log Repair"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BicycleRepairBooking;
