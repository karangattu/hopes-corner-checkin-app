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

/**
 * DATA INTEGRITY: Validate that a guest row has all required fields
 * Logs a warning if critical data is missing to help detect corruption
 * @param {object} row - Database row from guests table
 * @returns {object} Validation result with isValid flag and issues array
 */
export const validateGuestRow = (row) => {
  const issues = [];

  if (!row) {
    return { isValid: false, issues: ['Row is null or undefined'] };
  }

  if (!row.id) {
    issues.push('Missing id (primary key)');
  }

  if (!row.external_id) {
    issues.push('Missing external_id (guest ID)');
  }

  // Critical: first_name is required
  if (!row.first_name || !row.first_name.trim()) {
    issues.push(`Missing or empty first_name (id: ${row.id}, external_id: ${row.external_id})`);
  }

  // Critical: full_name is required
  if (!row.full_name || !row.full_name.trim()) {
    issues.push(`Missing or empty full_name (id: ${row.id}, external_id: ${row.external_id})`);
  }

  // last_name can technically be empty but should be logged
  if (!row.last_name || !row.last_name.trim()) {
    issues.push(`Missing or empty last_name (id: ${row.id}, external_id: ${row.external_id})`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

/**
 * Maps a database guest row to the application's guest object format.
 * CRITICAL: This function now validates required fields and logs warnings
 * for potential data corruption issues (guests becoming "Unknown Guest").
 * 
 * @param {object} row - Database row from guests table
 * @returns {object} Mapped guest object
 */
export const mapGuestRow = (row) => {
  // DATA INTEGRITY CHECK: Validate critical fields
  const validation = validateGuestRow(row);
  if (!validation.isValid) {
    console.error(
      '[DATA INTEGRITY WARNING] Guest row has missing/empty critical fields:',
      validation.issues,
      '\nRow data:', JSON.stringify(row, null, 2)
    );
    // Track this for potential alerting/monitoring
    if (typeof window !== 'undefined' && window.__guestDataIntegrityIssues) {
      window.__guestDataIntegrityIssues.push({
        timestamp: new Date().toISOString(),
        guestId: row?.id,
        externalId: row?.external_id,
        issues: validation.issues,
      });
    }
  }

  const firstNameFromRow = toTitleCase(row.first_name || "");
  const lastNameFromRow = toTitleCase(row.last_name || "");
  const fullName = toTitleCase(
    row.full_name || `${row.first_name || ""} ${row.last_name || ""}`,
  );

  let firstName = firstNameFromRow;
  let lastName = lastNameFromRow;
  if (!firstName || !lastName) {
    const fallbackParts = fullName.trim().split(/\s+/).filter(Boolean);
    if (!firstName && fallbackParts.length > 0) {
      firstName = fallbackParts[0];
    }
    if (!lastName && fallbackParts.length > 1) {
      lastName = fallbackParts.slice(1).join(" ");
    }
  }

  // Additional safety check: if all name fields are empty, this is a critical issue
  if (!firstName && !lastName && !fullName) {
    console.error(
      '[CRITICAL DATA INTEGRITY] Guest has completely empty name fields! This guest will appear as "Unknown Guest".',
      'id:', row?.id, 'external_id:', row?.external_id,
      '\nFull row:', JSON.stringify(row, null, 2)
    );
  }

  return {
    id: row.id,
    guestId: row.external_id,
    firstName,
    lastName,
    name: fullName,
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
    // Program-specific bans - if all are false/null but isBanned is true, it's a blanket ban
    bannedFromBicycle: row.banned_from_bicycle || false,
    bannedFromMeals: row.banned_from_meals || false,
    bannedFromShower: row.banned_from_shower || false,
    bannedFromLaundry: row.banned_from_laundry || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    docId: row.id,
  };
};

export const mapMealRow = (row) => {
  const recordedAt = row.recorded_at || row.created_at || null;
  // Use served_on as the primary date for filtering (this is the date the meal was actually served)
  // Fall back to recordedAt if served_on is not available
  const servedOnDate = row.served_on
    ? new Date(`${row.served_on}T12:00:00Z`).toISOString()
    : null;

  const picked = row.picked_up_by_guest_id || null;
  return {
    id: row.id,
    guestId: row.guest_id,
    // Support both property names for historical compatibility and UI usage
    pickedUpByGuestId: picked,
    pickedUpByProxyId: picked,
    count: row.quantity || 1,
    date: servedOnDate || recordedAt,
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
    type: toTitleCase(row.donation_type),
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

export const mapGuestWarningRow = (row) => ({
  id: row.id,
  guestId: row.guest_id,
  message: row.message,
  severity: Number(row.severity) || 1,
  issuedBy: row.issued_by || null,
  active: row.active === true || row.active === 't' || row.active === 'TRUE' || row.active === 'true',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapBlockedSlotRow = (row) => ({
  id: row.id,
  serviceType: row.service_type,
  slotTime: row.slot_time,
  date: row.date,
  createdAt: row.created_at,
  createdBy: row.created_by,
});
