import { useState, useEffect, useCallback } from "react";
import { shouldCelebrate } from "../utils/milestones";

/**
 * Hook to manage milestone celebrations
 * @param {string} serviceType - Type of service to track
 * @param {number} count - Current count
 * @returns {object} Celebration state and handlers
 */
export function useMilestoneCelebration(serviceType, count) {
  const [celebration, setCelebration] = useState(null);

  useEffect(() => {
    const celebrationConfig = shouldCelebrate(serviceType, count);
    if (celebrationConfig) {
      setCelebration(celebrationConfig);
    }
  }, [serviceType, count]);

  const closeCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  return {
    celebration,
    closeCelebration,
  };
}
