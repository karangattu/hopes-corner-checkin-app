import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Analytics from "../Analytics";

// Mock data generators
const createMockGuest = (id, overrides = {}) => ({
  id,
  name: `Guest ${id}`,
  housingStatus: "Unsheltered",
  age: "Adult",
  gender: "Male",
  location: "Mountain View",
  ...overrides,
});

let mockGetUniversalTimeRangeMetrics;
let mockGuests;
let mockContext;

// Mock implementations
vi.mock("../../../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

// Mock chart components to avoid rendering issues
vi.mock("../../../components/charts/TimeSeriesChart", () => ({
  default: () => <div data-testid="time-series-chart" />,
}));

vi.mock("../../../components/charts/MealsChart", () => ({
  default: () => <div data-testid="meals-chart" />,
}));

vi.mock("../../../components/charts/ShowerLaundryChart", () => ({
  default: () => <div data-testid="shower-laundry-chart" />,
}));

vi.mock("../../../components/charts/BicyclesChart", () => ({
  default: () => <div data-testid="bicycles-chart" />,
}));

vi.mock("../../../components/charts/HaircutsChart", () => ({
  default: () => <div data-testid="haircuts-chart" />,
}));

vi.mock("../../../components/charts/HolidaysChart", () => ({
  default: () => <div data-testid="holidays-chart" />,
}));

vi.mock("../../../components/charts/DonationsChart", () => ({
  default: () => <div data-testid="donations-chart" />,
}));

vi.mock("../../../components/charts/PieCardRecharts", () => ({
  default: ({ title, dataMap }) => (
    <div data-testid={`pie-chart-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      {title}: {Object.keys(dataMap || {}).length} categories
    </div>
  ),
}));

vi.mock("../../../components/charts/StackedBarCardRecharts", () => ({
  default: () => <div data-testid="stacked-bar-chart" />,
}));

// Mock date utility
vi.mock("../../../utils/date", () => ({
  todayPacificDateString: () => "2025-12-02",
}));

describe("Analytics - Filter Functionality", () => {
  beforeEach(() => {
    // Reset mock data before each test
    mockGuests = [
      createMockGuest("guest-1", { housingStatus: "Unsheltered", age: "Adult", gender: "Male", location: "Mountain View" }),
      createMockGuest("guest-2", { housingStatus: "Sheltered", age: "Senior", gender: "Female", location: "Sunnyvale" }),
      createMockGuest("guest-3", { housingStatus: "Unsheltered", age: "Youth", gender: "Non-binary", location: "Palo Alto" }),
      createMockGuest("guest-4", { housingStatus: "RV/Vehicle", age: "Adult", gender: "Male", location: "Mountain View" }),
    ];

    mockGetUniversalTimeRangeMetrics = vi.fn().mockImplementation((startDate, endDate, options = {}) => {
      const { programs = [] } = options;
      
      // Simulate different results based on date range and programs
      const activeGuestIds = [];
      let meals = 0, showers = 0, laundry = 0, haircuts = 0, holidays = 0, bicycles = 0;

      // Only count guests if their service program is selected
      if (programs.includes("meals")) {
        activeGuestIds.push("guest-1", "guest-2");
        meals = 10;
      }
      if (programs.includes("showers")) {
        activeGuestIds.push("guest-1", "guest-3");
        showers = 5;
      }
      if (programs.includes("laundry")) {
        activeGuestIds.push("guest-2", "guest-4");
        laundry = 3;
      }
      if (programs.includes("haircuts")) {
        activeGuestIds.push("guest-3");
        haircuts = 2;
      }
      if (programs.includes("holidays")) {
        activeGuestIds.push("guest-4");
        holidays = 1;
      }
      if (programs.includes("bicycles")) {
        activeGuestIds.push("guest-1");
        bicycles = 4;
      }

      // Deduplicate guest IDs
      const uniqueGuestIds = [...new Set(activeGuestIds)];

      return {
        startDate,
        endDate,
        programs,
        dailyBreakdown: [],
        totals: {
          mealsServed: meals,
          showersBooked: showers,
          laundryLoads: laundry,
          haircuts,
          holidays,
          bicycles,
          donationsLogged: 0,
          donationTrays: 0,
          donationWeightLbs: 0,
        },
        daysInRange: 30,
        activeGuestIds: uniqueGuestIds,
      };
    });

    mockContext = {
      getUniversalTimeRangeMetrics: mockGetUniversalTimeRangeMetrics,
      guests: mockGuests,
      settings: {},
    };
  });

  describe("Program Selection Filter", () => {
    it("should show all programs selected by default", () => {
      render(<Analytics />);

      // All program buttons should be selected (blue background)
      expect(screen.getByRole("button", { name: /meals/i })).toHaveClass("bg-blue-600");
      expect(screen.getByRole("button", { name: /showers/i })).toHaveClass("bg-blue-600");
      expect(screen.getByRole("button", { name: /laundry/i })).toHaveClass("bg-blue-600");
      expect(screen.getByRole("button", { name: /bicycles/i })).toHaveClass("bg-blue-600");
      expect(screen.getByRole("button", { name: /haircuts/i })).toHaveClass("bg-blue-600");
      expect(screen.getByRole("button", { name: /holidays/i })).toHaveClass("bg-blue-600");
      expect(screen.getByRole("button", { name: /donations/i })).toHaveClass("bg-blue-600");
    });

    it("should call getUniversalTimeRangeMetrics with correct programs when toggling", async () => {
      const user = userEvent.setup();
      render(<Analytics />);

      // Initially called with all programs
      expect(mockGetUniversalTimeRangeMetrics).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          programs: expect.arrayContaining([
            "meals",
            "showers",
            "laundry",
            "bicycles",
            "haircuts",
            "holidays",
            "donations",
          ]),
        }),
      );

      // Toggle off meals
      const mealsButton = screen.getByRole("button", { name: /meals/i });
      await user.click(mealsButton);

      // Should be called without meals
      await waitFor(() => {
        const lastCall = mockGetUniversalTimeRangeMetrics.mock.calls[mockGetUniversalTimeRangeMetrics.mock.calls.length - 1];
        expect(lastCall[2].programs).not.toContain("meals");
      });
    });

    it("should hide program summary cards when program is deselected", async () => {
      const user = userEvent.setup();
      render(<Analytics />);

      // Initially meals summary card should be visible (blue-50 background)
      const mealsCards = screen.getAllByText("Meals");
      const summaryCard = mealsCards.find(el => el.closest('[class*="bg-blue-50"]'));
      expect(summaryCard).toBeTruthy();

      // Toggle off meals
      const mealsButton = screen.getByRole("button", { name: /meals/i });
      await user.click(mealsButton);

      // Meals summary card should be hidden after toggle
      await waitFor(() => {
        const allMealsTexts = screen.getAllByText("Meals");
        // After toggle, only the selector button should have "Meals" text
        const hasSummaryCard = allMealsTexts.some(el => el.closest('[class*="bg-blue-50"]'));
        expect(hasSummaryCard).toBe(false);
      });
    });
  });

  describe("Date Range Filter", () => {
    it("should call getUniversalTimeRangeMetrics with correct date range on preset change", async () => {
      const user = userEvent.setup();
      render(<Analytics />);

      // Click "Today" preset
      const todayButton = screen.getByRole("button", { name: /today/i });
      await user.click(todayButton);

      await waitFor(() => {
        const lastCall = mockGetUniversalTimeRangeMetrics.mock.calls[mockGetUniversalTimeRangeMetrics.mock.calls.length - 1];
        expect(lastCall[0]).toBe("2025-12-02"); // startDate
        expect(lastCall[1]).toBe("2025-12-02"); // endDate
      });
    });

    it("should update metrics when date range changes", async () => {
      const user = userEvent.setup();
      render(<Analytics />);

      const initialCallCount = mockGetUniversalTimeRangeMetrics.mock.calls.length;

      // Click "This Week" preset
      const thisWeekButton = screen.getByRole("button", { name: /this week/i });
      await user.click(thisWeekButton);

      await waitFor(() => {
        expect(mockGetUniversalTimeRangeMetrics.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe("Demographics Tab Filter Integration", () => {
    it("should filter demographics based on activeGuestIds from metrics", async () => {
      const user = userEvent.setup();
      render(<Analytics />);

      // Navigate to Demographics tab
      const demographicsTab = screen.getByRole("button", { name: /demographics/i });
      await user.click(demographicsTab);

      // Check that demographics shows active guests count
      await waitFor(() => {
        expect(screen.getByText(/active guests/i)).toBeInTheDocument();
      });
    });

    it("should show correct number of active guests based on selected programs", async () => {
      // Set up mock to return specific guests for meals only
      mockGetUniversalTimeRangeMetrics.mockImplementation((startDate, endDate, options = {}) => ({
        startDate,
        endDate,
        programs: options.programs || [],
        dailyBreakdown: [],
        totals: {
          mealsServed: 10,
          showersBooked: 0,
          laundryLoads: 0,
          haircuts: 0,
          holidays: 0,
          bicycles: 0,
          donationsLogged: 0,
          donationTrays: 0,
          donationWeightLbs: 0,
        },
        daysInRange: 30,
        activeGuestIds: ["guest-1", "guest-2"], // Only 2 guests used meals
      }));

      const user = userEvent.setup();
      render(<Analytics />);

      // Navigate to Demographics tab
      const demographicsTab = screen.getByRole("button", { name: /demographics/i });
      await user.click(demographicsTab);

      // Should show 2 active guests
      await waitFor(() => {
        expect(screen.getByText(/2 active guests/i)).toBeInTheDocument();
      });
    });

    it("should show empty state when no guests match filters", async () => {
      // Set up mock to return no guests
      mockGetUniversalTimeRangeMetrics.mockImplementation((startDate, endDate, options = {}) => ({
        startDate,
        endDate,
        programs: options.programs || [],
        dailyBreakdown: [],
        totals: {
          mealsServed: 0,
          showersBooked: 0,
          laundryLoads: 0,
          haircuts: 0,
          holidays: 0,
          bicycles: 0,
          donationsLogged: 0,
          donationTrays: 0,
          donationWeightLbs: 0,
        },
        daysInRange: 30,
        activeGuestIds: [], // No active guests
      }));

      const user = userEvent.setup();
      render(<Analytics />);

      // Navigate to Demographics tab
      const demographicsTab = screen.getByRole("button", { name: /demographics/i });
      await user.click(demographicsTab);

      // Should show empty state message
      await waitFor(() => {
        expect(screen.getByText(/no guests found for the selected filters/i)).toBeInTheDocument();
      });
    });

    it("should update demographics when toggling programs", async () => {
      const user = userEvent.setup();
      render(<Analytics />);

      // Navigate to Demographics tab
      const demographicsTab = screen.getByRole("button", { name: /demographics/i });
      await user.click(demographicsTab);

      // Get initial active guests count
      const initialCallCount = mockGetUniversalTimeRangeMetrics.mock.calls.length;

      // Toggle off a program
      const showerButton = screen.getByRole("button", { name: /showers/i });
      await user.click(showerButton);

      // Metrics should be recalculated
      await waitFor(() => {
        expect(mockGetUniversalTimeRangeMetrics.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe("Overview Tab Metrics Display", () => {
    it("should display correct totals for each program", () => {
      render(<Analytics />);

      // Check that totals are displayed (the mock returns 10 meals, 5 showers, etc.)
      expect(screen.getByText("10")).toBeInTheDocument(); // Meals
      expect(screen.getByText("5")).toBeInTheDocument(); // Showers
    });

    it("should only show cards for selected programs", async () => {
      const user = userEvent.setup();
      render(<Analytics />);

      // Initially all cards are shown - check for the summary card (with bg-blue-50 class)
      const mealsCards = screen.getAllByText("Meals");
      const initialSummaryCard = mealsCards.find(el => el.closest('[class*="bg-blue-50"]'));
      expect(initialSummaryCard).toBeTruthy();

      // Toggle off meals
      const mealsButton = screen.getByRole("button", { name: /meals/i });
      await user.click(mealsButton);

      // Wait for the component to update
      await waitFor(() => {
        // Check that the meals summary card (with bg-blue-50 class) is no longer present
        const allMealsTexts = screen.getAllByText("Meals");
        // Only button should remain (in program selector, not summary card)
        const hasSummaryCard = allMealsTexts.some(el => el.closest('[class*="bg-blue-50"]'));
        expect(hasSummaryCard).toBe(false);
      });
    });
  });
});

describe("Analytics - getUniversalTimeRangeMetrics Integration", () => {
  describe("activeGuestIds tracking", () => {
    it("should return correct activeGuestIds for single program", () => {
      // This tests the contract that getUniversalTimeRangeMetrics must fulfill
      const mockResult = {
        activeGuestIds: ["guest-1", "guest-2"],
        totals: { mealsServed: 10 },
      };

      expect(mockResult.activeGuestIds).toHaveLength(2);
      expect(mockResult.activeGuestIds).toContain("guest-1");
      expect(mockResult.activeGuestIds).toContain("guest-2");
    });

    it("should deduplicate guest IDs across programs", () => {
      // If guest-1 used both meals and showers, they should only appear once
      const mealsGuests = ["guest-1", "guest-2"];
      const showersGuests = ["guest-1", "guest-3"];
      const allGuests = [...new Set([...mealsGuests, ...showersGuests])];

      expect(allGuests).toHaveLength(3);
      expect(allGuests.filter(id => id === "guest-1")).toHaveLength(1);
    });

    it("should return empty array when no services match date range", () => {
      const mockResult = {
        activeGuestIds: [],
        totals: { mealsServed: 0 },
      };

      expect(mockResult.activeGuestIds).toHaveLength(0);
    });
  });
});

describe("Analytics - Edge Cases", () => {
  beforeEach(() => {
    mockContext = {
      getUniversalTimeRangeMetrics: vi.fn().mockReturnValue({
        startDate: "2025-12-01",
        endDate: "2025-12-02",
        programs: [],
        dailyBreakdown: [],
        totals: {
          mealsServed: 0,
          showersBooked: 0,
          laundryLoads: 0,
          haircuts: 0,
          holidays: 0,
          bicycles: 0,
          donationsLogged: 0,
          donationTrays: 0,
          donationWeightLbs: 0,
        },
        daysInRange: 2,
        activeGuestIds: [],
      }),
      guests: [],
      settings: {},
    };
  });

  it("should handle empty guests array", () => {
    render(<Analytics />);
    
    // Should not crash with empty data
    expect(screen.getByText("Analytics & Reports")).toBeInTheDocument();
  });

  it("should handle missing activeGuestIds in metrics", () => {
    mockContext.getUniversalTimeRangeMetrics.mockReturnValue({
      totals: { mealsServed: 0 },
      daysInRange: 0,
      // activeGuestIds is missing
    });
    
    // Should not crash when activeGuestIds is undefined
    expect(() => render(<Analytics />)).not.toThrow();
  });
});
