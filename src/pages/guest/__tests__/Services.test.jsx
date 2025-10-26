import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import Services from "../Services.jsx";

const useAppContextMock = vi.fn();

vi.mock("../../../context/useAppContext", () => ({
  useAppContext: () => useAppContextMock(),
}));

vi.mock("../../../context/useAuth", () => ({
  useAuth: () => ({ user: { role: "admin" } }),
}));

vi.mock("../../../components/ShowerBooking", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../../components/LaundryBooking", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../../components/StickyQuickActions", () => ({
  __esModule: true,
  default: ({
    isVisible,
    onShowerClick,
    onLaundryClick,
    onDonationClick,
    onClose,
  }) => {
    if (!isVisible) return null;
    return (
      <div data-testid="sticky-quick-actions">
        <button onClick={onShowerClick}>Sticky Shower</button>
        <button onClick={onLaundryClick}>Sticky Laundry</button>
        <button onClick={onDonationClick}>Sticky Donation</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

vi.mock("../../../components/Selectize", () => ({
  __esModule: true,
  default: ({ options = [], value = "", onChange, placeholder = "" }) => (
    <select
      data-testid="selectize"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("../../../components/charts/DonutCardRecharts", () => ({
  __esModule: true,
  default: () => <div data-testid="donut-card" />,
}));

vi.mock("../../../components/charts/TrendLineRecharts", () => ({
  __esModule: true,
  default: () => <div data-testid="trend-line" />,
}));

vi.mock("../../../components/lanes/BicycleKanban", () => ({
  __esModule: true,
  default: () => <div data-testid="bicycle-kanban" />,
}));

vi.mock("../../../components/lanes/ShowerKanban", () => ({
  __esModule: true,
  default: () => <div data-testid="shower-kanban" />,
}));

vi.mock("../../../components/lanes/LaundryKanban", () => ({
  __esModule: true,
  default: () => <div data-testid="laundry-kanban" />,
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("../../../utils/toast", () => ({
  __esModule: true,
  default: {
    validationError: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../../../utils/bicycles", () => ({
  __esModule: true,
  getBicycleServiceCount: () => 1,
}));

const fixedToday = "2024-10-24";

vi.mock("../../../utils/date", () => ({
  __esModule: true,
  todayPacificDateString: () => fixedToday,
  pacificDateStringFrom: (value) => {
    if (!value) return "";
    const str = String(value);
    if (str.length >= 10) return str.slice(0, 10);
    return str;
  },
}));

vi.mock("../../../utils/animations", () => {
  const animatedProxy = new Proxy(
    {},
    {
      get: (_target, tag) => {
        const Component = ({ children, ...props }) =>
          React.createElement(tag, props, children);
        Component.displayName = `Animated.${String(tag)}`;
        return Component;
      },
    },
  );

  const useStagger = (count = 0) => {
    const total = typeof count === "number" && count > 0 ? count : 0;
    return Array.from({ length: total }, () => ({}));
  };

  return {
    __esModule: true,
    useFadeInUp: () => ({}),
    useScaleIn: () => ({}),
    useStagger,
    animated: animatedProxy,
    SpringIcon: ({ children }) => <>{children}</>,
  };
});

const FILTER_STORAGE_KEY = "services-filters-v1";

const defaultMetrics = {
  mealsServed: 42,
  showersBooked: 3,
  laundryLoads: 7,
  haircuts: 2,
  holidays: 1,
  bicycles: 5,
};

const defaultGuests = [
  { id: "guest-1", name: "July Carter", housingStatus: "Sheltered" },
  { id: "guest-2", name: "Chris Pine", housingStatus: "Unknown" },
];

const defaultMealRecords = [
  { id: "meal-1", date: `${fixedToday}T12:00:00Z`, count: 1 },
];

const defaultShowerRecords = [
  {
    id: "shower-1",
    guestId: "guest-1",
    status: "awaiting",
    date: `${fixedToday}T09:00:00Z`,
    time: "09:00",
  },
  {
    id: "shower-2",
    guestId: "guest-2",
    status: "done",
    date: `${fixedToday}T09:30:00Z`,
    time: "09:30",
  },
];

const defaultLaundryRecords = [
  {
    id: "laundry-1",
    guestId: "guest-1",
    status: "in_progress",
    date: `${fixedToday}T08:30:00Z`,
    time: "08:30 - 09:15",
    type: "wash",
  },
  {
    id: "laundry-2",
    guestId: "guest-2",
    status: "done",
    date: `${fixedToday}T07:30:00Z`,
    time: "07:30 - 08:15",
    type: "wash",
  },
];

const defaultBicycleRecords = [
  {
    id: "bike-1",
    guestId: "guest-1",
    status: "done",
    date: `${fixedToday}T15:00:00Z`,
    priority: 2,
  },
];

const defaultActionHistory = [
  {
    id: "action-1",
    description: "Marked laundry done",
    timestamp: "2024-10-24T10:00:00Z",
  },
];

const buildContext = (overrides = {}) => {
  const { metrics = defaultMetrics, ...rest } = overrides;

  const context = {
    getTodayMetrics: vi.fn(() => metrics),
    getTodayLaundryWithGuests: vi.fn(() => []),
    mealRecords: defaultMealRecords,
    rvMealRecords: [],
    addRvMealRecord: vi.fn(),
    shelterMealRecords: [],
    addShelterMealRecord: vi.fn(),
    addUnitedEffortMealRecord: vi.fn(),
    unitedEffortMealRecords: [],
    extraMealRecords: [],
    addExtraMealRecord: vi.fn(),
    dayWorkerMealRecords: [],
    removeMealAttendanceRecord: vi.fn(),
    addDayWorkerMealRecord: vi.fn(),
    lunchBagRecords: [],
    addLunchBagRecord: vi.fn(),
    laundryRecords: defaultLaundryRecords,
    showerRecords: defaultShowerRecords,
    haircutRecords: [],
    holidayRecords: [],
    guests: defaultGuests,
    showerPickerGuest: null,
    setShowerPickerGuest: vi.fn(),
    laundryPickerGuest: null,
    setLaundryPickerGuest: vi.fn(),
    LAUNDRY_STATUS: {
      DONE: "done",
      PICKED_UP: "picked_up",
      RETURNED: "returned",
      OFFSITE_PICKED_UP: "offsite_picked_up",
    },
    updateLaundryStatus: vi.fn(async () => true),
    updateLaundryBagNumber: vi.fn(async () => true),
    actionHistory: defaultActionHistory,
    undoAction: vi.fn(async () => true),
    clearActionHistory: vi.fn(),
    allShowerSlots: ["09:00", "09:30", "10:00"],
    allLaundrySlots: [],
    cancelShowerRecord: vi.fn(),
    rescheduleShower: vi.fn(async (_id, time) => ({ time })),
    updateShowerStatus: vi.fn(async () => true),
    cancelLaundryRecord: vi.fn(),
    rescheduleLaundry: vi.fn(),
    canGiveItem: vi.fn(() => true),
    getLastGivenItem: vi.fn(() => null),
    giveItem: vi.fn(),
    getNextAvailabilityDate: vi.fn(() => new Date(`${fixedToday}T00:00:00Z`)),
    getDaysUntilAvailable: vi.fn(() => 0),
    bicycleRecords: defaultBicycleRecords,
    updateBicycleRecord: vi.fn(),
    deleteBicycleRecord: vi.fn(),
    setBicycleStatus: vi.fn(),
    moveBicycleRecord: vi.fn(),
    settings: {},
    BICYCLE_REPAIR_STATUS: {},
  };

  return { ...context, ...rest };
};

const renderServices = (overrides = {}) => {
  const context = buildContext(overrides);
  useAppContextMock.mockReturnValue(context);
  return { context, ...render(<Services />) };
};

beforeEach(() => {
  window.scrollTo = vi.fn();
  useAppContextMock.mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("Services page", () => {
  it("shows multi-service metrics from context", () => {
    renderServices();

    expect(
      screen.getByText(/Meals served today/i).parentElement,
    ).toHaveTextContent("42");
    expect(screen.getByText(/Laundry loads/i).parentElement).toHaveTextContent(
      "7",
    );
    expect(
      screen.getByText(/Bicycle repairs today/i).parentElement,
    ).toHaveTextContent("1");
    expect(screen.getByText(/5 completed overall/i)).toBeInTheDocument();
  });

  it("switches sections when navigation tabs are used", async () => {
    renderServices();

    expect(screen.queryByText("Today's Showers")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    await waitFor(() => {
      expect(screen.getByText("Today's Showers")).toBeInTheDocument();
    });
  });

  it("invokes clear history from the undo panel", async () => {
    const { context } = renderServices();

    fireEvent.click(screen.getByRole("button", { name: /Undo Actions/i }));

    await waitFor(() => {
      expect(screen.getByText(/Recent actions/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Clear All/i }));

    expect(context.clearActionHistory).toHaveBeenCalledTimes(1);
  });

  it("restores and persists shower filter selections", async () => {
    const savedFilters = {
      showerStatusFilter: "done",
      showerLaundryFilter: "with",
      showerSort: "name",
      showCompletedShowers: true,
      laundryTypeFilter: "any",
      laundryStatusFilter: "any",
      laundrySort: "time-asc",
      showCompletedLaundry: false,
      bicycleViewMode: "kanban",
      showerViewMode: "list",
      laundryViewMode: "list",
    };

    window.localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify(savedFilters),
    );

    renderServices();

    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    const statusSelect = await screen.findByDisplayValue("Status: Done");

    // Verify initial restoration
    expect(statusSelect.value).toBe("done");

    // Now change it and verify persistence
    fireEvent.change(statusSelect, { target: { value: "awaiting" } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Status: Awaiting")).toBeInTheDocument();
    });

    // Check that localStorage was updated
    await waitFor(() => {
      const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored);
      expect(parsed.showerStatusFilter).toBe("awaiting");
    });
  });

  it("navigates to showers via the timeline quick add control", async () => {
    renderServices();

    fireEvent.click(screen.getByRole("button", { name: /^Timeline$/i }));

    const quickAddShower = await screen.findByRole("button", {
      name: /Add Shower/i,
    });

    fireEvent.click(quickAddShower);

    await waitFor(() => {
      expect(screen.getByText("Today's Showers")).toBeInTheDocument();
    });
  });

  it("requires a meal export date range before downloading", async () => {
    renderServices();

    // Get all buttons with "Data export" text and click the one in the navigation
    const dataExportButtons = screen.getAllByRole("button", {
      name: /Data export/i,
    });
    fireEvent.click(dataExportButtons[0]);

    // Wait for the export section heading to appear
    await screen.findByText(/Data exports & backups/i);

    // The Download CSV button should be disabled when no dates are selected
    const downloadButton = screen.getByRole("button", {
      name: /Download CSV/i,
    });

    // Verify the button is disabled
    expect(downloadButton).toBeDisabled();

    // The button being disabled prevents the download, which is the expected behavior
    // when no date range is selected. The toast.error in the handler is defensive code
    // that would only fire if somehow the button was clicked while disabled.
  });
});
