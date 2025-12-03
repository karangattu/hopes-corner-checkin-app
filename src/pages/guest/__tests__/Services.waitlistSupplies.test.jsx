import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import Services from "../Services.jsx";

const fixedToday = "2025-10-24";

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
  default: () => null,
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

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    custom: vi.fn(),
  },
}));

vi.mock("../../../utils/date", () => ({
  todayPacificDateString: vi.fn(() => fixedToday),
  pacificDateStringFrom: vi.fn((date) => {
    if (!date) return "";
    if (typeof date === "string" && date.startsWith(fixedToday)) {
      return fixedToday;
    }
    const d = new Date(date);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }),
  formatRelativeDate: vi.fn((date) => date),
  formatRelativeDateShort: vi.fn((date) => date),
}));

const defaultGuests = [
  {
    id: "guest-1",
    name: "Alice",
    firstName: "Alice",
    lastName: "Smith",
    legalFirstName: "Alice",
    legalLastName: "Smith",
    preferredName: null,
    isBanned: false,
  },
  {
    id: "guest-2",
    name: "Bob",
    firstName: "Bob",
    lastName: "Johnson",
    legalFirstName: "Bob",
    legalLastName: "Johnson",
    preferredName: null,
    isBanned: false,
  },
];

const defaultMetrics = {
  meals: 42,
  laundry: 7,
  showers: 5,
  haircuts: 2,
  bicycle: 1,
  rv: 0,
  shelter: 3,
  dayWorker: 1,
  extraMeals: 2,
  unitedEffort: 0,
  donations: 0,
};

// Waitlisted shower record
const waitlistedShowerRecords = [
  {
    id: "shower-waitlist-1",
    guestId: "guest-1",
    status: "waitlisted",
    date: `${fixedToday}T10:00:00Z`,
    time: null,
  },
];

const buildContext = (overrides = {}) => {
  const { metrics = defaultMetrics, ...rest } = overrides;

  const context = {
    getTodayMetrics: vi.fn(() => metrics),
    getTodayLaundryWithGuests: vi.fn(() => []),
    getPreviousServiceDay: vi.fn(() => "2025-11-26"),
    getLaundryForDateWithGuests: vi.fn(() => []),
    mealRecords: [],
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
    laundryRecords: [],
    showerRecords: waitlistedShowerRecords,
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
    actionHistory: [],
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
    bicycleRecords: [],
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

describe("Services - Waitlist Supplies", () => {
  it("shows waitlist section with supply buttons when there are waitlisted guests", async () => {
    renderServices();

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    await waitFor(() => {
      expect(screen.getByText("Shower Waitlist")).toBeInTheDocument();
    });
  });

  it("renders all 5 supply buttons for waitlisted guests (T-Shirt, Sleeping Bag, Backpack/Duffel Bag, Tent, Flip Flops)", async () => {
    renderServices();

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    await waitFor(() => {
      expect(screen.getByText("Shower Waitlist")).toBeInTheDocument();
    });

    // Check that all 5 supply buttons are present
    expect(screen.getByRole("button", { name: /Give T-Shirt/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Give Sleeping Bag/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Give Backpack\/Duffel Bag/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Give Tent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Give Flip Flops/i })).toBeInTheDocument();
  });

  it("calls giveItem when clicking supply button for waitlisted guest", async () => {
    const { context } = renderServices();

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    await waitFor(() => {
      expect(screen.getByText("Shower Waitlist")).toBeInTheDocument();
    });

    // Click the T-Shirt button
    const tshirtBtn = screen.getByRole("button", { name: /Give T-Shirt/i });
    fireEvent.click(tshirtBtn);

    expect(context.giveItem).toHaveBeenCalledWith("guest-1", "tshirt");
  });

  it("calls giveItem for Tent supply on waitlisted guest", async () => {
    const { context } = renderServices();

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    await waitFor(() => {
      expect(screen.getByText("Shower Waitlist")).toBeInTheDocument();
    });

    // Click the Tent button
    const tentBtn = screen.getByRole("button", { name: /Give Tent/i });
    fireEvent.click(tentBtn);

    expect(context.giveItem).toHaveBeenCalledWith("guest-1", "tent");
  });

  it("calls giveItem for Flip Flops supply on waitlisted guest", async () => {
    const { context } = renderServices();

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    await waitFor(() => {
      expect(screen.getByText("Shower Waitlist")).toBeInTheDocument();
    });

    // Click the Flip Flops button
    const flipFlopsBtn = screen.getByRole("button", { name: /Give Flip Flops/i });
    fireEvent.click(flipFlopsBtn);

    expect(context.giveItem).toHaveBeenCalledWith("guest-1", "flip_flops");
  });

  it("disables supply buttons when item cannot be given", async () => {
    const context = buildContext();
    // Make canGiveItem return false for tent and flip_flops
    context.canGiveItem = vi.fn((guestId, itemKey) => {
      if (itemKey === "tent" || itemKey === "flip_flops") return false;
      return true;
    });
    useAppContextMock.mockReturnValue(context);
    render(<Services />);

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    await waitFor(() => {
      expect(screen.getByText("Shower Waitlist")).toBeInTheDocument();
    });

    // Check that Tent and Flip Flops buttons are disabled
    const tentBtn = screen.getByRole("button", { name: /Give Tent/i });
    const flipFlopsBtn = screen.getByRole("button", { name: /Give Flip Flops/i });
    
    expect(tentBtn).toBeDisabled();
    expect(flipFlopsBtn).toBeDisabled();
  });
});

describe("Services - Backpack/Duffel Bag naming", () => {
  it("displays Backpack/Duffel Bag label in essentials config for shower cards", async () => {
    // Create a booked shower record to show the essentials
    const bookedShowerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        status: "awaiting",
        date: `${fixedToday}T09:00:00Z`,
        time: "09:00",
      },
    ];
    
    renderServices({
      showerRecords: bookedShowerRecords,
    });

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    await waitFor(() => {
      expect(screen.getByText("Today's Showers")).toBeInTheDocument();
    });

    // Expand the essentials section for the shower card
    const detailsBtn = screen.getByRole("button", { name: /Essentials & notes/i });
    fireEvent.click(detailsBtn);

    await waitFor(() => {
      // Check that the label shows Backpack/Duffel Bag
      expect(screen.getByText("Backpack/Duffel Bag")).toBeInTheDocument();
    });
  });

  it("shows Backpack/Duffel Bag button in waitlist section", async () => {
    renderServices();

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    await waitFor(() => {
      expect(screen.getByText("Shower Waitlist")).toBeInTheDocument();
    });

    // Check that the button shows Backpack/Duffel Bag
    expect(screen.getByRole("button", { name: /Give Backpack\/Duffel Bag/i })).toBeInTheDocument();
  });
});
