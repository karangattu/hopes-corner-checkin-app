/**
 * Bicycle utility functions
 */

import { BICYCLE_REPAIR_STATUS } from '../constants';

/**
 * Checks if a bicycle repair status should be counted in statistics
 */
export const isBicycleStatusCountable = (status: string | null | undefined): boolean => {
  const normalized = (status || '').toString().toLowerCase().trim();
  if (!normalized) return true;

  const allowed = new Set([
    BICYCLE_REPAIR_STATUS.DONE,
    BICYCLE_REPAIR_STATUS.PENDING,
    BICYCLE_REPAIR_STATUS.IN_PROGRESS,
    'completed',
    'ready',
    'finished',
  ]);

  return allowed.has(normalized);
};

interface BicycleRecord {
  repairTypes?: (string | null | undefined)[];
  [key: string]: unknown;
}

/**
 * Gets the count of bicycle services from a repair record
 */
export const getBicycleServiceCount = (record: BicycleRecord | null | undefined): number => {
  if (!record) return 0;
  
  const rawTypes = Array.isArray(record.repairTypes)
    ? record.repairTypes.filter((type): type is string => {
        if (type == null) return false;
        const label = String(type).trim();
        return label.length > 0;
      })
    : [];
    
  if (rawTypes.length > 0) {
    return rawTypes.length;
  }
  
  return 1; // Default to 1 if no repair types specified
};
