import { pacificDateStringFrom, isoFromPacificDateString } from "../utils/date";

export const buildSupabaseShowerPayload = (record) => {
  const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);

  return {
    guest_id: record.internalGuestId,
    scheduled_time: null,
    scheduled_for: pacificDateStr,
    status: "done",
  };
};

export const buildSupabaseLaundryPayload = (record) => {
  const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);

  return {
    guest_id: record.internalGuestId,
    slot_label: null,
    laundry_type: "offsite",
    bag_number: null,
    scheduled_for: pacificDateStr,
    status: "done",
  };
};

export const buildSupabaseBicyclePayload = (record) => {
  const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
  const dateIso = isoFromPacificDateString(pacificDateStr);

  return {
    guest_id: record.internalGuestId,
    repair_type: "Legacy Import",
    repair_types: ["Legacy Import"],
    completed_repairs: [],
    notes: "Imported from legacy system",
    status: "done",
    priority: 0,
    requested_at: dateIso,
    completed_at: dateIso,
  };
};

export const buildSupabaseHaircutPayload = (record) => {
  const pacificDateStr = pacificDateStringFrom(record.dateSubmitted);
  const dateIso = isoFromPacificDateString(pacificDateStr);

  return {
    guest_id: record.internalGuestId,
    served_at: dateIso,
  };
};
