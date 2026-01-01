import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import MealReport from "../MealReport";

const createDefaultContext = () => ({
  guests: [],
  mealRecords: [],
  extraMealRecords: [],
  rvMealRecords: [],
  shelterMealRecords: [],
  unitedEffortMealRecords: [],
  dayWorkerMealRecords: [],
  lunchBagRecords: [],
  exportDataAsCSV: vi.fn(),
});

let mockContextValue = createDefaultContext();

vi.mock("../../../context/useAppContext", () => ({
  useAppContext: () => mockContextValue,
}));

// Use fixed dates in 2025 - the component filters by current year,
// so we need to mock the system date to 2025 for tests to work
const TEST_YEAR = 2025;
const TEST_MONTH = 11; // December (0-indexed)

describe("MealReport - Service Day Filters and Pie Chart", () => {
  beforeEach(() => {
    mockContextValue = createDefaultContext();
    // Mock system time to December 2025 so the component's date filtering works
    // Use shouldAdvanceTime to allow async operations to work
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2025, 11, 15, 12, 0, 0)); // Dec 15, 2025
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Lunch Bags removal from pie chart", () => {
    it("does not include Lunch Bags in meal distribution pie chart", async () => {
      const testDate = new Date(TEST_YEAR, TEST_MONTH, 15, 12, 0, 0).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "John Doe",
            age: "Adult 18-59",
          },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: testDate, count: 50 },
        ],
        extraMealRecords: [
          { id: "e1", guestId: "g1", date: testDate, count: 20 },
        ],
        rvMealRecords: [
          { id: "r1", guestId: "g1", date: testDate, count: 15 },
        ],
        dayWorkerMealRecords: [
          { id: "d1", guestId: "g1", date: testDate, count: 10 },
        ],
        shelterMealRecords: [
          { id: "s1", guestId: "g1", date: testDate, count: 5 },
        ],
        unitedEffortMealRecords: [
          { id: "u1", guestId: "g1", date: testDate, count: 8 },
        ],
        lunchBagRecords: [
          { id: "l1", guestId: "g1", date: testDate, count: 30 },
        ],
      };

      render(<MealReport />);

      await waitFor(() => {
        expect(screen.getByText(/Meal Distribution/i)).toBeInTheDocument();
      });

      // Check that Lunch Bags is not in the pie chart section specifically
      const mealDistributionSection = screen.getByText(/Meal Distribution/i).closest("div");
      const pieChartText = mealDistributionSection.textContent;
      expect(pieChartText).not.toMatch(/Lunch Bags/i);

      // Verify other meal types are present in the pie chart
      const guestMealsInPie = within(mealDistributionSection).getAllByText(/Guest Meals/i);
      expect(guestMealsInPie.length).toBeGreaterThan(0);
      expect(within(mealDistributionSection).getByText(/Extras/i)).toBeInTheDocument();
    });

    it("shows other meal types but not Lunch Bags in pie chart legend", async () => {
      const testDate = new Date(TEST_YEAR, TEST_MONTH, 15, 12, 0, 0).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        mealRecords: [{ id: "m1", guestId: "g1", date: testDate, count: 50 }],
        extraMealRecords: [
          { id: "e1", guestId: "g1", date: testDate, count: 20 },
        ],
        lunchBagRecords: [
          { id: "l1", guestId: "g1", date: testDate, count: 30 },
        ],
      };

      render(<MealReport />);

      await waitFor(() => {
        const mealDistribution = screen.getByText(/Meal Distribution/i);
        expect(mealDistribution).toBeInTheDocument();
      });

      const allText = screen.getByText(/Meal Distribution/i).closest("div")
        .textContent;
      expect(allText).not.toMatch(/Lunch Bags/i);
    });
  });

  describe("Service day filter interactivity", () => {
    it("allows clicking on service day buttons to toggle days", async () => {
      const testDate = new Date(TEST_YEAR, TEST_MONTH, 15, 12, 0, 0).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        mealRecords: [{ id: "m1", guestId: "g1", date: testDate, count: 50 }],
      };

      render(<MealReport />);

      await waitFor(() => {
        expect(screen.getByText(/Service Days:/i)).toBeInTheDocument();
      });

      // Find the Service Days section and get buttons within it
      const serviceDaysSection = screen.getByText(/Service Days:/i).closest("div");
      const dayButtons = within(serviceDaysSection).getAllByRole("button");
      const mondayButton = dayButtons.find((btn) => btn.textContent.includes("Mon"));
      const wednesdayButton = dayButtons.find((btn) => btn.textContent.includes("Wed"));
      
      expect(mondayButton).toBeInTheDocument();
      expect(wednesdayButton).toBeInTheDocument();

      fireEvent.click(mondayButton);

      await waitFor(() => {
        expect(mondayButton).toHaveClass(/border-gray-300/);
      });
    });

    it("allows toggling all days and selecting again", async () => {
      const testDate = new Date(TEST_YEAR, TEST_MONTH, 15, 12, 0, 0).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        mealRecords: [{ id: "m1", guestId: "g1", date: testDate, count: 50 }],
      };

      render(<MealReport />);

      await waitFor(() => {
        expect(screen.getByText(/Service Days:/i)).toBeInTheDocument();
      });

      // Find the Service Days section and get buttons within it
      const getServiceDayButtons = () => {
        const serviceDaysSection = screen.getByText(/Service Days:/i).closest("div");
        const dayButtons = within(serviceDaysSection).getAllByRole("button");
        return {
          monday: dayButtons.find((btn) => btn.textContent.includes("Mon")),
          wednesday: dayButtons.find((btn) => btn.textContent.includes("Wed")),
          friday: dayButtons.find((btn) => btn.textContent.includes("Fri")),
          saturday: dayButtons.find((btn) => btn.textContent.includes("Sat")),
        };
      };

      let buttons = getServiceDayButtons();
      // Deselect all days except Monday
      fireEvent.click(buttons.wednesday);
      fireEvent.click(buttons.friday);
      fireEvent.click(buttons.saturday);

      // Deselect Monday (last remaining day)
      fireEvent.click(buttons.monday);

      await waitFor(() => {
        buttons = getServiceDayButtons();
        // Monday should now be deselected (gray border)
        expect(buttons.monday).toHaveClass(/border-gray-300/);
      });

      // Click Monday again to select it
      fireEvent.click(buttons.monday);

      await waitFor(() => {
        buttons = getServiceDayButtons();
        // Monday should be selected again (blue border)
        expect(buttons.monday).toHaveClass(/border-blue-600/);
      });
    });

    it("toggles day selection on and off", async () => {
      const testDate = new Date(TEST_YEAR, TEST_MONTH, 15, 12, 0, 0).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        mealRecords: [{ id: "m1", guestId: "g1", date: testDate, count: 50 }],
      };

      render(<MealReport />);

      await waitFor(() => {
        expect(screen.getByText(/Service Days:/i)).toBeInTheDocument();
      });

      // Find the Service Days section and get buttons within it
      const serviceDaysSection = screen.getByText(/Service Days:/i).closest("div");
      const dayButtons = within(serviceDaysSection).getAllByRole("button");
      const mondayButton = dayButtons.find((btn) => btn.textContent.includes("Mon"));

      expect(mondayButton).toHaveClass(/border-blue-600/);

      fireEvent.click(mondayButton);

      await waitFor(() => {
        expect(mondayButton).toHaveClass(/border-gray-300/);
      });

      fireEvent.click(mondayButton);

      await waitFor(() => {
        expect(mondayButton).toHaveClass(/border-blue-600/);
      });
    });
  });

  describe("Service day trends chart legend", () => {
    it("shows clickable legend items for service days in trends chart", async () => {
      // Use December 2, 2025 (Tuesday) and December 4, 2025 (Thursday) - not service days, but that's okay for this test
      const mondayDate = new Date(TEST_YEAR, TEST_MONTH, 1, 12, 0, 0).toISOString();
      const wednesdayDate = new Date(TEST_YEAR, TEST_MONTH, 3, 12, 0, 0).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        mealRecords: [
          { id: "m1", guestId: "g1", date: mondayDate, count: 50 },
          { id: "m2", guestId: "g1", date: wednesdayDate, count: 60 },
        ],
      };

      render(<MealReport />);

      await waitFor(() => {
        expect(screen.getByText(/Service Day Trends/i)).toBeInTheDocument();
      });

      const legend = screen
        .getByText(/Service Day Trends/i)
        .closest("div")
        .querySelector(".flex.flex-wrap.gap-3");
      expect(legend).toBeInTheDocument();

      const legendButtons = legend.querySelectorAll("button");
      expect(legendButtons.length).toBeGreaterThan(0);
    });

    it("updates chart when clicking legend day buttons", async () => {
      // Find a Monday in December 2025 - Dec 1, 2025 is a Monday
      const getMondayDate = () => {
        return new Date(TEST_YEAR, TEST_MONTH, 1, 12, 0, 0).toISOString();
      };

      mockContextValue = {
        ...createDefaultContext(),
        mealRecords: [
          { id: "m1", guestId: "g1", date: getMondayDate(), count: 50 },
        ],
      };

      render(<MealReport />);

      await waitFor(() => {
        expect(screen.getByText(/Service Day Trends/i)).toBeInTheDocument();
      });

      const trendsSection = screen
        .getByText(/Service Day Trends/i)
        .closest("div");
      const legendButtons = trendsSection.querySelectorAll(
        ".flex.flex-wrap.gap-3 button"
      );

      expect(legendButtons.length).toBeGreaterThanOrEqual(4);

      const mondayButton = Array.from(legendButtons).find((button) =>
        button.textContent.includes("Monday")
      );
      expect(mondayButton).toBeInTheDocument();

      fireEvent.click(mondayButton);

      await waitFor(() => {
        expect(mondayButton.className).toMatch(/opacity-50|opacity-75/);
      });
    });
  });
});