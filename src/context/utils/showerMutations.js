import { addShowerWithOffline } from '../../utils/offlineOperations';
import { mapShowerStatusToDb } from './mappers';

export const createShowerMutations = ({
  supabaseEnabled,
  supabaseClient,
  mapShowerRow,
  ensureGuestServiceEligible,
  showerRecords,
  setShowerRecords,
  showerSlots,
  setShowerSlots,
  pacificDateStringFrom,
  todayPacificDateString,
  combineDateAndTimeISO,
  createLocalId,
  pushAction,
  toast,
  enhancedToast,
  normalizeDateInputToISO,
  onServiceCompleted, // Callback when a service is marked complete
}) => {
  const addShowerRecord = async (guestId, time, dateOverride = null) => {
    const countAtTime = showerSlots.filter((slot) => slot.time === time).length;
    if (countAtTime >= 2) {
      throw new Error("That time slot is already full.");
    }

    const timestamp = dateOverride || new Date().toISOString();
    const today = dateOverride
      ? pacificDateStringFrom(dateOverride)
      : todayPacificDateString();
    const alreadyBooked = showerRecords.some(
      (record) =>
        record.guestId === guestId && pacificDateStringFrom(record.date) === today,
    );

    if (alreadyBooked) {
      throw new Error("Guest already has a shower booking today.");
    }

    const scheduledFor = today;
    const scheduledDateTime = combineDateAndTimeISO(scheduledFor, time);

    ensureGuestServiceEligible(guestId, "shower bookings");

    if (supabaseEnabled && supabaseClient) {
      try {
        const payload = {
          guest_id: guestId,
          scheduled_time: time,
          scheduled_for: scheduledFor,
          status: "booked",
        };

        // Use offline-aware wrapper
        const result = await addShowerWithOffline(payload, navigator.onLine);

        if (result.queued) {
          // Operation was queued for later sync
          const localRecord = {
            id: createLocalId("local-shower"),
            guestId,
            time,
            scheduledFor,
            date: scheduledDateTime || timestamp,
            status: "awaiting",
            createdAt: timestamp,
            lastUpdated: timestamp,
            pendingSync: true,
            queueId: result.queueId,
          };

          setShowerRecords((prev) => [...prev, localRecord]);
          setShowerSlots((prev) => [...prev, { guestId, time }]);

          pushAction({
            id: Date.now() + Math.random(),
            type: "SHOWER_BOOKED",
            timestamp,
            data: { recordId: localRecord.id, guestId, time },
            description: `Booked shower at ${time} for guest (pending sync)`,
          });

          toast.success("Shower booked (will sync when online)");
          return localRecord;
        }

        // Operation completed successfully
        const mapped = mapShowerRow(result.result);
        setShowerRecords((prev) => [...prev, mapped]);
        setShowerSlots((prev) => [...prev, { guestId, time }]);
        pushAction({
          id: Date.now() + Math.random(),
          type: "SHOWER_BOOKED",
          timestamp,
          data: { recordId: mapped.id, guestId, time },
          description: `Booked shower at ${time} for guest`,
        });
        return mapped;
      } catch (error) {
        console.error("Failed to create shower booking:", error);
        toast.error("Unable to save shower booking.");
        throw error;
      }
    }

    const record = {
      id: createLocalId("local-shower"),
      guestId,
      time,
      scheduledFor,
      date: scheduledDateTime || timestamp,
      status: "awaiting",
      createdAt: timestamp,
      lastUpdated: timestamp,
    };

    setShowerRecords((prev) => [...prev, record]);
    setShowerSlots((prev) => [...prev, { guestId, time }]);

    pushAction({
      id: Date.now() + Math.random(),
      type: "SHOWER_BOOKED",
      timestamp,
      data: { recordId: record.id, guestId, time },
      description: `Booked shower at ${time} for guest`,
    });

    return record;
  };

  const addShowerWaitlist = async (guestId) => {
    const today = todayPacificDateString();
    const already = showerRecords.some(
      (record) =>
        record.guestId === guestId && pacificDateStringFrom(record.date) === today,
    );
    if (already) {
      throw new Error("Guest already has a shower entry today.");
    }

    ensureGuestServiceEligible(guestId, "shower bookings");

    const timestamp = new Date().toISOString();
    const baseRecord = {
      id: Date.now(),
      guestId,
      time: null,
      date: timestamp,
      scheduledFor: today,
      status: "waitlisted",
      createdAt: timestamp,
      lastUpdated: timestamp,
    };

    if (supabaseEnabled && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("shower_reservations")
          .insert({
            guest_id: guestId,
            scheduled_time: null,
            scheduled_for: today,
            status: "waitlisted",
          })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapShowerRow(data);
        setShowerRecords((prev) => [...prev, mapped]);
        pushAction({
          id: Date.now() + Math.random(),
          type: "SHOWER_WAITLISTED",
          timestamp,
          data: { recordId: mapped.id, guestId },
          description: "Added to shower waitlist",
        });
        return mapped;
      } catch (error) {
        console.error("Failed to add shower waitlist entry:", error);
        toast.error("Unable to add to shower waitlist.");
        throw error;
      }
    }

    const record = { ...baseRecord, id: `local-${baseRecord.id}` };
    setShowerRecords((prev) => [...prev, record]);
    pushAction({
      id: Date.now() + Math.random(),
      type: "SHOWER_WAITLISTED",
      timestamp,
      data: { recordId: record.id, guestId },
      description: "Added to shower waitlist",
    });
    return record;
  };

  const cancelShowerRecord = async (recordId) => {
    const record = showerRecords.find((candidate) => candidate.id === recordId);
    if (!record) return false;

    setShowerRecords((prev) => prev.filter((candidate) => candidate.id !== recordId));
    setShowerSlots((prev) =>
      prev.filter(
        (slot) => !(slot.guestId === record.guestId && slot.time === record.time),
      ),
    );

    if (supabaseEnabled && supabaseClient && !String(recordId).startsWith("local-")) {
      try {
        const { error } = await supabaseClient
          .from("shower_reservations")
          .delete()
          .eq("id", recordId);
        if (error) throw error;
      } catch (error) {
        console.error("Failed to cancel shower booking:", error);
        toast.error("Unable to cancel shower booking.");
        return false;
      }
    }

    pushAction({
      id: Date.now() + Math.random(),
      type: "SHOWER_CANCELLED",
      timestamp: new Date().toISOString(),
      data: {
        recordId,
        guestId: record.guestId,
        time: record.time,
        snapshot: { ...record },
      },
      description: `Cancelled shower at ${record.time}`,
    });

    return true;
  };

  const rescheduleShower = async (recordId, newTime) => {
    const record = showerRecords.find((candidate) => candidate.id === recordId);
    if (!record) throw new Error("Shower booking not found");
    if (record.time === newTime) return record;

    const countAtNew = showerSlots.filter(
      (slot) => slot.time === newTime && slot.guestId !== record.guestId,
    ).length;
    if (countAtNew >= 2) throw new Error("That time slot is full.");

    const timestamp = new Date().toISOString();
    const scheduledFor =
      record.scheduledFor ||
      pacificDateStringFrom(record.date) ||
      todayPacificDateString();
    const scheduledDateTime = combineDateAndTimeISO(scheduledFor, newTime);
    const originalRecord = { ...record };
    const previousSlots = showerSlots.map((slot) => ({ ...slot }));

    let updatedRecord = {
      ...record,
      time: newTime,
      scheduledFor,
      date: scheduledDateTime || record.date,
      lastUpdated: timestamp,
    };
    let success = true;

    setShowerRecords((prev) =>
      prev.map((candidate) =>
        candidate.id === recordId ? updatedRecord : candidate,
      ),
    );

    setShowerSlots((prev) => {
      const filtered = prev.filter(
        (slot) => !(slot.guestId === record.guestId && slot.time === record.time),
      );
      return [...filtered, { guestId: record.guestId, time: newTime }];
    });

    if (supabaseEnabled && supabaseClient && !String(recordId).startsWith("local-")) {
      try {
        const { data, error } = await supabaseClient
          .from("shower_reservations")
          .update({ scheduled_time: newTime, updated_at: timestamp })
          .eq("id", recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapShowerRow(data);
          updatedRecord = mapped;
          setShowerRecords((prev) =>
            prev.map((candidate) =>
              candidate.id === recordId ? mapped : candidate,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to reschedule shower:", error);
        success = false;
        setShowerRecords((prev) =>
          prev.map((candidate) =>
            candidate.id === recordId ? originalRecord : candidate,
          ),
        );
        setShowerSlots(previousSlots);
        enhancedToast.error(
          "Unable to reschedule shower. Changes were reverted.",
        );
      }
    }

    if (!success) {
      return originalRecord;
    }

    pushAction({
      id: Date.now() + Math.random(),
      type: "SHOWER_RESCHEDULED",
      timestamp,
      data: {
        recordId,
        guestId: record.guestId,
        from: record.time,
        to: newTime,
      },
      description: `Rescheduled shower ${record.time} → ${newTime}`,
    });

    return updatedRecord;
  };

  const updateShowerStatus = async (recordId, newStatus) => {
    const timestamp = new Date().toISOString();
    const originalRecord = showerRecords.find(
      (candidate) => candidate.id === recordId,
    );
    if (!originalRecord) return false;

    const previousRecord = { ...originalRecord };

    setShowerRecords((prev) =>
      prev.map((candidate) =>
        candidate.id === recordId
          ? { ...candidate, status: newStatus, lastUpdated: timestamp }
          : candidate,
      ),
    );

    const dbStatus = mapShowerStatusToDb(newStatus);

    if (supabaseEnabled && supabaseClient && !String(recordId).startsWith("local-")) {
      try {
        const { data, error } = await supabaseClient
          .from("shower_reservations")
          .update({ status: dbStatus, updated_at: timestamp })
          .eq("id", recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapShowerRow(data);
          setShowerRecords((prev) =>
            prev.map((candidate) =>
              candidate.id === recordId ? mapped : candidate,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to update shower status:", error);
        setShowerRecords((prev) =>
          prev.map((candidate) =>
            candidate.id === recordId ? previousRecord : candidate,
          ),
        );
        enhancedToast.error(
          "Unable to update shower status. Changes were reverted.",
        );
        return false;
      }
    }

    const isWaitlistCompletion =
      previousRecord.status === "waitlisted" && newStatus === "done";
    if (isWaitlistCompletion) {
      pushAction({
        id: Date.now() + Math.random(),
        type: "SHOWER_WAITLIST_COMPLETED",
        timestamp,
        data: {
          recordId,
          guestId: previousRecord.guestId,
          fromStatus: previousRecord.status,
          time: previousRecord.time,
        },
        description: "Marked waitlisted shower complete",
      });
    }

    // Notify when shower is marked complete (for waiver check)
    if (newStatus === "done" && onServiceCompleted) {
      onServiceCompleted(previousRecord.guestId, "shower");
    }

    return true;
  };

  const importShowerAttendanceRecord = (
    guestId,
    { dateSubmitted = null, count = 1, status = "done" } = {},
  ) => {
    const timestampIso =
      normalizeDateInputToISO(dateSubmitted) ?? new Date().toISOString();
    const scheduledFor = pacificDateStringFrom(timestampIso);

    const importedRecords = Array.from({ length: Math.max(count, 1) }, () => ({
      id: createLocalId("import-shower"),
      guestId,
      time: null,
      scheduledFor,
      date: timestampIso,
      status,
      createdAt: timestampIso,
      lastUpdated: timestampIso,
      source: "import",
    }));

    setShowerRecords((prev) => [...prev, ...importedRecords]);

    pushAction({
      id: createLocalId("action"),
      type: "SHOWER_IMPORTED",
      timestamp: timestampIso,
      data: { guestId, count: importedRecords.length },
      description: `Imported ${importedRecords.length} shower record${
        importedRecords.length === 1 ? "" : "s"
      }`,
    });

    return importedRecords;
  };

  return {
    addShowerRecord,
    addShowerWaitlist,
    cancelShowerRecord,
    rescheduleShower,
    updateShowerStatus,
    importShowerAttendanceRecord,
  };
};
