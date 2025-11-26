import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Dashboard from "../Dashboard";

let mockContext = {};
let exportDataAsCSVMock;
let getDateRangeMetricsMock;
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

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
  collection: vi.fn(),
  query: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}));

// Mock supabaseProxyClient to prevent Firebase Functions initialization
vi.mock("../../../supabaseProxyClient", () => ({
  supabaseProxy: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
  isSupabaseProxyAvailable: false,
  default: null,
}));

vi.mock("../../../context/useAppContext", () => ({
  useAppContext: () => mockContext || {},
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

const selectDataset = (label) => {
  const heading = screen.getByText(label, { selector: "div" });
  const button = heading.closest("button");
  if (!button) {
    throw new Error(`Dataset button not found for label: ${label}`);
  }
  fireEvent.click(button);
};

const getContinueButton = () =>
  screen.getByRole("button", { name: /Continue to review/i });

const getExportButton = () =>
  screen.getByRole("button", { name: /Export CSV/i });

const completeExportFlow = (datasetLabel, configureStep) => {
  selectDataset(datasetLabel);
  if (configureStep) configureStep();

  const continueButton = getContinueButton();
  expect(continueButton).not.toBeDisabled();
  fireEvent.click(continueButton);

  const exportButton = getExportButton();
  expect(exportButton).not.toBeDisabled();
  fireEvent.click(exportButton);
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

    completeExportFlow("Guest roster");

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
      mealRecords: [{ guestId: "guest-1", date: dateString, count: 2 }],
      showerRecords: [{ guestId: "guest-1", date: dateString, time: "09:30" }],
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

    completeExportFlow("Service history");

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
      mealRecords: [{ guestId: "guest-1", date: dateString, count: 1 }],
      showerRecords: [{ guestId: "guest-1", date: dateString, time: "08:00" }],
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

    completeExportFlow("Single guest timeline", () => {
      const select = screen.getByTestId("selectize");
      fireEvent.change(select, { target: { value: "guest-1" } });
    });

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows, filename] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toHaveLength(3);
    expect(filename).toMatch(/guest-/);
    expect(toastMock.success).toHaveBeenCalled();
  });

  it("exports current metrics", () => {
    renderDashboard();

    completeExportFlow("Daily metrics");

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

  it("exports bicycle records in service data", () => {
    const dateString = new Date("2025-03-15").toISOString();
    setupMockContext({
      bicycleRecords: [
        {
          guestId: "guest-1",
          date: dateString,
          repairType: "Flat tire",
          status: "completed",
          notes: "Fixed front tire",
        },
      ],
    });

    renderDashboard();

    completeExportFlow("Service history");

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Service: "Bicycle Repair",
          "Repair Type": "Flat tire",
          "Repair Status": "completed",
          Notes: "Fixed front tire",
        }),
      ]),
    );
  });

  it("exports haircut records in service data", () => {
    const dateString = new Date("2025-03-15").toISOString();
    setupMockContext({
      haircutRecords: [
        {
          guestId: "guest-1",
          date: dateString,
        },
      ],
    });

    renderDashboard();

    completeExportFlow("Service history");

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Service: "Haircut",
          "Guest ID": "guest-1",
        }),
      ]),
    );
  });

  it("exports holiday records in service data", () => {
    const dateString = new Date("2025-12-25").toISOString();
    setupMockContext({
      holidayRecords: [
        {
          guestId: "guest-1",
          date: dateString,
        },
      ],
    });

    renderDashboard();

    completeExportFlow("Service history");

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Service: "Holiday",
          "Guest ID": "guest-1",
        }),
      ]),
    );
  });

  it("exports supplies/items given data", () => {
    const dateString = new Date("2025-03-15").toISOString();
    setupMockContext({
      itemGivenRecords: [
        {
          guestId: "guest-1",
          date: dateString,
          item: "sleeping_bag",
        },
        {
          guestId: "guest-1",
          date: dateString,
          item: "blanket",
        },
      ],
    });

    renderDashboard();

  completeExportFlow("Supplies given");

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows, filename] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Item: "sleeping bag",
          "Guest ID": "guest-1",
        }),
        expect.objectContaining({
          Item: "blanket",
          "Guest ID": "guest-1",
        }),
      ]),
    );
    expect(filename).toMatch(/supplies/);
  });

  it("exports donation records", () => {
    const dateString = new Date("2025-03-15").toISOString();
    setupMockContext({
      donationRecords: [
        {
          date: dateString,
          type: "Food",
          itemName: "Canned goods",
          trays: 5,
          weightLbs: 50,
          donor: "Community Church",
        },
      ],
    });

    renderDashboard();

  completeExportFlow("Donations log");

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows, filename] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Type: "Food",
          Item: "Canned goods",
          Trays: 5,
          "Weight (lbs)": 50,
          Donor: "Community Church",
        }),
      ]),
    );
    expect(filename).toMatch(/donations/);
  });

  it("exports day worker meal records in service data", () => {
    const dateString = new Date("2025-03-15").toISOString();
    setupMockContext({
      dayWorkerMealRecords: [
        {
          date: dateString,
          count: 5,
        },
      ],
    });

    renderDashboard();

    completeExportFlow("Service history");

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Service: "Day Worker Meal",
          "Guest ID": "-",
          "Guest Name": "-",
          Quantity: 5,
        }),
      ]),
    );
  });

  it("handles guest export when no guests exist", () => {
    setupMockContext({
      guests: [],
    });

    renderDashboard();

  completeExportFlow("Guest roster");

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows] = exportDataAsCSVMock.mock.calls[0];
    expect(rows).toEqual([]);
  });

  it("shows error when exporting metrics with no data", () => {
    setupMockContext({
      getDateRangeMetrics: vi.fn(() => ({
        mealsServed: 0,
        showersBooked: 0,
        laundryLoads: 0,
        dailyBreakdown: [],
      })),
    });

    renderDashboard();

    completeExportFlow("Daily metrics");

    expect(exportDataAsCSVMock).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(
      "No daily breakdown records to export",
    );
  });

  it("shows error when exporting single guest with no service history", () => {
    setupMockContext({
      mealRecords: [],
      showerRecords: [],
      laundryRecords: [],
    });

    renderDashboard();

    completeExportFlow("Single guest timeline", () => {
      const select = screen.getByTestId("selectize");
      fireEvent.change(select, { target: { value: "guest-1" } });
    });

    expect(exportDataAsCSVMock).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(
      "No service history found for this guest",
    );
  });

  it("disables export button when no guest is selected", () => {
    renderDashboard();

    selectDataset("Single guest timeline");
    const continueButton = getContinueButton();
    expect(continueButton).toBeDisabled();

    fireEvent.click(continueButton);
    expect(exportDataAsCSVMock).not.toHaveBeenCalled();
  });

  it("exports guest details with all fields", () => {
    const guestWithAllFields = {
      id: "guest-2",
      guestId: "G-002",
      name: "Bob Smith",
      firstName: "Bob",
      lastName: "Smith",
      preferredName: "Bobby",
      housingStatus: "Unsheltered",
      location: "Downtown",
      age: "36-45",
      gender: "Male",
      phone: "555-1234",
      birthdate: "1980-01-15",
      createdAt: new Date("2025-01-15").toISOString(),
    };

    setupMockContext({
      guests: [guestWithAllFields],
    });

    renderDashboard();

  completeExportFlow("Guest roster");

    expect(exportDataAsCSVMock).toHaveBeenCalledTimes(1);
    const [rows] = exportDataAsCSVMock.mock.calls[0];
    expect(rows[0]).toEqual({
      Guest_ID: "G-002",
      "First Name": "Bob",
      "Last Name": "Smith",
      "Preferred Name": "Bobby",
      Name: "Bob Smith",
      "Housing Status": "Unsheltered",
      Location: "Downtown",
      Age: "36-45",
      Gender: "Male",
      Phone: "555-1234",
      "Birth Date": "1980-01-15",
      "Registration Date": expect.any(String),
    });
  });
});
