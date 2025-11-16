import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "../Dashboard";

let mockContext = {};

vi.mock("../../../context/useAppContext", () => ({
  useAppContext: () => mockContext || {},
}));

vi.mock("../../../context/useAuth", () => ({
  useAuth: () => ({ user: { role: "board" } }),
}));

vi.mock("../../../components/GuestBatchUpload", () => ({
  default: () => <div data-testid="guest-batch-upload" />,
}));

vi.mock("../../../components/AttendanceBatchUpload", () => ({
  default: () => <div data-testid="attendance-batch-upload" />,
}));

vi.mock("../../../components/admin/OverviewDashboard", () => ({
  default: () => <div data-testid="overview-section" />,
}));

const setupMockContext = (overrides = {}) => {
  mockContext = {
    getTodayMetrics: () => ({}),
    getDateRangeMetrics: () => ({}),
    exportDataAsCSV: vi.fn(),
    guests: [],
    mealRecords: [],
    rvMealRecords: [],
    shelterMealRecords: [],
    extraMealRecords: [],
    dayWorkerMealRecords: [],
    lunchBagRecords: [],
    showerRecords: [],
    laundryRecords: [],
    itemGivenRecords: [],
    haircutRecords: [],
    holidayRecords: [],
    bicycleRecords: [],
    donationRecords: [],
    resetAllData: vi.fn(),
    supabaseConfigured: false,
    supabaseEnabled: false,
    settings: {},
    updateSettings: vi.fn(),
    ...overrides,
  };
};

describe("Dashboard role 'board'", () => {
  beforeEach(() => setupMockContext());

  it("shows only admin dashboard nav and hides batch upload & system items", () => {
    render(<Dashboard />);

    // Overview should be available
    expect(screen.getByRole("button", { name: /Overview/i })).toBeInTheDocument();
    // Batch upload button should not be available
    const batchButtons = screen.queryAllByRole("button", { name: /Batch Upload/i });
    expect(batchButtons.length).toBe(0);
    // System button should not be present
    const systemButtons = screen.queryAllByRole("button", { name: /System/i });
    expect(systemButtons.length).toBe(0);

    // Guest upload components shouldn't render
    expect(screen.queryByTestId("guest-batch-upload")).toBeNull();
    expect(screen.queryByTestId("attendance-batch-upload")).toBeNull();
  });
});
