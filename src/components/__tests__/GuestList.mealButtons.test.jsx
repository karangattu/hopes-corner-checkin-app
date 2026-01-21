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
  addMealRecord: vi.fn(),
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

// Mock date utils to control "today"
vi.mock("../../utils/date", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    todayPacificDateString: () => "2025-12-26",
    pacificDateStringFrom: (date) => {
      if (!date) return "";
      if (typeof date === 'string') return date.substring(0, 10);
      return date.toISOString().substring(0, 10);
    }
  };
});

describe("GuestList - Meal Button Changes", () => {
  beforeEach(() => {
    mockContextValue = createDefaultContext();
  });

  describe("Meal button count", () => {
    it("renders only 1 meal and 2 meals buttons, not 3 meals", async () => {
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
        const mealButtons = screen.getAllByRole("button", { name: /\d+ Meal/ });
        expect(mealButtons).toHaveLength(2);
        expect(screen.getByRole("button", { name: /1 Meal$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /2 Meals$/i })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /3 Meals$/i })).not.toBeInTheDocument();
      });
    });

    it("disables meal buttons after guest receives meal", async () => {
      const today = "2025-12-26";
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
        mealRecords: [{ id: "m1", guestId: "g1", date: today, count: 1 }],
      };

      render(<GuestList />);

      const search = screen.getByPlaceholderText(/search guests/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      // After meal is logged, should show single DIV (not button) with meal count and checkmark
      // It has default cursor and opacity-60, so it looks disabled.
      // We search by title since it provides the best descriptive text.
      // Use getAllByTitle since it may appear in both compact and full views
      const bookedIndicators = screen.getAllByTitle(/Already received 1 meal.*today/i);
      expect(bookedIndicators.length).toBeGreaterThanOrEqual(1);
      const bookedIndicator = bookedIndicators[0];
      expect(bookedIndicator).toBeInTheDocument();
      // Check if it's a DIV in the compact view
      const divIndicators = bookedIndicators.filter(el => el.tagName === "DIV");
      expect(divIndicators.length).toBeGreaterThanOrEqual(1);

      // Ensure the clickable buttons are GONE (not just disabled, but replaced)
      expect(screen.queryByRole("button", { name: /1 Meal$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /2 Meals$/i })).not.toBeInTheDocument();
    });
  });

  describe("Complete Check-in button", () => {
    it("shows Complete Check-in button after guest has received meals", async () => {
      const today = "2025-12-26";
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
        mealRecords: [{ id: "m1", guestId: "g1", date: today, count: 2 }],
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
        const completeButtons = screen.queryAllByRole("button", { name: /Complete Check-in/i });
        expect(completeButtons.length).toBeGreaterThan(0);
      });
    });

    it("resets search field when Complete Check-in is clicked", async () => {
      const today = "2025-12-26";
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
        mealRecords: [{ id: "m1", guestId: "g1", date: today, count: 1 }],
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
        const completeButtons = screen.getAllByRole("button", { name: /Complete Check-in/i });
        expect(completeButtons.length).toBeGreaterThan(0);
        fireEvent.click(completeButtons[0]); // Click the first one (the prominent button)
      });

      await waitFor(() => {
        expect(search.value).toBe("");
      });
    });

    it("does not show Complete Check-in button before guest receives meals", async () => {
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
        expect(screen.queryByRole("button", { name: /Complete Check-in/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("Meal button interaction", () => {
    it("calls addMealRecord with count 1 when 1 meal button is clicked", async () => {
      const addMealRecordMock = vi.fn(() => ({ id: "m1", guestId: "g1", count: 1 }));
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
        addMealRecord: addMealRecordMock,
      };

      render(<GuestList />);

      const search = screen.getByPlaceholderText(/search guests/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      const guestCard = screen.getByText("John Doe").closest("div");
      fireEvent.click(guestCard);

      const oneMealButton = await screen.findByRole("button", { name: /1 Meal$/i });
      fireEvent.click(oneMealButton);

      await waitFor(() => {
        expect(addMealRecordMock).toHaveBeenCalled();
        const args = addMealRecordMock.mock.calls[0];
        expect(args[0]).toBe("g1");
        expect(args[1]).toBe(1);
      });
    });

    it("calls addMealRecord with count 2 when 2 meals button is clicked", async () => {
      const addMealRecordMock = vi.fn(() => ({ id: "m1", guestId: "g1", count: 2 }));
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
        addMealRecord: addMealRecordMock,
      };

      render(<GuestList />);

      const search = screen.getByPlaceholderText(/search guests/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      const guestCard = screen.getByText("John Doe").closest("div");
      fireEvent.click(guestCard);

      const twoMealsButton = await screen.findByRole("button", { name: /2 Meals$/i });
      fireEvent.click(twoMealsButton);

      await waitFor(() => {
        expect(addMealRecordMock).toHaveBeenCalled();
        const args = addMealRecordMock.mock.calls[0];
        expect(args[0]).toBe("g1");
        expect(args[1]).toBe(2);
      });
    });

    it("calls addExtraMealRecord when extra meal button is clicked", async () => {
      const today = "2025-12-26";
      const addExtraMealRecordMock = vi.fn();
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
        mealRecords: [{ id: "m1", guestId: "g1", date: today, count: 1 }],
        addExtraMealRecord: addExtraMealRecordMock,
      };

      render(<GuestList />);

      const search = screen.getByPlaceholderText(/search guests/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      const guestCard = screen.getByText("John Doe").closest("div");
      fireEvent.click(guestCard);

      const extraOneButton = await screen.findByRole("button", { name: "1 Extra" });
      fireEvent.click(extraOneButton);

      await waitFor(() => {
        expect(addExtraMealRecordMock).toHaveBeenCalledWith("g1", 1);
      });
    });
  });

  describe("Disabled meal buttons show meal count", () => {
    it("meal buttons are replaced by status indicator after guest receives meal", async () => {
      const today = "2025-12-26";
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
        mealRecords: [{ id: "m1", guestId: "g1", date: today, count: 1 }],
      };

      render(<GuestList />);

      const search = screen.getByPlaceholderText(/search guests/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      // Verify the status indicator exists
      // Use getAllByTitle since it may appear in both compact and full views
      const indicators = screen.getAllByTitle(/Already received 1 meal.*today/i);
      expect(indicators.length).toBeGreaterThanOrEqual(1);
      expect(indicators[0]).toBeInTheDocument();
    });

    it("guest with 2 meals shows correct meal count on status indicator", async () => {
      const today = "2025-12-26";
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Jane Smith",
            preferredName: "",
            firstName: "Jane",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
        ],
        mealRecords: [{ id: "m1", guestId: "g1", date: today, count: 2 }],
      };

      render(<GuestList />);

      const search = screen.getByPlaceholderText(/search guests/i);
      fireEvent.change(search, { target: { value: "Jane Smith" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      const indicator = screen.getByTitle(/Already received 2 meals.*today/i);
      expect(indicator).toBeInTheDocument();
    });

    it("shows status indicator in expanded view when meals already received", async () => {
      const today = "2025-12-26";
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
        mealRecords: [{ id: "m1", guestId: "g1", date: today, count: 1 }],
      };

      render(<GuestList />);

      const search = screen.getByPlaceholderText(/search guests/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      const guestCard = screen.getByText("John Doe").closest("div");
      fireEvent.click(guestCard);

      // Get all indicators with this title and find the one in the expanded view
      const indicators = await screen.findAllByTitle(/Already received 1 meal.*today/i);
      expect(indicators.length).toBeGreaterThanOrEqual(1);
      expect(indicators[0]).toBeInTheDocument();
    });

    it("shows two buttons in expanded view when no meals yet", async () => {
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
        // Should show two buttons (1 Meal and 2 Meals) when no meals logged yet
        const oneButton = screen.queryByRole("button", { name: /1 Meal/i });
        const twoButton = screen.queryByRole("button", { name: /2 Meals/i });

        // Both buttons should be available
        expect(oneButton).toBeInTheDocument();
        expect(twoButton).toBeInTheDocument();
      });
    });
  });
});
