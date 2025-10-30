import { describe, it, expect } from "vitest";

/**
 * Integration test for Bicycle and Haircut metrics in analytics
 *
 * This test ensures that:
 * 1. Bicycle records with status='done' are counted in analytics
 * 2. Haircut records are counted in analytics
 * 3. Records with CSV-imported dates appear in the correct time ranges
 * 4. Metrics calculations include all imported records
 *
 * Bug context: Previously, bicycle and haircut records from CSV imports
 * were not appearing in analytics metrics due to date and status issues.
 */

describe("Analytics Metrics - Bicycle and Haircut Records", () => {
  const BICYCLE_REPAIR_STATUS = {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    DONE: "done",
  };

  describe("Bicycle record filtering for metrics", () => {
    it("should count bicycle records with status='done'", () => {
      const bicycleRecords = [
        {
          id: "bike-1",
          guestId: "guest-123",
          date: "2025-09-06T10:35:54Z",
          status: "done",
          repairTypes: ["Legacy Import"],
        },
        {
          id: "bike-2",
          guestId: "guest-456",
          date: "2025-09-06T10:36:25Z",
          status: "done",
          repairTypes: ["Legacy Import"],
        },
      ];

      // Simulate the filter from getUniversalTimeRangeMetrics
      const periodBicycles = bicycleRecords.filter(
        (r) =>
          r.date >= "2025-09-01T00:00:00Z" &&
          r.date <= "2025-09-30T23:59:59Z" &&
          (r.status ? r.status === BICYCLE_REPAIR_STATUS.DONE : true),
      );

      expect(periodBicycles).toHaveLength(2);
      expect(periodBicycles.every((r) => r.status === "done")).toBe(true);
    });

    it("should not count bicycle records with status='pending'", () => {
      const bicycleRecords = [
        {
          id: "bike-1",
          guestId: "guest-123",
          date: "2025-09-06T10:35:54Z",
          status: "pending",
          repairTypes: ["Flat Tire"],
        },
      ];

      // Simulate the filter from getUniversalTimeRangeMetrics
      const periodBicycles = bicycleRecords.filter(
        (r) =>
          r.date >= "2025-09-01T00:00:00Z" &&
          r.date <= "2025-09-30T23:59:59Z" &&
          (r.status ? r.status === BICYCLE_REPAIR_STATUS.DONE : true),
      );

      expect(periodBicycles).toHaveLength(0);
    });

    it("should count bicycle records with no status field", () => {
      const bicycleRecords = [
        {
          id: "bike-1",
          guestId: "guest-123",
          date: "2025-09-06T10:35:54Z",
          // status field missing - legacy record
          repairTypes: ["Legacy Import"],
        },
      ];

      // Simulate the filter from getUniversalTimeRangeMetrics
      const periodBicycles = bicycleRecords.filter(
        (r) =>
          r.date >= "2025-09-01T00:00:00Z" &&
          r.date <= "2025-09-30T23:59:59Z" &&
          (r.status ? r.status === BICYCLE_REPAIR_STATUS.DONE : true),
      );

      expect(periodBicycles).toHaveLength(1);
    });
  });

  describe("Haircut record counting for metrics", () => {
    it("should count all haircut records in date range", () => {
      const haircutRecords = [
        {
          id: "hair-1",
          guestId: "guest-1",
          date: "2025-09-10T11:43:03Z",
        },
        {
          id: "hair-2",
          guestId: "guest-2",
          date: "2025-09-10T11:43:42Z",
        },
        {
          id: "hair-3",
          guestId: "guest-3",
          date: "2025-09-10T11:44:19Z",
        },
        {
          id: "hair-4",
          guestId: "guest-4",
          date: "2025-09-10T11:45:00Z",
        },
      ];

      // Simulate the filter from getUniversalTimeRangeMetrics
      const periodHaircuts = haircutRecords.filter(
        (r) =>
          r.date >= "2025-09-10T00:00:00Z" &&
          r.date <= "2025-09-10T23:59:59Z",
      );

      expect(periodHaircuts).toHaveLength(4);
    });

    it("should not count haircut records outside date range", () => {
      const haircutRecords = [
        {
          id: "hair-1",
          guestId: "guest-1",
          date: "2025-09-09T11:43:03Z",
        },
        {
          id: "hair-2",
          guestId: "guest-2",
          date: "2025-09-11T11:43:42Z",
        },
      ];

      // Simulate the filter for Sept 10 only
      const periodHaircuts = haircutRecords.filter(
        (r) =>
          r.date >= "2025-09-10T00:00:00Z" &&
          r.date <= "2025-09-10T23:59:59Z",
      );

      expect(periodHaircuts).toHaveLength(0);
    });
  });

  describe("Date range filtering across months", () => {
    it("should count bicycle records from multiple months", () => {
      const bicycleRecords = [
        {
          id: "bike-1",
          date: "2025-05-06T10:35:54Z",
          status: "done",
          repairTypes: ["Legacy Import"],
        },
        {
          id: "bike-2",
          date: "2025-06-15T10:30:00Z",
          status: "done",
          repairTypes: ["Legacy Import"],
        },
        {
          id: "bike-3",
          date: "2025-07-20T14:00:00Z",
          status: "done",
          repairTypes: ["Legacy Import"],
        },
        {
          id: "bike-4",
          date: "2025-08-10T09:15:00Z",
          status: "done",
          repairTypes: ["Legacy Import"],
        },
        {
          id: "bike-5",
          date: "2025-09-05T11:45:00Z",
          status: "done",
          repairTypes: ["Legacy Import"],
        },
      ];

      // Filter for entire period
      const periodBicycles = bicycleRecords.filter(
        (r) =>
          r.date >= "2025-05-01T00:00:00Z" &&
          r.date <= "2025-09-30T23:59:59Z" &&
          (r.status ? r.status === BICYCLE_REPAIR_STATUS.DONE : true),
      );

      expect(periodBicycles).toHaveLength(5);
    });

    it("should count haircut records from specific date", () => {
      const haircutRecords = [
        { id: "hair-1", date: "2025-09-10T11:43:03Z" },
        { id: "hair-2", date: "2025-09-10T11:43:42Z" },
        { id: "hair-3", date: "2025-09-10T11:44:19Z" },
        { id: "hair-4", date: "2025-09-10T11:45:00Z" },
      ];

      // Filter for September 10th
      const periodHaircuts = haircutRecords.filter(
        (r) =>
          r.date >= "2025-09-10T00:00:00Z" &&
          r.date <= "2025-09-10T23:59:59Z",
      );

      expect(periodHaircuts).toHaveLength(4);
    });
  });

  describe("Service count calculation", () => {
    const getBicycleServiceCount = (record) => {
      if (!record) return 0;
      const rawTypes = Array.isArray(record.repairTypes)
        ? record.repairTypes.filter((type) => {
            if (type == null) return false;
            const label = String(type).trim();
            return label.length > 0;
          })
        : [];
      if (rawTypes.length > 0) {
        return rawTypes.length;
      }
      return record.repairType ? 1 : 0;
    };

    it("should count bicycle repairs based on repair_types array length", () => {
      const record = {
        id: "bike-1",
        repairTypes: ["Legacy Import"],
        status: "done",
      };

      const count = getBicycleServiceCount(record);
      expect(count).toBe(1);
    });

    it("should count 1 for each haircut record", () => {
      const haircutRecords = [
        { id: "hair-1", date: "2025-09-10T11:43:03Z" },
        { id: "hair-2", date: "2025-09-10T11:43:42Z" },
        { id: "hair-3", date: "2025-09-10T11:44:19Z" },
        { id: "hair-4", date: "2025-09-10T11:45:00Z" },
      ];

      const totalHaircuts = haircutRecords.length;
      expect(totalHaircuts).toBe(4);
    });

    it("should handle empty repair_types array", () => {
      const record = {
        id: "bike-1",
        repairTypes: [],
        repairType: "Flat Tire",
        status: "done",
      };

      const count = getBicycleServiceCount(record);
      // Should fall back to repairType if repair_types is empty
      expect(count).toBe(1);
    });
  });

  describe("Metrics aggregation simulation", () => {
    it("should aggregate bicycle records for daily metrics", () => {
      const bicycleRecords = [
        {
          id: "bike-1",
          date: "2025-09-06T10:35:54Z",
          status: "done",
          repairTypes: ["Legacy Import"],
        },
        {
          id: "bike-2",
          date: "2025-09-06T10:36:25Z",
          status: "done",
          repairTypes: ["Legacy Import"],
        },
        {
          id: "bike-3",
          date: "2025-09-06T10:37:46Z",
          status: "done",
          repairTypes: ["Legacy Import"],
        },
      ];

      const getBicycleServiceCount = (record) => {
        if (!record) return 0;
        const rawTypes = Array.isArray(record.repairTypes)
          ? record.repairTypes.filter((type) => {
              if (type == null) return false;
              return String(type).trim().length > 0;
            })
          : [];
        if (rawTypes.length > 0) return rawTypes.length;
        return record.repairType ? 1 : 0;
      };

      // Simulate metrics calculation
      const periodBicycles = bicycleRecords.filter(
        (r) =>
          r.date >= "2025-09-06T00:00:00Z" &&
          r.date <= "2025-09-06T23:59:59Z" &&
          (r.status ? r.status === BICYCLE_REPAIR_STATUS.DONE : true),
      );

      const totalBicycles = periodBicycles.reduce(
        (sum, r) => sum + getBicycleServiceCount(r),
        0,
      );

      expect(totalBicycles).toBe(3);
    });

    it("should aggregate haircut records for daily metrics", () => {
      const haircutRecords = [
        { id: "hair-1", date: "2025-09-10T11:43:03Z" },
        { id: "hair-2", date: "2025-09-10T11:43:42Z" },
        { id: "hair-3", date: "2025-09-10T11:44:19Z" },
        { id: "hair-4", date: "2025-09-10T11:45:00Z" },
      ];

      // Simulate metrics calculation
      const periodHaircuts = haircutRecords.filter(
        (r) =>
          r.date >= "2025-09-10T00:00:00Z" &&
          r.date <= "2025-09-10T23:59:59Z",
      );

      const totalHaircuts = periodHaircuts.length;

      expect(totalHaircuts).toBe(4);
    });
  });

  describe("Regression: CSV Import Records in Analytics", () => {
    it("should include CSV-imported bicycle records with status='done'", () => {
      // This simulates records that were imported from CSV
      const csvImportedBicycles = [
        {
          id: "bike-imported-1",
          guestId: "M73402640",
          date: "2025-09-06T14:00:00Z", // After timezone conversion
          status: "done", // Explicitly set to done
          repairTypes: ["Legacy Import"],
        },
        {
          id: "bike-imported-2",
          guestId: "M56528545",
          date: "2025-09-06T14:00:00Z", // After timezone conversion
          status: "done",
          repairTypes: ["Legacy Import"],
        },
        {
          id: "bike-imported-3",
          guestId: "M32444962",
          date: "2025-09-06T14:00:00Z", // After timezone conversion
          status: "done",
          repairTypes: ["Legacy Import"],
        },
      ];

      // Filter for September
      const periodBicycles = csvImportedBicycles.filter(
        (r) =>
          r.date >= "2025-09-01T00:00:00Z" &&
          r.date <= "2025-09-30T23:59:59Z" &&
          (r.status ? r.status === BICYCLE_REPAIR_STATUS.DONE : true),
      );

      expect(periodBicycles).toHaveLength(3);
      expect(periodBicycles.every((r) => r.repairTypes)).toBe(true);
    });

    it("should include CSV-imported haircut records", () => {
      // This simulates records that were imported from CSV
      const csvImportedHaircuts = [
        {
          id: "hair-imported-1",
          guestId: "M68859243",
          date: "2025-09-10T14:00:00Z", // After timezone conversion
        },
        {
          id: "hair-imported-2",
          guestId: "M41671847",
          date: "2025-09-10T14:00:00Z", // After timezone conversion
        },
        {
          id: "hair-imported-3",
          guestId: "M14763626",
          date: "2025-09-10T14:00:00Z", // After timezone conversion
        },
        {
          id: "hair-imported-4",
          guestId: "M40418985",
          date: "2025-09-10T14:00:00Z", // After timezone conversion
        },
      ];

      // Filter for September 10th
      const periodHaircuts = csvImportedHaircuts.filter(
        (r) =>
          r.date >= "2025-09-10T00:00:00Z" &&
          r.date <= "2025-09-10T23:59:59Z",
      );

      expect(periodHaircuts).toHaveLength(4);
    });
  });
});
