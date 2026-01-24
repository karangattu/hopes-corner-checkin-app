import React, { useState, useMemo, memo } from "react";
import { Bell } from "lucide-react";
import { useRemindersStore } from "../../stores/useRemindersStore";
import ReminderDismissalModal from "./ReminderDismissalModal";

/**
 * ReminderBadge - A compact indicator that shows when a guest has active reminders.
 * Clicking the badge opens the ReminderDismissalModal.
 * 
 * Props:
 * - guestId: UUID of the guest
 * - guestName: Display name (used in modal)
 * - onDismissComplete: Optional callback when all reminders are dismissed
 * - size: "sm" | "md" (default: "sm")
 * - showCount: Whether to show the reminder count (default: true)
 */
const ReminderBadge = memo(({
  guestId,
  guestName = "Guest",
  onDismissComplete,
  size = "sm",
  showCount = true,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  
  // Select raw reminders array to avoid infinite loop from selector returning new array
  const reminders = useRemindersStore((state) => state.reminders);
  const activeReminders = useMemo(
    () => (reminders || []).filter((r) => r.guestId === guestId && r.active),
    [reminders, guestId]
  );
  const reminderCount = activeReminders.length;

  if (reminderCount === 0) return null;

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-0.5",
    md: "px-2 py-1 text-xs gap-1",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
  };

  const handleClick = (e) => {
    e.stopPropagation();
    setModalOpen(true);
  };

  const handleDismissComplete = () => {
    onDismissComplete?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center font-bold uppercase tracking-wide rounded-md bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 hover:border-amber-300 transition-colors cursor-pointer ${sizeClasses[size]}`}
        title={`${reminderCount} active reminder${reminderCount > 1 ? 's' : ''} - click to view`}
        aria-label={`View ${reminderCount} reminder${reminderCount > 1 ? 's' : ''} for ${guestName}`}
      >
        <Bell size={iconSizes[size]} className="flex-shrink-0" />
        {showCount && reminderCount > 0 && (
          <span>{reminderCount}</span>
        )}
        <span className="sr-only">
          {reminderCount} active reminder{reminderCount > 1 ? 's' : ''}
        </span>
      </button>

      <ReminderDismissalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        guestId={guestId}
        guestName={guestName}
        onDismissComplete={handleDismissComplete}
      />
    </>
  );
});

ReminderBadge.displayName = "ReminderBadge";

export default ReminderBadge;

/**
 * CompactReminderIndicator - Even smaller indicator for list views
 * Shows just the bell icon with no count, for use in dense lists
 */
export const CompactReminderIndicator = memo(({ guestId, guestName = "Guest", onDismissComplete }) => {
  const [modalOpen, setModalOpen] = useState(false);
  
  const hasReminders = useRemindersStore((state) => state.hasActiveReminders(guestId));

  if (!hasReminders) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    setModalOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="text-amber-600 hover:text-amber-700 transition-colors p-0.5 rounded hover:bg-amber-100"
        title="Guest has active reminders - click to view"
        aria-label={`View reminders for ${guestName}`}
      >
        <Bell size={14} className="fill-amber-200" />
      </button>

      <ReminderDismissalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        guestId={guestId}
        guestName={guestName}
        onDismissComplete={onDismissComplete}
      />
    </>
  );
});

CompactReminderIndicator.displayName = "CompactReminderIndicator";
