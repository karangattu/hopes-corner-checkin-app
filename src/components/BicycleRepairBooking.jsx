import { Bike, X, Star, Bell } from "lucide-react";
import { useId, useRef, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useAppContext } from "../context/useAppContext";
import { useRemindersStore } from "../stores/useRemindersStore";
import Modal from "./ui/Modal";
import ReminderDismissalModal from "./guest/ReminderDismissalModal";

const repairTypes = [
  "New Bicycle",
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
  "Other",
];

const BicycleRepairBooking = () => {
  const { bicyclePickerGuest, setBicyclePickerGuest, addBicycleRecord } =
    useAppContext();
  const [selectedRepairTypes, setSelectedRepairTypes] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef(null);

  // Get reminders for the guest - select raw array and memoize filtered result
  const reminders = useRemindersStore((state) => state.reminders);
  const activeReminders = useMemo(
    () => bicyclePickerGuest 
      ? (reminders || []).filter((r) => r.guestId === bicyclePickerGuest.id && r.active)
      : [],
    [reminders, bicyclePickerGuest]
  );
  const hasReminders = activeReminders.length > 0;

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
    <>
    <Modal
      isOpen={Boolean(bicyclePickerGuest)}
      onClose={handleClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocusRef={closeButtonRef}
    >
      <div className="w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-xl sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <h2
              className="flex items-center gap-2 text-lg font-semibold text-gray-900"
              id={titleId}
            >
              <Bike aria-hidden="true" /> Log Bicycle Repair for{" "}
              {bicyclePickerGuest.name}
            </h2>
            {hasReminders && (
              <button
                type="button"
                onClick={() => setReminderModalOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wide rounded-md bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 hover:border-amber-300 transition-colors"
                title={`${activeReminders.length} active reminder${activeReminders.length > 1 ? 's' : ''} - click to view`}
              >
                <Bell size={12} />
                {activeReminders.length}
              </button>
            )}
          </div>
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
          {/* Reminder Alert Banner */}
          {hasReminders && (
            <button
              type="button"
              onClick={() => setReminderModalOpen(true)}
              className="w-full text-left text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-semibold">
                    {activeReminders.length} Reminder{activeReminders.length > 1 ? 's' : ''} 
                  </span>
                  <span className="text-amber-700"> — Click to view and dismiss before proceeding</span>
                </div>
              </div>
            </button>
          )}
          
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
              {repairTypes.map((type) => {
                const isNewBicycle = type === "New Bicycle";
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded transition-colors ${
                      isNewBicycle
                        ? "bg-amber-50 hover:bg-amber-100 border border-amber-200"
                        : "hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRepairTypes.includes(type)}
                      onChange={() => toggleRepairType(type)}
                      className={`w-4 h-4 ${
                        isNewBicycle
                          ? "text-amber-600 border-amber-300"
                          : "text-sky-600 border-gray-300"
                      } rounded focus:ring-sky-500 flex-shrink-0`}
                    />
                    <span className={`text-sm flex items-center gap-1.5 ${
                      isNewBicycle ? "font-semibold text-amber-900" : ""
                    }`}>
                      {isNewBicycle && (
                        <Star size={14} className="text-amber-600 fill-amber-600" aria-hidden="true" />
                      )}
                      {type}
                      {isNewBicycle && (
                        <span className="inline-flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">
                          NEW
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
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

    {/* Reminder Dismissal Modal */}
    {bicyclePickerGuest && (
      <ReminderDismissalModal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        guestId={bicyclePickerGuest.id}
        guestName={bicyclePickerGuest.name}
      />
    )}
    </>
  );
};

export default BicycleRepairBooking;
