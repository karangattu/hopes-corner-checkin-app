import toast from "react-hot-toast";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  AlertCircle,
} from "lucide-react";
import { bulkOperationManager } from "./bulkOperationContext";

// Enhanced toast with context-specific icons and colors
const createToast = (type, message, options = {}) => {
  // Suppress toasts during bulk operations unless explicitly forced
  if (bulkOperationManager.shouldSuppressToast() && !options.force) {
    return null;
  }
  const config = {
    success: {
      icon: <CheckCircle size={16} className="text-green-500" />,
      style: {
        background: "#f0fdf4", // green-50
        border: "1px solid #bbf7d0", // green-200
        color: "#166534", // green-800
      },
      ariaLabel: "Success notification",
    },
    error: {
      icon: <XCircle size={16} className="text-red-500" />,
      style: {
        background: "#fef2f2", // red-50
        border: "1px solid #fecaca", // red-200
        color: "#991b1b", // red-800
      },
      ariaLabel: "Error notification",
    },
    warning: {
      icon: <AlertTriangle size={16} className="text-amber-500" />,
      style: {
        background: "#fffbeb", // amber-50
        border: "1px solid #fde68a", // amber-200
        color: "#92400e", // amber-800
      },
      ariaLabel: "Warning notification",
    },
    info: {
      icon: <Info size={16} className="text-blue-500" />,
      style: {
        background: "#eff6ff", // blue-50
        border: "1px solid #bfdbfe", // blue-200
        color: "#1e40af", // blue-800
      },
      ariaLabel: "Information notification",
    },
    loading: {
      icon: <AlertCircle size={16} className="text-gray-500 animate-spin" />,
      style: {
        background: "#f9fafb", // gray-50
        border: "1px solid #e5e7eb", // gray-200
        color: "#374151", // gray-700
      },
      ariaLabel: "Loading notification",
    },
  };

  const typeConfig = config[type] || config.info;

  return toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        style={typeConfig.style}
        role="alert"
        aria-label={typeConfig.ariaLabel}
        aria-live="polite"
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">{typeConfig.icon}</div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Dismiss notification"
          >
            <XCircle size={16} />
          </button>
        </div>
      </div>
    ),
    {
      duration: options.duration || 4000,
      position: options.position || "top-right",
      ...options,
    },
  );
};

// Enhanced toast methods with accessibility and context
export const enhancedToast = {
  success: (message, options) => createToast("success", message, options),
  error: (message, options) => createToast("error", message, options),
  warning: (message, options) => createToast("warning", message, options),
  info: (message, options) => createToast("info", message, options),
  loading: (message, options) =>
    createToast("loading", message, { duration: Infinity, ...options }),

  // Quick access methods for common scenarios
  saved: (item = "Changes") =>
    createToast("success", `${item} saved successfully`),
  deleted: (item = "Item") =>
    createToast("success", `${item} deleted successfully`),
  updated: (item = "Item") =>
    createToast("success", `${item} updated successfully`),

  networkError: () =>
    createToast("error", "Network error. Changes saved locally."),
  validationError: (field = "Field") =>
    createToast("warning", `${field} is required`),
  permissionError: () => createToast("error", "Permission denied"),

  // Promise-based toast for async operations
  promise: (promise, messages) => {
    const loadingToast = enhancedToast.loading(
      messages.loading || "Processing...",
    );

    return promise
      .then((result) => {
        toast.dismiss(loadingToast);
        enhancedToast.success(messages.success || "Operation completed");
        return result;
      })
      .catch((error) => {
        toast.dismiss(loadingToast);
        enhancedToast.error(messages.error || "Operation failed");
        throw error;
      });
  },
};

export default enhancedToast;
