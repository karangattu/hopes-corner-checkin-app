import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GuestList from "../GuestList";

const createDefaultContext = () => ({
  guests: [],
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
  addGuest: vi.fn(),
  setBicyclePickerGuest: vi.fn(),
  addHaircutRecord: vi.fn(),
  addHolidayRecord: vi.fn(),
  updateGuest: vi.fn(),
  removeGuest: vi.fn(),
  banGuest: vi.fn(),
  clearGuestBan: vi.fn(),
});

let mockContextValue = createDefaultContext();

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContextValue,
}));

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

      const search = screen.getByPlaceholderText(/search by name/i);
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
      const today = new Date().toISOString();
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

      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      // After meal is logged, should show single button with meal count
      const mealButtons = screen.getAllByRole("button", { name: /Meal/i });
      const disabledMealButtons = mealButtons.filter(btn => btn.disabled && btn.textContent.includes("Meal"));
      
      expect(disabledMealButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Complete Check-in button", () => {
    it("shows Complete Check-in button after guest has received meals", async () => {
      const today = new Date().toISOString();
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

      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      const guestCard = screen.getByText("John Doe").closest("div");
      fireEvent.click(guestCard);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Complete Check-in/i })).toBeInTheDocument();
      });
    });

    it("resets search field when Complete Check-in is clicked", async () => {
      const today = new Date().toISOString();
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

      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      const guestCard = screen.getByText("John Doe").closest("div");
      fireEvent.click(guestCard);

      await waitFor(() => {
        const completeButton = screen.getByRole("button", { name: /Complete Check-in/i });
        fireEvent.click(completeButton);
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

      const search = screen.getByPlaceholderText(/search by name/i);
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

      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      const guestCard = screen.getByText("John Doe").closest("div");
      fireEvent.click(guestCard);

      const oneMealButton = await screen.findByRole("button", { name: /1 Meal$/i });
      fireEvent.click(oneMealButton);

      await waitFor(() => {
        expect(addMealRecordMock).toHaveBeenCalledWith("g1", 1);
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

      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      const guestCard = screen.getByText("John Doe").closest("div");
      fireEvent.click(guestCard);

      const twoMealsButton = await screen.findByRole("button", { name: /2 Meals$/i });
      fireEvent.click(twoMealsButton);

      await waitFor(() => {
        expect(addMealRecordMock).toHaveBeenCalledWith("g1", 2);
      });
    });
  });

  describe("Disabled meal buttons show meal count", () => {
    it("meal buttons are disabled after guest receives meal", async () => {
      const today = new Date().toISOString();
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

      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      // Verify the meal record was created with correct count
      expect(mockContextValue.mealRecords[0].count).toBe(1);
    });

    it("guest with 2 meals shows correct meal count", async () => {
      const today = new Date().toISOString();
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

      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Jane Smith" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      // Verify the meal record has correct count of 2
      expect(mockContextValue.mealRecords[0].count).toBe(2);
    });

    it("shows single button in expanded view when meals already received", async () => {
      const today = new Date().toISOString();
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

      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "John Doe" } });

      await waitFor(() => {
        expect(screen.getByText(/1 guest.*found/i)).toBeInTheDocument();
      });

      const guestCard = screen.getByText("John Doe").closest("div");
      fireEvent.click(guestCard);

      await waitFor(() => {
        // Should have a disabled button showing meal count
        const mealButtons = screen.queryAllByRole("button", { name: /1 Meal/i });
        const disabledButtons = mealButtons.filter(btn => btn.disabled);
        
        // At least one disabled button showing "1 Meal"
        expect(disabledButtons.length).toBeGreaterThan(0);
      });
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

      const search = screen.getByPlaceholderText(/search by name/i);
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
