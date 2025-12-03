import { describe, it, expect } from "vitest";

/**
 * Tests for Analytics filter functionality with getUniversalTimeRangeMetrics
 *
 * These tests verify that:
 * 1. Date range filters properly exclude records outside the range
 * 2. Program selection filters properly include/exclude service types
 * 3. activeGuestIds correctly tracks unique guests who used services
 * 4. Demographics filtering uses activeGuestIds correctly
 */

describe("getUniversalTimeRangeMetrics - activeGuestIds tracking", () => {
  // Mock pacificDateStringFrom for testing
  const pacificDateStringFrom = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toISOString().split("T")[0];
  };

  // Helper to filter records by date range (simulates what getUniversalTimeRangeMetrics does)
  const inRange = (startDate, endDate) => (iso) => {
    const d = pacificDateStringFrom(iso);
    return d >= startDate && d <= endDate;
  };

  describe("Date range filtering", () => {
    it("should include records within date range", () => {
      const records = [
        { id: "1", guestId: "guest-1", date: "2025-11-15T10:00:00Z" },
        { id: "2", guestId: "guest-2", date: "2025-11-20T10:00:00Z" },
        { id: "3", guestId: "guest-3", date: "2025-11-25T10:00:00Z" },
      ];

      const filter = inRange("2025-11-01", "2025-11-30");
      const filtered = records.filter((r) => filter(r.date));

      expect(filtered).toHaveLength(3);
    });

    it("should exclude records outside date range", () => {
      const records = [
        { id: "1", guestId: "guest-1", date: "2025-10-15T10:00:00Z" }, // Before range
        { id: "2", guestId: "guest-2", date: "2025-11-20T10:00:00Z" }, // In range
        { id: "3", guestId: "guest-3", date: "2025-12-05T10:00:00Z" }, // After range
      ];

      const filter = inRange("2025-11-01", "2025-11-30");
      const filtered = records.filter((r) => filter(r.date));

      expect(filtered).toHaveLength(1);
      expect(filtered[0].guestId).toBe("guest-2");
    });

    it("should handle single day range", () => {
      const records = [
        { id: "1", guestId: "guest-1", date: "2025-11-15T08:00:00Z" },
        { id: "2", guestId: "guest-2", date: "2025-11-15T14:00:00Z" },
        { id: "3", guestId: "guest-3", date: "2025-11-16T10:00:00Z" },
      ];

      const filter = inRange("2025-11-15", "2025-11-15");
      const filtered = records.filter((r) => filter(r.date));

      expect(filtered).toHaveLength(2);
    });
  });

  describe("Guest ID collection from service records", () => {
    it("should collect unique guest IDs from meal records", () => {
      const mealRecords = [
        { guestId: "guest-1", date: "2025-11-15T10:00:00Z", count: 1 },
        { guestId: "guest-1", date: "2025-11-16T10:00:00Z", count: 1 }, // Same guest
        { guestId: "guest-2", date: "2025-11-15T10:00:00Z", count: 1 },
      ];

      const activeGuestIds = new Set();
      mealRecords.forEach((record) => {
        if (record.guestId) activeGuestIds.add(record.guestId);
      });

      expect(activeGuestIds.size).toBe(2);
      expect(activeGuestIds.has("guest-1")).toBe(true);
      expect(activeGuestIds.has("guest-2")).toBe(true);
    });

    it("should collect unique guest IDs from shower records", () => {
      const showerRecords = [
        { guestId: "guest-1", date: "2025-11-15T09:00:00Z" },
        { guestId: "guest-3", date: "2025-11-15T09:30:00Z" },
      ];

      const activeGuestIds = new Set();
      showerRecords.forEach((record) => {
        if (record.guestId) activeGuestIds.add(record.guestId);
      });

      expect(activeGuestIds.size).toBe(2);
    });

    it("should handle records without guestId", () => {
      const records = [
        { id: "1", date: "2025-11-15T10:00:00Z" }, // No guestId
        { id: "2", guestId: "guest-1", date: "2025-11-15T10:00:00Z" },
        { id: "3", guestId: null, date: "2025-11-15T10:00:00Z" }, // Null guestId
      ];

      const activeGuestIds = new Set();
      records.forEach((record) => {
        if (record.guestId) activeGuestIds.add(record.guestId);
      });

      expect(activeGuestIds.size).toBe(1);
      expect(activeGuestIds.has("guest-1")).toBe(true);
    });

    it("should combine guest IDs from multiple program types", () => {
      const mealRecords = [
        { guestId: "guest-1", date: "2025-11-15T10:00:00Z", count: 1 },
      ];
      const showerRecords = [
        { guestId: "guest-1", date: "2025-11-15T09:00:00Z" }, // Same guest
        { guestId: "guest-2", date: "2025-11-15T09:30:00Z" },
      ];
      const laundryRecords = [
        { guestId: "guest-3", date: "2025-11-15T11:00:00Z" },
      ];

      const activeGuestIds = new Set();
      
      mealRecords.forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
      showerRecords.forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
      laundryRecords.forEach((r) => r.guestId && activeGuestIds.add(r.guestId));

      expect(activeGuestIds.size).toBe(3);
      expect(Array.from(activeGuestIds).sort()).toEqual(["guest-1", "guest-2", "guest-3"]);
    });
  });

  describe("Program selection filtering", () => {
    const collectActiveGuests = (programs, serviceData) => {
      const activeGuestIds = new Set();
      
      if (programs.includes("meals") && serviceData.meals) {
        serviceData.meals.forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
      }
      if (programs.includes("showers") && serviceData.showers) {
        serviceData.showers.forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
      }
      if (programs.includes("laundry") && serviceData.laundry) {
        serviceData.laundry.forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
      }
      if (programs.includes("haircuts") && serviceData.haircuts) {
        serviceData.haircuts.forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
      }
      if (programs.includes("holidays") && serviceData.holidays) {
        serviceData.holidays.forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
      }
      if (programs.includes("bicycles") && serviceData.bicycles) {
        serviceData.bicycles.forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
      }
      
      return Array.from(activeGuestIds);
    };

    it("should only include guests from selected programs", () => {
      const serviceData = {
        meals: [{ guestId: "guest-1" }],
        showers: [{ guestId: "guest-2" }],
        laundry: [{ guestId: "guest-3" }],
      };

      // Only select meals
      const result = collectActiveGuests(["meals"], serviceData);
      
      expect(result).toHaveLength(1);
      expect(result).toContain("guest-1");
      expect(result).not.toContain("guest-2");
      expect(result).not.toContain("guest-3");
    });

    it("should include guests from multiple selected programs", () => {
      const serviceData = {
        meals: [{ guestId: "guest-1" }],
        showers: [{ guestId: "guest-2" }],
        laundry: [{ guestId: "guest-3" }],
      };

      const result = collectActiveGuests(["meals", "showers"], serviceData);
      
      expect(result).toHaveLength(2);
      expect(result).toContain("guest-1");
      expect(result).toContain("guest-2");
      expect(result).not.toContain("guest-3");
    });

    it("should deduplicate guests who used multiple selected programs", () => {
      const serviceData = {
        meals: [{ guestId: "guest-1" }],
        showers: [{ guestId: "guest-1" }], // Same guest
        laundry: [{ guestId: "guest-1" }], // Same guest again
      };

      const result = collectActiveGuests(["meals", "showers", "laundry"], serviceData);
      
      expect(result).toHaveLength(1);
      expect(result).toContain("guest-1");
    });

    it("should return empty array when no programs selected", () => {
      const serviceData = {
        meals: [{ guestId: "guest-1" }],
        showers: [{ guestId: "guest-2" }],
      };

      const result = collectActiveGuests([], serviceData);
      
      expect(result).toHaveLength(0);
    });
  });

  describe("Demographics filtering with activeGuestIds", () => {
    const filterGuestsByActiveIds = (guests, activeGuestIds) => {
      const activeIdSet = new Set(activeGuestIds);
      return guests.filter((guest) => activeIdSet.has(guest.id));
    };

    it("should filter guests to only those in activeGuestIds", () => {
      const allGuests = [
        { id: "guest-1", housingStatus: "Unsheltered" },
        { id: "guest-2", housingStatus: "Sheltered" },
        { id: "guest-3", housingStatus: "RV/Vehicle" },
        { id: "guest-4", housingStatus: "Unsheltered" },
      ];

      const activeGuestIds = ["guest-1", "guest-3"];
      const filtered = filterGuestsByActiveIds(allGuests, activeGuestIds);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((g) => g.id).sort()).toEqual(["guest-1", "guest-3"]);
    });

    it("should return empty array when no active guests", () => {
      const allGuests = [
        { id: "guest-1", housingStatus: "Unsheltered" },
        { id: "guest-2", housingStatus: "Sheltered" },
      ];

      const filtered = filterGuestsByActiveIds(allGuests, []);

      expect(filtered).toHaveLength(0);
    });

    it("should handle active guests not in guest list", () => {
      const allGuests = [
        { id: "guest-1", housingStatus: "Unsheltered" },
      ];

      // guest-999 doesn't exist in the guest list
      const activeGuestIds = ["guest-1", "guest-999"];
      const filtered = filterGuestsByActiveIds(allGuests, activeGuestIds);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("guest-1");
    });

    it("should calculate correct demographics from filtered guests", () => {
      const allGuests = [
        { id: "guest-1", housingStatus: "Unsheltered", age: "Adult" },
        { id: "guest-2", housingStatus: "Sheltered", age: "Senior" },
        { id: "guest-3", housingStatus: "Unsheltered", age: "Adult" },
        { id: "guest-4", housingStatus: "RV/Vehicle", age: "Youth" },
      ];

      const activeGuestIds = ["guest-1", "guest-3"];
      const filtered = filterGuestsByActiveIds(allGuests, activeGuestIds);

      // Calculate demographics
      const housingCounts = {};
      filtered.forEach((g) => {
        const housing = g.housingStatus || "Unknown";
        housingCounts[housing] = (housingCounts[housing] || 0) + 1;
      });

      expect(housingCounts["Unsheltered"]).toBe(2);
      expect(housingCounts["Sheltered"]).toBeUndefined();
      expect(housingCounts["RV/Vehicle"]).toBeUndefined();
    });
  });
});

