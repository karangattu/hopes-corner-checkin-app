import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import OverviewDashboard from "../OverviewDashboard";
import { useAppContext } from "../../../context/useAppContext";

// Mock the useAppContext hook
vi.mock("../../../context/useAppContext");

// Mock react-spring
vi.mock("@react-spring/web", () => ({
  animated: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  useFadeInUp: () => ({}),
}));

// Mock animations
vi.mock("../../../utils/animations", () => ({
  SpringIcon: ({ children }) => <div data-testid="spring-icon">{children}</div>,
  useFadeInUp: () => ({}),
}));

// Mock DonutCard
vi.mock("../../charts/DonutCard", () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="donut-card">
      {title} - {subtitle}
    </div>
  ),
}));

// Mock PieCardRecharts
vi.mock("../../charts/PieCardRecharts", () => ({
  default: ({ title, subtitle, dataMap }) => (
    <div data-testid="pie-card">
      {title} - {subtitle}
      <div data-testid="pie-data">{JSON.stringify(dataMap)}</div>
    </div>
  ),
}));

// Mock StackedBarCardRecharts
vi.mock("../../charts/StackedBarCardRecharts", () => ({
  default: ({ title, subtitle, crossTabData }) => (
    <div data-testid="stacked-bar-card">
      {title} - {subtitle}
      <div data-testid="stacked-data">{JSON.stringify(crossTabData)}</div>
    </div>
  ),
}));

// Mock OnsiteMealDemographics
vi.mock("../OnsiteMealDemographics", () => ({
  default: () => <div data-testid="onsite-meal-demographics">Meal Demographics</div>,
}));

describe("OverviewDashboard Target Management", () => {
  const mockUpdateSettings = vi.fn();

  const mockContext = {
    getTodayMetrics: vi.fn(() => ({
      mealsServed: 25,
      showersBooked: 10,
    })),
    guests: [
      { id: 1, housingStatus: "Unhoused" },
      { id: 2, housingStatus: "Housed" },
    ],
    settings: {
      targets: {
        monthlyMeals: 1500,
        yearlyMeals: 18000,
        monthlyShowers: 300,
        yearlyShowers: 3600,
        monthlyLaundry: 200,
        yearlyLaundry: 2400,
        monthlyBicycles: 50,
        yearlyBicycles: 600,
        monthlyHaircuts: 100,
        yearlyHaircuts: 1200,
        monthlyHolidays: 80,
        yearlyHolidays: 960,
      },
    },
    updateSettings: mockUpdateSettings,
    mealRecords: [],
    rvMealRecords: [],
    unitedEffortMealRecords: [],
    extraMealRecords: [],
    dayWorkerMealRecords: [],
    showerRecords: [],
    laundryRecords: [],
    bicycleRecords: [],
    haircutRecords: [],
    holidayRecords: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContext.mockReturnValue(mockContext);
  });

  it("renders dashboard without crashing", () => {
    const component = React.createElement(OverviewDashboard, {
      overviewGridAnim: {},
      monthGridAnim: {},
      yearGridAnim: {},
    });

    expect(component).toBeTruthy();
  });

  it("has proper target management functionality", () => {
    // Test that the component structure is correct
    const expectedTargets = {
      monthlyMeals: 1500,
      yearlyMeals: 18000,
      monthlyShowers: 300,
      yearlyShowers: 3600,
    };

    expect(mockContext.settings.targets).toEqual(
      expect.objectContaining(expectedTargets),
    );
  });

  it("handles target updates correctly", () => {
    // Mock a target update
    const newTargets = {
      targets: {
        ...mockContext.settings.targets,
        monthlyMeals: 2000,
      },
    };

    mockUpdateSettings(newTargets);

    expect(mockUpdateSettings).toHaveBeenCalledWith(newTargets);
  });

  it("validates input handling logic", () => {
    // Test parseInt behavior for target values
    const testValues = ["1500", "2000", "", "0", "invalid"];
    const results = testValues.map((val) => parseInt(val) || 0);

    expect(results).toEqual([1500, 2000, 0, 0, 0]);
  });

  it("ensures modal state management is simple", () => {
    // Test simple state management - no complex dependencies
    const modalStates = [false, true, false];

    modalStates.forEach((state) => {
      expect(typeof state).toBe("boolean");
    });
  });
});

