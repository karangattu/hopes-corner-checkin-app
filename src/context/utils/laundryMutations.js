import { addLaundryWithOffline } from '../../utils/offlineOperations';
import { globalSyncManager } from '../SupabaseSync';
import { useServicesStore } from '../../stores/useServicesStore';
import { broadcastChange } from '../../utils/crossTabSync';

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
  onServiceCompleted, // Callback when a service is marked complete
}) => {
  /**
   * Trigger a sync for other users to see updated slots immediately
   */
  const triggerLaundrySync = () => {
    try {
      // Reset the last sync time to force an immediate sync
      globalSyncManager?.lastSync.set('laundry', 0);
    } catch (error) {
      console.warn('Could not trigger laundry sync:', error);
    }
  };

  /**
   * Validates slot availability by querying the database directly.
   * This prevents race conditions when multiple users book simultaneously.
   * Falls back to local state check when offline or on error.
   */
  const validateLaundrySlotAvailability = async (time, scheduledFor) => {
    if (!supabaseEnabled || !supabaseClient || !navigator.onLine) {
      // Fall back to local state check when offline or no supabase
      const slotTaken = laundrySlots.some(
        (slot) => slot.time === time
      );
      return !slotTaken;
    }

    try {
      // Query database directly to check if slot is already taken
      const { count, error } = await supabaseClient
        .from("laundry_bookings")
        .select("*", { count: "exact", head: true })
        .eq("slot_label", time)
        .eq("scheduled_for", scheduledFor)
        .eq("laundry_type", "onsite");

      if (error) {
        console.error("Error validating laundry slot availability:", error);
        // Fall back to local check on error
        const slotTaken = laundrySlots.some(
          (slot) => slot.time === time
        );
        return !slotTaken;
      }

      // Slot is available if no bookings exist for this time
      return (count || 0) === 0;
    } catch (err) {
      console.error("Failed to validate laundry slot availability:", err);
      // Fall back to local check on error
      const slotTaken = laundrySlots.some(
        (slot) => slot.time === time
      );
      return !slotTaken;
    }
  };

  /**
   * Validates that the total on-site slots haven't been exceeded.
   * Queries the database to get accurate count.
   */
  const validateOnsiteCapacity = async (scheduledFor) => {
    if (!supabaseEnabled || !supabaseClient || !navigator.onLine) {
      // Fall back to local state check
      const onsiteSlots = laundrySlots.filter(
        (slot) => slot.laundryType === "onsite"
      );
      return onsiteSlots.length < settings.maxOnsiteLaundrySlots;
    }

    try {
      const { count, error } = await supabaseClient
        .from("laundry_bookings")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_for", scheduledFor)
        .eq("laundry_type", "onsite");

      if (error) {
        console.error("Error validating onsite capacity:", error);
        const onsiteSlots = laundrySlots.filter(
          (slot) => slot.laundryType === "onsite"
        );
        return onsiteSlots.length < settings.maxOnsiteLaundrySlots;
      }

      return (count || 0) < settings.maxOnsiteLaundrySlots;
    } catch (err) {
      console.error("Failed to validate onsite capacity:", err);
      const onsiteSlots = laundrySlots.filter(
        (slot) => slot.laundryType === "onsite"
      );
      return onsiteSlots.length < settings.maxOnsiteLaundrySlots;
    }
  };

  const addLaundryRecord = async (
    guestId,
    time,
    laundryType,
    bagNumber = "",
    dateOverride = null,
  ) => {
    const scheduledFor = dateOverride
      ? pacificDateStringFrom(dateOverride)
      : todayPacificDateString();

    if (laundryType === "onsite") {
      // Re-validate slot availability from database before booking
      // This prevents race conditions when multiple users book simultaneously
      const isSlotAvailable = await validateLaundrySlotAvailability(time, scheduledFor);
      if (!isSlotAvailable) {
        // Slot became full while user was selecting - show helpful message
        toast.error("This slot just filled up. Please choose another time.");
        throw new Error("That laundry slot is already taken. Please refresh and try another slot.");
      }

      // Also validate total on-site capacity from database
      const hasCapacity = await validateOnsiteCapacity(scheduledFor);
      if (!hasCapacity) {
        toast.error("All on-site slots are now full. Please try off-site laundry.");
        throw new Error("All on-site laundry slots are taken for today.");
      }
    }

    const timestamp = dateOverride || new Date().toISOString();
    const alreadyBooked = laundryRecords.some(
      (record) =>
        record.guestId === guestId && pacificDateStringFrom(record.date) === scheduledFor,
    );

    if (alreadyBooked) {
      throw new Error("Guest already has a laundry booking today.");
    }
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
        // Sync to Zustand store so realtime bridge stays consistent
        useServicesStore.getState().syncLaundryFromMutation('add', mapped);
        broadcastChange('laundry', 'add', mapped);
        pushAction({
          id: Date.now() + Math.random(),
          type: "LAUNDRY_BOOKED",
          timestamp,
          data: { recordId: mapped.id, guestId, time, laundryType, bagNumber },
          description: `Booked ${laundryType} laundry${time ? ` at ${time}` : ""} for guest`,
        });
        // Trigger sync so other users see the new booking immediately
        triggerLaundrySync();
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

    // Create snapshots for rollback
    const recordsSnapshot = laundryRecords.map((r) => ({ ...r }));
    const slotsSnapshot = laundrySlots.map((s) => ({ ...s }));

    try {
      // Remove the record from local state optimistically
      setLaundryRecords((prev) =>
        prev.filter((candidate) => candidate.id !== recordId)
      );

      if (record.laundryType === "onsite") {
        setLaundrySlots((prev) =>
          prev.filter((slot) =>
            !(slot.guestId === record.guestId && slot.time === record.time)
          )
        );
      }

      // Then sync to server if online
      if (supabaseEnabled && supabaseClient && !String(recordId).startsWith("local-")) {
        const { error } = await supabaseClient
          .from("laundry_bookings")
          .delete()
          .eq("id", recordId);
        if (error) throw error;
      }

      // Sync cancellation to Zustand store
      useServicesStore.getState().syncLaundryFromMutation('remove', record);
      broadcastChange('laundry', 'remove', record);

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
        description: `Cancelled ${record.laundryType} laundry${record.time ? ` at ${record.time}` : ""
          }`,
      });

      return true;
    } catch (error) {
      // Rollback on failure
      console.error("Failed to cancel laundry booking:", error);
      setLaundryRecords(recordsSnapshot);
      setLaundrySlots(slotsSnapshot);
      toast.error("Unable to cancel laundry booking.");
      return false;
    }
  };

  const cancelMultipleLaundry = async (recordIds) => {
    if (!recordIds || recordIds.length === 0) return true;

    const recordsToCancel = laundryRecords.filter((r) => recordIds.includes(r.id));
    if (recordsToCancel.length === 0) return true;

    // Create snapshots for rollback
    const recordsSnapshot = laundryRecords.map((r) => ({ ...r }));
    const slotsSnapshot = laundrySlots.map((s) => ({ ...s }));

    try {
      // Update local state optimistically
      setLaundryRecords((prev) =>
        prev.filter((candidate) => !recordIds.includes(candidate.id))
      );

      setLaundrySlots((prev) =>
        prev.filter((slot) => {
          const matchingRecord = recordsToCancel.find(
            (r) =>
              r.guestId === slot.guestId &&
              r.time === slot.time &&
              r.laundryType === "onsite",
          );
          return !matchingRecord;
        }),
      );

      // Then sync to server if online
      if (supabaseEnabled && supabaseClient) {
        const nonLocalIds = recordIds.filter(
          (id) => !String(id).startsWith("local-"),
        );
        if (nonLocalIds.length > 0) {
          const { error } = await supabaseClient
            .from("laundry_bookings")
            .delete()
            .in("id", nonLocalIds);
          if (error) throw error;
        }
      }

      // Sync bulk cancel to Zustand store
      useServicesStore.getState().syncLaundryFromMutation('bulkRemove', recordsToCancel);
      broadcastChange('laundry', 'bulkRemove', recordsToCancel);

      pushAction({
        id: Date.now() + Math.random(),
        type: "LAUNDRY_BULK_CANCELLED",
        timestamp: new Date().toISOString(),
        data: { recordIds, count: recordIds.length },
        description: `Bulk cancelled ${recordIds.length} laundry loads`,
      });

      return true;
    } catch (error) {
      // Rollback on failure
      console.error("Failed to bulk cancel laundry bookings:", error);
      setLaundryRecords(recordsSnapshot);
      setLaundrySlots(slotsSnapshot);
      toast.error("Unable to cancel some laundry bookings.");
      return false;
    }
  };

  const rescheduleLaundry = async (
    recordId,
    { newTime = null, newLaundryType = null } = {},
  ) => {
    const record = laundryRecords.find((candidate) => candidate.id === recordId);
    if (!record) throw new Error("Laundry booking not found");

    const targetType = newLaundryType || record.laundryType;
    const targetTime = targetType === "onsite" ? (newTime ?? record.time) : null;
    const scheduledFor =
      record.scheduledFor ||
      pacificDateStringFrom(record.date) ||
      todayPacificDateString();

    if (targetType === "onsite") {
      if (!targetTime) {
        throw new Error("A time slot is required for on-site laundry.");
      }

      // If moving to a different time slot, validate from database
      // (skip validation if keeping same time - guest is just updating type)
      if (targetTime !== record.time) {
        const isSlotAvailable = await validateLaundrySlotAvailability(targetTime, scheduledFor);
        if (!isSlotAvailable) {
          toast.error("This slot just filled up. Please choose another time.");
          throw new Error("That laundry slot is already taken. Please refresh and try another slot.");
        }
      }

      // If switching from offsite to onsite, check capacity
      const isNewToOnsite = record.laundryType !== "onsite";
      if (isNewToOnsite) {
        const hasCapacity = await validateOnsiteCapacity(scheduledFor);
        if (!hasCapacity) {
          toast.error("All on-site slots are now full. Please try off-site laundry.");
          throw new Error("All on-site laundry slots are taken for today.");
        }
      }
    }

    const timestamp = new Date().toISOString();
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

    // Sync rescheduled record to Zustand store
    useServicesStore.getState().syncLaundryFromMutation('update', updatedRecord);
    broadcastChange('laundry', 'update', updatedRecord);

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
      description: `Updated laundry to ${targetType}${targetTime ? ` at ${targetTime}` : ""
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

    // Notify when laundry is marked complete (for waiver check)
    // "done" means ready for pickup, "picked_up" means guest collected it
    const completedStatuses = [LAUNDRY_STATUS.DONE, LAUNDRY_STATUS.PICKED_UP, LAUNDRY_STATUS.OFFSITE_PICKED_UP];
    if (completedStatuses.includes(newStatus) && onServiceCompleted) {
      onServiceCompleted(originalRecord.guestId, "laundry");
    }

    // Sync status update to Zustand store so realtime bridge stays consistent
    const currentRecord = laundryRecords.find((r) => r.id === recordId);
    if (currentRecord) {
      useServicesStore.getState().syncLaundryFromMutation('update', { ...currentRecord, status: newStatus });
      broadcastChange('laundry', 'update', { ...currentRecord, status: newStatus });
    }

    // Trigger sync so other users see the status update immediately
    triggerLaundrySync();

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
      description: `Imported ${importedRecords.length} laundry record${importedRecords.length === 1 ? "" : "s"
        }`,
    });

    return importedRecords;
  };

  return {
    addLaundryRecord,
    cancelLaundryRecord,
    cancelMultipleLaundry,
    rescheduleLaundry,
    updateLaundryStatus,
    updateLaundryBagNumber,
    importLaundryAttendanceRecord,
  };
};
