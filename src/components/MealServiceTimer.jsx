import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { getMealServiceStatus } from "../utils/mealServiceTime";

/**
 * MealServiceTimer - A subtle indicator showing meal service time remaining
 * 
 * Displays:
 * - During service: Time remaining with a subtle progress indicator
 * - After service: "Meal service ended for today"
 * - No service days (Tue, Thu, Sun): Nothing shown
 * - Before service: Time until service starts
 */
const MealServiceTimer = () => {
  const [status, setStatus] = useState(() => getMealServiceStatus());

  useEffect(() => {
    // Update immediately
    setStatus(getMealServiceStatus());

    // Update every 30 seconds for more responsive updates
    const interval = setInterval(() => {
      setStatus(getMealServiceStatus());
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Don't render anything on non-service days
  if (status.type === "no-service") {
    return null;
  }

  // Calculate progress percentage for visual indicator
  const getProgressWidth = () => {
    if (status.type === "during-service" && status.totalDuration) {
      const progress = (status.elapsed / status.totalDuration) * 100;
      return Math.min(100, Math.max(0, progress));
    }
    return 0;
  };

  const getStatusColor = () => {
    switch (status.type) {
      case "before-service":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "during-service":
        if (status.timeRemaining <= 10) {
          return "text-red-600 bg-red-50 border-red-200"; // Less than 10 min - urgent
        }
        if (status.timeRemaining <= 20) {
          return "text-orange-600 bg-orange-50 border-orange-200"; // Less than 20 min - warning
        }
        return "text-emerald-600 bg-emerald-50 border-emerald-200"; // Plenty of time
      case "ended":
        return "text-gray-500 bg-gray-50 border-gray-200";
      default:
        return "text-gray-500 bg-gray-50 border-gray-200";
    }
  };

  const getProgressBarColor = () => {
    if (status.timeRemaining <= 10) {
      return "bg-red-400";
    }
    if (status.timeRemaining <= 20) {
      return "bg-orange-400";
    }
    return "bg-emerald-400";
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor()} transition-colors duration-300`}
      role="status"
      aria-live="polite"
      aria-label={`Meal service status: ${status.message}`}
    >
      <Clock size={12} className="flex-shrink-0" aria-hidden="true" />
      <span className="whitespace-nowrap">{status.message}</span>
      
      {/* Progress indicator for during-service */}
      {status.type === "during-service" && (
        <div 
          className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden ml-1"
          role="progressbar"
          aria-valuenow={getProgressWidth()}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Service progress: ${Math.round(getProgressWidth())}%`}
        >
          <div
            className={`h-full ${getProgressBarColor()} transition-all duration-500`}
            style={{ width: `${getProgressWidth()}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(MealServiceTimer);