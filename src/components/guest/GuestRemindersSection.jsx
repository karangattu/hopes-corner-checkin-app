import React, { useState, useCallback, useMemo, memo } from "react";
import { Bell, Plus, Trash2, User, Calendar, X } from "lucide-react";
import { useRemindersStore } from "../../stores/useRemindersStore";
import toast from "react-hot-toast";

/**
 * GuestRemindersSection - Manages reminders for a specific guest
 * Allows staff to add new reminders and view/delete existing ones
 */
const GuestRemindersSection = memo(({ guestId, guestName }) => {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Select raw reminders array to avoid infinite loop from selector returning new array
  const reminders = useRemindersStore((state) => state.reminders);
  const addReminder = useRemindersStore((state) => state.addReminder);
  const deleteReminder = useRemindersStore((state) => state.deleteReminder);

  // Memoize filtered arrays to prevent unnecessary re-renders
  const activeReminders = useMemo(
    () => (reminders || []).filter((r) => r.guestId === guestId && r.active),
    [reminders, guestId]
  );
  const allReminders = useMemo(
    () => (reminders || []).filter((r) => r.guestId === guestId),
    [reminders, guestId]
  );

  const [showDismissed, setShowDismissed] = useState(false);
  const dismissedReminders = useMemo(
    () => allReminders.filter((r) => !r.active),
    [allReminders]
  );

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter a reminder message");
      return;
    }

    setSubmitting(true);
    try {
      await addReminder(guestId, {
        message: message.trim(),
        createdBy: createdBy.trim() || null,
      });
      toast.success("Reminder added");
      setMessage("");
      setCreatedBy("");
      setShowForm(false);
    } catch (error) {
      toast.error(error?.message || "Unable to add reminder");
    } finally {
      setSubmitting(false);
    }
  }, [guestId, message, createdBy, addReminder]);

  const handleDelete = useCallback(async (reminderId) => {
    try {
      const success = await deleteReminder(reminderId);
      if (success) {
        toast.success("Reminder deleted");
      }
    } catch (error) {
      toast.error(error?.message || "Unable to delete reminder");
    }
  }, [deleteReminder]);

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
    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
          <Bell size={16} className="text-amber-600" />
          Reminders {activeReminders.length > 0 && `(${activeReminders.length} active)`}
        </h4>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
          >
            <Plus size={14} />
            Add Reminder
          </button>
        )}
      </div>

      {/* Add reminder form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-3 bg-white rounded-md border border-amber-200 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-amber-900 mb-1 uppercase tracking-wide">
              Reminder Message*
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
              rows={2}
              placeholder="Enter reminder details (e.g., 'Return sleeping bag from last week')..."
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-900 mb-1 uppercase tracking-wide">
              Your Name (optional)
            </label>
            <input
              type="text"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="w-full px-3 py-2 border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
              placeholder="Staff name"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setMessage("");
                setCreatedBy("");
              }}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={submitting || !message.trim()}
            >
              {submitting ? "Saving..." : "Add Reminder"}
            </button>
          </div>
        </form>
      )}

      {/* Display active reminders */}
      {activeReminders.length > 0 ? (
        <div className="space-y-2">
          {activeReminders.map((reminder) => (
            <div
              key={reminder.id}
              className="p-3 rounded-md border bg-amber-50 border-amber-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">{reminder.message}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-amber-700">
                    {reminder.createdBy && (
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {reminder.createdBy}
                      </span>
                    )}
                    {reminder.createdAt && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(reminder.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(reminder.id)}
                  className="p-1.5 rounded text-amber-600 hover:bg-amber-200 hover:text-amber-800 transition-colors"
                  title="Delete reminder"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-amber-700 italic">
          No active reminders for {guestName || "this guest"}.
        </p>
      )}

      {/* Show dismissed reminders toggle */}
      {dismissedReminders.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <button
            type="button"
            onClick={() => setShowDismissed(!showDismissed)}
            className="text-xs text-amber-600 hover:text-amber-800 transition-colors"
          >
            {showDismissed ? "Hide" : "Show"} dismissed reminders ({dismissedReminders.length})
          </button>
          
          {showDismissed && (
            <div className="mt-2 space-y-2">
              {dismissedReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-2 rounded-md border bg-gray-50 border-gray-200 opacity-60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 line-through">{reminder.message}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-gray-500">
                        {reminder.dismissedBy && (
                          <span>Dismissed by {reminder.dismissedBy}</span>
                        )}
                        {reminder.dismissedAt && (
                          <span>on {formatDate(reminder.dismissedAt)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(reminder.id)}
                      className="p-1 rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                      title="Delete reminder permanently"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

GuestRemindersSection.displayName = "GuestRemindersSection";

export default GuestRemindersSection;
