import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useAppContext } from "../../context/useAppContext";

/**
 * CompactWaiverIndicator - A small, compact indicator for kanban cards
 * Shows a small warning icon when a waiver is needed, with tooltip on hover
 * 
 * @param {string} guestId - The guest ID to check waiver status for
 * @param {string} serviceType - 'shower', 'laundry', or 'bicycle'
 * @returns {JSX.Element|null}
 */
export const CompactWaiverIndicator = ({ guestId, serviceType }) => {
  const [needsWaiver, setNeedsWaiver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  // Safely get context - may be undefined in tests
  const context = useAppContext() || {};
  const { guestNeedsWaiverReminder, hasActiveWaiver } = context;

  // Determine if this is a bicycle waiver (separate from shower/laundry)
  const isBicycleWaiver = serviceType === "bicycle";

  useEffect(() => {
    const checkWaiver = async () => {
      // If context functions aren't available (e.g., in tests), don't show indicator
      if (!guestNeedsWaiverReminder) {
        setLoading(false);
        setNeedsWaiver(false);
        return;
      }

      setLoading(true);
      try {
        const needsForThisService = await guestNeedsWaiverReminder(guestId, serviceType);
        
        if (!needsForThisService) {
          setNeedsWaiver(false);
          setLoading(false);
          return;
        }
        
        // For bicycle, just check this service (separate waiver)
        if (isBicycleWaiver) {
          setNeedsWaiver(true);
          setLoading(false);
          return;
        }
        
        // Since shower and laundry share a common waiver, check if the OTHER service
        // already has an active (dismissed) waiver this year
        const otherService = serviceType === "shower" ? "laundry" : "shower";
        const hasOtherWaiver = hasActiveWaiver 
          ? await hasActiveWaiver(guestId, otherService)
          : false;
        
        // If the other service has an active waiver, this service doesn't need one
        if (hasOtherWaiver) {
          setNeedsWaiver(false);
        } else {
          setNeedsWaiver(true);
        }
      } catch (error) {
        console.error("[CompactWaiverIndicator] Error checking waiver status:", error);
        setNeedsWaiver(false);
      } finally {
        setLoading(false);
      }
    };

    if (guestId && serviceType) {
      checkWaiver();
    } else {
      setLoading(false);
    }
  }, [guestId, serviceType, guestNeedsWaiverReminder, hasActiveWaiver, isBicycleWaiver]);

  // Don't render anything if loading or no waiver needed
  if (loading || !needsWaiver) {
    return null;
  }

  const tooltipText = serviceType === "bicycle" 
    ? "Bicycle program waiver needed" 
    : "Services waiver needed (covers shower & laundry)";

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <div 
        className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 border border-amber-300 cursor-help"
        aria-label={tooltipText}
        tabIndex={0}
      >
        <AlertTriangle size={11} className="text-amber-600" strokeWidth={2.5} />
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
          <div className="bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {tooltipText}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactWaiverIndicator;
