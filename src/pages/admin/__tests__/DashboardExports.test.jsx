import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Dashboard from "../Dashboard";

let mockContext;
let exportDataAsCSVMock;
let getDateRangeMetricsMock;
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../../../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}));

vi.mock("@react-spring/web", () => ({
  animated: {
    div: ({ children, ...rest }) => <div {...rest}>{children}</div>,
    span: ({ children, ...rest }) => <span {...rest}>{children}</span>,
  },
}));

vi.mock("../../../utils/animations", () => ({
  useFadeInUp: () => ({}),
  SpringIcon: ({ children }) => <span>{children}</span>,
}));

vi.mock("../../../components/admin/OverviewDashboard", () => ({
  default: () => <div data-testid="overview-section" />,
}));

vi.mock("../../../components/GuestBatchUpload", () => ({
  default: () => <div data-testid="guest-batch-upload" />,
}));

vi.mock("../../../components/AttendanceBatchUpload", () => ({
  default: () => <div data-testid="attendance-batch-upload" />,
}));

vi.mock("../../../components/Donations", () => ({
  default: () => <div data-testid="donations" />,
}));

vi.mock("../../../components/charts/TrendLine", () => ({
  default: () => <div data-testid="trend-line" />,
}));

vi.mock("../../../components/Selectize", () => ({
  default: ({ options, value, onChange, placeholder }) => (
    <select
      data-testid="selectize"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

const baseGuest = {
  id: "guest-1",
  guestId: "G-001",
  name: "Alice Example",
  firstName: "Alice",
  lastName: "Example",
  preferredName: "",
  housingStatus: "Sheltered",
  location: "Mountain View",
  age: "26-35",
  gender: "Female",
  phone: "",
  birthdate: "",
  createdAt: new Date("2025-01-01").toISOString(),
};

const setupMockContext = (overrides = {}) => {
  exportDataAsCSVMock = vi.fn();
  getDateRangeMetricsMock = vi.fn(() => ({
    mealsServed: 3,
    showersBooked: 2,
    laundryLoads: 1,
    dailyBreakdown: [
      {
        date: "2025-10-05",
        meals: 3,
        showers: 2,
        laundry: 1,
      },
    ],
  }));

  mockContext = {
    getTodayMetrics: vi.fn(() => ({
      mealsServed: 0,
      showersBooked: 0,
      laundryLoads: 0,
    })),
    getDateRangeMetrics: getDateRangeMetricsMock,
    exportDataAsCSV: exportDataAsCSVMock,
    guests: [baseGuest],
    mealRecords: [],
    rvMealRecords: [],
    unitedEffortMealRecords: [],
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
    settings: {},
  };

  mockContext = {
    ...mockContext,
    ...overrides,
  };
};

const openDataExportTab = () => {
  const dataExportButton = screen.getByRole("button", {
    name: /Data Export/i,
  });
  fireEvent.click(dataExportButton);
};

const renderDashboard = () => {
  render(<Dashboard />);
  openDataExportTab();
};

describe("Dashboard data exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  setupMockContext();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
  });

  it("exports the guest roster", () => {
    renderDashboard();

    fireEvent.click(
      screen.getByRole("button", { name: /Export Guest List/i }),
    );

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows, filename] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Guest_ID: baseGuest.guestId,
          Name: baseGuest.name,
        }),
      ]),
    );
    expect(filename).toMatch(/guests/);
  });

  it("exports combined service history", () => {
    const dateString = new Date("2025-03-15").toISOString();
    setupMockContext({
      mealRecords: [
        { guestId: "guest-1", date: dateString, count: 2 },
      ],
      showerRecords: [
        { guestId: "guest-1", date: dateString, time: "09:30" },
      ],
      laundryRecords: [
        {
          guestId: "guest-1",
          date: dateString,
          laundryType: "onsite",
          time: "10:00",
        },
      ],
    });

    renderDashboard();

    fireEvent.click(
      screen.getByRole("button", { name: /Export Service Records/i }),
    );

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows, filename] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Service: "Meal", Quantity: 2 }),
        expect.objectContaining({
          Service: "Shower",
          "Time Slot": "09:30",
        }),
        expect.objectContaining({
          Service: "Laundry",
          "Laundry Type": "onsite",
        }),
      ]),
    );
    expect(filename).toMatch(/services/);
  });

  it("exports a single guest's history via select", () => {
    const dateString = new Date("2025-03-15").toISOString();
    setupMockContext({
      mealRecords: [
        { guestId: "guest-1", date: dateString, count: 1 },
      ],
      showerRecords: [
        { guestId: "guest-1", date: dateString, time: "08:00" },
      ],
      laundryRecords: [
        {
          guestId: "guest-1",
          date: dateString,
          laundryType: "onsite",
          time: "08:30",
        },
      ],
    });

    renderDashboard();

    const select = screen.getByTestId("selectize");
    fireEvent.change(select, { target: { value: "guest-1" } });

    fireEvent.click(screen.getByRole("button", { name: /Export History/i }));

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows, filename] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toHaveLength(3);
    expect(filename).toMatch(/guest-/);
  expect(toastMock.success).toHaveBeenCalled();
  });

  it("exports current metrics", () => {
    renderDashboard();

    fireEvent.click(
      screen.getByRole("button", { name: /Export Current Metrics/i }),
    );

    expect(getDateRangeMetricsMock).toHaveBeenCalled();
    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows, filename] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Date: "2025-10-05",
          "Meals Served": 3,
        }),
      ]),
    );
    expect(filename).toMatch(/metrics/);
  expect(toastMock.success).toHaveBeenCalledWith("Metrics export created");
  });
});
