import { addLaundryWithOffline } from '../../utils/offlineOperations';

export const createLaundryMutations = ({
  supabaseEnabled,
  supabaseClient,
  mapLaundryRow,
  laundryRecords,
  setLaundryRecords,
  laundrySlots,
  setLaundrySlots,
  settings,
  LAUNDRY_STATUS,
  extractLaundrySlotStart,
  pacificDateStringFrom,
  todayPacificDateString,
  combineDateAndTimeISO,
  ensureGuestServiceEligible,
  createLocalId,
  pushAction,
  toast,
  enhancedToast,
  normalizeDateInputToISO,
}) => {
  const addLaundryRecord = async (
    guestId,
    time,
    laundryType,
    bagNumber = "",
    dateOverride = null,
  ) => {
    if (laundryType === "onsite") {
      const slotTaken = laundrySlots.some((slot) => slot.time === time);
      if (slotTaken) {
        throw new Error("That laundry slot is already taken.");
      }

      const onsiteSlots = laundrySlots.filter(
        (slot) => slot.laundryType === "onsite",
      );
      if (onsiteSlots.length >= settings.maxOnsiteLaundrySlots) {
        throw new Error("All on-site laundry slots are taken for today.");
      }
    }

    const timestamp = dateOverride || new Date().toISOString();
    const today = dateOverride
      ? pacificDateStringFrom(dateOverride)
      : todayPacificDateString();
    const alreadyBooked = laundryRecords.some(
      (record) =>
        record.guestId === guestId && pacificDateStringFrom(record.date) === today,
    );

    if (alreadyBooked) {
      throw new Error("Guest already has a laundry booking today.");
    }

    const scheduledFor = today;
    const slotStart =
      laundryType === "onsite" ? extractLaundrySlotStart(time) : null;
    const scheduledDateTime = combineDateAndTimeISO(scheduledFor, slotStart);

    ensureGuestServiceEligible(guestId, "laundry bookings");

    if (supabaseEnabled && supabaseClient) {
      try {
        const payload = {
          guest_id: guestId,
          slot_label: laundryType === "onsite" ? time : null,
          laundry_type: laundryType,
          bag_number: bagNumber,
          scheduled_for: scheduledFor,
          status:
            laundryType === "onsite"
              ? LAUNDRY_STATUS.WAITING
              : LAUNDRY_STATUS.PENDING,
        };

        // Use offline-aware wrapper
        const result = await addLaundryWithOffline(payload, navigator.onLine);

        if (result.queued) {
          // Operation was queued for later sync
          const localRecord = {
            id: createLocalId("local-laundry"),
            guestId,
            time: laundryType === "onsite" ? time : null,
            laundryType,
            bagNumber,
            scheduledFor,
            date: scheduledDateTime || timestamp,
            status:
              laundryType === "onsite"
                ? LAUNDRY_STATUS.WAITING
                : LAUNDRY_STATUS.PENDING,
            createdAt: timestamp,
            lastUpdated: timestamp,
            pendingSync: true,
            queueId: result.queueId,
          };

          setLaundryRecords((prev) => [...prev, localRecord]);
          if (laundryType === "onsite") {
            setLaundrySlots((prev) => [
              ...prev,
              {
                guestId,
                time,
                laundryType,
                bagNumber,
                status: localRecord.status,
              },
            ]);
          }

          pushAction({
            id: Date.now() + Math.random(),
            type: "LAUNDRY_BOOKED",
            timestamp,
            data: { recordId: localRecord.id, guestId, time, laundryType, bagNumber },
            description: `Booked ${laundryType} laundry${time ? ` at ${time}` : ""} for guest (pending sync)`,
          });

          toast.success("Laundry booked (will sync when online)");
          return localRecord;
        }

        // Operation completed successfully
        const mapped = mapLaundryRow(result.result);
        setLaundryRecords((prev) => [...prev, mapped]);
        if (laundryType === "onsite") {
          setLaundrySlots((prev) => [
            ...prev,
            {
              guestId,
              time,
              laundryType,
              bagNumber,
              status: mapped.status,
            },
          ]);
        }
        pushAction({
          id: Date.now() + Math.random(),
          type: "LAUNDRY_BOOKED",
          timestamp,
          data: { recordId: mapped.id, guestId, time, laundryType, bagNumber },
          description: `Booked ${laundryType} laundry${time ? ` at ${time}` : ""} for guest`,
        });
        return mapped;
      } catch (error) {
        console.error("Failed to create laundry booking:", error);
        toast.error("Unable to save laundry booking.");
        throw error;
      }
    }

    const record = {
      id: createLocalId("local-laundry"),
      guestId,
      time: laundryType === "onsite" ? time : null,
      laundryType,
      bagNumber,
      scheduledFor,
      date: scheduledDateTime || timestamp,
      status:
        laundryType === "onsite"
          ? LAUNDRY_STATUS.WAITING
          : LAUNDRY_STATUS.PENDING,
      createdAt: timestamp,
      lastUpdated: timestamp,
    };

    setLaundryRecords((prev) => [...prev, record]);
    if (laundryType === "onsite") {
      setLaundrySlots((prev) => [
        ...prev,
        { guestId, time, laundryType, bagNumber, status: record.status },
      ]);
    }

    pushAction({
      id: Date.now() + Math.random(),
      type: "LAUNDRY_BOOKED",
      timestamp,
      data: { recordId: record.id, guestId, time, laundryType, bagNumber },
      description: `Booked ${laundryType} laundry${time ? ` at ${time}` : ""} for guest`,
    });

    return record;
  };

  const cancelLaundryRecord = async (recordId) => {
    const record = laundryRecords.find((candidate) => candidate.id === recordId);
    if (!record) return false;

    setLaundryRecords((prev) => prev.filter((candidate) => candidate.id !== recordId));
    if (record.laundryType === "onsite") {
      setLaundrySlots((prev) =>
        prev.filter(
          (slot) => !(slot.guestId === record.guestId && slot.time === record.time),
        ),
      );
    }

    if (supabaseEnabled && supabaseClient && !String(recordId).startsWith("local-")) {
      try {
        const { error } = await supabaseClient
          .from("laundry_bookings")
          .delete()
          .eq("id", recordId);
        if (error) throw error;
      } catch (error) {
        console.error("Failed to cancel laundry booking:", error);
        toast.error("Unable to cancel laundry booking.");
        return false;
      }
    }

    pushAction({
      id: Date.now() + Math.random(),
      type: "LAUNDRY_CANCELLED",
      timestamp: new Date().toISOString(),
      data: {
        recordId,
        guestId: record.guestId,
        time: record.time,
        laundryType: record.laundryType,
        snapshot: { ...record },
      },
      description: `Cancelled ${record.laundryType} laundry${
        record.time ? ` at ${record.time}` : ""
      }`,
    });

    return true;
  };

  const rescheduleLaundry = async (
    recordId,
    { newTime = null, newLaundryType = null } = {},
  ) => {
    const record = laundryRecords.find((candidate) => candidate.id === recordId);
    if (!record) throw new Error("Laundry booking not found");

    const targetType = newLaundryType || record.laundryType;
    const targetTime = targetType === "onsite" ? (newTime ?? record.time) : null;

    if (targetType === "onsite") {
      if (!targetTime) {
        throw new Error("A time slot is required for on-site laundry.");
      }
      const slotTakenByOther = laundrySlots.some(
        (slot) => slot.time === targetTime && slot.guestId !== record.guestId,
      );
      if (slotTakenByOther) {
        throw new Error("That laundry slot is already taken.");
      }
      const onsiteSlots = laundrySlots.filter(
        (slot) => slot.laundryType === "onsite",
      );
      const isNewToOnsite = record.laundryType !== "onsite";
      if (isNewToOnsite && onsiteSlots.length >= settings.maxOnsiteLaundrySlots) {
        throw new Error("All on-site laundry slots are taken for today.");
      }
    }

    const timestamp = new Date().toISOString();
    const scheduledFor =
      record.scheduledFor ||
      pacificDateStringFrom(record.date) ||
      todayPacificDateString();
    const slotStart =
      targetType === "onsite" ? extractLaundrySlotStart(targetTime) : null;
    const scheduledDateTime = combineDateAndTimeISO(scheduledFor, slotStart);
    const originalRecord = { ...record };
    const previousSlots = laundrySlots.map((slot) => ({ ...slot }));

    let updatedRecord = {
      ...record,
      laundryType: targetType,
      time: targetTime,
      status:
        targetType === "onsite"
          ? LAUNDRY_STATUS.WAITING
          : LAUNDRY_STATUS.PENDING,
      scheduledFor,
      date:
        scheduledDateTime ||
        (targetType === "onsite" ? record.date : timestamp),
      lastUpdated: timestamp,
    };
    let success = true;

    setLaundryRecords((prev) =>
      prev.map((candidate) =>
        candidate.id === recordId ? updatedRecord : candidate,
      ),
    );

    setLaundrySlots((prev) => {
      let next = prev.filter(
        (slot) => !(slot.guestId === record.guestId && slot.time === record.time),
      );
      if (targetType === "onsite") {
        next = [
          ...next,
          {
            guestId: record.guestId,
            time: targetTime,
            laundryType: "onsite",
            bagNumber: record.bagNumber,
            status: LAUNDRY_STATUS.WAITING,
          },
        ];
      }
      return next;
    });

    if (supabaseEnabled && supabaseClient && !String(recordId).startsWith("local-")) {
      try {
        const { data, error } = await supabaseClient
          .from("laundry_bookings")
          .update({
            laundry_type: targetType,
            slot_label: targetTime,
            status:
              targetType === "onsite"
                ? LAUNDRY_STATUS.WAITING
                : LAUNDRY_STATUS.PENDING,
            updated_at: timestamp,
          })
          .eq("id", recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapLaundryRow(data);
          updatedRecord = mapped;
          setLaundryRecords((prev) =>
            prev.map((candidate) =>
              candidate.id === recordId ? mapped : candidate,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to update laundry booking:", error);
        success = false;
        setLaundryRecords((prev) =>
          prev.map((candidate) =>
            candidate.id === recordId ? originalRecord : candidate,
          ),
        );
        setLaundrySlots(previousSlots);
        enhancedToast.error(
          "Unable to update laundry booking. Changes were reverted.",
        );
      }
    }

    if (!success) {
      return originalRecord;
    }

    pushAction({
      id: Date.now() + Math.random(),
      type: "LAUNDRY_RESCHEDULED",
      timestamp: new Date().toISOString(),
      data: {
        recordId,
        guestId: record.guestId,
        from: { type: record.laundryType, time: record.time },
        to: { type: targetType, time: targetTime },
      },
      description: `Updated laundry to ${targetType}${
        targetTime ? ` at ${targetTime}` : ""
      }`,
    });

    return updatedRecord;
  };

  const updateLaundryStatus = async (recordId, newStatus) => {
    const originalRecord = laundryRecords.find(
      (candidate) => candidate.id === recordId,
    );
    if (!originalRecord) return false;

    const timestamp = new Date().toISOString();
    const previousSlots = laundrySlots.map((slot) => ({ ...slot }));
    const updatedRecord = {
      ...originalRecord,
      status: newStatus,
      lastUpdated: timestamp,
    };

    setLaundryRecords((prev) =>
      prev.map((record) => (record.id === recordId ? updatedRecord : record)),
    );

    setLaundrySlots((prev) =>
      prev.map((slot) =>
        slot.guestId === updatedRecord.guestId &&
        slot.time === updatedRecord.time
          ? { ...slot, status: newStatus, bagNumber: updatedRecord.bagNumber }
          : slot,
      ),
    );

    if (supabaseEnabled && supabaseClient && !String(recordId).startsWith("local-")) {
      try {
        const { data, error } = await supabaseClient
          .from("laundry_bookings")
          .update({ status: newStatus, updated_at: timestamp })
          .eq("id", recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapLaundryRow(data);
          setLaundryRecords((prev) =>
            prev.map((candidate) =>
              candidate.id === recordId ? mapped : candidate,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to update laundry status:", error);
        setLaundryRecords((prev) =>
          prev.map((record) =>
            record.id === recordId ? originalRecord : record,
          ),
        );
        setLaundrySlots(previousSlots);
        enhancedToast.error(
          "Unable to update laundry status. Changes were reverted.",
        );
        return false;
      }
    }

    return true;
  };

  const updateLaundryBagNumber = async (recordId, bagNumber) => {
    const originalRecord = laundryRecords.find(
      (candidate) => candidate.id === recordId,
    );
    if (!originalRecord) return false;

    const timestamp = new Date().toISOString();
    const previousSlots = laundrySlots.map((slot) => ({ ...slot }));
    const updatedRecord = {
      ...originalRecord,
      bagNumber: bagNumber || "",
      lastUpdated: timestamp,
    };

    setLaundryRecords((prev) =>
      prev.map((record) => (record.id === recordId ? updatedRecord : record)),
    );

    setLaundrySlots((prev) =>
      prev.map((slot) =>
        slot.guestId === updatedRecord.guestId &&
        slot.time === updatedRecord.time
          ? { ...slot, bagNumber: bagNumber || "" }
          : slot,
      ),
    );

    if (supabaseEnabled && supabaseClient && !String(recordId).startsWith("local-")) {
      try {
        const { data, error } = await supabaseClient
          .from("laundry_bookings")
          .update({
            bag_number: bagNumber || null,
            updated_at: timestamp,
          })
          .eq("id", recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapLaundryRow(data);
          setLaundryRecords((prev) =>
            prev.map((candidate) =>
              candidate.id === recordId ? mapped : candidate,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to update bag number in Supabase:", error);
        setLaundryRecords((prev) =>
          prev.map((record) =>
            record.id === recordId ? originalRecord : record,
          ),
        );
        setLaundrySlots(previousSlots);
        enhancedToast.error(
          "Unable to update bag number. Changes were reverted.",
        );
        return false;
      }
    }

    return true;
  };

  const importLaundryAttendanceRecord = (
    guestId,
    {
      dateSubmitted = null,
      count = 1,
      status = LAUNDRY_STATUS.DONE,
      laundryType = "offsite",
      bagNumber = "",
    } = {},
  ) => {
    const timestampIso =
      normalizeDateInputToISO(dateSubmitted) ?? new Date().toISOString();
    const scheduledFor = pacificDateStringFrom(timestampIso);

    const importedRecords = Array.from({ length: Math.max(count, 1) }, () => ({
      id: createLocalId("import-laundry"),
      guestId,
      time: null,
      laundryType,
      bagNumber,
      scheduledFor,
      date: timestampIso,
      status,
      createdAt: timestampIso,
      lastUpdated: timestampIso,
      source: "import",
    }));

    setLaundryRecords((prev) => [...prev, ...importedRecords]);

    pushAction({
      id: createLocalId("action"),
      type: "LAUNDRY_IMPORTED",
      timestamp: timestampIso,
      data: { guestId, count: importedRecords.length },
      description: `Imported ${importedRecords.length} laundry record${
        importedRecords.length === 1 ? "" : "s"
      }`,
    });

    return importedRecords;
  };

  return {
    addLaundryRecord,
    cancelLaundryRecord,
    rescheduleLaundry,
    updateLaundryStatus,
    updateLaundryBagNumber,
    importLaundryAttendanceRecord,
  };
};
