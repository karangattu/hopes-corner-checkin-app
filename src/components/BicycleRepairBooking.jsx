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
  const [selectedRepairTypes, setSelectedRepairTypes] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!bicyclePickerGuest) return null;

  const bikeDescription = bicyclePickerGuest?.bicycleDescription?.trim();

  const toggleRepairType = (type) => {
    setSelectedRepairTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleCreate = () => {
    if (!bicyclePickerGuest) return;

    // Require bicycle description before logging repair
    if (!bikeDescription) {
      toast.error(
        "Please add a bicycle description to this guest's profile before logging repairs.",
      );
      return;
    }

    // Require at least one repair type
    if (selectedRepairTypes.length === 0) {
      toast.error("Please select at least one repair type.");
      return;
    }

    // Require notes if "Other" is selected
    if (selectedRepairTypes.includes("Other") && !notes.trim()) {
      toast.error("Please add notes for 'Other' repair type.");
      return;
    }

    try {
      setSubmitting(true);
      addBicycleRecord(bicyclePickerGuest.id, {
        repairTypes: selectedRepairTypes,
        notes
      });
      setBicyclePickerGuest(null);
      setSelectedRepairTypes([]);
      setNotes("");
    } catch (e) {
      toast.error(e.message || "Failed to add repair");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setBicyclePickerGuest(null)}
      />
      <div className="relative w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
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
              <div className="font-semibold mb-1">
                ⚠️ No bicycle description saved
              </div>
              <div>
                Please add bicycle details (make, model, color, etc.) to this
                guest's profile before logging repair work.
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">
              Repair Types <span className="text-gray-500 text-xs">(select all that apply)</span>
            </label>
            <div className="space-y-0.5 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
              {repairTypes.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2.5 cursor-pointer hover:bg-white px-3 py-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedRepairTypes.includes(type)}
                    onChange={() => toggleRepairType(type)}
                    className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500 flex-shrink-0"
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
            {selectedRepairTypes.length > 0 && (
              <div className="mt-2 text-xs text-sky-700 font-medium">
                {selectedRepairTypes.length} repair type{selectedRepairTypes.length > 1 ? "s" : ""} selected (counts as {selectedRepairTypes.length} bicycle service{selectedRepairTypes.length > 1 ? "s" : ""})
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex justify-between">
              <span>Notes {selectedRepairTypes.includes("Other") && "(required)"}</span>
              <span className="text-xs text-gray-400">
                {selectedRepairTypes.includes("Other") ? "Required" : "Optional"}
              </span>
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
              disabled={
                submitting ||
                selectedRepairTypes.length === 0 ||
                (selectedRepairTypes.includes("Other") && !notes.trim()) ||
                !bikeDescription
              }
              onClick={handleCreate}
              className="px-4 py-2 text-sm rounded bg-sky-600 text-white disabled:opacity-50 hover:bg-sky-700"
              title={
                !bikeDescription
                  ? "Bicycle description required in guest profile"
                  : selectedRepairTypes.length === 0
                  ? "Please select at least one repair type"
                  : ""
              }
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
