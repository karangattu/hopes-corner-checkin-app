'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface CompactWaiverIndicatorProps {
  guestId: string;
  serviceType: 'shower' | 'laundry' | 'bicycle';
}

/**
 * CompactWaiverIndicator - A small indicator for kanban cards
 * Shows a warning icon when a waiver is needed, with tooltip on hover
 */
export const CompactWaiverIndicator: React.FC<CompactWaiverIndicatorProps> = ({
  guestId,
  serviceType,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // For now, this is a placeholder that doesn't show anything
  // In a full implementation, this would check waiver status via API
  const needsWaiver = false;

  if (!needsWaiver || !guestId) {
    return null;
  }

  const tooltipText =
    serviceType === 'bicycle'
      ? 'Bicycle program waiver needed'
      : 'Services waiver needed (covers shower & laundry)';

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