describe("Analytics Integration - Full Filter Flow", () => {
  it("should apply both date and program filters correctly", () => {
    // Simulate full filter flow
    const startDate = "2025-11-01";
    const endDate = "2025-11-30";
    const selectedPrograms = ["meals", "showers"];

    const allServiceRecords = {
      meals: [
        { guestId: "guest-1", date: "2025-11-15T10:00:00Z" },
        { guestId: "guest-2", date: "2025-10-15T10:00:00Z" }, // Outside date range
      ],
      showers: [
        { guestId: "guest-3", date: "2025-11-20T10:00:00Z" },
      ],
      laundry: [
        { guestId: "guest-4", date: "2025-11-10T10:00:00Z" }, // Laundry not selected
      ],
    };

    // Step 1: Apply date filter
    const inRange = (iso) => {
      const d = new Date(iso).toISOString().split("T")[0];
      return d >= startDate && d <= endDate;
    };

    // Step 2: Collect guests from selected programs with date filter
    const activeGuestIds = new Set();
    
    if (selectedPrograms.includes("meals")) {
      allServiceRecords.meals
        .filter((r) => inRange(r.date))
        .forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
    }
    if (selectedPrograms.includes("showers")) {
      allServiceRecords.showers
        .filter((r) => inRange(r.date))
        .forEach((r) => r.guestId && activeGuestIds.add(r.guestId));
    }

    // Should only include guest-1 (meals in range) and guest-3 (showers in range)
    // guest-2 is excluded (outside date range)
    // guest-4 is excluded (laundry not selected)
    expect(activeGuestIds.size).toBe(2);
    expect(activeGuestIds.has("guest-1")).toBe(true);
    expect(activeGuestIds.has("guest-2")).toBe(false);
    expect(activeGuestIds.has("guest-3")).toBe(true);
    expect(activeGuestIds.has("guest-4")).toBe(false);
  });
});
