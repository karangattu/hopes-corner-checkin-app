import { addHolidayWithOffline } from '../../utils/offlineOperations';

export const createHolidayMutations = ({
  supabaseEnabled,
  supabaseClient,
  mapHolidayRow,
  ensureGuestServiceEligible,
  setHolidayRecords,
  pacificDateStringFrom,
  todayPacificDateString,
  createLocalId,
  pushAction,
  toast,
  normalizeDateInputToISO,
}) => {
  const addHolidayRecord = async (guestId, dateOverride = null) => {
    const timestamp = dateOverride || new Date().toISOString();
    const today = dateOverride
      ? pacificDateStringFrom(dateOverride)
      : todayPacificDateString();

    ensureGuestServiceEligible(guestId, "holiday services");

    if (supabaseEnabled && supabaseClient) {
      try {
        const payload = {
          guest_id: guestId,
          visit_date: today,
        };

        // Use offline-aware wrapper
        const result = await addHolidayWithOffline(payload, navigator.onLine);

        if (result.queued) {
          // Operation was queued for later sync
          const localRecord = {
            id: createLocalId("local-holiday"),
            guestId,
            date: timestamp,
            createdAt: timestamp,
            lastUpdated: timestamp,
            pendingSync: true,
            queueId: result.queueId,
          };

          setHolidayRecords((prev) => [...prev, localRecord]);

          pushAction({
            id: Date.now() + Math.random(),
            type: "HOLIDAY_LOGGED",
            timestamp,
            data: { recordId: localRecord.id, guestId },
            description: `Holiday visit logged for guest (pending sync)`,
          });

          toast.success("Holiday visit logged (will sync when online)");
          return localRecord;
        }

        // Operation completed successfully
        const mapped = mapHolidayRow(result.result);
        setHolidayRecords((prev) => [...prev, mapped]);
        pushAction({
          id: Date.now() + Math.random(),
          type: "HOLIDAY_LOGGED",
          timestamp,
          data: { recordId: mapped.id, guestId },
          description: `Holiday visit logged for guest`,
        });
        return mapped;
      } catch (error) {
        console.error("Failed to log holiday visit:", error);
        toast.error("Unable to save holiday visit.");
        throw error;
      }
    }

    const record = {
      id: createLocalId("local-holiday"),
      guestId,
      date: timestamp,
      createdAt: timestamp,
      lastUpdated: timestamp,
    };

    setHolidayRecords((prev) => [...prev, record]);

    pushAction({
      id: Date.now() + Math.random(),
      type: "HOLIDAY_LOGGED",
      timestamp,
      data: { recordId: record.id, guestId },
      description: `Holiday visit logged for guest`,
    });

    return record;
  };

  const importHolidayRecord = (
    guestId,
    { dateSubmitted = null, count = 1 } = {},
  ) => {
    const timestampIso =
      normalizeDateInputToISO(dateSubmitted) ?? new Date().toISOString();

    const importedRecords = Array.from({ length: Math.max(count, 1) }, () => ({
      id: createLocalId("import-holiday"),
      guestId,
      date: timestampIso,
      createdAt: timestampIso,
      lastUpdated: timestampIso,
      source: "import",
    }));

    setHolidayRecords((prev) => [...prev, ...importedRecords]);

    pushAction({
      id: createLocalId("action"),
      type: "HOLIDAY_IMPORTED",
      timestamp: timestampIso,
      data: { guestId, count: importedRecords.length },
      description: `Imported ${importedRecords.length} holiday record${
        importedRecords.length === 1 ? "" : "s"
      }`,
    });

    return importedRecords;
  };

  return {
    addHolidayRecord,
    importHolidayRecord,
  };
};
