import React from "react";
import { X } from "lucide-react";
import Modal from "./ui/Modal";
import { WaiverBadge } from "./ui/WaiverBadge";

/**
 * ShowerDetailModal - Displays detailed shower information for a guest in a modal
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {Object} showerRecord - The shower record to display
 * @param {Object} guest - The guest object
 * @param {ReactNode} children - The detailed shower card content to display
 */
const ShowerDetailModal = ({ isOpen, onClose, showerRecord, guest, children }) => {
  if (!showerRecord || !guest) {
    return null;
  }

  const guestName = guest.preferredName || guest.name || `${guest.firstName || ""} ${guest.lastName || ""}`.trim();
  const isCompleted = showerRecord.status === "done" || showerRecord.status === "cancelled" || showerRecord.status === "no_show";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="shower-detail-title"
      describedBy="shower-detail-content"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-white px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="shower-detail-title" className="text-xl font-semibold text-gray-900">
              Shower Details - {guestName}
            </h2>
            {/* Show waiver badge for non-completed showers */}
            {!isCompleted && (
              <WaiverBadge guestId={showerRecord.guestId} serviceType="shower" />
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div id="shower-detail-content" className="p-6">
        {children}
      </div>
    </Modal>
  );
};

export default ShowerDetailModal;
