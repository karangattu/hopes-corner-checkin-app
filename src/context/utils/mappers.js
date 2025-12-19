import {
  toTitleCase,
  normalizePreferredName,
  normalizeBicycleDescription,
  normalizeHousingStatus,
  combineDateAndTimeISO,
  fallbackIsoFromDateOnly,
  extractLaundrySlotStart,
  computeIsGuestBanned,
} from "./normalizers";

export const mapShowerStatusToApp = (status) => {
  if (!status) return "awaiting";
  return status === "booked" ? "awaiting" : status;
};

export const mapShowerStatusToDb = (status) => {
  if (!status) return "booked";
  return status === "awaiting" ? "booked" : status;
};

export const mapGuestRow = (row) => ({
  id: row.id,
  guestId: row.external_id,
  firstName: toTitleCase(row.first_name || ""),
  lastName: toTitleCase(row.last_name || ""),
  name: toTitleCase(
    row.full_name || `${row.first_name || ""} ${row.last_name || ""}`,
  ),
  preferredName: normalizePreferredName(row.preferred_name),
  housingStatus: normalizeHousingStatus(row.housing_status),
  age: row.age_group,
  gender: row.gender,
  location: row.location || "Mountain View",
  notes: row.notes || "",
  bicycleDescription: normalizeBicycleDescription(row.bicycle_description),
  bannedAt: row.banned_at,
  bannedUntil: row.banned_until,
  banReason: row.ban_reason || "",
  isBanned: computeIsGuestBanned(row.banned_until),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  docId: row.id,
});

export const mapMealRow = (row) => {
  const recordedAt = row.recorded_at || row.created_at || null;
  const fallbackDate = row.served_on
    ? new Date(`${row.served_on}T12:00:00Z`).toISOString()
    : null;

  return {
    id: row.id,
    guestId: row.guest_id,
    count: row.quantity || 1,
    date: recordedAt || fallbackDate,
    recordedAt,
    servedOn: row.served_on,
    createdAt: row.created_at,
    type: row.meal_type,
  };
};

export const mapShowerRow = (row) => {
  const scheduledTimestamp = combineDateAndTimeISO(
    row.scheduled_for,
    row.scheduled_time,
  );
  const fallbackTimestamp =
    row.updated_at ||
    row.created_at ||
    fallbackIsoFromDateOnly(row.scheduled_for) ||
    new Date().toISOString();
  return {
    id: row.id,
    guestId: row.guest_id,
    time: row.scheduled_time || null,
    scheduledFor: row.scheduled_for || row.created_at || null,
    date: scheduledTimestamp || fallbackTimestamp,
    status: mapShowerStatusToApp(row.status),
    createdAt: row.created_at,
    lastUpdated: row.updated_at,
  };
};

export const mapLaundryRow = (row) => {
  const slotStart = extractLaundrySlotStart(row.slot_label);
  const scheduledTimestamp = combineDateAndTimeISO(
    row.scheduled_for,
    slotStart,
  );
  const fallbackTimestamp =
    row.updated_at ||
    row.created_at ||
    fallbackIsoFromDateOnly(row.scheduled_for) ||
    new Date().toISOString();
  return {
    id: row.id,
    guestId: row.guest_id,
    time: row.slot_label || null,
    laundryType: row.laundry_type,
    bagNumber: row.bag_number || "",
    scheduledFor: row.scheduled_for || row.created_at || null,
    date: scheduledTimestamp || fallbackTimestamp,
    status: row.status,
    createdAt: row.created_at,
    lastUpdated: row.updated_at,
  };
};

export const mapBicycleRow = (row) => ({
  id: row.id,
  guestId: row.guest_id,
  date: row.requested_at,
  type: "bicycle",
  repairType: row.repair_type,
  repairTypes: row.repair_types || (row.repair_type ? [row.repair_type] : []),
  completedRepairs: row.completed_repairs || [],
  notes: row.notes,
  status: row.status,
  priority: row.priority || 0,
  doneAt: row.completed_at,
  lastUpdated: row.updated_at,
});

export const mapHolidayRow = (row) => ({
  id: row.id,
  guestId: row.guest_id,
  date: row.served_at,
  type: "holiday",
});

export const mapHaircutRow = (row) => ({
  id: row.id,
  guestId: row.guest_id,
  date: row.served_at,
  type: "haircut",
});

export const mapItemRow = (row) => ({
  id: row.id,
  guestId: row.guest_id,
  item: row.item_key,
  date: row.distributed_at,
});

export const mapDonationRow = (row) => {
  return {
    id: row.id,
    type: row.donation_type,
    itemName: row.item_name,
    trays: Number(row.trays) || 0,
    weightLbs: Number(row.weight_lbs) || 0,
    servings: Number(row.servings) || 0,
    temperature: row.temperature || null,
    donor: row.donor,
    date: row.donated_at,
    dateKey: row.date_key,
    createdAt: row.created_at,
  };
};

export const mapLaPlazaDonationRow = (row) => {
  return {
    id: row.id,
    category: row.category,
    weightLbs: Number(row.weight_lbs) || 0,
    notes: row.notes || "",
    receivedAt: row.received_at,
    dateKey: row.date_key,
    createdAt: row.created_at,
  };
};

export const mapGuestProxyRow = (row) => ({
  id: row.id,
  guestId: row.guest_id,
  proxyId: row.proxy_id,
  createdAt: row.created_at,
});
