import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MonthlySummaryReport from "../MonthlySummaryReport";
import { LAUNDRY_STATUS } from "../../../context/constants";

let mockContext;
const exportDataAsCSVMock = vi.fn();

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
  useAppContext: () => mockContext,
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
    exportDataAsCSV: exportDataAsCSVMock,
    ...overrides,
  };
};

describe("MonthlySummaryReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockContext();
  });

  it("renders the table with correct headers", () => {
    render(<MonthlySummaryReport />);

    expect(screen.getByText("Monthly Summary Report - 2025")).toBeInTheDocument();

    // Check for table headers in the thead
  const [mealsTable] = screen.getAllByRole("table");
  const thead = mealsTable.querySelector("thead");

    expect(thead.textContent).toContain("Monday");
    expect(thead.textContent).toContain("Wednesday");
    expect(thead.textContent).toContain("Saturday");
    expect(thead.textContent).toContain("Friday");
    expect(thead.textContent).toContain("Day Worker Center");
    expect(thead.textContent).toContain("Extra Meals");
    expect(thead.textContent).toContain("RV Wed+Sat");
    expect(thead.textContent).toContain("RV Mon+Thu");
    expect(thead.textContent).toContain("Lunch Bags");
    expect(thead.textContent).toContain("TOTAL HOT MEALS");
    expect(thead.textContent).toContain("Total w/ Lunch Bags");
    expect(thead.textContent).toContain("Onsite Hot Meals");
  });

  it("displays January 2025 row", () => {
    render(<MonthlySummaryReport />);
    const tables = screen.getAllByRole("table");
    expect(tables[0].textContent).toContain("January");
    expect(tables[1].textContent).toContain("January");
    expect(tables[2].textContent).toContain("January");
  });

  it("displays TOTAL row at the bottom", () => {
    render(<MonthlySummaryReport />);
    const [mealsTable] = screen.getAllByRole("table");
    const totalCells = Array.from(mealsTable.querySelectorAll("td")).filter(
      (cell) => cell.textContent === "TOTAL"
    );
    expect(totalCells.length).toBeGreaterThan(0);
  });

  it("calculates Monday meals correctly", () => {
    // Create meal records for Mondays in January 2025
    // January 6, 13, 20, 27 are Mondays in 2025
    setupMockContext({
      mealRecords: [
        { date: "2025-01-06T12:00:00Z", count: 10, guestId: "guest1" },
        { date: "2025-01-13T12:00:00Z", count: 15, guestId: "guest2" },
        { date: "2025-01-20T12:00:00Z", count: 12, guestId: "guest3" },
      ],
    });

    render(<MonthlySummaryReport />);

    // Find January row and check Monday column
  const [mealsTable] = screen.getAllByRole("table");
  const rows = mealsTable.querySelectorAll("tbody tr");
    const januaryRow = Array.from(rows).find((row) =>
      row.textContent.includes("January")
    );

    expect(januaryRow).toBeTruthy();
    // Monday meals should be 37 (10 + 15 + 12)
    expect(januaryRow.textContent).toContain("37");
  });

  it("calculates RV meals by day groups correctly", () => {
    // Wed = 1, Thu = 4, Sat = 6 in January 2025
    setupMockContext({
      rvMealRecords: [
        { date: "2025-01-01T12:00:00Z", count: 5, guestId: null }, // Wednesday
        { date: "2025-01-04T12:00:00Z", count: 8, guestId: null }, // Saturday
        { date: "2025-01-06T12:00:00Z", count: 10, guestId: null }, // Monday
        { date: "2025-01-09T12:00:00Z", count: 7, guestId: null }, // Thursday
      ],
    });

    render(<MonthlySummaryReport />);

  const [mealsTable] = screen.getAllByRole("table");
  const rows = mealsTable.querySelectorAll("tbody tr");
    const januaryRow = Array.from(rows).find((row) =>
      row.textContent.includes("January")
    );

    expect(januaryRow).toBeTruthy();
    // RV Wed+Sat should be 5 + 8 = 13
    // RV Mon+Thu should be 10 + 7 = 17
    expect(januaryRow.textContent).toContain("13");
    expect(januaryRow.textContent).toContain("17");
  });

  it("calculates TOTAL HOT MEALS correctly", () => {
    setupMockContext({
      mealRecords: [{ date: "2025-01-06T12:00:00Z", count: 10 }], // Monday
      extraMealRecords: [{ date: "2025-01-06T12:00:00Z", count: 5 }],
      dayWorkerMealRecords: [{ date: "2025-01-06T12:00:00Z", count: 8 }],
      lunchBagRecords: [{ date: "2025-01-06T12:00:00Z", count: 3 }], // Should NOT be included
    });

    render(<MonthlySummaryReport />);

  const [mealsTable] = screen.getAllByRole("table");
  const rows = mealsTable.querySelectorAll("tbody tr");
    const januaryRow = Array.from(rows).find((row) =>
      row.textContent.includes("January")
    );

    expect(januaryRow).toBeTruthy();
    // TOTAL HOT MEALS should be 10 + 5 + 8 = 23 (not including lunch bags)
    const cells = januaryRow.querySelectorAll("td");
    const totalHotMealsCell = cells[10]; // 11th column (0-indexed)
    expect(totalHotMealsCell.textContent).toBe("23");
  });

  it("calculates onsite hot meals correctly (guest + extra on Mon/Wed/Sat/Fri)", () => {
    setupMockContext({
      mealRecords: [
        { date: "2025-01-06T12:00:00Z", count: 10 }, // Monday
        { date: "2025-01-08T12:00:00Z", count: 12 }, // Wednesday
        { date: "2025-01-07T12:00:00Z", count: 8 }, // Tuesday - should NOT be included
      ],
      extraMealRecords: [
        { date: "2025-01-06T12:00:00Z", count: 5 }, // Monday
        { date: "2025-01-08T12:00:00Z", count: 3 }, // Wednesday
      ],
    });

    render(<MonthlySummaryReport />);

  const [mealsTable] = screen.getAllByRole("table");
  const rows = mealsTable.querySelectorAll("tbody tr");
    const januaryRow = Array.from(rows).find((row) =>
      row.textContent.includes("January")
    );

    expect(januaryRow).toBeTruthy();
    // Onsite = (10 + 5) Monday + (12 + 3) Wednesday = 30
    // Tuesday meals should NOT be included
    const cells = januaryRow.querySelectorAll("td");
    const onsiteCell = cells[12]; // 13th column (0-indexed)
    expect(onsiteCell.textContent).toBe("30");
  });

  it("exports to CSV when button is clicked", () => {
    setupMockContext({
      guests: [
        { id: "guest-1", age: "Adult 18-59" },
        { id: "guest-2", age: "Senior 60+" },
      ],
      mealRecords: [{ date: "2025-01-06T12:00:00Z", count: 10 }],
      bicycleRecords: [
        { date: "2025-01-05T12:00:00Z", status: "done", repairTypes: ["New Bicycle"] },
        { date: "2025-02-02T12:00:00Z", status: "done", repairTypes: ["Flat Tire"] },
      ],
      showerRecords: [
        { guestId: "guest-1", date: "2025-01-02T12:00:00Z", status: "done" },
      ],
      laundryRecords: [
        { guestId: "guest-2", date: "2025-01-03T12:00:00Z", status: LAUNDRY_STATUS.DONE },
      ],
    });

    render(<MonthlySummaryReport />);

    const exportButton = screen.getByRole("button", { name: /Export to CSV/i });
    fireEvent.click(exportButton);

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [csvData, filename] = exportDataAsCSVMock.mock.calls[0];

    expect(csvData.length).toBeGreaterThan(0);
    expect(filename).toMatch(/monthly-summary-2025/);

    // Check that CSV has correct columns
    expect(csvData[0]).toHaveProperty("Month");
    expect(csvData[0]).toHaveProperty("Monday");
    expect(csvData[0]).toHaveProperty("TOTAL HOT MEALS");

    const ytdRow = csvData.find((row) => row?.Month === "Year to Date");
    expect(ytdRow).toBeTruthy();
    expect(ytdRow["New Bikes"]).toBe(1);
    expect(ytdRow["Bike Services"]).toBe(1);

    const showerLaundryHeaderIndex = csvData.findIndex(
      (row) => row?.Month === "Shower & Laundry Services Summary",
    );
    expect(showerLaundryHeaderIndex).toBeGreaterThan(-1);
    const showerLaundryDataRow = csvData[showerLaundryHeaderIndex + 1];
    expect(showerLaundryDataRow["Program Days in Month"]).toBeDefined();
    const finalRow = csvData[csvData.length - 1];
    expect(finalRow["YTD Total Unduplicated Laundry Users"]).toBeDefined();
  });

  it("renders shower and laundry summary section with headers", () => {
    render(<MonthlySummaryReport />);

    expect(screen.getByText("Shower & Laundry Services Summary")).toBeInTheDocument();
    expect(screen.getByText("Program Days in Month")).toBeInTheDocument();
    expect(screen.getByText("YTD Total Unduplicated Laundry Users")).toBeInTheDocument();
  });

  it("exports bicycle summary via the dedicated button", () => {
    setupMockContext({
      bicycleRecords: [
        { date: "2025-01-10T12:00:00Z", status: "done", repairTypes: ["New Bicycle"] },
      ],
    });

    render(<MonthlySummaryReport />);

    const button = screen.getByRole("button", { name: /Export Bicycle CSV/i });
    fireEvent.click(button);

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [csvData, filename] = exportDataAsCSVMock.mock.calls[0];
    expect(filename).toMatch(/bicycle-summary-2025/);
    expect(csvData[0]).toHaveProperty("Month");
    expect(csvData[0]).toHaveProperty("New Bikes");
  });

  it("exports shower and laundry summary via the dedicated button", () => {
    setupMockContext({
      guests: [
        { id: "guest-1", age: "Adult 18-59" },
      ],
      showerRecords: [
        { guestId: "guest-1", date: "2025-01-05T12:00:00Z", status: "done" },
      ],
      laundryRecords: [
        { guestId: "guest-1", date: "2025-01-06T12:00:00Z", status: LAUNDRY_STATUS.DONE },
      ],
    });

    render(<MonthlySummaryReport />);

    const button = screen.getByRole("button", { name: /Export Shower & Laundry CSV/i });
    fireEvent.click(button);

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [csvData, filename] = exportDataAsCSVMock.mock.calls[0];
    expect(filename).toMatch(/shower-laundry-summary-2025/);
    expect(csvData[0]).toHaveProperty("Program Days in Month");
    expect(csvData[csvData.length - 1]["YTD Total Unduplicated Laundry Users"]).toBeDefined();
  });

  it("shows totals row with correct calculations", () => {
    setupMockContext({
      mealRecords: [
        { date: "2025-01-06T12:00:00Z", count: 10 }, // January Monday
        { date: "2025-02-03T12:00:00Z", count: 15 }, // February Monday
      ],
    });

    render(<MonthlySummaryReport />);

    const [mealsTable] = screen.getAllByRole("table");
    const rows = mealsTable.querySelectorAll("tbody tr");
    const totalRow = Array.from(rows).find((row) =>
      row.textContent.includes("TOTAL")
    );

    expect(totalRow).toBeTruthy();
    const cells = totalRow.querySelectorAll("td");
    const mondayCell = cells[1];
    expect(mondayCell.textContent).toBe("25");
  });

  it("does not show future months", () => {
    // Mock current date as January 15, 2025
    const mockDate = new Date("2025-01-15");
    vi.setSystemTime(mockDate);

    render(<MonthlySummaryReport />);

    const tables = screen.getAllByRole("table");
    const mealsTable = tables[0];
    const bicycleTable = tables[1];
  const showerLaundryTable = tables[2];

    expect(mealsTable.textContent).toContain("January");
    expect(mealsTable.textContent).not.toContain("February");
    expect(mealsTable.textContent).not.toContain("March");

    // Bicycle summary always displays full year
    expect(bicycleTable.textContent).toContain("February");
  expect(showerLaundryTable.textContent).toContain("December");

    vi.useRealTimers();
  });

  it("shows bicycle new vs service counts with year-to-date totals", () => {
    setupMockContext({
      bicycleRecords: [
        {
          date: "2025-01-05T12:00:00Z",
          status: "done",
          repairTypes: ["New Bicycle"],
        },
        {
          date: "2025-01-10T12:00:00Z",
          status: "done",
          repairTypes: ["Flat Tire", "Brake Adjustment"],
        },
        {
          date: "2025-02-02T12:00:00Z",
          status: "done",
          repairTypes: ["New Bicycle", "Chain Replacement"],
        },
      ],
    });

    render(<MonthlySummaryReport />);

    const tables = screen.getAllByRole("table");
    const bicycleTable = tables[1];
    const rows = bicycleTable.querySelectorAll("tbody tr");

    expect(rows.length).toBe(13); // 12 months + YTD

    const januaryRow = Array.from(rows).find((row) =>
      row.textContent.includes("January")
    );
    expect(januaryRow).toBeTruthy();
    const janCells = januaryRow.querySelectorAll("td");
    expect(janCells[1].textContent).toBe("1");
    expect(janCells[2].textContent).toBe("2");
    expect(janCells[3].textContent).toBe("3");

    const ytdRow = rows[rows.length - 1];
    const ytdCells = ytdRow.querySelectorAll("td");
    expect(ytdCells[1].textContent).toBe("2");
    expect(ytdCells[2].textContent).toBe("3");
    expect(ytdCells[3].textContent).toBe("5");
  });
  
  it("handles empty data gracefully", () => {
    setupMockContext({
      mealRecords: [],
      rvMealRecords: [],
      extraMealRecords: [],
      dayWorkerMealRecords: [],
      lunchBagRecords: [],
      bicycleRecords: [],
    });

    render(<MonthlySummaryReport />);

    const [mealsTable, bicycleTable] = screen.getAllByRole("table");
    expect(mealsTable.textContent).toContain("January");
    expect(mealsTable.textContent).toContain("TOTAL");
    expect(bicycleTable.textContent).toContain("Year to Date");

    const mealRows = mealsTable.querySelectorAll("tbody tr");
    const januaryRow = Array.from(mealRows).find((row) =>
      row.textContent.includes("January")
    );

    expect(januaryRow).toBeTruthy();
    const mealCells = januaryRow.querySelectorAll("td");
    expect(mealCells[1].textContent).toBe("0");
    expect(mealCells[2].textContent).toBe("0");

    const bicycleRows = bicycleTable.querySelectorAll("tbody tr");
    const ytdRow = bicycleRows[bicycleRows.length - 1];
    const bicycleCells = ytdRow.querySelectorAll("td");
    expect(bicycleCells[1].textContent).toBe("0");
    expect(bicycleCells[2].textContent).toBe("0");
  });
});
