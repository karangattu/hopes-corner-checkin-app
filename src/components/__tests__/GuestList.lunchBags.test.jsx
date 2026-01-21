import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GuestList from "../GuestList";

const createDefaultContext = () => ({
  guests: [],
  guestsWithShowerToday: new Set(),
  guestsWithLaundryToday: new Set(),
  mealRecords: [],
  extraMealRecords: [],
  showerRecords: [],
  laundryRecords: [],
  holidayRecords: [],
  haircutRecords: [],
  bicycleRecords: [],
  dayWorkerMealRecords: [],
  unitedEffortMealRecords: [],
  rvMealRecords: [],
  lunchBagRecords: [],
  actionHistory: [],
  undoAction: vi.fn(),
  setShowerPickerGuest: vi.fn(),
  setLaundryPickerGuest: vi.fn(),
  addMealRecord: vi.fn().mockReturnValue({ id: "meal-1" }),
  addExtraMealRecord: vi.fn(),
  addLunchBagRecord: vi.fn(),
  addGuest: vi.fn(),
  setBicyclePickerGuest: vi.fn(),
  addHaircutRecord: vi.fn(),
  addHolidayRecord: vi.fn(),
  updateGuest: vi.fn(),
  removeGuest: vi.fn(),
  banGuest: vi.fn(),
  clearGuestBan: vi.fn(),
  guestNeedsWaiverReminder: vi.fn().mockResolvedValue(false),
  dismissWaiver: vi.fn().mockResolvedValue(true),
  hasActiveWaiver: vi.fn().mockReturnValue(true),
  transferAllGuestRecords: vi.fn(),
  isDataLoaded: true,
});

let mockContextValue = createDefaultContext();

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContextValue,
}));

// Track what date is being mocked
let mockTodayDate = "2025-12-26"; // Default: Friday

vi.mock("../../utils/date", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    todayPacificDateString: () => mockTodayDate,
    pacificDateStringFrom: (date) => {
      if (!date) return "";
      if (typeof date === "string") return date.substring(0, 10);
      return date.toISOString().substring(0, 10);
    },
  };
});

describe("GuestList - Lunch Bag Auto-Add Logic", () => {
  beforeEach(() => {
    mockContextValue = createDefaultContext();
    vi.clearAllMocks();
  });

  const setupGuestAndClickMeal = async () => {
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        {
          id: "g1",
          name: "John Doe",
          preferredName: "",
          firstName: "John",
          lastName: "Doe",
          housingStatus: "Unhoused",
          location: "Mountain View",
          age: "Adult 18-59",
          gender: "Male",
        },
      ],
      mealRecords: [],
      addMealRecord: vi.fn().mockReturnValue({ id: "meal-1" }),
      addLunchBagRecord: vi.fn(),
    };

    render(<GuestList />);

    const search = screen.getByPlaceholderText(/search guests/i);
    fireEvent.change(search, { target: { value: "John Doe" } });

    await waitFor(() => {
      expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
    });

    const guestCard = screen.getByText("John Doe").closest("div");
    fireEvent.click(guestCard);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /1 Meal$/i })).toBeInTheDocument();
    });

    const mealButton = screen.getByRole("button", { name: /1 Meal$/i });
    fireEvent.click(mealButton);

    return mockContextValue;
  };

  describe("Friday lunch bag exclusion", () => {
    it("does NOT add lunch bag when meal is logged on Friday", async () => {
      // Friday, December 26, 2025
      mockTodayDate = "2025-12-26";

      const context = await setupGuestAndClickMeal();

      await waitFor(() => {
        expect(context.addMealRecord).toHaveBeenCalled();
        expect(context.addMealRecord.mock.calls[0][0]).toBe("g1"); // guestId
        expect(context.addMealRecord.mock.calls[0][1]).toBe(1); // count
      });

      // Lunch bag should NOT be added on Friday
      expect(context.addLunchBagRecord).not.toHaveBeenCalled();
    });

    it("adds lunch bag when meal is logged on Monday", async () => {
      // Monday, December 22, 2025
      mockTodayDate = "2025-12-22";

      const context = await setupGuestAndClickMeal();

      await waitFor(() => {
        expect(context.addMealRecord).toHaveBeenCalled();
      });

      // Lunch bag SHOULD be added on Monday
      await waitFor(() => {
        expect(context.addLunchBagRecord).toHaveBeenCalledWith(1, "2025-12-22");
      });
    });

    it("adds lunch bag when meal is logged on Wednesday", async () => {
      // Wednesday, December 24, 2025
      mockTodayDate = "2025-12-24";

      const context = await setupGuestAndClickMeal();

      await waitFor(() => {
        expect(context.addMealRecord).toHaveBeenCalled();
      });

      // Lunch bag SHOULD be added on Wednesday
      await waitFor(() => {
        expect(context.addLunchBagRecord).toHaveBeenCalledWith(1, "2025-12-24");
      });
    });

    it("adds lunch bag when meal is logged on Saturday", async () => {
      // Saturday, December 27, 2025
      mockTodayDate = "2025-12-27";

      const context = await setupGuestAndClickMeal();

      await waitFor(() => {
        expect(context.addMealRecord).toHaveBeenCalled();
      });

      // Lunch bag SHOULD be added on Saturday
      await waitFor(() => {
        expect(context.addLunchBagRecord).toHaveBeenCalledWith(1, "2025-12-27");
      });
    });

    it("adds lunch bag when meal is logged on Thursday", async () => {
      // Thursday, December 25, 2025
      mockTodayDate = "2025-12-25";

      const context = await setupGuestAndClickMeal();

      await waitFor(() => {
        expect(context.addMealRecord).toHaveBeenCalled();
      });

      // Lunch bag SHOULD be added on Thursday
      await waitFor(() => {
        expect(context.addLunchBagRecord).toHaveBeenCalledWith(1, "2025-12-25");
      });
    });
  });

  describe("Lunch bag count per meal", () => {
    it("adds exactly 1 lunch bag per guest meal", async () => {
      // Monday
      mockTodayDate = "2025-12-22";

      const context = await setupGuestAndClickMeal();

      await waitFor(() => {
        expect(context.addMealRecord).toHaveBeenCalled();
      });

      // Should add exactly 1 lunch bag
      await waitFor(() => {
        expect(context.addLunchBagRecord).toHaveBeenCalledTimes(1);
        expect(context.addLunchBagRecord).toHaveBeenCalledWith(1, "2025-12-22");
      });
    });
  });
});
