import React, { useState, useRef, useId, useMemo } from "react";
import { Bell, X, AlertCircle, User, Calendar, CheckCircle } from "lucide-react";
import Modal from "../ui/Modal";
import { useRemindersStore } from "../../stores/useRemindersStore";
import toast from "react-hot-toast";

/**
 * ReminderDismissalModal - A blocking modal that displays active reminders for a guest
 * and requires staff to provide their name before dismissing.
 * 
 * This modal is designed to appear when staff attempts to perform a service action
 * (shower, laundry, bicycle) for a guest with active reminders.
 */
const ReminderDismissalModal = ({
  isOpen,
  onClose,
  guestId,
  guestName = "Guest",
  onDismissComplete, // Callback when all reminders are dismissed
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef(null);
  
  const [staffName, setStaffName] = useState("");
  const [dismissingId, setDismissingId] = useState(null);
  const [error, setError] = useState("");

  // Select raw reminders array to avoid infinite loop from selector returning new array
  const reminders = useRemindersStore((state) => state.reminders);
  const activeReminders = useMemo(
    () => (reminders || []).filter((r) => r.guestId === guestId && r.active),
    [reminders, guestId]
  );
  const dismissReminder = useRemindersStore((state) => state.dismissReminder);

  const handleDismiss = async (reminderId) => {
    if (!staffName.trim()) {
      setError("Please enter your name to dismiss this reminder");
      return;
    }

    setError("");
    setDismissingId(reminderId);

    try {
      const success = await dismissReminder(reminderId, staffName.trim());
      if (success) {
        toast.success("Reminder dismissed");
        
        // Check if this was the last reminder
        const remainingReminders = activeReminders.filter((r) => r.id !== reminderId);
        if (remainingReminders.length === 0) {
          onDismissComplete?.();
          onClose();
        }
      } else {
        setError("Failed to dismiss reminder. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Failed to dismiss reminder");
    } finally {
      setDismissingId(null);
    }
  };

  const handleDismissAll = async () => {
    if (!staffName.trim()) {
      setError("Please enter your name to dismiss reminders");
      return;
    }

    setError("");
    setDismissingId("all");

    try {
      const results = await Promise.all(
        activeReminders.map((r) => dismissReminder(r.id, staffName.trim()))
      );
      
      const allSuccess = results.every(Boolean);
      if (allSuccess) {
        toast.success(`${activeReminders.length} reminder${activeReminders.length > 1 ? 's' : ''} dismissed`);
        onDismissComplete?.();
        onClose();
      } else {
        setError("Some reminders could not be dismissed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Failed to dismiss reminders");
    } finally {
      setDismissingId(null);
    }
  };

  if (!isOpen || activeReminders.length === 0) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocusRef={closeButtonRef}
    >
      <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-amber-100 bg-amber-50 p-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                Reminder{activeReminders.length > 1 ? 's' : ''} for {guestName}
              </h2>
              <p className="text-sm text-amber-700">
                Please review and dismiss before proceeding
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-amber-100 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            aria-label="Close reminder dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4" id={descriptionId}>
          {/* Reminders List */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {activeReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="rounded-lg border border-amber-200 bg-amber-50/50 p-3"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap">
                      {reminder.message}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {reminder.createdBy && (
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {reminder.createdBy}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(reminder.createdAt)}
                      </span>
                    </div>
                  </div>
                  {activeReminders.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDismiss(reminder.id)}
                      disabled={dismissingId !== null || !staffName.trim()}
                      className="flex-shrink-0 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {dismissingId === reminder.id ? "..." : "Dismiss"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Staff Name Input */}
          <div>
            <label htmlFor="staff-name" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              id="staff-name"
              type="text"
              value={staffName}
              onChange={(e) => {
                setStaffName(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter your name to dismiss"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              autoComplete="name"
            />
            {error && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} />
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 p-4 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={activeReminders.length === 1 ? () => handleDismiss(activeReminders[0].id) : handleDismissAll}
            disabled={dismissingId !== null || !staffName.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {dismissingId !== null ? (
              <>Dismissing...</>
            ) : (
              <>
                <CheckCircle size={16} />
                Dismiss {activeReminders.length > 1 ? `All (${activeReminders.length})` : 'Reminder'}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReminderDismissalModal;
