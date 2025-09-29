import React from "react";
import { 
  ShowerHead, 
  WashingMachine, 
  Gift, 
  Plus,
  X 
} from "lucide-react";

const StickyQuickActions = ({ 
  isVisible = true,
  onShowerClick,
  onLaundryClick, 
  onDonationClick,
  onClose,
  className = ""
}) => {
  if (!isVisible) return null;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden ${className}`}
      role="toolbar" 
      aria-label="Quick actions"
    >
      {/* Gradient overlay for visual separation */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
      
      <div className="flex items-center justify-between px-4 py-3 pb-safe">
        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium text-gray-700 mr-2">
            Quick Add:
          </span>
          
          {/* Shower Button */}
          <button
            onClick={onShowerClick}
            className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-800 rounded-lg text-sm font-medium transition-colors touch-manipulation"
            aria-label="Add shower booking"
          >
            <ShowerHead size={16} />
            <span className="hidden xs:inline">Shower</span>
          </button>
          
          {/* Laundry Button */}
          <button
            onClick={onLaundryClick}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 rounded-lg text-sm font-medium transition-colors touch-manipulation"
            aria-label="Add laundry booking"
          >
            <WashingMachine size={16} />
            <span className="hidden xs:inline">Laundry</span>
          </button>
          
          {/* Donation Button */}
          <button
            onClick={onDonationClick}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 rounded-lg text-sm font-medium transition-colors touch-manipulation"
            aria-label="Add donation"
          >
            <Gift size={16} />
            <span className="hidden xs:inline">Donate</span>
          </button>
        </div>
        
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 active:text-gray-900 touch-manipulation"
            aria-label="Close quick actions"
          >
            <X size={18} />
          </button>
        )}
      </div>
      
      {/* Safe area padding for devices with home indicators */}
      <div className="pb-safe"></div>
    </div>
  );
};

export default StickyQuickActions;