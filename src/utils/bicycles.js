import { BICYCLE_REPAIR_STATUS } from "../context/constants";

export const isBicycleStatusCountable = (status) => {
  const normalized = (status || "").toString().toLowerCase().trim();
  if (!normalized) return true;

  const allowed = new Set([
    BICYCLE_REPAIR_STATUS.DONE,
    BICYCLE_REPAIR_STATUS.PENDING,
    BICYCLE_REPAIR_STATUS.IN_PROGRESS,
    "completed",
    "ready",
    "finished",
  ]);

  return allowed.has(normalized);
};

export const getBicycleServiceCount = (record) => {
  if (!record) return 0;
  const rawTypes = Array.isArray(record.repairTypes)
    ? record.repairTypes.filter((type) => {
        if (type == null) return false;
        const label = String(type).trim();
        return label.length > 0;
      })
    : [];
  if (rawTypes.length > 0) {
    return rawTypes.length;
  }
  return record.repairType ? 1 : 0;
};
