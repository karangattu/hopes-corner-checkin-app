import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MonthlySummaryReport from "../MonthlySummaryReport";

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
    mealRecords: [],
    rvMealRecords: [],
    shelterMealRecords: [],
    unitedEffortMealRecords: [],
    extraMealRecords: [],
    dayWorkerMealRecords: [],
    lunchBagRecords: [],
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
    const table = screen.getByRole("table");
    const thead = table.querySelector("thead");

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
    expect(screen.getByText("January")).toBeInTheDocument();
  });

  it("displays TOTAL row at the bottom", () => {
    render(<MonthlySummaryReport />);
    const totalCells = screen.getAllByText("TOTAL");
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
    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");
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

    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");
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

    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");
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

    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");
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
      mealRecords: [{ date: "2025-01-06T12:00:00Z", count: 10 }],
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
  });

  it("shows totals row with correct calculations", () => {
    setupMockContext({
      mealRecords: [
        { date: "2025-01-06T12:00:00Z", count: 10 }, // January Monday
        { date: "2025-02-03T12:00:00Z", count: 15 }, // February Monday
      ],
    });

    render(<MonthlySummaryReport />);

    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");
    const totalRow = Array.from(rows).find((row) =>
      row.textContent.includes("TOTAL")
    );

    expect(totalRow).toBeTruthy();
    // Total Monday meals should be 25 (10 + 15)
    const cells = totalRow.querySelectorAll("td");
    const mondayCell = cells[1]; // 2nd column (0-indexed)
    expect(mondayCell.textContent).toBe("25");
  });

  it("does not show future months", () => {
    // Mock current date as January 15, 2025
    const mockDate = new Date("2025-01-15");
    vi.setSystemTime(mockDate);

    render(<MonthlySummaryReport />);

    // Should show January
    expect(screen.getByText("January")).toBeInTheDocument();

    // Should NOT show February through December
    expect(screen.queryByText("February")).not.toBeInTheDocument();
    expect(screen.queryByText("March")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("handles empty data gracefully", () => {
    setupMockContext({
      mealRecords: [],
      rvMealRecords: [],
      extraMealRecords: [],
      dayWorkerMealRecords: [],
      lunchBagRecords: [],
    });

    render(<MonthlySummaryReport />);

    // Should still render the table with all zeros
    expect(screen.getByText("January")).toBeInTheDocument();
    expect(screen.getByText("TOTAL")).toBeInTheDocument();

    // Find January row and verify it has zeros
    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");
    const januaryRow = Array.from(rows).find((row) =>
      row.textContent.includes("January")
    );

    expect(januaryRow).toBeTruthy();
    const cells = januaryRow.querySelectorAll("td");
    // Check that numeric cells show 0
    expect(cells[1].textContent).toBe("0"); // Monday
    expect(cells[2].textContent).toBe("0"); // Wednesday
  });
});
