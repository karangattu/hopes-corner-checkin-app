import { addBicycleWithOffline } from '../../utils/offlineOperations';

export const createBicycleMutations = ({
  supabaseEnabled,
  supabaseClient,
  mapBicycleRow,
  ensureGuestServiceEligible,
  bicycleRecords,
  setBicycleRecords,
  pacificDateStringFrom,
  todayPacificDateString,
  createLocalId,
  pushAction,
  toast,
  enhancedToast,
  normalizeDateInputToISO,
}) => {
  const addBicycleRecord = async (
    guestId,
    repairType,
    status = "pending",
    dateOverride = null,
  ) => {
    const timestamp = dateOverride || new Date().toISOString();
    const today = dateOverride
      ? pacificDateStringFrom(dateOverride)
      : todayPacificDateString();

    ensureGuestServiceEligible(guestId, "bicycle repairs");

    if (supabaseEnabled && supabaseClient) {
      try {
        const payload = {
          guest_id: guestId,
          repair_type: repairType,
          status,
          service_date: today,
        };

        // Use offline-aware wrapper
        const result = await addBicycleWithOffline(payload, navigator.onLine);

        if (result.queued) {
          // Operation was queued for later sync
          const localRecord = {
            id: createLocalId("local-bicycle"),
            guestId,
            repairType,
            status,
            date: timestamp,
            createdAt: timestamp,
            lastUpdated: timestamp,
            pendingSync: true,
            queueId: result.queueId,
          };

          setBicycleRecords((prev) => [...prev, localRecord]);

          pushAction({
            id: Date.now() + Math.random(),
            type: "BICYCLE_REPAIR",
            timestamp,
            data: { recordId: localRecord.id, guestId, repairType, status },
            description: `Bicycle repair logged: ${repairType} (pending sync)`,
          });

          toast.success("Bicycle repair logged (will sync when online)");
          return localRecord;
        }

        // Operation completed successfully
        const mapped = mapBicycleRow(result.result);
        setBicycleRecords((prev) => [...prev, mapped]);
        pushAction({
          id: Date.now() + Math.random(),
          type: "BICYCLE_REPAIR",
          timestamp,
          data: { recordId: mapped.id, guestId, repairType, status },
          description: `Bicycle repair logged: ${repairType}`,
        });
        return mapped;
      } catch (error) {
        console.error("Failed to log bicycle repair:", error);
        toast.error("Unable to save bicycle repair.");
        throw error;
      }
    }

    const record = {
      id: createLocalId("local-bicycle"),
      guestId,
      repairType,
      status,
      date: timestamp,
      createdAt: timestamp,
      lastUpdated: timestamp,
    };

    setBicycleRecords((prev) => [...prev, record]);

    pushAction({
      id: Date.now() + Math.random(),
      type: "BICYCLE_REPAIR",
      timestamp,
      data: { recordId: record.id, guestId, repairType, status },
      description: `Bicycle repair logged: ${repairType}`,
    });

    return record;
  };

  const updateBicycleStatus = async (recordId, newStatus) => {
    const timestamp = new Date().toISOString();
    const originalRecord = bicycleRecords.find(
      (candidate) => candidate.id === recordId,
    );
    if (!originalRecord) return false;

    const previousRecord = { ...originalRecord };

    setBicycleRecords((prev) =>
      prev.map((candidate) =>
        candidate.id === recordId
          ? { ...candidate, status: newStatus, lastUpdated: timestamp }
          : candidate,
      ),
    );

    if (supabaseEnabled && supabaseClient && !String(recordId).startsWith("local-")) {
      try {
        const { data, error } = await supabaseClient
          .from("bicycle_repairs")
          .update({ status: newStatus, updated_at: timestamp })
          .eq("id", recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapBicycleRow(data);
          setBicycleRecords((prev) =>
            prev.map((candidate) =>
              candidate.id === recordId ? mapped : candidate,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to update bicycle status:", error);
        setBicycleRecords((prev) =>
          prev.map((candidate) =>
            candidate.id === recordId ? previousRecord : candidate,
          ),
        );
        enhancedToast.error(
          "Unable to update bicycle status. Changes were reverted.",
        );
        return false;
      }
    }

    return true;
  };

  const importBicycleRecord = (
    guestId,
    { dateSubmitted = null, count = 1, repairType = "Basic Tune Up", status = "completed" } = {},
  ) => {
    const timestampIso =
      normalizeDateInputToISO(dateSubmitted) ?? new Date().toISOString();

    const importedRecords = Array.from({ length: Math.max(count, 1) }, () => ({
      id: createLocalId("import-bicycle"),
      guestId,
      repairType,
      status,
      date: timestampIso,
      createdAt: timestampIso,
      lastUpdated: timestampIso,
      source: "import",
    }));

    setBicycleRecords((prev) => [...prev, ...importedRecords]);

    pushAction({
      id: createLocalId("action"),
      type: "BICYCLE_IMPORTED",
      timestamp: timestampIso,
      data: { guestId, count: importedRecords.length },
      description: `Imported ${importedRecords.length} bicycle record${
        importedRecords.length === 1 ? "" : "s"
      }`,
    });

    return importedRecords;
  };

  return {
    addBicycleRecord,
    updateBicycleStatus,
    importBicycleRecord,
  };
};
