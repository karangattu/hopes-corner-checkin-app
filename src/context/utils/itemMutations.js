import { addItemWithOffline } from '../../utils/offlineOperations';

export const createItemMutations = ({
  supabaseEnabled,
  supabaseClient,
  mapItemRow,
  ensureGuestServiceEligible,
  setItemGivenRecords,
  pacificDateStringFrom,
  todayPacificDateString,
  createLocalId,
  pushAction,
  toast,
  normalizeDateInputToISO,
}) => {
  const addItemGiven = async (guestId, itemDescription, dateOverride = null) => {
    const timestamp = dateOverride || new Date().toISOString();
    const today = dateOverride
      ? pacificDateStringFrom(dateOverride)
      : todayPacificDateString();

    ensureGuestServiceEligible(guestId, "items");

    if (supabaseEnabled && supabaseClient) {
      try {
        const payload = {
          guest_id: guestId,
          item_description: itemDescription,
          date_given: today,
        };

        // Use offline-aware wrapper
        const result = await addItemWithOffline(payload, navigator.onLine);

        if (result.queued) {
          // Operation was queued for later sync
          const localRecord = {
            id: createLocalId("local-item"),
            guestId,
            itemDescription,
            date: timestamp,
            createdAt: timestamp,
            lastUpdated: timestamp,
            pendingSync: true,
            queueId: result.queueId,
          };

          setItemGivenRecords((prev) => [...prev, localRecord]);

          pushAction({
            id: Date.now() + Math.random(),
            type: "ITEM_GIVEN",
            timestamp,
            data: { recordId: localRecord.id, guestId, itemDescription },
            description: `Item given: ${itemDescription} (pending sync)`,
          });

          toast.success("Item logged (will sync when online)");
          return localRecord;
        }

        // Operation completed successfully
        const mapped = mapItemRow(result.result);
        setItemGivenRecords((prev) => [...prev, mapped]);
        pushAction({
          id: Date.now() + Math.random(),
          type: "ITEM_GIVEN",
          timestamp,
          data: { recordId: mapped.id, guestId, itemDescription },
          description: `Item given: ${itemDescription}`,
        });
        return mapped;
      } catch (error) {
        console.error("Failed to log item:", error);
        toast.error("Unable to save item.");
        throw error;
      }
    }

    const record = {
      id: createLocalId("local-item"),
      guestId,
      itemDescription,
      date: timestamp,
      createdAt: timestamp,
      lastUpdated: timestamp,
    };

    setItemGivenRecords((prev) => [...prev, record]);

    pushAction({
      id: Date.now() + Math.random(),
      type: "ITEM_GIVEN",
      timestamp,
      data: { recordId: record.id, guestId, itemDescription },
      description: `Item given: ${itemDescription}`,
    });

    return record;
  };

  const importItemRecord = (
    guestId,
    { dateSubmitted = null, itemDescription = "Item", count = 1 } = {},
  ) => {
    const timestampIso =
      normalizeDateInputToISO(dateSubmitted) ?? new Date().toISOString();

    const importedRecords = Array.from({ length: Math.max(count, 1) }, () => ({
      id: createLocalId("import-item"),
      guestId,
      itemDescription,
      date: timestampIso,
      createdAt: timestampIso,
      lastUpdated: timestampIso,
      source: "import",
    }));

    setItemGivenRecords((prev) => [...prev, ...importedRecords]);

    pushAction({
      id: createLocalId("action"),
      type: "ITEM_IMPORTED",
      timestamp: timestampIso,
      data: { guestId, count: importedRecords.length },
      description: `Imported ${importedRecords.length} item record${
        importedRecords.length === 1 ? "" : "s"
      }`,
    });

    return importedRecords;
  };

  return {
    addItemGiven,
    importItemRecord,
  };
};
