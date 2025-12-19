import React from "react";
import { Link, User, ChevronRight } from "lucide-react";

/**
 * Shows linked guests as a compact badge/section when viewing a guest.
 * Clicking on a linked guest allows quick selection for meal assignment.
 */
const LinkedGuestsBadge = ({
  linkedGuests,
  onSelectGuest,
  compact = false,
}) => {
  if (!linkedGuests || linkedGuests.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
        <Link size={12} />
        <span>{linkedGuests.length} linked</span>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
      <div className="flex items-center gap-2 mb-2">
        <Link size={14} className="text-purple-500" />
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
          Linked Guests ({linkedGuests.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {linkedGuests.map((linkedGuest) => (
          <button
            key={linkedGuest.id}
            onClick={() => onSelectGuest?.(linkedGuest)}
            className="group flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-sm transition-all text-sm"
            title={`Select ${linkedGuest.preferredName || linkedGuest.name} for meal`}
          >
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
              <User size={12} className="text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors">
                {linkedGuest.preferredName || linkedGuest.name}
              </p>
              {linkedGuest.preferredName && (
                <p className="text-xs text-gray-500">
                  {linkedGuest.name}
                </p>
              )}
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-purple-400 transition-colors" />
          </button>
        ))}
      </div>
      <p className="text-xs text-purple-600 mt-2">
        Click a linked guest to quickly assign meals
      </p>
    </div>
  );
};

export default LinkedGuestsBadge;
