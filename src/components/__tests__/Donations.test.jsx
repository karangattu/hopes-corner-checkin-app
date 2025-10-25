import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Donations from "../Donations";
import { useAppContext } from "../../context/useAppContext";

// Mock the useAppContext hook
vi.mock("../../context/useAppContext");

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("Donations Component", () => {
  const mockDate = "2025-01-15";
  const mockContext = {
    DONATION_TYPES: ["Protein", "Produce", "Dairy", "Bakery", "Prepared"],
    donationRecords: [],
    addDonation: vi.fn(),
    getRecentDonations: vi.fn(() => []),
    exportDataAsCSV: vi.fn(),
    setDonationRecords: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContext.mockReturnValue(mockContext);
  });

  describe("Consolidation Logic", () => {
    it("consolidates multiple entries with same type, item, and donor", () => {
      // Setup: Create donation records with same type, item, and donor
      const donationRecords = [
        {
          id: "1",
          type: "Protein",
          itemName: "Chicken curry",
          donor: "Waymo",
          trays: 2,
          weightLbs: 15,
          date: mockDate,
          createdAt: new Date("2025-01-15T10:00:00").toISOString(),
        },
        {
          id: "2",
          type: "Protein",
          itemName: "Chicken curry",
          donor: "Waymo",
          trays: 3,
          weightLbs: 20,
          date: mockDate,
          createdAt: new Date("2025-01-15T11:00:00").toISOString(),
        },
        {
          id: "3",
          type: "Protein",
          itemName: "Chicken curry",
          donor: "Waymo",
          trays: 1,
          weightLbs: 8,
          date: mockDate,
          createdAt: new Date("2025-01-15T12:00:00").toISOString(),
        },
      ];

      const consolidationMap = new Map();

      // Simulate the consolidation logic
      for (const record of donationRecords) {
        const key = `${record.type}|${record.itemName}|${record.donor}`;

        if (!consolidationMap.has(key)) {
          consolidationMap.set(key, {
            type: record.type,
            itemName: record.itemName,
            donor: record.donor,
            trays: 0,
            weightLbs: 0,
            entries: [],
          });
        }

        const consolidated = consolidationMap.get(key);
        consolidated.trays += Number(record.trays) || 0;
        consolidated.weightLbs += Number(record.weightLbs) || 0;
        consolidated.entries.push(record);
      }

      const consolidatedArray = Array.from(consolidationMap.values());

      // Assertions
      expect(consolidatedArray).toHaveLength(1);
      expect(consolidatedArray[0].type).toBe("Protein");
      expect(consolidatedArray[0].itemName).toBe("Chicken curry");
      expect(consolidatedArray[0].donor).toBe("Waymo");
      expect(consolidatedArray[0].trays).toBe(6);
      expect(consolidatedArray[0].weightLbs).toBe(43);
      expect(consolidatedArray[0].entries).toHaveLength(3);
    });

    it("does not consolidate entries with different types", () => {
      const donationRecords = [
        {
          id: "1",
          type: "Protein",
          itemName: "Rice",
          donor: "LinkedIn",
          trays: 2,
          weightLbs: 15,
          date: mockDate,
        },
        {
          id: "2",
          type: "Produce",
          itemName: "Rice",
          donor: "LinkedIn",
          trays: 3,
          weightLbs: 20,
          date: mockDate,
        },
      ];

      const consolidationMap = new Map();

      for (const record of donationRecords) {
        const key = `${record.type}|${record.itemName}|${record.donor}`;

        if (!consolidationMap.has(key)) {
          consolidationMap.set(key, {
            type: record.type,
            itemName: record.itemName,
            donor: record.donor,
            trays: 0,
            weightLbs: 0,
            entries: [],
          });
        }

        const consolidated = consolidationMap.get(key);
        consolidated.trays += Number(record.trays) || 0;
        consolidated.weightLbs += Number(record.weightLbs) || 0;
        consolidated.entries.push(record);
      }

      const consolidatedArray = Array.from(consolidationMap.values());

      // Should create two separate entries
      expect(consolidatedArray).toHaveLength(2);
      expect(consolidatedArray[0].type).toBe("Protein");
      expect(consolidatedArray[1].type).toBe("Produce");
    });

    it("does not consolidate entries with different donors", () => {
      const donationRecords = [
        {
          id: "1",
          type: "Protein",
          itemName: "Chicken curry",
          donor: "Waymo",
          trays: 2,
          weightLbs: 15,
          date: mockDate,
        },
        {
          id: "2",
          type: "Protein",
          itemName: "Chicken curry",
          donor: "LinkedIn",
          trays: 3,
          weightLbs: 20,
          date: mockDate,
        },
      ];

      const consolidationMap = new Map();

      for (const record of donationRecords) {
        const key = `${record.type}|${record.itemName}|${record.donor}`;

        if (!consolidationMap.has(key)) {
          consolidationMap.set(key, {
            type: record.type,
            itemName: record.itemName,
            donor: record.donor,
            trays: 0,
            weightLbs: 0,
            entries: [],
          });
        }

        const consolidated = consolidationMap.get(key);
        consolidated.trays += Number(record.trays) || 0;
        consolidated.weightLbs += Number(record.weightLbs) || 0;
        consolidated.entries.push(record);
      }

      const consolidatedArray = Array.from(consolidationMap.values());

      // Should create two separate entries
      expect(consolidatedArray).toHaveLength(2);
      expect(consolidatedArray[0].donor).toBe("Waymo");
      expect(consolidatedArray[1].donor).toBe("LinkedIn");
    });

    it("does not consolidate entries with different item names", () => {
      const donationRecords = [
        {
          id: "1",
          type: "Protein",
          itemName: "Chicken curry",
          donor: "Waymo",
          trays: 2,
          weightLbs: 15,
          date: mockDate,
        },
        {
          id: "2",
          type: "Protein",
          itemName: "Beef stew",
          donor: "Waymo",
          trays: 3,
          weightLbs: 20,
          date: mockDate,
        },
      ];

      const consolidationMap = new Map();

      for (const record of donationRecords) {
        const key = `${record.type}|${record.itemName}|${record.donor}`;

        if (!consolidationMap.has(key)) {
          consolidationMap.set(key, {
            type: record.type,
            itemName: record.itemName,
            donor: record.donor,
            trays: 0,
            weightLbs: 0,
            entries: [],
          });
        }

        const consolidated = consolidationMap.get(key);
        consolidated.trays += Number(record.trays) || 0;
        consolidated.weightLbs += Number(record.weightLbs) || 0;
        consolidated.entries.push(record);
      }

      const consolidatedArray = Array.from(consolidationMap.values());

      // Should create two separate entries
      expect(consolidatedArray).toHaveLength(2);
      expect(consolidatedArray[0].itemName).toBe("Chicken curry");
      expect(consolidatedArray[1].itemName).toBe("Beef stew");
    });

    it("handles zero and decimal values correctly in consolidation", () => {
      const donationRecords = [
        {
          id: "1",
          type: "Produce",
          itemName: "Vegetables",
          donor: "Google",
          trays: 0,
          weightLbs: 5.5,
          date: mockDate,
        },
        {
          id: "2",
          type: "Produce",
          itemName: "Vegetables",
          donor: "Google",
          trays: 2,
          weightLbs: 10.75,
          date: mockDate,
        },
        {
          id: "3",
          type: "Produce",
          itemName: "Vegetables",
          donor: "Google",
          trays: 1,
          weightLbs: 3.25,
          date: mockDate,
        },
      ];

      const consolidationMap = new Map();

      for (const record of donationRecords) {
        const key = `${record.type}|${record.itemName}|${record.donor}`;

        if (!consolidationMap.has(key)) {
          consolidationMap.set(key, {
            type: record.type,
            itemName: record.itemName,
            donor: record.donor,
            trays: 0,
            weightLbs: 0,
            entries: [],
          });
        }

        const consolidated = consolidationMap.get(key);
        consolidated.trays += Number(record.trays) || 0;
        consolidated.weightLbs += Number(record.weightLbs) || 0;
        consolidated.entries.push(record);
      }

      const consolidatedArray = Array.from(consolidationMap.values());

      expect(consolidatedArray).toHaveLength(1);
      expect(consolidatedArray[0].trays).toBe(3);
      expect(consolidatedArray[0].weightLbs).toBe(19.5);
    });
  });

  describe("Component Rendering", () => {
    it("renders the Donations component without crashing", () => {
      render(<Donations />);
      expect(screen.getByText("Donations")).toBeInTheDocument();
    });

    it("displays the three main tabs", () => {
      render(<Donations />);
      expect(screen.getByText("Log Donations")).toBeInTheDocument();
      expect(screen.getByText("Analytics")).toBeInTheDocument();
      expect(screen.getByText("Export")).toBeInTheDocument();
    });

    it("displays stat cards with correct labels", () => {
      render(<Donations />);
      expect(screen.getByText("Entries")).toBeInTheDocument();
      expect(screen.getByText("Weight")).toBeInTheDocument();
      expect(screen.getAllByText("Trays").length).toBeGreaterThan(0);
      expect(screen.getByText("Donors")).toBeInTheDocument();
    });
  });

  describe("Stats Calculation", () => {
    it("calculates correct stats for a single day", () => {
      const donationRecords = [
        {
          id: "1",
          type: "Protein",
          itemName: "Chicken",
          donor: "Waymo",
          trays: 2,
          weightLbs: 15,
          date: mockDate,
        },
        {
          id: "2",
          type: "Produce",
          itemName: "Vegetables",
          donor: "LinkedIn",
          trays: 3,
          weightLbs: 10,
          date: mockDate,
        },
      ];

      let totalTrays = 0;
      let totalWeight = 0;
      const uniqueDonors = new Set();

      for (const record of donationRecords) {
        totalTrays += Number(record.trays) || 0;
        totalWeight += Number(record.weightLbs) || 0;
        if (record.donor) {
          uniqueDonors.add(record.donor.trim());
        }
      }

      expect(totalTrays).toBe(5);
      expect(totalWeight).toBe(25);
      expect(uniqueDonors.size).toBe(2);
    });
  });
});
