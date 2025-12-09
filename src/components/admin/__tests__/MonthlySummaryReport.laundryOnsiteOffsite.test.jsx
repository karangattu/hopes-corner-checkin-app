import React from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MonthlySummaryReport from "../MonthlySummaryReport";
import { LAUNDRY_STATUS } from "../../../context/constants";

let mockContext = {};

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
  getApp: vi.fn(() => ({})),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
}));

vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(() => ({})),
}));

vi.mock("../../../context/useAppContext", () => ({
  useAppContext: () => mockContext || {},
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const setupMockContext = (overrides = {}) => {
  mockContext = {
    guests: [],
    mealRecords: [],
    rvMealRecords: [],
    shelterMealRecords: [],
    unitedEffortMealRecords: [],
    extraMealRecords: [],
    dayWorkerMealRecords: [],
    lunchBagRecords: [],
    showerRecords: [],
    laundryRecords: [],
    bicycleRecords: [],
    exportDataAsCSV: vi.fn(),
    ...overrides,
  };
};

const DEFAULT_REPORT_DATE = new Date("2025-10-23T12:00:00Z");

const getShowerLaundryTable = () => {
  const tables = screen.getAllByRole("table");
  return tables[2]; // Third table is shower/laundry
};

const getShowerLaundryRow = (monthLabel) => {
  const table = getShowerLaundryTable();
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  return rows.find((row) => {
    const header = row.querySelector("th[scope='row']");
    return header?.textContent?.trim() === monthLabel;
  });
};

const getShowerLaundryCellText = (row, columnKey) => {
  const cell = row?.querySelector(`[data-column='${columnKey}']`);
  return cell?.textContent?.trim();
};

describe("MonthlySummaryReport - Onsite/Offsite Laundry Calculations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(DEFAULT_REPORT_DATE);
    vi.clearAllMocks();
    setupMockContext();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Monthly onsite/offsite calculations", () => {
    it("calculates onsite laundry loads correctly for a single month", () => {
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-10T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-15T12:00:00Z",
            status: LAUNDRY_STATUS.RETURNED,
            laundryType: "onsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const januaryRow = getShowerLaundryRow("January");
      expect(januaryRow).toBeTruthy();

      const onsiteLaundry = getShowerLaundryCellText(
        januaryRow,
        "onsite-laundry",
      );
      expect(onsiteLaundry).toBe("3");
    });

    it("calculates offsite laundry loads correctly for a single month", () => {
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "offsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-10T12:00:00Z",
            status: LAUNDRY_STATUS.OFFSITE_PICKED_UP,
            laundryType: "offsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const januaryRow = getShowerLaundryRow("January");
      expect(januaryRow).toBeTruthy();

      const offsiteLaundry = getShowerLaundryCellText(
        januaryRow,
        "offsite-laundry",
      );
      expect(offsiteLaundry).toBe("2");
    });

    it("separates onsite and offsite laundry loads correctly in same month", () => {
      setupMockContext({
        guests: [
          { id: "guest-1", age: "Adult 18-59" },
          { id: "guest-2", age: "Senior 60+" },
        ],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-06T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-2",
            date: "2025-01-07T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "offsite",
          },
          {
            guestId: "guest-2",
            date: "2025-01-08T12:00:00Z",
            status: LAUNDRY_STATUS.OFFSITE_PICKED_UP,
            laundryType: "offsite",
          },
          {
            guestId: "guest-2",
            date: "2025-01-09T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "offsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const januaryRow = getShowerLaundryRow("January");
      expect(januaryRow).toBeTruthy();

      const onsiteLaundry = getShowerLaundryCellText(
        januaryRow,
        "onsite-laundry",
      );
      const offsiteLaundry = getShowerLaundryCellText(
        januaryRow,
        "offsite-laundry",
      );
      const totalLaundry = getShowerLaundryCellText(
        januaryRow,
        "laundry-loads",
      );

      expect(onsiteLaundry).toBe("2");
      expect(offsiteLaundry).toBe("3");
      expect(totalLaundry).toBe("5");
    });

    it("handles records without laundryType gracefully", () => {
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            // laundryType missing
          },
          {
            guestId: "guest-1",
            date: "2025-01-06T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const januaryRow = getShowerLaundryRow("January");
      expect(januaryRow).toBeTruthy();

      const onsiteLaundry = getShowerLaundryCellText(
        januaryRow,
        "onsite-laundry",
      );
      const offsiteLaundry = getShowerLaundryCellText(
        januaryRow,
        "offsite-laundry",
      );
      const totalLaundry = getShowerLaundryCellText(
        januaryRow,
        "laundry-loads",
      );

      expect(onsiteLaundry).toBe("1");
      expect(offsiteLaundry).toBe("0");
      expect(totalLaundry).toBe("2");
    });

    it("only counts completed laundry statuses", () => {
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-06T12:00:00Z",
            status: "in-progress", // Should not be counted
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-07T12:00:00Z",
            status: "pending", // Should not be counted
            laundryType: "offsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const januaryRow = getShowerLaundryRow("January");
      expect(januaryRow).toBeTruthy();

      const onsiteLaundry = getShowerLaundryCellText(
        januaryRow,
        "onsite-laundry",
      );
      const offsiteLaundry = getShowerLaundryCellText(
        januaryRow,
        "offsite-laundry",
      );

      expect(onsiteLaundry).toBe("1");
      expect(offsiteLaundry).toBe("0");
    });
  });

  describe("Year to Date totals calculations", () => {
    it("displays onsite and offsite columns in Year to Date row", () => {
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const ytdRow = getShowerLaundryRow("Year to Date");
      expect(ytdRow).toBeTruthy();

      const onsiteCell = ytdRow.querySelector("[data-column='onsite-laundry']");
      const offsiteCell = ytdRow.querySelector(
        "[data-column='offsite-laundry']",
      );

      expect(onsiteCell).toBeTruthy();
      expect(offsiteCell).toBeTruthy();
    });

    it("calculates YTD onsite laundry totals correctly across multiple months", () => {
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-10T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-02-05T12:00:00Z",
            status: LAUNDRY_STATUS.RETURNED,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-03-10T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const ytdRow = getShowerLaundryRow("Year to Date");
      expect(ytdRow).toBeTruthy();

      const onsiteLaundry = getShowerLaundryCellText(ytdRow, "onsite-laundry");
      expect(onsiteLaundry).toBe("4");
    });

    it("calculates YTD offsite laundry totals correctly across multiple months", () => {
      setupMockContext({
        guests: [
          { id: "guest-1", age: "Adult 18-59" },
          { id: "guest-2", age: "Senior 60+" },
        ],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "offsite",
          },
          {
            guestId: "guest-2",
            date: "2025-02-10T12:00:00Z",
            status: LAUNDRY_STATUS.OFFSITE_PICKED_UP,
            laundryType: "offsite",
          },
          {
            guestId: "guest-1",
            date: "2025-03-15T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "offsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const ytdRow = getShowerLaundryRow("Year to Date");
      expect(ytdRow).toBeTruthy();

      const offsiteLaundry = getShowerLaundryCellText(
        ytdRow,
        "offsite-laundry",
      );
      expect(offsiteLaundry).toBe("3");
    });

    it("calculates YTD with mixed onsite and offsite across multiple months", () => {
      setupMockContext({
        guests: [
          { id: "guest-1", age: "Adult 18-59" },
          { id: "guest-2", age: "Senior 60+" },
        ],
        laundryRecords: [
          // January
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-06T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "offsite",
          },
          // February
          {
            guestId: "guest-2",
            date: "2025-02-10T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-2",
            date: "2025-02-11T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-2",
            date: "2025-02-12T12:00:00Z",
            status: LAUNDRY_STATUS.OFFSITE_PICKED_UP,
            laundryType: "offsite",
          },
          // March
          {
            guestId: "guest-1",
            date: "2025-03-05T12:00:00Z",
            status: LAUNDRY_STATUS.RETURNED,
            laundryType: "offsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const ytdRow = getShowerLaundryRow("Year to Date");
      expect(ytdRow).toBeTruthy();

      const onsiteLaundry = getShowerLaundryCellText(ytdRow, "onsite-laundry");
      const offsiteLaundry = getShowerLaundryCellText(
        ytdRow,
        "offsite-laundry",
      );
      const totalLaundry = getShowerLaundryCellText(ytdRow, "laundry-loads");

      expect(onsiteLaundry).toBe("3");
      expect(offsiteLaundry).toBe("3");
      expect(totalLaundry).toBe("6");
    });

    it("YTD totals match sum of monthly values", () => {
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-06T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "offsite",
          },
          {
            guestId: "guest-1",
            date: "2025-02-10T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const januaryRow = getShowerLaundryRow("January");
      const februaryRow = getShowerLaundryRow("February");
      const ytdRow = getShowerLaundryRow("Year to Date");

      const janOnsite = parseInt(
        getShowerLaundryCellText(januaryRow, "onsite-laundry"),
      );
      const janOffsite = parseInt(
        getShowerLaundryCellText(januaryRow, "offsite-laundry"),
      );
      const febOnsite = parseInt(
        getShowerLaundryCellText(februaryRow, "onsite-laundry"),
      );
      const febOffsite = parseInt(
        getShowerLaundryCellText(februaryRow, "offsite-laundry"),
      );

      const ytdOnsite = parseInt(
        getShowerLaundryCellText(ytdRow, "onsite-laundry"),
      );
      const ytdOffsite = parseInt(
        getShowerLaundryCellText(ytdRow, "offsite-laundry"),
      );

      expect(ytdOnsite).toBe(janOnsite + febOnsite);
      expect(ytdOffsite).toBe(janOffsite + febOffsite);
    });
  });

  describe("Edge cases", () => {
    it("handles zero onsite and offsite loads correctly", () => {
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [],
      });

      render(<MonthlySummaryReport />);

      const januaryRow = getShowerLaundryRow("January");
      const ytdRow = getShowerLaundryRow("Year to Date");

      expect(getShowerLaundryCellText(januaryRow, "onsite-laundry")).toBe("0");
      expect(getShowerLaundryCellText(januaryRow, "offsite-laundry")).toBe("0");
      expect(getShowerLaundryCellText(ytdRow, "onsite-laundry")).toBe("0");
      expect(getShowerLaundryCellText(ytdRow, "offsite-laundry")).toBe("0");
    });

    it("handles invalid laundryType values", () => {
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "invalid-type",
          },
          {
            guestId: "guest-1",
            date: "2025-01-06T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "",
          },
          {
            guestId: "guest-1",
            date: "2025-01-07T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: null,
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const januaryRow = getShowerLaundryRow("January");

      // Invalid types should not count as onsite or offsite
      expect(getShowerLaundryCellText(januaryRow, "onsite-laundry")).toBe("0");
      expect(getShowerLaundryCellText(januaryRow, "offsite-laundry")).toBe("0");
      // But should still count in total loads
      expect(getShowerLaundryCellText(januaryRow, "laundry-loads")).toBe("3");
    });

    it("filters by year correctly when data from previous year exists", () => {
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2024-12-25T12:00:00Z", // Previous year
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z", // Current year
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
        ],
      });

      render(<MonthlySummaryReport />);

      const ytdRow = getShowerLaundryRow("Year to Date");

      // Should only count 2025 record
      expect(getShowerLaundryCellText(ytdRow, "onsite-laundry")).toBe("1");
    });
  });

  describe("CSV export", () => {
    it("includes onsite and offsite columns in CSV export", () => {
      const exportMock = vi.fn();
      setupMockContext({
        guests: [{ id: "guest-1", age: "Adult 18-59" }],
        laundryRecords: [
          {
            guestId: "guest-1",
            date: "2025-01-05T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "onsite",
          },
          {
            guestId: "guest-1",
            date: "2025-01-06T12:00:00Z",
            status: LAUNDRY_STATUS.DONE,
            laundryType: "offsite",
          },
        ],
        exportDataAsCSV: exportMock,
      });

      render(<MonthlySummaryReport />);

      const exportButton = screen.getByRole("button", {
        name: /Export Shower & Laundry CSV/i,
      });
      exportButton.click();

      expect(exportMock).toHaveBeenCalledTimes(1);
      const [csvData] = exportMock.mock.calls[0];

      expect(csvData[0]).toHaveProperty("On-site Laundry Loads");
      expect(csvData[0]).toHaveProperty("Off-site Laundry Loads");

      const ytdRow = csvData[csvData.length - 1];
      expect(ytdRow.Month).toBe("Year to Date");
      expect(ytdRow["On-site Laundry Loads"]).toBeDefined();
      expect(ytdRow["Off-site Laundry Loads"]).toBeDefined();
    });
  });
});