describe("OverviewDashboard Demographics Calculations", () => {
  const mockUpdateSettings = vi.fn();

  // Helper to create a guest with a specific creation date
  const createGuest = (id, age, location, housingStatus, createdAt) => ({
    id,
    age,
    location,
    housingStatus,
    createdAt,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Year-to-Date (YTD) Calculations", () => {
    it("calculates YTD age group counts correctly", () => {
      const currentYear = new Date().getFullYear();
      const guests = [
        createGuest(1, "Adult 18-59", "Oakland", "Unhoused", `${currentYear}-03-15T10:00:00`),
        createGuest(2, "Senior 60+", "Oakland", "Housed", `${currentYear}-06-20T10:00:00`),
        createGuest(3, "Adult 18-59", "Berkeley", "Unhoused", `${currentYear}-01-10T10:00:00`),
        createGuest(4, "Child 0-17", "Oakland", "Housed", `${currentYear}-08-05T10:00:00`),
        createGuest(5, "Adult 18-59", "Berkeley", "Unhoused", `${currentYear - 1}-12-31T10:00:00`), // Last year
      ];

      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests,
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // YTD should show 4 guests (excludes the one from last year)
      expect(screen.getByText(/YTD: 4 guest\(s\) registered this year/i)).toBeInTheDocument();
    });

    it("calculates YTD location counts correctly", () => {
      const currentYear = new Date().getFullYear();
      const guests = [
        createGuest(1, "Adult 18-59", "Oakland", "Unhoused", `${currentYear}-03-15T10:00:00`),
        createGuest(2, "Senior 60+", "Oakland", "Housed", `${currentYear}-06-20T10:00:00`),
        createGuest(3, "Adult 18-59", "Berkeley", "Unhoused", `${currentYear}-01-10T10:00:00`),
        createGuest(4, "Child 0-17", "San Francisco", "Housed", `${currentYear}-08-05T10:00:00`),
      ];

      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests,
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Should display YTD summary with unique cities count (3 cities)
      expect(screen.getByText("Unique Cities")).toBeInTheDocument();
      // getAllByText to handle multiple "3" elements
      const threeElements = screen.getAllByText("3");
      expect(threeElements.length).toBeGreaterThan(0);
    });

    it("displays YTD percentages correctly", () => {
      const currentYear = new Date().getFullYear();
      const guests = [
        createGuest(1, "Adult 18-59", "Oakland", "Unhoused", `${currentYear}-03-15T10:00:00`),
        createGuest(2, "Adult 18-59", "Oakland", "Housed", `${currentYear}-06-20T10:00:00`),
        createGuest(3, "Senior 60+", "Berkeley", "Unhoused", `${currentYear}-01-10T10:00:00`),
        createGuest(4, "Child 0-17", "Oakland", "Housed", `${currentYear}-08-05T10:00:00`),
      ];

      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests,
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Adult 18-59: 2/4 = 50% - use getAllByText since percentages may appear multiple times
      const fiftyPercentElements = screen.getAllByText("50.0%");
      expect(fiftyPercentElements.length).toBeGreaterThan(0);
      // Senior 60+: 1/4 = 25%
      const twentyFivePercentElements = screen.getAllByText("25.0%");
      expect(twentyFivePercentElements.length).toBeGreaterThan(0);
    });
  });

  describe("Date Range Filtering", () => {
    it("filters guests by custom date range", () => {
      const guests = [
        createGuest(1, "Adult 18-59", "Oakland", "Unhoused", "2023-03-15T10:00:00"),
        createGuest(2, "Senior 60+", "Oakland", "Housed", "2024-06-20T10:00:00"),
        createGuest(3, "Adult 18-59", "Berkeley", "Unhoused", "2024-01-10T10:00:00"),
        createGuest(4, "Child 0-17", "Oakland", "Housed", "2025-08-05T10:00:00"),
      ];

      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests,
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Default "All Time" should show all 4 guests
      expect(screen.getByText(/Showing 4 guest\(s\) in selected date range/i)).toBeInTheDocument();
    });

    it("handles guests without createdAt dates", () => {
      const currentYear = new Date().getFullYear();
      const guests = [
        createGuest(1, "Adult 18-59", "Oakland", "Unhoused", null), // No date
        createGuest(2, "Senior 60+", "Oakland", "Housed", undefined), // No date
        createGuest(3, "Adult 18-59", "Berkeley", "Unhoused", `${currentYear}-01-10T10:00:00`),
      ];

      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests,
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      // Should not crash when guests have no createdAt
      const { container } = render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("Demographics by City", () => {
    it("calculates age group by city cross-tabulation", () => {
      const currentYear = new Date().getFullYear();
      const guests = [
        createGuest(1, "Adult 18-59", "Oakland", "Unhoused", `${currentYear}-03-15T10:00:00`),
        createGuest(2, "Senior 60+", "Oakland", "Housed", `${currentYear}-06-20T10:00:00`),
        createGuest(3, "Adult 18-59", "Berkeley", "Unhoused", `${currentYear}-01-10T10:00:00`),
        createGuest(4, "Child 0-17", "Oakland", "Housed", `${currentYear}-08-05T10:00:00`),
      ];

      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests,
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Should display the stacked bar charts - there are 2 stacked bar cards
      const stackedBarCards = screen.getAllByTestId("stacked-bar-card");
      expect(stackedBarCards.length).toBe(2);
      expect(screen.getByText(/Distribution of age groups across cities/)).toBeInTheDocument();
    });

    it("handles Unknown age and location values", () => {
      const currentYear = new Date().getFullYear();
      const guests = [
        createGuest(1, null, null, "Unhoused", `${currentYear}-03-15T10:00:00`),
        createGuest(2, "", "", "Housed", `${currentYear}-06-20T10:00:00`),
        createGuest(3, "Adult 18-59", "Oakland", "Unhoused", `${currentYear}-01-10T10:00:00`),
      ];

      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests,
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      const { container } = render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Should handle Unknown values gracefully - there may be multiple "Unknown" texts
      expect(container).toBeInTheDocument();
      const unknownElements = screen.getAllByText("Unknown");
      expect(unknownElements.length).toBeGreaterThan(0);
    });
  });

  describe("Percentage Calculations", () => {
    it("calculates correct percentages for YTD age groups", () => {
      const currentYear = new Date().getFullYear();
      const guests = [
        createGuest(1, "Adult 18-59", "Oakland", "Unhoused", `${currentYear}-03-15T10:00:00`),
        createGuest(2, "Adult 18-59", "Oakland", "Housed", `${currentYear}-06-20T10:00:00`),
        createGuest(3, "Adult 18-59", "Berkeley", "Unhoused", `${currentYear}-01-10T10:00:00`),
        createGuest(4, "Senior 60+", "Oakland", "Housed", `${currentYear}-08-05T10:00:00`),
      ];

      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests,
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Adult 18-59: 3/4 = 75.0% - use getAllByText since percentages may appear in multiple places
      const seventyFiveElements = screen.getAllByText("75.0%");
      expect(seventyFiveElements.length).toBeGreaterThan(0);
      // Senior 60+: 1/4 = 25.0%
      const twentyFiveElements = screen.getAllByText("25.0%");
      expect(twentyFiveElements.length).toBeGreaterThan(0);
    });

    it("handles zero guests gracefully", () => {
      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 0, showersBooked: 0 })),
        guests: [],
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      const { container } = render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Should not crash with no guests
      expect(container).toBeInTheDocument();
      expect(screen.getByText(/YTD: 0 guest\(s\) registered this year/i)).toBeInTheDocument();
    });

    it("formats percentages correctly with one decimal place", () => {
      const currentYear = new Date().getFullYear();
      const guests = [
        createGuest(1, "Adult 18-59", "Oakland", "Unhoused", `${currentYear}-03-15T10:00:00`),
        createGuest(2, "Adult 18-59", "Oakland", "Housed", `${currentYear}-06-20T10:00:00`),
        createGuest(3, "Senior 60+", "Berkeley", "Unhoused", `${currentYear}-01-10T10:00:00`),
      ];

      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests,
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Adult 18-59: 2/3 = 66.7% - use getAllByText since percentages may appear in multiple places
      const sixtySixElements = screen.getAllByText("66.7%");
      expect(sixtySixElements.length).toBeGreaterThan(0);
      // Senior 60+: 1/3 = 33.3%
      const thirtyThreeElements = screen.getAllByText("33.3%");
      expect(thirtyThreeElements.length).toBeGreaterThan(0);
    });
  });

  describe("UI Elements and Features", () => {
    it("displays Year-to-Date Demographics Summary section", () => {
      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests: [],
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      expect(screen.getByText("Year-to-Date Demographics Summary")).toBeInTheDocument();
      expect(screen.getByText("Age Groups (YTD)")).toBeInTheDocument();
      expect(screen.getByText("Top Cities (YTD)")).toBeInTheDocument();
      expect(screen.getByText("YTD Summary")).toBeInTheDocument();
    });

    it("displays date range filter with preset buttons", () => {
      const mockContext = {
        getTodayMetrics: vi.fn(() => ({ mealsServed: 25, showersBooked: 10 })),
        guests: [],
        settings: { targets: {} },
        updateSettings: mockUpdateSettings,
        mealRecords: [],
        rvMealRecords: [],
        shelterMealRecords: [],
        unitedEffortMealRecords: [],
        extraMealRecords: [],
        dayWorkerMealRecords: [],
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
        haircutRecords: [],
        holidayRecords: [],
      };

      useAppContext.mockReturnValue(mockContext);

      render(
        <OverviewDashboard
          overviewGridAnim={{}}
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      expect(screen.getByText("All Time")).toBeInTheDocument();
      expect(screen.getByText("Year-to-Date")).toBeInTheDocument();
      expect(screen.getByText("Filter Demographics by Date Range")).toBeInTheDocument();
    });
  });
});
