import toast from "react-hot-toast";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  AlertCircle,
} from "lucide-react";
import { bulkOperationManager } from "./bulkOperationContext";

// Toast configuration for different types
const toastConfig = {
  success: {
    icon: <CheckCircle size={16} className="text-green-500" />,
    style: {
      background: "#f0fdf4", // green-50
      border: "1px solid #bbf7d0", // green-200
      color: "#166534", // green-800
    },
    ariaLabel: "Success notification",
    defaultDuration: 3000,
  },
  error: {
    icon: <XCircle size={16} className="text-red-500" />,
    style: {
      background: "#fef2f2", // red-50
      border: "1px solid #fecaca", // red-200
      color: "#991b1b", // red-800
    },
    ariaLabel: "Error notification",
    defaultDuration: 4000,
  },
  warning: {
    icon: <AlertTriangle size={16} className="text-amber-500" />,
    style: {
      background: "#fffbeb", // amber-50
      border: "1px solid #fde68a", // amber-200
      color: "#92400e", // amber-800
    },
    ariaLabel: "Warning notification",
    defaultDuration: 3500,
  },
  info: {
    icon: <Info size={16} className="text-blue-500" />,
    style: {
      background: "#eff6ff", // blue-50
      border: "1px solid #bfdbfe", // blue-200
      color: "#1e40af", // blue-800
    },
    ariaLabel: "Information notification",
    defaultDuration: 3000,
  },
  loading: {
    icon: <AlertCircle size={16} className="text-gray-500 animate-spin" />,
    style: {
      background: "#f9fafb", // gray-50
      border: "1px solid #e5e7eb", // gray-200
      color: "#374151", // gray-700
    },
    ariaLabel: "Loading notification",
    defaultDuration: Infinity,
  },
};

// Enhanced toast with context-specific icons and colors
// Uses standard toast methods for reliable auto-dismiss behavior
const createToast = (type, message, options = {}) => {
  // Suppress toasts during bulk operations unless explicitly forced
  if (bulkOperationManager.shouldSuppressToast() && !options.force) {
    return null;
  }
  
  const typeConfig = toastConfig[type] || toastConfig.info;
  const duration = options.duration ?? typeConfig.defaultDuration;
  
  // Use native toast methods for reliable auto-dismiss
  // These integrate better with react-hot-toast's internal timing
  const toastOptions = {
    duration,
    position: options.position || "top-center",
    style: typeConfig.style,
    icon: typeConfig.icon,
    ariaProps: {
      role: "status",
      "aria-live": "polite",
    },
    ...options,
  };
  
  // Map to appropriate toast method for better lifecycle handling
  switch (type) {
    case "success":
      return toast.success(message, toastOptions);
    case "error":
      return toast.error(message, toastOptions);
    case "loading":
      return toast.loading(message, toastOptions);
    default:
      // For warning/info, use toast() with custom styling
      return toast(message, toastOptions);
  }
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