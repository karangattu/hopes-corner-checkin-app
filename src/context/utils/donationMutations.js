import { addDonationWithOffline } from '../../utils/offlineOperations';

export const createDonationMutations = ({
  supabaseEnabled,
  supabaseClient,
  mapDonationRow,
  setDonationRecords,
  createLocalId,
  pushAction,
  toast,
  normalizeDateInputToISO,
  resolveDonationDateParts,
}) => {
  const addDonation = async (typeInput, quantityInput, dateSubmitted = null) => {
    const timestamp = normalizeDateInputToISO(dateSubmitted) ?? new Date().toISOString();
    const { datePart, timePart } = resolveDonationDateParts(timestamp);
    const type = typeInput || "";
    const quantity = Number(quantityInput) || 0;

    if (!type || quantity <= 0) {
      throw new Error("Invalid donation type or quantity");
    }

    if (supabaseEnabled && supabaseClient) {
      try {
        const payload = {
          donation_type: type,
          quantity,
          date_received: datePart,
          time_received: timePart,
        };

        // Use offline-aware wrapper
        const result = await addDonationWithOffline(payload, navigator.onLine);

        if (result.queued) {
          // Operation was queued for later sync
          const localRecord = {
            id: createLocalId("local-donation"),
            type,
            quantity,
            dateReceived: datePart,
            timeReceived: timePart,
            createdAt: timestamp,
            pendingSync: true,
            queueId: result.queueId,
          };

          setDonationRecords((prev) => [...prev, localRecord]);

          pushAction({
            id: Date.now() + Math.random(),
            type: "DONATION_LOGGED",
            timestamp,
            data: { recordId: localRecord.id, donationType: type, quantity },
            description: `Donation logged: ${quantity} ${type} (pending sync)`,
          });

          toast.success("Donation logged (will sync when online)");
          return localRecord;
        }

        // Operation completed successfully
        const mapped = mapDonationRow(result.result);
        setDonationRecords((prev) => [...prev, mapped]);
        pushAction({
          id: Date.now() + Math.random(),
          type: "DONATION_LOGGED",
          timestamp,
          data: { recordId: mapped.id, donationType: type, quantity },
          description: `Donation logged: ${quantity} ${type}`,
        });
        return mapped;
      } catch (error) {
        console.error("Failed to log donation:", error);
        toast.error("Unable to save donation.");
        throw error;
      }
    }

    const record = {
      id: createLocalId("local-donation"),
      type,
      quantity,
      dateReceived: datePart,
      timeReceived: timePart,
      createdAt: timestamp,
    };

    setDonationRecords((prev) => [...prev, record]);

    pushAction({
      id: Date.now() + Math.random(),
      type: "DONATION_LOGGED",
      timestamp,
      data: { recordId: record.id, donationType: type, quantity },
      description: `Donation logged: ${quantity} ${type}`,
    });

    return record;
  };

  const importDonationRecord = (
    { donationType, quantity, dateSubmitted = null, count = 1 } = {},
  ) => {
    const timestampIso =
      normalizeDateInputToISO(dateSubmitted) ?? new Date().toISOString();
    const { datePart, timePart } = resolveDonationDateParts(timestampIso);

    const importedRecords = Array.from({ length: Math.max(count, 1) }, () => ({
      id: createLocalId("import-donation"),
      type: donationType || "Protein",
      quantity: Number(quantity) || 1,
      dateReceived: datePart,
      timeReceived: timePart,
      createdAt: timestampIso,
      source: "import",
    }));

    setDonationRecords((prev) => [...prev, ...importedRecords]);

    pushAction({
      id: createLocalId("action"),
      type: "DONATION_IMPORTED",
      timestamp: timestampIso,
      data: { count: importedRecords.length },
      description: `Imported ${importedRecords.length} donation record${
        importedRecords.length === 1 ? "" : "s"
      }`,
    });

    return importedRecords;
  };

  return {
    addDonation,
    importDonationRecord,
  };
};
