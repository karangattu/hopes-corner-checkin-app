import { Bike, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAppContext } from "../context/useAppContext";
import Modal from "./ui/Modal";

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
  "Seat Adjustment",
  "Kickstand",
  "Basket/Rack",
  "Bike Lights",
  "Lock",
  "New Tube",
  "New Tire",
  "New Bicycle",
  "Other",
];

const BicycleRepairBooking = () => {
  const { bicyclePickerGuest, setBicyclePickerGuest, addBicycleRecord } =
    useAppContext();
  const [selectedRepairTypes, setSelectedRepairTypes] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef(null);

  const handleClose = () => setBicyclePickerGuest(null);

  if (!bicyclePickerGuest) return null;

  const bikeDescription = bicyclePickerGuest?.bicycleDescription?.trim();

  const toggleRepairType = (type) => {
    setSelectedRepairTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
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
        notes,
      });
      handleClose();
      setSelectedRepairTypes([]);
      setNotes("");
    } catch (e) {
      toast.error(e.message || "Failed to add repair");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(bicyclePickerGuest)}
      onClose={handleClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocusRef={closeButtonRef}
    >
      <div className="w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-xl sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <h2
            className="flex items-center gap-2 text-lg font-semibold text-gray-900"
            id={titleId}
          >
            <Bike aria-hidden="true" /> Log Bicycle Repair for{" "}
            {bicyclePickerGuest.name}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            aria-label="Close bicycle repair dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 pt-4" id={descriptionId}>
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
              Repair Types{" "}
              <span className="text-gray-500 text-xs">
                (select all that apply)
              </span>
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
                {selectedRepairTypes.length} repair type
                {selectedRepairTypes.length > 1 ? "s" : ""} selected (counts as{" "}
                {selectedRepairTypes.length} bicycle service
                {selectedRepairTypes.length > 1 ? "s" : ""})
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex justify-between">
              <span>
                Notes {selectedRepairTypes.includes("Other") && "(required)"}
              </span>
              <span className="text-xs text-gray-400">
                {selectedRepairTypes.includes("Other")
                  ? "Required"
                  : "Optional"}
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
              type="button"
              onClick={handleClose}
              className="rounded border px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
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
              type="button"
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
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
    </Modal>
  );
};

export default BicycleRepairBooking;
