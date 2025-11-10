import React, { useState, useEffect } from "react";
import { AlertTriangle, X, Check } from "lucide-react";
import { useAppContext } from "../../context/useAppContext";
import toast from "react-hot-toast";

/**
 * WaiverBadge - Displays a badge for guests needing waiver acknowledgment
 * Shows for guests who have used shower/laundry services but haven't signed waivers
 * Staff dismisses the badge after confirming external waiver is signed (paper/separate app)
 * Waiver is required once per year (Jan 1 - Dec 31)
 *
 * @param {string} guestId - The guest ID
 * @param {string} serviceType - 'shower' or 'laundry'
 * @param {Function} onDismissed - Callback when waiver is dismissed
 * @returns {JSX.Element|null}
 */
export const WaiverBadge = ({ guestId, serviceType, onDismissed }) => {
  const [needsWaiver, setNeedsWaiver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const { guestNeedsWaiverReminder, dismissWaiver } = useAppContext();

  // Check if guest needs waiver on mount and when guestId/serviceType changes
  useEffect(() => {
    const checkWaiver = async () => {
      setLoading(true);
      console.log('[WaiverBadge] Checking waiver for guest:', guestId, 'service:', serviceType);
      try {
        const result = await guestNeedsWaiverReminder(guestId, serviceType);
        console.log('[WaiverBadge] Result:', result, 'for guest:', guestId, 'service:', serviceType);
        setNeedsWaiver(result);
      } catch (error) {
        console.error("[WaiverBadge] Error checking waiver status:", error);
        setNeedsWaiver(false);
      } finally {
        setLoading(false);
      }
    };

    if (guestId && serviceType) {
      checkWaiver();
    } else {
      console.warn('[WaiverBadge] Missing guestId or serviceType:', { guestId, serviceType });
    }
  }, [guestId, serviceType, guestNeedsWaiverReminder]);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      // Staff confirms they've seen/verified the external waiver is signed
      const success = await dismissWaiver(guestId, serviceType, "signed_by_staff");
      if (success) {
        setNeedsWaiver(false);
        setShowModal(false);
        toast.success(`${serviceType === "shower" ? "Shower" : "Laundry"} waiver confirmed for this year`);
        onDismissed?.();
      }
    } catch (error) {
      console.error("Error dismissing waiver:", error);
      toast.error("Failed to confirm waiver");
    } finally {
      setDismissing(false);
    }
  };

  if (loading || !needsWaiver) {
    if (loading) {
      console.log('[WaiverBadge] Still loading for guest:', guestId);
    } else if (!needsWaiver) {
      console.log('[WaiverBadge] No waiver needed for guest:', guestId, 'service:', serviceType);
    }
    return null;
  }

  console.log('[WaiverBadge] RENDERING BADGE for guest:', guestId, 'service:', serviceType);
  const serviceName = serviceType === "shower" ? "Shower" : "Laundry";
  return (
    <>
      {/* Badge */}
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-full hover:bg-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
        title={`${serviceName} waiver required`}
      >
        <AlertTriangle size={14} className="flex-shrink-0" />
        <span className="hidden sm:inline">Waiver needed</span>
        <span className="sm:hidden">⚠️</span>
      </button>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative max-w-md w-full bg-white rounded-lg shadow-xl">
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Content */}
            <div className="p-6 pt-8">
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 pt-0.5">
                  <AlertTriangle
                    size={24}
                    className="text-amber-600"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {serviceName} Waiver
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Confirm waiver is signed for this year
                  </p>
                </div>
              </div>

              {/* Waiver info box */}
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                <p className="text-sm text-gray-700 leading-relaxed">
                  This guest has used {serviceName.toLowerCase()} services. Please confirm you have verified their signed waiver (paper or external system) before dismissing this reminder.
                </p>
                <p className="text-xs text-gray-600 mt-3">
                  This waiver requirement will reset on January 1st of next year.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={dismissing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDismiss}
                  disabled={dismissing}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {dismissing ? "Confirming..." : (
                    <>
                      <Check size={16} />
                      Confirmed
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WaiverBadge;
