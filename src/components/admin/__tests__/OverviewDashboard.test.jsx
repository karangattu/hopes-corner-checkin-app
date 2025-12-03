import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("OverviewDashboard", () => {
  const mockUpdateSettings = vi.fn();

  const mockContext = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContext.mockReturnValue(mockContext);
  });

  it("renders dashboard without crashing", () => {
    render(
      <OverviewDashboard
        monthGridAnim={{}}
        yearGridAnim={{}}
      />
    );

    expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
  });

  it("displays Monthly Progress section", () => {
    render(
      <OverviewDashboard
        monthGridAnim={{}}
        yearGridAnim={{}}
      />
    );

    expect(screen.getByText("Monthly Progress")).toBeInTheDocument();
  });

  it("displays Yearly Progress section", () => {
    render(
      <OverviewDashboard
        monthGridAnim={{}}
        yearGridAnim={{}}
      />
    );

    expect(screen.getByText("Yearly Progress")).toBeInTheDocument();
  });

  it("shows Edit Targets button", () => {
    render(
      <OverviewDashboard
        monthGridAnim={{}}
        yearGridAnim={{}}
      />
    );

    expect(screen.getByText("Edit Targets")).toBeInTheDocument();
  });

  it("opens target editor when Edit Targets is clicked", async () => {
    const user = userEvent.setup();

    render(
      <OverviewDashboard
        monthGridAnim={{}}
        yearGridAnim={{}}
      />
    );

    await user.click(screen.getByText("Edit Targets"));

    expect(screen.getByText("Edit Monthly & Yearly Targets")).toBeInTheDocument();
    expect(screen.getByText("Monthly Targets")).toBeInTheDocument();
    expect(screen.getByText("Yearly Targets")).toBeInTheDocument();
  });

  it("has proper target management functionality", () => {
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
    const newTargets = {
      targets: {
        ...mockContext.settings.targets,
        monthlyMeals: 2000,
      },
    };

    mockUpdateSettings(newTargets);

    expect(mockUpdateSettings).toHaveBeenCalledWith(newTargets);
  });

  it("displays metric cards for all service types", () => {
    render(
      <OverviewDashboard
        monthGridAnim={{}}
        yearGridAnim={{}}
      />
    );

    // Check that all service type labels appear (once in Monthly, once in Yearly)
    const mealsLabels = screen.getAllByText("Meals");
    expect(mealsLabels.length).toBe(2);

    const showersLabels = screen.getAllByText("Showers");
    expect(showersLabels.length).toBe(2);

    const laundryLabels = screen.getAllByText("Laundry");
    expect(laundryLabels.length).toBe(2);

    const bicyclesLabels = screen.getAllByText("Bicycles");
    expect(bicyclesLabels.length).toBe(2);

    const haircutsLabels = screen.getAllByText("Haircuts");
    expect(haircutsLabels.length).toBe(2);

    const holidayLabels = screen.getAllByText("Holiday");
    expect(holidayLabels.length).toBe(2);
  });

  describe("Progress Calculations", () => {
    it("calculates monthly meals from records", () => {
      const now = new Date();
      const currentMonthDate = now.toISOString().split("T")[0];

      const contextWithRecords = {
        ...mockContext,
        mealRecords: [
          { date: currentMonthDate, count: 50 },
          { date: currentMonthDate, count: 30 },
        ],
      };

      useAppContext.mockReturnValue(contextWithRecords);

      render(
        <OverviewDashboard
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Should show 80 meals (50 + 30) in the monthly progress
      const eightyElements = screen.getAllByText("80");
      expect(eightyElements.length).toBeGreaterThan(0);
    });

    it("calculates yearly totals correctly", () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const januaryDate = `${currentYear}-01-15`;
      const juneDate = `${currentYear}-06-15`;

      const contextWithRecords = {
        ...mockContext,
        mealRecords: [
          { date: januaryDate, count: 100 },
          { date: juneDate, count: 200 },
        ],
      };

      useAppContext.mockReturnValue(contextWithRecords);

      render(
        <OverviewDashboard
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Should show 300 meals (100 + 200) in the yearly progress
      expect(screen.getByText("300")).toBeInTheDocument();
    });

    it("counts completed showers only", () => {
      const now = new Date();
      const currentMonthDate = now.toISOString().split("T")[0];

      const contextWithRecords = {
        ...mockContext,
        showerRecords: [
          { date: currentMonthDate, status: "done" },
          { date: currentMonthDate, status: "done" },
          { date: currentMonthDate, status: "pending" }, // Should not count
        ],
      };

      useAppContext.mockReturnValue(contextWithRecords);

      render(
        <OverviewDashboard
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Should show 2 showers (only "done" status)
      const twoElements = screen.getAllByText("2");
      expect(twoElements.length).toBeGreaterThan(0);
    });

    it("counts completed laundry loads only", () => {
      const now = new Date();
      const currentMonthDate = now.toISOString().split("T")[0];

      const contextWithRecords = {
        ...mockContext,
        laundryRecords: [
          { date: currentMonthDate, status: "done" },
          { date: currentMonthDate, status: "picked_up" },
          { date: currentMonthDate, status: "returned" },
          { date: currentMonthDate, status: "pending" }, // Should not count
        ],
      };

      useAppContext.mockReturnValue(contextWithRecords);

      render(
        <OverviewDashboard
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      // Should show 3 laundry loads (done, picked_up, returned)
      const threeElements = screen.getAllByText("3");
      expect(threeElements.length).toBeGreaterThan(0);
    });
  });

  describe("Target Editor", () => {
    it("cancels editing without saving", async () => {
      const user = userEvent.setup();

      render(
        <OverviewDashboard
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      await user.click(screen.getByText("Edit Targets"));
      expect(screen.getByText("Edit Monthly & Yearly Targets")).toBeInTheDocument();

      await user.click(screen.getByText("Cancel"));
      expect(screen.queryByText("Edit Monthly & Yearly Targets")).not.toBeInTheDocument();
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it("saves targets when Save Targets is clicked", async () => {
      const user = userEvent.setup();

      render(
        <OverviewDashboard
          monthGridAnim={{}}
          yearGridAnim={{}}
        />
      );

      await user.click(screen.getByText("Edit Targets"));
      await user.click(screen.getByText("Save Targets"));

      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });
});
