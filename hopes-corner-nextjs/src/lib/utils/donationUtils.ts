
export const DENSITY_SERVINGS = {
    light: 10,
    medium: 20,
    high: 30,
};

export const MINIMAL_TYPES = new Set(["School Lunch", "Pastries", "Deli Foods"]);

export const calculateServings = (type: string, weightLbs: any, trays: any = 0, density: any = "medium") => {
    const parsedTrays = Number(trays) || 0;
    if (parsedTrays > 0) {
        const size = density || "medium";
        const perTray = (DENSITY_SERVINGS as any)[size] || DENSITY_SERVINGS.medium;
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

export const deriveDonationDateKey = (record: any, DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/) => {
    if (!record) return null;
    if (record.dateKey) return record.dateKey;

    // Try to use date property if it matches YYYY-MM-DD
    if (typeof record.date === 'string' && DATE_ONLY_REGEX.test(record.date)) {
        return record.date;
    }

    const candidates = [
        record.date,
        record.donatedAt,
        record.donated_at,
        record.createdAt,
        record.created_at,
        record.receivedAt,
        record.received_at
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
            // timestamp?
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

export const formatProteinAndCarbsClipboardText = (consolidatedActivity: any[] = []) => {
    const types = ["Protein", "Veggie Protein", "Carbs"];
    const grouped: Record<string, any[]> = {};
    for (const t of types) grouped[t] = [];

    for (const item of consolidatedActivity || []) {
        if (types.includes(item.type)) {
            grouped[item.type].push(item);
        }
    }

    // Sort by servings desc then item name
    for (const t of types) {
        grouped[t].sort((a, b) => (b.servings || 0) - (a.servings || 0) || a.itemName.localeCompare(b.itemName));
    }

    const lines = [];
    lines.push("Donations\n");
    for (const t of types) {
        lines.push(t);
        if (grouped[t].length === 0) {
            lines.push("None");
        } else {
            for (const entry of grouped[t]) {
                const trays = Number(entry.trays || 0);
                const servings = Number(entry.servings || 0);
                const traysText = `${trays} ${trays === 1 ? "tray" : "trays"}`;
                const servingsText = `${servings} ${servings === 1 ? "serving" : "servings"}`;
                lines.push(`${entry.itemName}: ${traysText}, ${servingsText}`);
            }
        }
        lines.push("\n");
    }
    return lines.join("\n");
};
