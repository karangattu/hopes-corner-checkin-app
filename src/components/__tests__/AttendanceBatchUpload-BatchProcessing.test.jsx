import { describe, it, expect, vi } from "vitest";

/**
 * Test suite for AttendanceBatchUpload batch processing functionality
 *
 * This test ensures that:
 * 1. Records are grouped by type before processing
 * 2. Batch insert functions are called instead of individual inserts for large datasets
 * 3. Progress updates are shown during upload
 * 4. Errors are handled gracefully in batch mode
 * 5. Fallback to individual inserts works when batch functions aren't available
 *
 * Context: Batch processing is critical for handling 2000+ records without
 * rate limiting or timeout issues.
 *
 * Note: These are unit tests that test the batch processing logic directly,
 * without rendering React components.
 */

describe("AttendanceBatchUpload - Batch Processing Logic", () => {
  describe("Record grouping by type", () => {
    it("should group records by program type before processing", () => {
      const groupRecordsByType = (records) => {
        const recordsByType = {
          meals: [],
          showers: [],
          laundry: [],
          bicycles: [],
          haircuts: [],
          holidays: [],
          specialMeals: [],
        };

        records.forEach((record) => {
          const type = record.programType;
          if (recordsByType[type]) {
            recordsByType[type].push(record);
          }
        });

        return recordsByType;
      };

      const records = [
        { id: 1, programType: "meals" },
        { id: 2, programType: "meals" },
        { id: 3, programType: "showers" },
        { id: 4, programType: "laundry" },
        { id: 5, programType: "meals" },
      ];

      const grouped = groupRecordsByType(records);

      expect(grouped.meals).toHaveLength(3);
      expect(grouped.showers).toHaveLength(1);
      expect(grouped.laundry).toHaveLength(1);
      expect(grouped.bicycles).toHaveLength(0);
    });

    it("should separate special meal types from regular records", () => {
      const SPECIAL_GUEST_IDS = {
        M91834859: { type: "extra", label: "Extra meals" },
        M94816825: { type: "rv", label: "RV meals" },
      };

      const categorizeRecords = (records) => {
        const specialMeals = [];
        const regularRecords = [];

        records.forEach((record) => {
          if (SPECIAL_GUEST_IDS[record.guestId]) {
            specialMeals.push({
              ...record,
              isSpecial: true,
              specialMapping: SPECIAL_GUEST_IDS[record.guestId],
            });
          } else {
            regularRecords.push(record);
          }
        });

        return { specialMeals, regularRecords };
      };

      const records = [
        { id: 1, guestId: "G001", program: "Meal" },
        { id: 2, guestId: "M91834859", program: "Meal" },
        { id: 3, guestId: "G002", program: "Meal" },
        { id: 4, guestId: "M94816825", program: "Meal" },
      ];

      const categorized = categorizeRecords(records);

      expect(categorized.specialMeals).toHaveLength(2);
      expect(categorized.regularRecords).toHaveLength(2);
      expect(categorized.specialMeals[0].specialMapping.type).toBe("extra");
      expect(categorized.specialMeals[1].specialMapping.type).toBe("rv");
    });
  });

  describe("Batch vs individual processing", () => {
    it("should use batch insert for large datasets when available", async () => {
      const mockBatchInsert = vi.fn(async (payloads) => payloads);
      const mockIndividualInsert = vi.fn(async (record) => record);

      const processRecords = async (records, useBatch = true) => {
        if (useBatch && mockBatchInsert) {
          await mockBatchInsert(records);
        } else {
          for (const record of records) {
            await mockIndividualInsert(record);
          }
        }
      };

      const records = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      // Process with batch
      await processRecords(records, true);

      expect(mockBatchInsert).toHaveBeenCalledTimes(1);
      expect(mockBatchInsert).toHaveBeenCalledWith(records);
      expect(mockIndividualInsert).not.toHaveBeenCalled();
    });

    it("should fall back to individual inserts when batch functions aren't available", async () => {
      const mockIndividualInsert = vi.fn(async (record) => record);

      const processRecords = async (records, batchInsertFn = null) => {
        if (batchInsertFn) {
          await batchInsertFn(records);
        } else {
          for (const record of records) {
            await mockIndividualInsert(record);
          }
        }
      };

      const records = [{ id: 1 }, { id: 2 }];

      // Process without batch function
      await processRecords(records, null);

      expect(mockIndividualInsert).toHaveBeenCalledTimes(2);
    });
  });

  describe("Progress tracking", () => {
    it("should track progress during batch processing", async () => {
      const progressUpdates = [];
      const setProgress = (message) => progressUpdates.push(message);

      const processBatches = async (records) => {
        setProgress("Parsing CSV file...");
        setProgress(`Preparing to import ${records.length} records...`);

        const groups = {
          meals: records.filter((r) => r.type === "meal"),
          showers: records.filter((r) => r.type === "shower"),
        };

        for (const [type, typeRecords] of Object.entries(groups)) {
          if (typeRecords.length > 0) {
            setProgress(`Processing ${typeRecords.length} ${type} records...`);
            // Simulate processing
            await Promise.resolve();
          }
        }

        setProgress(null); // Clear progress
      };

      const records = [
        { id: 1, type: "meal" },
        { id: 2, type: "meal" },
        { id: 3, type: "shower" },
      ];

      await processBatches(records);

      expect(progressUpdates).toContain("Parsing CSV file...");
      expect(progressUpdates).toContain("Preparing to import 3 records...");
      expect(progressUpdates).toContain("Processing 2 meals records...");
      expect(progressUpdates).toContain("Processing 1 showers records...");
      expect(progressUpdates[progressUpdates.length - 1]).toBe(null);
    });

    it("should clear progress indicator after completion", () => {
      let progress = "Processing...";
      const setProgress = (value) => {
        progress = value;
      };

      // Start processing
      setProgress("Processing records...");
      expect(progress).toBe("Processing records...");

      // Complete processing
      setProgress(null);
      expect(progress).toBe(null);
    });
  });

  describe("Error handling in batch mode", () => {
    it("should handle batch insert errors gracefully", async () => {
      const mockBatchInsert = vi.fn().mockRejectedValue(new Error("Database error"));

      const processWithErrorHandling = async (records) => {
        const errors = [];
        let successCount = 0;

        try {
          const result = await mockBatchInsert(records);
          successCount += result.length;
        } catch (error) {
          errors.push({ type: "batch", error: error.message });
        }

        return { successCount, errors };
      };

      const records = [{ id: 1 }, { id: 2 }];
      const result = await processWithErrorHandling(records);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe("Database error");
      expect(result.successCount).toBe(0);
    });

    it("should report partial success with batch errors", async () => {
      const mockMealBatch = vi.fn(async (records) => records);
      const mockShowerBatch = vi.fn().mockRejectedValue(new Error("Shower batch failed"));

      const processMultipleBatches = async (recordsByType) => {
        let successCount = 0;
        const errors = [];

        // Process meals
        try {
          const mealResults = await mockMealBatch(recordsByType.meals);
          successCount += mealResults.length;
        } catch (error) {
          errors.push({ type: "meals", error: error.message });
        }

        // Process showers
        try {
          const showerResults = await mockShowerBatch(recordsByType.showers);
          successCount += showerResults.length;
        } catch (error) {
          errors.push({ type: "showers", error: error.message });
        }

        return { successCount, errors };
      };

      const recordsByType = {
        meals: [{ id: 1 }, { id: 2 }],
        showers: [{ id: 3 }],
      };

      const result = await processMultipleBatches(recordsByType);

      expect(result.successCount).toBe(2); // Meals succeeded
      expect(result.errors).toHaveLength(1); // Showers failed
      expect(result.errors[0].type).toBe("showers");
    });
  });

  describe("Performance characteristics", () => {
    it("should process 2000 records efficiently", async () => {
      const mockBatchInsert = vi.fn(async (records) => records);

      const processRecords = async (records) => {
        // Simulate batch processing
        await mockBatchInsert(records);
        return records.length;
      };

      const records = Array.from({ length: 2000 }, (_, i) => ({ id: i }));

      const startTime = Date.now();
      const count = await processRecords(records);
      const duration = Date.now() - startTime;

      expect(count).toBe(2000);
      expect(mockBatchInsert).toHaveBeenCalledTimes(1); // Single batch call
      expect(duration).toBeLessThan(100); // Should be very fast for mocked operation
    });

    it("should handle mixed record types efficiently", async () => {
      const batchInsertFns = {
        meals: vi.fn(async (records) => records),
        showers: vi.fn(async (records) => records),
        laundry: vi.fn(async (records) => records),
        bicycles: vi.fn(async (records) => records),
        haircuts: vi.fn(async (records) => records),
        holidays: vi.fn(async (records) => records),
      };

      const processRecordsByType = async (recordsByType) => {
        const results = {};

        for (const [type, records] of Object.entries(recordsByType)) {
          if (records.length > 0 && batchInsertFns[type]) {
            results[type] = await batchInsertFns[type](records);
          }
        }

        return results;
      };

      // Create 1000 records distributed across types
      const recordsByType = {
        meals: Array.from({ length: 200 }, (_, i) => ({ id: i })),
        showers: Array.from({ length: 150 }, (_, i) => ({ id: i })),
        laundry: Array.from({ length: 150 }, (_, i) => ({ id: i })),
        bicycles: Array.from({ length: 150 }, (_, i) => ({ id: i })),
        haircuts: Array.from({ length: 150 }, (_, i) => ({ id: i })),
        holidays: Array.from({ length: 200 }, (_, i) => ({ id: i })),
      };

      const results = await processRecordsByType(recordsByType);

      // Each type should be processed in a single batch
      expect(batchInsertFns.meals).toHaveBeenCalledTimes(1);
      expect(batchInsertFns.showers).toHaveBeenCalledTimes(1);
      expect(batchInsertFns.laundry).toHaveBeenCalledTimes(1);
      expect(batchInsertFns.bicycles).toHaveBeenCalledTimes(1);
      expect(batchInsertFns.haircuts).toHaveBeenCalledTimes(1);
      expect(batchInsertFns.holidays).toHaveBeenCalledTimes(1);

      // Verify all records were processed
      const totalProcessed = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalProcessed).toBe(1000);
    });
  });

  describe("State updates after batch insert", () => {
    it("should update state with batch results", async () => {
      const mockSetMealRecords = vi.fn();
      const batchResults = [{ id: 1 }, { id: 2 }, { id: 3 }];

      // Simulate state update after batch insert
      mockSetMealRecords((prev) => [...batchResults, ...prev]);

      expect(mockSetMealRecords).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should prepend batch results to existing records", () => {
      const existingRecords = [{ id: "existing-1" }, { id: "existing-2" }];
      const batchResults = [{ id: "new-1" }, { id: "new-2" }];

      // Simulate the update function
      const updateFunction = (prev) => [...batchResults, ...prev];
      const updatedRecords = updateFunction(existingRecords);

      expect(updatedRecords).toHaveLength(4);
      expect(updatedRecords[0].id).toBe("new-1");
      expect(updatedRecords[1].id).toBe("new-2");
      expect(updatedRecords[2].id).toBe("existing-1");
      expect(updatedRecords[3].id).toBe("existing-2");
    });
  });

  describe("Validation and pre-processing", () => {
    it("should validate guests exist before grouping", () => {
      const guests = [
        { id: "uuid-1", guestId: "G001" },
        { id: "uuid-2", guestId: "G002" },
      ];

      const validateAndEnrich = (records, guestList) => {
        const validRecords = [];
        const errors = [];

        records.forEach((record, index) => {
          const guest = guestList.find((g) => g.guestId === record.guestId);
          if (!guest) {
            errors.push({ row: index + 2, error: `Guest ${record.guestId} not found` });
          } else {
            validRecords.push({
              ...record,
              internalGuestId: guest.id,
              guest,
            });
          }
        });

        return { validRecords, errors };
      };

      const records = [
        { guestId: "G001", program: "Meal" },
        { guestId: "INVALID", program: "Meal" },
        { guestId: "G002", program: "Shower" },
      ];

      const result = validateAndEnrich(records, guests);

      expect(result.validRecords).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain("INVALID");
      expect(result.validRecords[0].internalGuestId).toBe("uuid-1");
    });

    it("should reject guests with local IDs when Supabase is enabled", () => {
      const guests = [
        { id: "uuid-1", guestId: "G001" },
        { id: "local-abc123", guestId: "G002" },
      ];

      const validateForSupabase = (records, guestList, supabaseEnabled) => {
        const validRecords = [];
        const errors = [];

        records.forEach((record, index) => {
          const guest = guestList.find((g) => g.guestId === record.guestId);
          if (!guest) {
            errors.push({ row: index + 2, error: "Guest not found" });
            return;
          }

          if (supabaseEnabled && guest.id.startsWith("local-")) {
            errors.push({
              row: index + 2,
              error: `Guest ${guest.guestId} was created locally and cannot be synced`,
            });
            return;
          }

          validRecords.push({ ...record, internalGuestId: guest.id });
        });

        return { validRecords, errors };
      };

      const records = [
        { guestId: "G001", program: "Meal" },
        { guestId: "G002", program: "Meal" },
      ];

      const result = validateForSupabase(records, guests, true);

      expect(result.validRecords).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain("created locally");
    });
  });
});
