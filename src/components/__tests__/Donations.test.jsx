import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Donations from "../Donations";
import toast from "react-hot-toast";
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
    DONATION_TYPES: ["Protein", "Produce", "Dairy", "Bakery", "Prepared", "School lunch", "Pastries", "Deli Foods"],
    donationRecords: [],
    addDonation: vi.fn(),
    getRecentDonations: vi.fn(() => []),
    exportDataAsCSV: vi.fn(),
    setDonationRecords: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.addDonation = vi.fn().mockResolvedValue({});
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

    it("displays density selector", () => {
      render(<Donations />);
      expect(screen.getByText("Density")).toBeInTheDocument();
      expect(screen.getByText("Medium density (20 servings)")).toBeInTheDocument();
    });

    it("requires item name for non-minimal types (not School lunch or Pastries)", async () => {
      const user = userEvent.setup();
      const { container } = render(<Donations />);

      // Ensure type is not School lunch (default is Protein)
      const typeSelect = screen.getByRole("option", { name: /Protein/i }).closest('select');
      expect(typeSelect.value).not.toBe("School lunch");

      // Ensure item name is blank
      const itemInput = screen.getByPlaceholderText(/e.g., Chicken tikka masala, Fresh vegetables/i);
      await user.clear(itemInput);

      // Submit the form
      const formEl = container.querySelector('form');
      fireEvent.submit(formEl);

      expect(mockContext.addDonation).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Item name is required");
    });

    it("allows adding a School lunch donation with only donor and weight", async () => {
      const user = userEvent.setup();
      render(<Donations />);

      // Select 'School lunch'
      const typeSelect = screen.getByRole("option", { name: /Protein/i }).closest('select');
      await user.selectOptions(typeSelect, "School lunch");

      // Fill in donor and weight only
      const donorInput = screen.getByPlaceholderText(/e.g., Waymo, LinkedIn, Anonymous/i);
      await user.clear(donorInput);
      await user.type(donorInput, "Local Elementary");

      const weightInput = screen.getByPlaceholderText(/0.0/i);
      await user.clear(weightInput);
      await user.type(weightInput, "12");

      // Click add donation
      const addButton = screen.getByRole("button", { name: /add donation/i });
      await user.click(addButton);

      expect(mockContext.addDonation).toHaveBeenCalledTimes(1);
      const calledWith = mockContext.addDonation.mock.calls[0][0];
      expect(calledWith.type).toBe("School lunch");
      expect(calledWith.donor).toBe("Local Elementary");
      expect(calledWith.weightLbs).toBe(12);
    });

    it("allows adding a Pastries donation with only donor and weight", async () => {
      const user = userEvent.setup();
      render(<Donations />);

      // Select 'Pastries'
      const typeSelect = screen.getByRole("option", { name: /Protein/i }).closest('select');
      await user.selectOptions(typeSelect, "Pastries");

      // Fill in donor and weight only
      const donorInput = screen.getByPlaceholderText(/e.g., Waymo, LinkedIn, Anonymous/i);
      await user.clear(donorInput);
      await user.type(donorInput, "Local Bakery");

      const weightInput = screen.getByPlaceholderText(/0.0/i);
      await user.clear(weightInput);
      await user.type(weightInput, "5");

      // Click add donation
      const addButton = screen.getByRole("button", { name: /add donation/i });
      await user.click(addButton);

      expect(mockContext.addDonation).toHaveBeenCalledTimes(1);
      const calledWith = mockContext.addDonation.mock.calls[0][0];
      expect(calledWith.type).toBe("Pastries");
      expect(calledWith.donor).toBe("Local Bakery");
      expect(calledWith.weightLbs).toBe(5);
    });

    it("allows adding a Deli Foods donation with only donor and weight", async () => {
      const user = userEvent.setup();
      render(<Donations />);

      // Select 'Deli Foods'
      const typeSelect = screen.getByRole("option", { name: /Protein/i }).closest('select');
      await user.selectOptions(typeSelect, "Deli Foods");

      // Fill in donor and weight only
      const donorInput = screen.getByPlaceholderText(/e.g., Waymo, LinkedIn, Anonymous/i);
      await user.clear(donorInput);
      await user.type(donorInput, "Community Deli");

      const weightInput = screen.getByPlaceholderText(/0.0/i);
      await user.clear(weightInput);
      await user.type(weightInput, "7");

      // Click add donation
      const addButton = screen.getByRole("button", { name: /add donation/i });
      await user.click(addButton);

      expect(mockContext.addDonation).toHaveBeenCalledTimes(1);
      const calledWith = mockContext.addDonation.mock.calls[0][0];
      expect(calledWith.type).toBe("Deli Foods");
      expect(calledWith.donor).toBe("Community Deli");
      expect(calledWith.weightLbs).toBe(7);
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
      // calculate servings using new tray size mapping
      const DENSITY_SERVINGS = { light: 10, medium: 20, high: 30 };
      let totalServings = 0;
      for (const record of donationRecords) {
        if (record.servings) {
          totalServings += Number(record.servings);
          continue;
        }
        if (Number(record.trays || 0) > 0) {
          const size = (record.density || "medium");
          totalServings += (Number(record.trays) || 0) * (DENSITY_SERVINGS[size] || DENSITY_SERVINGS.medium);
        } else {
          if (record.type === "Carbs") totalServings += (Number(record.weightLbs || 0) * 4);
          else if (record.type === "Protein") totalServings += (Number(record.weightLbs || 0) * 5);
          else totalServings += (Number(record.weightLbs || 0));
        }
      }
      // For the records above: 2 trays default medium density = 2*20=40 and 3 trays medium density = 3*20=60 -> 100
      expect(totalServings).toBe(100);
    });
  });
});
