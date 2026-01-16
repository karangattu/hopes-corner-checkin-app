import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import Services from "../Services.jsx";
import CompactShowerList from "../../../components/CompactShowerList";

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

vi.mock("../../../components/CompactShowerList", () => ({
  __esModule: true,
  default: vi.fn(() => null),
}));

vi.mock("../../../components/CompactLaundryList", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../../components/ShowerDetailModal", () => ({
  __esModule: true,
  default: ({ isOpen, children }) => {
    if (!isOpen) return null;
    return <div data-testid="shower-detail-modal">{children}</div>;
  },
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
    addAutomaticMealEntries: vi.fn(async () => ({ success: true, added: 0, summary: "" })),
    hasAutomaticMealsForDay: vi.fn(() => false),
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

describe("Services - Waitlist Supplies", () => {
  it("shows waitlist section with supply buttons when there are waitlisted guests", async () => {
    // Need to test via compact view now since detailed view toggle was removed
    // Create a mock that renders CompactShowerList properly
    CompactShowerList.mockImplementation(({ onGuestClick }) => (
      <div>
        <button onClick={() => onGuestClick("guest-1", "shower-waitlist-1")}>
          Alice
        </button>
      </div>
    ));

    renderServices();

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    // Click on the waitlisted guest to open modal
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Alice"));

    // Wait for modal to show the detailed card with essentials section
    await waitFor(() => {
      expect(screen.getByTitle(/Essentials & Notes/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle(/Essentials & Notes/i));

    await waitFor(() => {
      // Verify we can see supply buttons in the modal
      expect(screen.getByRole("button", { name: /Give T-Shirt/i })).toBeInTheDocument();
    });
  });

  it("renders all 5 supply buttons for waitlisted guests (T-Shirt, Sleeping Bag, Backpack/Duffel Bag, Tent, Flip Flops)", async () => {
    CompactShowerList.mockImplementation(({ onGuestClick }) => (
      <div>
        <button onClick={() => onGuestClick("guest-1", "shower-waitlist-1")}>
          Alice
        </button>
      </div>
    ));

    renderServices();

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    // Click on the waitlisted guest to open modal
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Alice"));

    // Expand the card to see essentials
    await waitFor(() => {
      expect(screen.getByTitle(/Essentials & Notes/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle(/Essentials & Notes/i));

    await waitFor(() => {
      // Check that all 5 supply buttons are present
      expect(screen.getByRole("button", { name: /Give T-Shirt/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Give Sleeping Bag/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Give Backpack\/Duffel Bag/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Give Tent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Give Flip Flops/i })).toBeInTheDocument();
  });

  it("calls giveItem when clicking supply button for waitlisted guest", async () => {
    CompactShowerList.mockImplementation(({ onGuestClick }) => (
      <div>
        <button onClick={() => onGuestClick("guest-1", "shower-waitlist-1")}>
          Alice
        </button>
      </div>
    ));

    const giveItem = vi.fn();
    renderServices({ giveItem });

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    // Click on the waitlisted guest to open modal
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Alice"));

    // Expand the card to see essentials
    await waitFor(() => {
      expect(screen.getByTitle(/Essentials & Notes/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle(/Essentials & Notes/i));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Give T-Shirt/i })).toBeInTheDocument();
    });

    // Click the T-Shirt button
    const tshirtBtn = screen.getByRole("button", { name: /Give T-Shirt/i });
    fireEvent.click(tshirtBtn);

    expect(giveItem).toHaveBeenCalledWith("guest-1", "tshirt");
  });

  it("calls giveItem for Tent supply on waitlisted guest", async () => {
    CompactShowerList.mockImplementation(({ onGuestClick }) => (
      <div>
        <button onClick={() => onGuestClick("guest-1", "shower-waitlist-1")}>
          Alice
        </button>
      </div>
    ));

    const giveItem = vi.fn();
    renderServices({ giveItem });

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    // Click on the waitlisted guest to open modal
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Alice"));

    // Expand the card to see essentials
    await waitFor(() => {
      expect(screen.getByTitle(/Essentials & Notes/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle(/Essentials & Notes/i));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Give Tent/i })).toBeInTheDocument();
    });

    // Click the Tent button
    const tentBtn = screen.getByRole("button", { name: /Give Tent/i });
    fireEvent.click(tentBtn);

    expect(giveItem).toHaveBeenCalledWith("guest-1", "tent");
  });

  it("calls giveItem for Flip Flops supply on waitlisted guest", async () => {
    CompactShowerList.mockImplementation(({ onGuestClick }) => (
      <div>
        <button onClick={() => onGuestClick("guest-1", "shower-waitlist-1")}>
          Alice
        </button>
      </div>
    ));

    const giveItem = vi.fn();
    renderServices({ giveItem });

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    // Click on the waitlisted guest to open modal
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Alice"));

    // Expand the card to see essentials
    await waitFor(() => {
      expect(screen.getByTitle(/Essentials & Notes/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle(/Essentials & Notes/i));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Give Flip Flops/i })).toBeInTheDocument();
    });

    // Click the Flip Flops button
    const flipFlopsBtn = screen.getByRole("button", { name: /Give Flip Flops/i });
    fireEvent.click(flipFlopsBtn);

    expect(giveItem).toHaveBeenCalledWith("guest-1", "flip_flops");
  });

  it("disables supply buttons when item cannot be given", async () => {
    CompactShowerList.mockImplementation(({ onGuestClick }) => (
      <div>
        <button onClick={() => onGuestClick("guest-1", "shower-waitlist-1")}>
          Alice
        </button>
      </div>
    ));

    renderServices({
      canGiveItem: vi.fn((guestId, itemKey) => {
        if (itemKey === "tent" || itemKey === "flip_flops") return false;
        return true;
      }),
    });

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    // Click on the waitlisted guest to open modal
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Alice"));

    // Expand the card to see essentials
    await waitFor(() => {
      expect(screen.getByTitle(/Essentials & Notes/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle(/Essentials & Notes/i));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Give Tent/i })).toBeInTheDocument();
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

    CompactShowerList.mockImplementation(({ onGuestClick }) => (
      <div>
        <button onClick={() => onGuestClick("guest-1", "shower-1")}>
          Alice - 9:00 AM
        </button>
      </div>
    ));

    renderServices({
      showerRecords: bookedShowerRecords,
    });

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    // Click on the booked shower to open modal
    await waitFor(() => {
      expect(screen.getByText(/Alice - 9:00 AM/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Alice - 9:00 AM/i));

    // Expand the essentials section for the shower card
    await waitFor(() => {
      expect(screen.getByTitle(/Essentials & Notes/i)).toBeInTheDocument();
    });
    const detailsBtn = screen.getByTitle(/Essentials & Notes/i);
    fireEvent.click(detailsBtn);

    await waitFor(() => {
      // Check that the label shows Backpack/Duffel Bag
      expect(screen.getByText("Backpack/Duffel Bag")).toBeInTheDocument();
    });
  });

  it("shows Backpack/Duffel Bag button in waitlist section", async () => {
    CompactShowerList.mockImplementation(({ onGuestClick }) => (
      <div>
        <button onClick={() => onGuestClick("guest-1", "shower-waitlist-1")}>
          Alice
        </button>
      </div>
    ));

    renderServices();

    // Navigate to Showers section
    fireEvent.click(screen.getByRole("button", { name: /^Showers$/i }));

    // Click on the waitlisted guest to open modal
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Alice"));

    // Expand the card to see essentials
    await waitFor(() => {
      expect(screen.getByTitle(/Essentials & Notes/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle(/Essentials & Notes/i));

    await waitFor(() => {
      // Check that the button shows Backpack/Duffel Bag
      expect(screen.getByRole("button", { name: /Give Backpack\/Duffel Bag/i })).toBeInTheDocument();
    });
  });
});
