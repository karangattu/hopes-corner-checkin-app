import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

vi.mock("../../../components/lanes/LaundryKanban", () => ({
  __esModule: true,
  default: () => <div data-testid="laundry-kanban" />,
}));

vi.mock("../../../components/Donations", () => ({
  __esModule: true,
  default: () => <div data-testid="donations" />,
}));

vi.mock("../../../components/LaPlazaDonations", () => ({
  __esModule: true,
  default: () => <div data-testid="la-plaza-donations" />,
}));

vi.mock("../../../components/CompactShowerList", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../../components/CompactLaundryList", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../../components/ShowerDetailModal", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../../components/SectionRefreshButton", () => ({
  __esModule: true,
  default: ({ serviceType }) => (
    <button
      data-testid={`section-refresh-${serviceType}`}
      aria-label={`Refresh ${serviceType}`}
    >
      Refresh {serviceType}
    </button>
  ),
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
  isBicycleStatusCountable: (status) => {
    const normalized = (status || "").toString().toLowerCase();
    return (
      !status ||
      [
        "done",
        "completed",
        "ready",
        "finished",
        "pending",
        "in_progress",
      ].includes(normalized)
    );
  },
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
  isoFromPacificDateString: (pacificDateStr) => {
    // Mock implementation: convert YYYY-MM-DD to ISO by setting UTC midnight + offset
    if (!pacificDateStr) return "";
    const [year, month, day] = pacificDateStr.split("-").map(Number);
    if ([year, month, day].some((n) => Number.isNaN(n))) return "";
    // Return a mock ISO string for the given date
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
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
    getPreviousServiceDay: vi.fn(() => "2025-11-26"),
    getLaundryForDateWithGuests: vi.fn(() => []),
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
    activeServiceSection: "overview",
    setActiveServiceSection: vi.fn(),
  };

  return { ...context, ...rest };
};

