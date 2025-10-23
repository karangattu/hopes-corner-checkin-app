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
