import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import toast from "react-hot-toast";

/**
 * SectionRefreshButton - A compact refresh button for specific service sections
 * Allows users to quickly refresh laundry or shower data without refreshing the entire page
 * 
 * @param {string} serviceType - "shower" or "laundry"
 * @param {string} [size="sm"] - Button size: "sm" (default), "md", "lg"
 * @param {string} [variant="ghost"] - Button style: "ghost", "outline", "solid"
 * @param {boolean} [showLabel=false] - Whether to show "Refresh" text
 * @param {Function} [onRefreshComplete] - Optional callback after refresh completes
 */
const SectionRefreshButton = ({
  serviceType,
  size = "sm",
  variant = "ghost",
  showLabel = false,
  onRefreshComplete,
}) => {
  const { refreshServiceSlots, supabaseEnabled } = useAppContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    if (!navigator.onLine) {
      toast.error("Cannot refresh while offline");
      return;
    }

    if (!supabaseEnabled) {
      toast.error("Cloud sync is disabled");
      return;
    }

    setIsRefreshing(true);

    try {
      const success = await refreshServiceSlots(serviceType);
      
      if (success) {
        const label = serviceType === "shower" ? "Showers" : "Laundry";
        toast.success(`${label} refreshed`);
        
        if (onRefreshComplete) {
          onRefreshComplete();
        }
      } else {
        toast.error("Failed to refresh data");
      }
    } catch (error) {
      console.error(`Error refreshing ${serviceType}:`, error);
      toast.error("Failed to refresh data");
    } finally {
      // Add a small delay to show the animation completing
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  }, [isRefreshing, supabaseEnabled, refreshServiceSlots, serviceType, onRefreshComplete]);

  const isDisabled = !navigator.onLine || !supabaseEnabled || isRefreshing;

  // Size classes
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  // Variant classes
  const variantClasses = {
    ghost: `text-gray-500 hover:text-gray-700 hover:bg-gray-100 ${
      isDisabled ? "text-gray-300 cursor-not-allowed hover:bg-transparent" : ""
    }`,
    outline: `border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 ${
      isDisabled ? "text-gray-300 border-gray-100 cursor-not-allowed hover:bg-transparent hover:border-gray-100" : ""
    }`,
    solid: `bg-gray-100 text-gray-600 hover:bg-gray-200 ${
      isDisabled ? "bg-gray-50 text-gray-300 cursor-not-allowed hover:bg-gray-50" : ""
    }`,
  };

  const serviceLabel = serviceType === "shower" ? "showers" : "laundry";

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isDisabled}
      aria-label={`Refresh ${serviceLabel}`}
      title={`Refresh ${serviceLabel} data`}
      className={`
        inline-flex items-center justify-center gap-1.5 rounded-lg
        transition-all duration-200
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
        ${sizeClasses[size]}
        ${variantClasses[variant]}
      `}
    >
      <RefreshCw
        size={iconSizes[size]}
        className={`transition-transform duration-300 ${
          isRefreshing ? "animate-spin" : ""
        }`}
      />
      {showLabel && (
        <span className={`text-xs font-medium ${size === "sm" ? "sr-only sm:not-sr-only" : ""}`}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </span>
      )}
    </button>
  );
};

export default SectionRefreshButton;
