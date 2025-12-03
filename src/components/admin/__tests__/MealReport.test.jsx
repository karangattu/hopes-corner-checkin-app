import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MealReport from "../MealReport.jsx";
import toast from "react-hot-toast";

const useAppContextMock = vi.fn();

vi.mock("../../../context/useAppContext", () => ({
  useAppContext: () => useAppContextMock(),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("html2canvas", () => ({
  __esModule: true,
  default: vi.fn(() =>
    Promise.resolve({
      toDataURL: () => "data:image/png;base64,",
    }),
  ),
}));

const BASE_DATE = "2024-03-11T12:00:00Z";

const buildContext = (overrides = {}) => ({
  mealRecords: [{ id: "guest-1", date: BASE_DATE, count: 50, guestId: "g1" }],
  extraMealRecords: [{ id: "extra-1", date: BASE_DATE, count: 10 }],
  rvMealRecords: [{ id: "rv-1", date: BASE_DATE, count: 5 }],
  dayWorkerMealRecords: [],
  shelterMealRecords: [],
  unitedEffortMealRecords: [],
  lunchBagRecords: [],
  exportDataAsCSV: vi.fn(),
  guests: [{ id: "g1", age: "Adult 18-59" }],
  ...overrides,
});

const renderMealReport = (overrides = {}) => {
  useAppContextMock.mockReturnValue(buildContext(overrides));
  return render(<MealReport />);
};

describe("MealReport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
    vi.clearAllMocks();
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates totals when meal categories are toggled", async () => {
    renderMealReport();

    // Advance timers to trigger any time-based calculations
    vi.runAllTimers();

    const totalValue = screen.getByTestId("meal-total-value");
    expect(totalValue).toHaveTextContent("65");

    // Find the "Extra meals" checkbox by finding the text and then the checkbox within that label
    const extrasLabel = screen.getByText("Extra meals").closest("label");
    const extrasCheckbox = extrasLabel.querySelector('input[type="checkbox"]');
    fireEvent.click(extrasCheckbox);

    expect(screen.getByTestId("meal-total-value")).toHaveTextContent("55");
  });

  it("prevents exports when no meal categories are selected", async () => {
    renderMealReport();

    // Advance timers to trigger any time-based calculations
    vi.runAllTimers();

    const clearButton = screen.getByRole("button", { name: /Clear all/i });
    fireEvent.click(clearButton);

    // Click the Export tab to navigate to the export section
    const exportTab = screen.getByRole("button", { name: /Export/i });
    fireEvent.click(exportTab);

    const exportButton = screen.getByRole("button", {
      name: /Export .* Service Days/i,
    });
    fireEvent.click(exportButton);

    expect(toast.error).toHaveBeenCalledWith(
      "Select at least one meal category before exporting.",
    );
  });
});