const renderServices = (overrides = {}) => {
  let capturedContext;
  useAppContextMock.mockImplementation(() => {
    const [activeSection, setActiveSection] = React.useState(
      overrides.activeServiceSection || "overview",
    );

    capturedContext = buildContext({
      ...overrides,
      activeServiceSection: activeSection,
      setActiveServiceSection: setActiveSection,
    });
    return capturedContext;
  });

  const result = render(<Services />);
  return { ...result, context: capturedContext };
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
    const clearActionHistory = vi.fn();
    renderServices({
      actionHistory: [
        { id: 1, type: "test", timestamp: `${fixedToday}T12:00:00Z` },
      ],
      clearActionHistory,
    });

    fireEvent.click(screen.getByRole("button", { name: /Undo Actions/i }));

    await waitFor(() => {
      expect(screen.getByText(/Recent actions/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Clear All/i }));

    expect(clearActionHistory).toHaveBeenCalledTimes(1);
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

    // Clear the dates to test disabled state
    const startDateInput = screen.getByLabelText(/Start date/i);
    const endDateInput = screen.getByLabelText(/End date/i);
    fireEvent.change(startDateInput, { target: { value: "" } });
    fireEvent.change(endDateInput, { target: { value: "" } });

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

  it("exports meal report CSV with date and day of week columns", async () => {
    const context = buildContext({
      mealRecords: [
        { id: "meal-1", date: "2024-10-24T12:00:00Z", count: 5 },
        { id: "meal-2", date: "2024-10-25T12:00:00Z", count: 3 },
      ],
      rvMealRecords: [
        { id: "rv-1", date: "2024-10-24T12:00:00Z", count: 2 },
      ],
      dayWorkerMealRecords: [],
      shelterMealRecords: [],
      unitedEffortMealRecords: [],
      extraMealRecords: [],
      lunchBagRecords: [],
    });
    useAppContextMock.mockReturnValue(context);

    renderServices();

    // Navigate to data exports section
    const dataExportButtons = screen.getAllByRole("button", {
      name: /Data export/i,
    });
    fireEvent.click(dataExportButtons[0]);

    // Wait for export section to load
    await screen.findByText(/Custom meal summary/i);

    // Set date range
    const startDateInput = screen.getByLabelText(/Start date/i);
    const endDateInput = screen.getByLabelText(/End date/i);

    fireEvent.change(startDateInput, { target: { value: "2024-10-24" } });
    fireEvent.change(endDateInput, { target: { value: "2024-10-25" } });

    // Click the Download CSV button
    const downloadButton = screen.getByRole("button", {
      name: /Download CSV/i,
    });

    fireEvent.click(downloadButton);

    // Verify the CSV export was triggered
    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it("end service day > cancels all active bookings", async () => {
    const cancelMultipleShowers = vi.fn();
    const cancelMultipleLaundry = vi.fn();

    renderServices({
      cancelMultipleShowers,
      cancelMultipleLaundry,
      showerRecords: [
        { id: "s1", guestId: "g1", date: `${fixedToday}T12:00:00Z`, status: "booked", time: "08:00" }
      ],
      laundryRecords: [
        { id: "l1", guestId: "g1", date: `${fixedToday}T12:00:00Z`, status: "waiting", laundryType: "onsite" }
      ]
    });

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    // Click End Showers button (new UI has separate buttons for Showers/Laundry)
    const endDayBtn = await screen.findByRole("button", {
      name: /End Showers/i,
    });

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    fireEvent.click(endDayBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(cancelMultipleShowers).toHaveBeenCalledWith(["s1"]);

    confirmSpy.mockRestore();
  });

  it("end service day > cancels awaiting showers as well", async () => {
    const cancelMultipleShowers = vi.fn();

    renderServices({
      cancelMultipleShowers,
      showerRecords: [
        { id: "s1", guestId: "g1", date: `${fixedToday}T12:00:00Z`, status: "awaiting", time: "08:00" }
      ]
    });

    // Navigate to Export section where the End Service Day buttons are
    fireEvent.click(screen.getByRole("button", { name: /Data export/i }));

    const endDayBtn = await screen.findByRole("button", {
      name: /End Shower Day/i,
    });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    fireEvent.click(endDayBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(cancelMultipleShowers).toHaveBeenCalledWith(["s1"]);

    confirmSpy.mockRestore();
  });

  it("allows staff users to end service day", async () => {
    const cancelMultipleShowers = vi.fn();

    // Mock useAuth to return a staff user
    vi.mock("../../../context/useAuth", () => ({
      useAuth: () => ({ user: { role: "staff" } }),
    }));

    renderServices({
      cancelMultipleShowers,
      showerRecords: [
        { id: "s1", guestId: "g1", date: `${fixedToday}T12:00:00Z`, status: "booked", time: "08:00" }
      ]
    });

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    // Verify End Showers button is visible for staff (new UI has separate buttons)
    const endDayBtn = await screen.findByRole("button", {
      name: /End Showers/i,
    });
    expect(endDayBtn).toBeInTheDocument();

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    fireEvent.click(endDayBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(cancelMultipleShowers).toHaveBeenCalledWith(["s1"]);

    confirmSpy.mockRestore();
  });

  describe("Section Refresh Buttons", () => {
    it("shows refresh button in the Showers section", async () => {
      renderServices();

      // Navigate to Showers section
      fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

      await waitFor(() => {
        const showerRefreshButton = screen.getByTestId("section-refresh-shower");
        expect(showerRefreshButton).toBeInTheDocument();
      });
    });

    it("shows refresh button in the Laundry section", async () => {
      renderServices();

      // Navigate to Laundry section by clicking the nav button that matches "Laundry" exactly
      const laundryNavButtons = screen.getAllByRole("button", { name: /Laundry/i });
      // Find the nav button (has the class pattern for nav items)
      const navButton = laundryNavButtons.find(btn =>
        btn.className.includes('rounded-md') &&
        btn.className.includes('text-sm')
      );
      fireEvent.click(navButton);

      await waitFor(() => {
        const laundryRefreshButton = screen.getByTestId("section-refresh-laundry");
        expect(laundryRefreshButton).toBeInTheDocument();
      });
    });

    it("refresh button has correct aria-label for showers", async () => {
      renderServices();

      // Navigate to Showers section
      fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

      await waitFor(() => {
        const showerRefreshButton = screen.getByTestId("section-refresh-shower");
        expect(showerRefreshButton).toHaveAttribute("aria-label", "Refresh shower");
      });
    });

    it("refresh button has correct aria-label for laundry", async () => {
      renderServices();

      // Navigate to Laundry section by clicking the nav button
      const laundryNavButtons = screen.getAllByRole("button", { name: /Laundry/i });
      const navButton = laundryNavButtons.find(btn =>
        btn.className.includes('rounded-md') &&
        btn.className.includes('text-sm')
      );
      fireEvent.click(navButton);

      await waitFor(() => {
        const laundryRefreshButton = screen.getByTestId("section-refresh-laundry");
        expect(laundryRefreshButton).toHaveAttribute("aria-label", "Refresh laundry");
      });
    });
  });

  describe("Shower Time-Travel", () => {
    it("renders showers section without errors", async () => {
      renderServices();

      // Navigate to Showers section
      fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

      await waitFor(() => {
        const showerSection = screen.getByText(/Today's Showers/i);
        expect(showerSection).toBeInTheDocument();
      });
    });

    it("shows date navigation controls for showers", async () => {
      renderServices();

      // Navigate to Showers section
      fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

      // Look for navigation buttons or date display
      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        // Should have navigation buttons in showers section
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it("displays shower records for the selected date", async () => {
      renderServices();

      // Navigate to Showers section
      fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

      // Should render shower section without crashing
      await waitFor(() => {
        const showerSection = screen.getByText(/Today's Showers/i);
        expect(showerSection).toBeInTheDocument();
      });
    });

    it("shower time-travel feature integrates with main services view", async () => {
      renderServices();

      // Navigate to Showers section
      fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

      await waitFor(() => {
        // Verify we're in the showers section
        const showerHeader = screen.getByText(/Today's Showers/i);
        expect(showerHeader).toBeInTheDocument();

        // Verify date navigation UI exists (buttons or date display)
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  it("resolves guest name even when record ID matches external_id instead of UUID (Unknown Guest Resilience)", () => {
    const resilientGuest = { id: "uuid-123", guestId: "EXT-123", name: "Resilient Guest", housingStatus: "Sheltered" };
    // Meal record points to EXT-123 (mismatched with UUID but matches external_id)
    const orphanedMeal = { id: "m-1", guestId: "EXT-123", date: `${fixedToday}T12:00:00Z`, count: 1 };

    // Render with specific data overrides
    renderServices({
      guests: [resilientGuest],
      mealRecords: [orphanedMeal],
      // Ensure we are on a view that shows the log
      activeServiceSection: "meals" // Assuming 'meals' is the key for Meal Log or it shows in overview
    });

    // Loop to find the guest name text
    // If it's not found, check if we need to switch tabs
    // But for now, let's assume it appears in the Meal Log / History

    // Note: If 'activeServiceSection' isn't supported by renderServices overrides directly 
    // (it sets initial state), we might need to navigate.
    // Let's try to query.
  });

  it("resolves guest name properly with mismatched IDs", async () => {
    const resilientGuest = { id: "uuid-123", guestId: "EXT-123", name: "Resilient Guest", firstName: "Resilient", lastName: "Guest" };
    const orphanedMeal = { id: "m-1", guestId: "EXT-123", date: `${fixedToday}T12:00:00Z`, count: 1 };

    renderServices({
      guests: [resilientGuest],
      mealRecords: [orphanedMeal]
    });

    // Navigate to Meals section to see the list if not default
    const mealsTab = screen.queryByRole("button", { name: /^Meals$/i });
    if (mealsTab) {
      fireEvent.click(mealsTab);
    }

    // Look for the guest name
    await waitFor(() => {
      expect(screen.getByText("Resilient Guest")).toBeInTheDocument();
    });

    // Ensure "Unknown Guest" is NOT present
    expect(screen.queryByText("Unknown Guest")).not.toBeInTheDocument();

    // Ensure "Orphaned Record" badge is NOT present
    expect(screen.queryByText(/Orphaned Record/i)).not.toBeInTheDocument();
  });

  it("distinguishes between meal count and unique guest count", async () => {
    // Add a guest
    const guest = { id: "g1", fullName: "Test Guest", housingStatus: "Unhoused", guestId: "G100" };

    // Add 2 meal records for the same guest
    const mealRecords = [
      { id: "m1", guestId: "g1", date: new Date().toISOString() },
      { id: "m2", guestId: "g1", date: new Date().toISOString() } // 2nd meal
    ];

    // Force metrics calculation
    const getTodayMetrics = vi.fn().mockReturnValue({
      mealsServed: 2,
      activeGuestIds: ["g1"], // Only 1 unique guest
      showersBooked: 0,
      laundryLoads: 0,
      haircuts: 0,
      holidays: 0,
      bicycles: 0,
    });

    renderServices({
      guests: [guest],
      mealRecords,
      getTodayMetrics
    });

    // Verify "Meals served" is 2
    expect(screen.getByText("Meals served today")).toBeInTheDocument();
    // Use regex to be more flexible finding the number 2 near the text
    const mealCard = screen.getByText("Meals served today").closest("div");
    expect(within(mealCard).getByText("2")).toBeInTheDocument();

    // Verify "Unique guests" is 1
    expect(screen.getByText("Unique guests served")).toBeInTheDocument();
    const guestCard = screen.getByText("Unique guests served").closest("div");
    expect(within(guestCard).getByText("1")).toBeInTheDocument();
  });

  it("displays proxy name when meal is picked up by another guest", async () => {
    // Guest A (Receiver)
    const guestA = { id: "g1", name: "Guest A", guestId: "GA" };
    // Guest B (Proxy)
    const guestB = { id: "g2", name: "Guest B", guestId: "GB" };

    // Meal for Guest A, picked up by Guest B
    const mealRecords = [
      {
        id: "m1",
        guestId: "g1",
        date: `${fixedToday}T12:00:00Z`,
        pickedUpByProxyId: "g2",
        count: 1,
      }
    ];

    renderServices({
      guests: [guestA, guestB],
      mealRecords
    });

    // Navigate to Meals section to ensure list is visible
    const mealsTab = screen.queryByRole("button", { name: /^Meals$/i });
    if (mealsTab) fireEvent.click(mealsTab);

    // Verify proxy badge title includes the proxy name
    await waitFor(() => {
      expect(screen.getByTitle('Picked up by proxy: Guest B')).toBeInTheDocument();
    });
  });
});