import { pacificDateStringFrom } from "../../utils/date";
import { HOUSING_STATUSES } from "../constants";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const toTitleCase = (str) => {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
};

export const normalizePreferredName = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.trim();
};

export const normalizeBicycleDescription = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.trim();
};

export const normalizeHousingStatus = (value) => {
  const v = (value || "").toString().trim().toLowerCase();
  if (!v) return "Unhoused";
  if (HOUSING_STATUSES.map((s) => s.toLowerCase()).includes(v)) {
    return HOUSING_STATUSES.find((s) => s.toLowerCase() === v) || "Unhoused";
  }
  if (/(temp|temporary).*(shelter)/.test(v) || /shelter(ed)?/.test(v))
    return "Temp. shelter";
  if (/(rv|vehicle|car|van|truck)/.test(v)) return "RV or vehicle";
  if (/house(d)?|apartment|home/.test(v)) return "Housed";
  if (/unhouse(d)?|unshelter(ed)?|street|tent/.test(v)) return "Unhoused";
  return "Unhoused";
};

export const normalizeTimeComponent = (value) => {
  if (value == null) return null;
  const [rawHours, rawMinutes] = value.toString().trim().split(":");
  if (rawHours == null || rawMinutes == null) return null;
  const hours = Number.parseInt(rawHours, 10);
  const minutes = Number.parseInt(rawMinutes, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

export const combineDateAndTimeISO = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const normalizedTime = normalizeTimeComponent(timeStr);
  if (!normalizedTime) return null;
  const candidate = new Date(`${dateStr}T${normalizedTime}:00`);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate.toISOString();
};

export const fallbackIsoFromDateOnly = (dateStr) => {
  if (!dateStr) return null;
  const candidate = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate.toISOString();
};

export const createLocalId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export const extractLaundrySlotStart = (slotLabel) => {
  if (!slotLabel) return null;
  const [start] = slotLabel.split("-");
  return normalizeTimeComponent(start);
};

export const computeIsGuestBanned = (bannedUntil) => {
  if (!bannedUntil) return false;
  const parsed = new Date(bannedUntil);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return parsed.getTime() > Date.now();
};

export const normalizeDateInputToISO = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (DATE_ONLY_REGEX.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    if ([year, month, day].some(Number.isNaN)) return null;
    const isoDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (Number.isNaN(isoDate.getTime())) return null;
    return isoDate.toISOString();
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export const resolveDonationDateParts = (value, fallback = null) => {
  const normalized =
    normalizeDateInputToISO(value) ??
    (fallback ? normalizeDateInputToISO(fallback) : null);
  if (!normalized) {
    return { timestamp: null, dateKey: null };
  }
  const dateObj = new Date(normalized);
  if (Number.isNaN(dateObj.getTime())) {
    return { timestamp: normalized, dateKey: null };
  }
  return {
    timestamp: normalized,
    dateKey: pacificDateStringFrom(dateObj),
  };
};

export const ensureDonationRecordShape = (record = {}) => {
  const base = record || {};
  const rawDate =
    base.date ??
    base.donated_at ??
    base.donatedAt ??
    base.createdAt ??
    base.created_at ??
    null;
  const { timestamp, dateKey } = resolveDonationDateParts(rawDate);
  return {
    ...base,
    trays: Number(base.trays) || 0,
    weightLbs: Number(base.weightLbs) || 0,
    date: timestamp ?? base.date ?? null,
    dateKey: dateKey ?? base.dateKey ?? null,
  };
};
