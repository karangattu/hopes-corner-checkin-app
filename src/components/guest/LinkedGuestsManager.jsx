import React, { useState, useMemo } from "react";
import { Users, Link, Unlink, Search, X, Plus, AlertCircle, Utensils, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import haptics from "../../utils/haptics";
import { todayPacificDateString, pacificDateStringFrom } from "../../utils/date";
import { SpringIcon } from "../../utils/animations";

const MAX_LINKED_GUESTS = 3;

/**
 * Component to manage linked guests (proxies) for a specific guest.
 * Allows linking and unlinking guests who pick up meals for each other.
 */
/**
 * @param {Object} props
 * @param {Object} props.guest - The primary guest who is picking up meals
 * @param {Array} props.allGuests - All guests in the system
 * @param {Array} props.linkedGuests - Guests linked to the primary guest
 * @param {Function} props.onLinkGuest - Callback to link a guest
 * @param {Function} props.onUnlinkGuest - Callback to unlink a guest
 * @param {Function} props.onAssignMeals - Callback to assign meals (guestId, count, pickedUpByGuestId)
 * @param {Array} props.mealRecords - All meal records
 * @param {Array} props.actionHistory - Action history for undo
 * @param {Function} props.onUndoAction - Callback to undo an action
 * @param {boolean} props.isLoading - Loading state
 */
const LinkedGuestsManager = ({
  guest,
  allGuests,
  linkedGuests,
  onLinkGuest,
  onUnlinkGuest,
  onAssignMeals,
  mealRecords = [],
  actionHistory = [],
  onUndoAction,
  isLoading = false,
}) => {
  const [showLinkSearch, setShowLinkSearch] = useState(false);
  const [linkSearchTerm, setLinkSearchTerm] = useState("");
  const [linkingGuestId, setLinkingGuestId] = useState(null);
  const [unlinkingGuestId, setUnlinkingGuestId] = useState(null);

  const linkedGuestIds = useMemo(
    () => new Set((linkedGuests || []).map((g) => g.id)),
    [linkedGuests]
  );

  // Filter available guests for linking (not already linked, not self)
  const availableGuestsForLinking = useMemo(() => {
    if (!linkSearchTerm.trim() || linkSearchTerm.length < 2) {
      return [];
    }

    const searchLower = linkSearchTerm.toLowerCase();
    return (allGuests || [])
      .filter((g) => {
        // Exclude self
        if (g.id === guest.id) return false;
        // Exclude already linked guests
        if (linkedGuestIds.has(g.id)) return false;

        // Search by name
        const fullName = (g.name || "").toLowerCase();
        const preferred = (g.preferredName || "").toLowerCase();
        const firstName = (g.firstName || "").toLowerCase();
        const lastName = (g.lastName || "").toLowerCase();

        return (
          fullName.includes(searchLower) ||
          preferred.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower)
        );
      })
      .slice(0, 8); // Limit results
  }, [allGuests, guest.id, linkedGuestIds, linkSearchTerm]);

  const handleLinkGuest = async (proxyGuest) => {
    if (linkedGuests.length >= MAX_LINKED_GUESTS) {
      haptics.warning();
      toast.error(`Maximum ${MAX_LINKED_GUESTS} linked guests allowed`);
      return;
    }

    setLinkingGuestId(proxyGuest.id);
    haptics.buttonPress();

    try {
      await onLinkGuest(guest.id, proxyGuest.id);
      haptics.success();
      toast.success(
        `Linked ${proxyGuest.preferredName || proxyGuest.name} to ${guest.preferredName || guest.name}`
      );
      setLinkSearchTerm("");
      setShowLinkSearch(false);
    } catch (error) {
      haptics.error();
      toast.error(error.message || "Failed to link guests");
    } finally {
      setLinkingGuestId(null);
    }
  };

  const handleUnlinkGuest = async (proxyGuest) => {
    setUnlinkingGuestId(proxyGuest.id);
    haptics.buttonPress();

    try {
      await onUnlinkGuest(guest.id, proxyGuest.id);
      haptics.success();
      toast.success(
        `Unlinked ${proxyGuest.preferredName || proxyGuest.name} from ${guest.preferredName || guest.name}`
      );
    } catch (error) {
      haptics.error();
      toast.error(error.message || "Failed to unlink guests");
    } finally {
      setUnlinkingGuestId(null);
    }
  };

  const canAddMore = linkedGuests.length < MAX_LINKED_GUESTS;

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 rounded-lg">
            <Users size={16} className="text-purple-600" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900">
            Linked Guests
          </h4>
          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border">
            {linkedGuests.length}/{MAX_LINKED_GUESTS}
          </span>
        </div>
        {canAddMore && !showLinkSearch && (
          <button
            onClick={() => setShowLinkSearch(true)}
            className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-1"
            disabled={isLoading}
          >
            <Plus size={14} />
            Link Guest
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 mb-3">
        Link guests who regularly pick up meals together. When you search for one, you'll see their linked guests too.
      </p>

      {/* Linked guests list */}
      {linkedGuests.length > 0 ? (
        <div className="space-y-2 mb-3">
          {linkedGuests.map((linkedGuest) => {
            const today = todayPacificDateString();
            const alreadyHasMeal = mealRecords.some(
              (record) =>
                record.guestId === linkedGuest.id &&
                pacificDateStringFrom(record.date) === today,
            );
            const linkedGuestMealAction = actionHistory.find(
              (action) =>
                action.type === "MEAL_ADDED" &&
                action.data?.guestId === linkedGuest.id &&
                pacificDateStringFrom(new Date(action.timestamp)) === today,
            );

            return (
              <div
                key={linkedGuest.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Link size={14} className="text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {linkedGuest.preferredName || linkedGuest.name}
                    </p>
                    {linkedGuest.preferredName && (
                      <p className="text-xs text-gray-500">
                        ({linkedGuest.name})
                      </p>
                    )}
                  </div>
                  {linkedGuest.isBanned && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      Banned
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {onAssignMeals && !linkedGuest.isBanned && (
                    <div className="flex gap-1">
                      {[1, 2].map((count) => {
                        const isDisabled = alreadyHasMeal;
                          return (
                          <button
                            key={count}
                            // Pass primary guest.id as pickedUpByGuestId to track who picked up the meal
                            onClick={() => onAssignMeals(linkedGuest.id, count, guest.id)}
                            disabled={isDisabled || isLoading}
                            className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1 ${
                              alreadyHasMeal
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                            title={alreadyHasMeal ? "Guest already received meals today" : `Give ${count} meal${count > 1 ? "s" : ""} (picked up by ${guest.preferredName || guest.name})`}
                          >
                            <Utensils size={12} />
                            {count}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {alreadyHasMeal && linkedGuestMealAction && onUndoAction && (
                    <button
                      onClick={async () => {
                        haptics.undo();
                        const success = await onUndoAction(linkedGuestMealAction.id);
                        if (success) {
                          haptics.success();
                          toast.success("Meal undone");
                        } else {
                          haptics.error();
                        }
                      }}
                      disabled={isLoading}
                      className="p-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Undo meal"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleUnlinkGuest(linkedGuest)}
                    disabled={unlinkingGuestId === linkedGuest.id || isLoading}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Unlink ${linkedGuest.preferredName || linkedGuest.name}`}
                  >
                    {unlinkingGuestId === linkedGuest.id ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Unlink size={16} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 bg-white/50 rounded-lg border border-dashed border-purple-200 text-center mb-3">
          <Users size={24} className="text-purple-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No linked guests yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Link guests who pick up meals together
          </p>
        </div>
      )}

      {/* Link search form */}
      {showLinkSearch && (
        <div className="p-3 bg-white rounded-lg border border-purple-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={linkSearchTerm}
              onChange={(e) => setLinkSearchTerm(e.target.value)}
              placeholder="Search guest to link..."
              className="flex-1 px-2 py-1.5 text-sm border-0 focus:ring-0 focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => {
                setShowLinkSearch(false);
                setLinkSearchTerm("");
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search results */}
          {linkSearchTerm.length >= 2 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableGuestsForLinking.length > 0 ? (
                availableGuestsForLinking.map((availableGuest) => (
                  <button
                    key={availableGuest.id}
                    onClick={() => handleLinkGuest(availableGuest)}
                    disabled={linkingGuestId === availableGuest.id || isLoading}
                    className="w-full flex items-center justify-between p-2 text-left text-sm hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {availableGuest.preferredName || availableGuest.name}
                      </p>
                      {availableGuest.preferredName && (
                        <p className="text-xs text-gray-500">
                          ({availableGuest.name})
                        </p>
                      )}
                    </div>
                    {linkingGuestId === availableGuest.id ? (
                      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus size={16} className="text-purple-500" />
                    )}
                  </button>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">
                  No guests found matching "{linkSearchTerm}"
                </p>
              )}
            </div>
          )}

          {linkSearchTerm.length > 0 && linkSearchTerm.length < 2 && (
            <p className="text-xs text-gray-400 text-center py-2">
              Type at least 2 characters to search
            </p>
          )}
        </div>
      )}

      {/* Info when at capacity */}
      {!canAddMore && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>Maximum {MAX_LINKED_GUESTS} linked guests reached. Unlink a guest to add another.</span>
        </div>
      )}
    </div>
  );
};

export default LinkedGuestsManager;