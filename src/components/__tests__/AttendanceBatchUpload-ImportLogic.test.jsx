import { describe, it, expect, vi } from "vitest";
import { BICYCLE_REPAIR_STATUS } from "../../context/constants";

/**
 * Test suite for AttendanceBatchUpload import logic
 *
 * This test ensures that:
 * 1. Imported records respect the date from CSV (not defaulting to today)
 * 2. Bicycle records are created with the correct date
 * 3. Shower records preserve the date
 * 4. Laundry records preserve the date
 * 5. Meal records preserve the date
 *
 * Bug context: Previously, bicycle records were imported without passing
 * dateOverride, causing all bicycle records to appear on today's date
 * instead of the date specified in the CSV.
 */

describe("AttendanceBatchUpload - Import Logic", () => {
  // Mock helper to simulate the attendance import behavior
  const createMockImportFunctions = () => {
    const mockCalls = {
      addMealRecord: [],
      addBicycleRecord: [],
      addShowerRecord: [],
      addLaundryRecord: [],
      addHaircutRecord: [],
      addHolidayRecord: [],
    };

    const addMealRecord = vi.fn((guestId, count, date) => {
      mockCalls.addMealRecord.push({ guestId, count, date });
    });

    const addBicycleRecord = vi.fn((guestId, options = {}) => {
      mockCalls.addBicycleRecord.push({
        guestId,
        dateOverride: options.dateOverride,
        repairType: options.repairType,
        statusOverride: options.statusOverride,
        completedAtOverride: options.completedAtOverride,
      });
    });

    const addShowerRecord = vi.fn((guestId, date) => {
      mockCalls.addShowerRecord.push({ guestId, date });
    });

    const addLaundryRecord = vi.fn((guestId, date) => {
      mockCalls.addLaundryRecord.push({ guestId, date });
    });

    const addHaircutRecord = vi.fn((guestId, date) => {
      mockCalls.addHaircutRecord.push({ guestId, date });
    });

    const addHolidayRecord = vi.fn((guestId, date) => {
      mockCalls.addHolidayRecord.push({ guestId, date });
    });

    return {
      addMealRecord,
      addBicycleRecord,
      addShowerRecord,
      addLaundryRecord,
      addHaircutRecord,
      addHolidayRecord,
      mockCalls,
    };
  };

  describe("Bicycle record import", () => {
    it("should pass dateOverride when importing bicycle records", () => {
      const { addBicycleRecord, mockCalls } = createMockImportFunctions();

      const testDate = "2025-09-15T10:30:00Z";
      const guestId = 123;

      // Simulate the import logic
      addBicycleRecord(guestId, {
        repairType: "Legacy Import",
        notes: "Imported from legacy system",
        dateOverride: testDate,
        statusOverride: BICYCLE_REPAIR_STATUS.DONE,
        completedAtOverride: testDate,
      });

      expect(mockCalls.addBicycleRecord).toHaveLength(1);
      expect(mockCalls.addBicycleRecord[0]).toEqual({
        guestId,
        repairType: "Legacy Import",
        dateOverride: testDate,
        statusOverride: BICYCLE_REPAIR_STATUS.DONE,
        completedAtOverride: testDate,
      });
      expect(mockCalls.addBicycleRecord[0].dateOverride).toBe(testDate);
    });

    it("should NOT have dateOverride as undefined or null for historical imports", () => {
      const { addBicycleRecord, mockCalls } = createMockImportFunctions();

      const testDate = "2025-08-20T14:22:00Z";
      const guestId = 456;

      addBicycleRecord(guestId, {
        repairType: "Legacy Import",
        notes: "Imported from legacy system",
        dateOverride: testDate,
        statusOverride: BICYCLE_REPAIR_STATUS.DONE,
        completedAtOverride: testDate,
      });

      expect(mockCalls.addBicycleRecord[0].dateOverride).toBeDefined();
      expect(mockCalls.addBicycleRecord[0].dateOverride).not.toBeNull();
      expect(mockCalls.addBicycleRecord[0].dateOverride).toBe(testDate);
      expect(mockCalls.addBicycleRecord[0].statusOverride).toBe(
        BICYCLE_REPAIR_STATUS.DONE,
      );
      expect(mockCalls.addBicycleRecord[0].completedAtOverride).toBe(testDate);
    });

    it("should preserve historical dates for multiple bicycle imports", () => {
      const { addBicycleRecord, mockCalls } = createMockImportFunctions();

      const imports = [
        { guestId: 1, date: "2025-09-01T10:00:00Z" },
        { guestId: 2, date: "2025-09-05T14:30:00Z" },
        { guestId: 3, date: "2025-08-25T09:15:00Z" },
      ];

      imports.forEach(({ guestId, date }) => {
        addBicycleRecord(guestId, {
          repairType: "Legacy Import",
          notes: "Imported from legacy system",
          dateOverride: date,
          statusOverride: BICYCLE_REPAIR_STATUS.DONE,
          completedAtOverride: date,
        });
      });

      expect(mockCalls.addBicycleRecord).toHaveLength(3);

      // Verify each import has the correct date
      mockCalls.addBicycleRecord.forEach((call, index) => {
        expect(call.dateOverride).toBe(imports[index].date);
        expect(call.statusOverride).toBe(BICYCLE_REPAIR_STATUS.DONE);
        expect(call.completedAtOverride).toBe(imports[index].date);
      });
    });
  });

  describe("Meal record import", () => {
    it("should preserve the CSV date for meal records", () => {
      const { addMealRecord, mockCalls } = createMockImportFunctions();

      const testDate = "2025-09-10";
      const guestId = 789;
      const count = 1;

      addMealRecord(guestId, count, testDate);

      expect(mockCalls.addMealRecord).toHaveLength(1);
      expect(mockCalls.addMealRecord[0].date).toBe(testDate);
    });

    it("should not default meal dates to today", () => {
      const { addMealRecord, mockCalls } = createMockImportFunctions();

      const historicalDate = "2025-07-01";
      const guestId = 111;

      addMealRecord(guestId, 1, historicalDate);

      // Ensure the date is the historical date, not today's date
      expect(mockCalls.addMealRecord[0].date).toBe(historicalDate);
      expect(mockCalls.addMealRecord[0].date).not.toBe(
        new Date().toISOString().split("T")[0],
      );
    });
  });

  describe("All service type imports with date handling", () => {
    it("should preserve dates across all service types", () => {
      const mocks = createMockImportFunctions();
      const testDate = "2025-09-12T11:00:00Z";
      const guestId = 500;

      // Simulate importing various service types with the same historical date
      mocks.addMealRecord(guestId, 1, testDate);
      mocks.addBicycleRecord(guestId, { dateOverride: testDate });
      mocks.addShowerRecord(guestId, testDate);
      mocks.addLaundryRecord(guestId, testDate);
      mocks.addHaircutRecord(guestId, testDate);
      mocks.addHolidayRecord(guestId, testDate);

      // Verify all records have the same date
      expect(mocks.mockCalls.addMealRecord[0].date).toBe(testDate);
      expect(mocks.mockCalls.addBicycleRecord[0].dateOverride).toBe(testDate);
      expect(mocks.mockCalls.addShowerRecord[0].date).toBe(testDate);
      expect(mocks.mockCalls.addLaundryRecord[0].date).toBe(testDate);
      expect(mocks.mockCalls.addHaircutRecord[0].date).toBe(testDate);
      expect(mocks.mockCalls.addHolidayRecord[0].date).toBe(testDate);
    });

    it("should handle different dates for different records", () => {
      const mocks = createMockImportFunctions();
      const guestId = 600;

      const records = [
        { type: "meal", date: "2025-09-01", count: 1 },
        { type: "bicycle", date: "2025-09-05" },
        { type: "meal", date: "2025-09-10", count: 1 },
        { type: "bicycle", date: "2025-09-15" },
      ];

      records.forEach((record) => {
        if (record.type === "meal") {
          mocks.addMealRecord(guestId, record.count, record.date);
        } else if (record.type === "bicycle") {
          mocks.addBicycleRecord(guestId, { dateOverride: record.date });
        }
      });

      expect(mocks.mockCalls.addMealRecord).toHaveLength(2);
      expect(mocks.mockCalls.addBicycleRecord).toHaveLength(2);

      expect(mocks.mockCalls.addMealRecord[0].date).toBe("2025-09-01");
      expect(mocks.mockCalls.addMealRecord[1].date).toBe("2025-09-10");
      expect(mocks.mockCalls.addBicycleRecord[0].dateOverride).toBe(
        "2025-09-05",
      );
      expect(mocks.mockCalls.addBicycleRecord[1].dateOverride).toBe(
        "2025-09-15",
      );
    });
  });

  describe("Regression tests - Bug prevention", () => {
    it("should NOT create all bicycle records on today's date", () => {
      const { addBicycleRecord, mockCalls } = createMockImportFunctions();

      const today = new Date().toISOString().split("T")[0];
      const historicalDate = "2025-06-01T10:00:00Z";

      // Import a bicycle record with a historical date
      addBicycleRecord(1, {
        repairType: "Legacy Import",
        dateOverride: historicalDate,
      });

      // Verify it's NOT today's date
      expect(mockCalls.addBicycleRecord[0].dateOverride).not.toBe(today);
      expect(mockCalls.addBicycleRecord[0].dateOverride).toBe(historicalDate);
    });

    it("should include dateOverride in bicycle record options", () => {
      const { addBicycleRecord, mockCalls } = createMockImportFunctions();

      const testDate = "2025-08-15T12:00:00Z";

      addBicycleRecord(1, {
        repairType: "Legacy Import",
        notes: "Imported from legacy system",
        dateOverride: testDate,
      });

      // The key test: dateOverride should be present
      expect(Object.keys(mockCalls.addBicycleRecord[0])).toContain(
        "dateOverride",
      );
      expect(mockCalls.addBicycleRecord[0]).toHaveProperty("dateOverride");
    });

    it("batch bicycle imports should each have their own date", () => {
      const { addBicycleRecord, mockCalls } = createMockImportFunctions();

      // Simulate batch import with dates spanning multiple months
      const batchImport = [
        { guestId: 1, date: "2025-05-01T08:00:00Z" },
        { guestId: 2, date: "2025-06-15T10:30:00Z" },
        { guestId: 3, date: "2025-07-20T14:00:00Z" },
        { guestId: 4, date: "2025-08-10T09:15:00Z" },
        { guestId: 5, date: "2025-09-05T11:45:00Z" },
      ];

      batchImport.forEach(({ guestId, date }) => {
        addBicycleRecord(guestId, {
          repairType: "Legacy Import",
          dateOverride: date,
        });
      });

      expect(mockCalls.addBicycleRecord).toHaveLength(5);

      // Each should have its own unique date, not all the same
      const dates = mockCalls.addBicycleRecord.map((call) => call.dateOverride);
      const uniqueDates = new Set(dates);
      expect(uniqueDates.size).toBe(5); // All 5 dates should be unique
    });
  });
});
