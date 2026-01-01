import toast from "react-hot-toast";
import { bulkOperationManager } from "./bulkOperationContext";

// Default durations for different toast types (in milliseconds)
const DURATIONS = {
  success: 2000,
  error: 4000,
  warning: 3000,
  info: 2500,
  loading: Infinity,
};

// Enhanced toast with reliable auto-dismiss behavior
// Uses native react-hot-toast methods without custom overrides for proper lifecycle
const createToast = (type, message, options = {}) => {
  // Suppress toasts during bulk operations unless explicitly forced
  if (bulkOperationManager.shouldSuppressToast() && !options.force) {
    return null;
  }
  
  const duration = options.duration ?? DURATIONS[type] ?? 2500;
  
  // Use minimal options to ensure proper toast lifecycle handling
  // Avoid overriding icons/styles which can interfere with auto-dismiss
  const toastOptions = {
    duration,
    id: options.id, // Allow custom IDs to prevent duplicates
  };
  
  // Map to appropriate toast method for proper lifecycle handling
  switch (type) {
    case "success":
      return toast.success(message, toastOptions);
    case "error":
      return toast.error(message, toastOptions);
    case "loading":
      return toast.loading(message, { ...toastOptions, duration: Infinity });
    case "warning":
      // Warning uses custom styling but still with proper duration
      return toast(message, {
        ...toastOptions,
        icon: " ",
        style: {
          background: "#fffbeb",
          border: "1px solid #fde68a",
          color: "#92400e",
        },
      });
    case "info":
      // Info uses custom styling but still with proper duration
      return toast(message, {
        ...toastOptions,
        icon: "9",
        style: {
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          color: "#1e40af",
        },
      });
    default:
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