import { addHaircutWithOffline } from '../../utils/offlineOperations';

export const createHaircutMutations = ({
  supabaseEnabled,
  supabaseClient,
  mapHaircutRow,
  ensureGuestServiceEligible,
  setHaircutRecords,
  pacificDateStringFrom,
  todayPacificDateString,
  createLocalId,
  pushAction,
  toast,
  normalizeDateInputToISO,
}) => {
  const addHaircutRecord = async (guestId, dateOverride = null) => {
    const timestamp = dateOverride || new Date().toISOString();
    const today = dateOverride
      ? pacificDateStringFrom(dateOverride)
      : todayPacificDateString();

    ensureGuestServiceEligible(guestId, "haircuts");

    if (supabaseEnabled && supabaseClient) {
      try {
        const payload = {
          guest_id: guestId,
          service_date: today,
        };

        // Use offline-aware wrapper
        const result = await addHaircutWithOffline(payload, navigator.onLine);

        if (result.queued) {
          // Operation was queued for later sync
          const localRecord = {
            id: createLocalId("local-haircut"),
            guestId,
            date: timestamp,
            createdAt: timestamp,
            lastUpdated: timestamp,
            pendingSync: true,
            queueId: result.queueId,
          };

          setHaircutRecords((prev) => [...prev, localRecord]);

          pushAction({
            id: Date.now() + Math.random(),
            type: "HAIRCUT_LOGGED",
            timestamp,
            data: { recordId: localRecord.id, guestId },
            description: `Haircut logged for guest (pending sync)`,
          });

          toast.success("Haircut logged (will sync when online)");
          return localRecord;
        }

        // Operation completed successfully
        const mapped = mapHaircutRow(result.result);
        setHaircutRecords((prev) => [...prev, mapped]);
        pushAction({
          id: Date.now() + Math.random(),
          type: "HAIRCUT_LOGGED",
          timestamp,
          data: { recordId: mapped.id, guestId },
          description: `Haircut logged for guest`,
        });
        return mapped;
      } catch (error) {
        console.error("Failed to log haircut:", error);
        toast.error("Unable to save haircut.");
        throw error;
      }
    }

    const record = {
      id: createLocalId("local-haircut"),
      guestId,
      date: timestamp,
      createdAt: timestamp,
      lastUpdated: timestamp,
    };

    setHaircutRecords((prev) => [...prev, record]);

    pushAction({
      id: Date.now() + Math.random(),
      type: "HAIRCUT_LOGGED",
      timestamp,
      data: { recordId: record.id, guestId },
      description: `Haircut logged for guest`,
    });

    return record;
  };

  const importHaircutRecord = (
    guestId,
    { dateSubmitted = null, count = 1 } = {},
  ) => {
    const timestampIso =
      normalizeDateInputToISO(dateSubmitted) ?? new Date().toISOString();

    const importedRecords = Array.from({ length: Math.max(count, 1) }, () => ({
      id: createLocalId("import-haircut"),
      guestId,
      date: timestampIso,
      createdAt: timestampIso,
      lastUpdated: timestampIso,
      source: "import",
    }));

    setHaircutRecords((prev) => [...prev, ...importedRecords]);

    pushAction({
      id: createLocalId("action"),
      type: "HAIRCUT_IMPORTED",
      timestamp: timestampIso,
      data: { guestId, count: importedRecords.length },
      description: `Imported ${importedRecords.length} haircut record${
        importedRecords.length === 1 ? "" : "s"
      }`,
    });

    return importedRecords;
  };

  return {
    addHaircutRecord,
    importHaircutRecord,
  };
};
