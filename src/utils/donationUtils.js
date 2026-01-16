export const DENSITY_SERVINGS = {
  light: 10,
  medium: 20,
  high: 30,
};

export const MINIMAL_TYPES = new Set(["School Lunch", "Pastries", "Deli Foods"]);

export const calculateServings = (type, weightLbs, trays = 0, density = "medium") => {
  const parsedTrays = Number(trays) || 0;
  if (parsedTrays > 0) {
    const size = density || "medium";
    const perTray = DENSITY_SERVINGS[size] || DENSITY_SERVINGS.medium;
    return parsedTrays * perTray;
  }

  const weight = Number(weightLbs) || 0;
  if (type === "Carbs") {
    return weight * 4;
  } else if (type === "Protein" || type === "Veggie Protein") {
    return weight * 5;
  }
  return weight;
};

export const deriveDonationDateKey = (record, DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/) => {
  if (!record) return null;
  if (record.dateKey) return record.dateKey;
  const candidates = [
    record.date,
    record.donatedAt,
    record.donated_at,
    record.createdAt,
    record.created_at,
  ];
  for (const value of candidates) {
    if (!value) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (DATE_ONLY_REGEX.test(trimmed)) {
        return trimmed;
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        return formatter.format(parsed);
      }
    } else if (value instanceof Date) {
      if (!Number.isNaN(value.getTime())) {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        return formatter.format(value);
      }
    } else {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        const formatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        return formatter.format(parsed);
      }
    }
  }
  return null;
};
