import React from "react";
import { X, AlertTriangle } from "lucide-react";

const DeleteConfirmationModal = ({
  isOpen,
  guest,
  onConfirm,
  onCancel,
  mealCount = 0,
  showerCount = 0,
  laundryCount = 0,
}) => {
  if (!isOpen || !guest) return null;

  const totalRecords = mealCount + showerCount + laundryCount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="text-red-500" size={48} />
          </div>

          <h3 className="text-xl font-semibold text-center mb-4">
            Delete Guest Profile?
          </h3>

          <div className="space-y-3 mb-6">
            <p className="text-gray-700">
              This will permanently delete{" "}
              <strong>
                {guest.firstName} {guest.lastName}
              </strong>
              {totalRecords > 0 && " and all associated records:"}
            </p>

            {totalRecords > 0 && (
              <ul className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                {mealCount > 0 && (
                  <li className="text-gray-700">
                    • {mealCount} meal record{mealCount !== 1 ? "s" : ""}
                  </li>
                )}
                {showerCount > 0 && (
                  <li className="text-gray-700">
                    • {showerCount} shower booking{showerCount !== 1 ? "s" : ""}
                  </li>
                )}
                {laundryCount > 0 && (
                  <li className="text-gray-700">
                    • {laundryCount} laundry record
                    {laundryCount !== 1 ? "s" : ""}
                  </li>
                )}
              </ul>
            )}

            <p className="text-red-600 font-semibold text-center mt-4">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
