
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GuestList from "../GuestList";

// Mock useAppContext
const mockSetShowerPickerGuest = vi.fn();
const mockSetLaundryPickerGuest = vi.fn();

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
    actionHistory: [],
    undoAction: vi.fn(),
    setShowerPickerGuest: mockSetShowerPickerGuest,
    setLaundryPickerGuest: mockSetLaundryPickerGuest,
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

// Mock useGuestsStore to avoid Zustand issues if any
vi.mock("../../stores/useGuestsStore", () => ({
    useGuestsStore: (selector) => {
        const state = {
            guestProxies: [],
            getLinkedGuests: () => [],
            linkGuests: vi.fn(),
            unlinkGuests: vi.fn(),
            getWarningsForGuest: () => [],
            addGuestWarning: vi.fn(),
            removeGuestWarning: vi.fn(),
        };
        return selector(state);
    },
}));

// Mock date utils to control "today"
vi.mock("../../utils/date", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        todayPacificDateString: () => "2025-12-26",
        pacificDateStringFrom: (date) => {
            if (!date) return "";
            // simple mock implementation for YYYY-MM-DD check
            if (typeof date === 'string') return date.substring(0, 10);
            return date.toISOString().substring(0, 10);
        }
    };
});


describe("GuestList Quick Services", () => {
    beforeEach(() => {
        mockContextValue = createDefaultContext();
        mockSetShowerPickerGuest.mockClear();
        mockSetLaundryPickerGuest.mockClear();
    });

    it("renders quick shower and laundry buttons for a guest", async () => {
        mockContextValue = {
            ...createDefaultContext(),
            guests: [
                { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" }
            ]
        };

        render(<GuestList />);
        const search = screen.getByLabelText(/search guests by name/i);
        fireEvent.change(search, { target: { value: "John" } });

        expect(await screen.findByText("John Doe")).toBeInTheDocument();

        // Check availability of buttons
        expect(screen.getByTitle("Book Shower")).toBeInTheDocument();
        expect(screen.getByTitle("Book Laundry")).toBeInTheDocument();
    });

    it("triggers setShowerPickerGuest when Shower button is clicked", async () => {
        const guest = { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" };
        mockContextValue = {
            ...createDefaultContext(),
            guests: [guest]
        };

        const user = userEvent.setup();
        render(<GuestList />);

        fireEvent.change(screen.getByLabelText(/search guests by name/i), { target: { value: "John" } });
        await screen.findByText("John Doe");

        const showerBtn = screen.getByTitle("Book Shower");
        await user.click(showerBtn);

        expect(mockSetShowerPickerGuest).toHaveBeenCalledTimes(1);
        expect(mockSetShowerPickerGuest).toHaveBeenCalledWith(guest);
    });

    it("triggers setLaundryPickerGuest when Laundry button is clicked", async () => {
        const guest = { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" };
        mockContextValue = {
            ...createDefaultContext(),
            guests: [guest]
        };

        const user = userEvent.setup();
        render(<GuestList />);

        fireEvent.change(screen.getByLabelText(/search guests by name/i), { target: { value: "John" } });
        await screen.findByText("John Doe");

        const laundryBtn = screen.getByTitle("Book Laundry");
        await user.click(laundryBtn);

        expect(mockSetLaundryPickerGuest).toHaveBeenCalledTimes(1);
        expect(mockSetLaundryPickerGuest).toHaveBeenCalledWith(guest);
    });

    it("shows disabled 'already booked' indicator if guest has booked shower today", async () => {
        // Mock date is 2025-12-26
        const guest = { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" };
        mockContextValue = {
            ...createDefaultContext(),
            guests: [guest],
            showerRecords: [{ id: "s1", guestId: "g1", date: "2025-12-26T10:00:00" }]
        };
        render(<GuestList />);

        fireEvent.change(screen.getByPlaceholderText(/search by name/i), { target: { value: "John" } });
        await screen.findByText("John Doe");

        expect(await screen.findByTitle("Shower already booked today")).toBeInTheDocument();
        expect(screen.queryByTitle("Book Shower")).not.toBeInTheDocument();
    });

    it("shows reset button if any service (Shower) is booked today", async () => {
        const guest = { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" };
        mockContextValue = {
            ...createDefaultContext(),
            guests: [guest],
            showerRecords: [{ id: "s1", guestId: "g1", date: "2025-12-26T10:00:00" }],
            guestsWithShowerToday: new Set(["g1"])
        };

        render(<GuestList />);
        fireEvent.change(screen.getByPlaceholderText(/search by name/i), { target: { value: "John" } });
        await screen.findByText("John Doe");

        // Reset button should be visible (BrushCleaning icon implies "Complete check-in")
        expect(screen.getByTitle("Complete check-in and search for next guest")).toBeInTheDocument();
    });

    it("shows reset button if specific service (Laundry) is booked today", async () => {
        const guest = { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" };
        mockContextValue = {
            ...createDefaultContext(),
            guests: [guest],
            laundryRecords: [{ id: "l1", guestId: "g1", date: "2025-12-26T10:00:00" }],
            guestsWithLaundryToday: new Set(["g1"])
        };

        render(<GuestList />);
        fireEvent.change(screen.getByPlaceholderText(/search by name/i), { target: { value: "John" } });
        await screen.findByText("John Doe");

        expect(screen.getByTitle("Complete check-in and search for next guest")).toBeInTheDocument();
    });

    it("hides Shower button if guest is banned from Shower but shows Laundry button", async () => {
        const guest = {
            id: "g1",
            name: "John Doe",
            firstName: "John",
            lastName: "Doe",
            isBanned: true,
            bannedFromShower: true,
            bannedFromLaundry: false,
            bannedFromMeals: false
        };

        mockContextValue = {
            ...createDefaultContext(),
            guests: [guest],
        };

        render(<GuestList />);
        fireEvent.change(screen.getByPlaceholderText(/search by name/i), { target: { value: "John" } });
        await screen.findByText("John Doe");

        // Shower button should NOT be present (conditional rendering)
        expect(screen.queryByTitle("Book Shower")).not.toBeInTheDocument();

        // Laundry button SHOULD be present
        expect(screen.getByTitle("Book Laundry")).toBeInTheDocument();

        // Meal buttons SHOULD be present
        expect(screen.getByTitle("Quick log 1 meal")).toBeInTheDocument();
    });

    it("hides Meal buttons if guest is banned from Meals", async () => {
        const guest = {
            id: "g1",
            name: "John Doe",
            firstName: "John",
            lastName: "Doe",
            isBanned: true,
            bannedFromMeals: true,
            bannedFromShower: false
        };

        mockContextValue = {
            ...createDefaultContext(),
            guests: [guest]
        };

        render(<GuestList />);
        fireEvent.change(screen.getByPlaceholderText(/search by name/i), { target: { value: "John" } });
        await screen.findByText("John Doe");

        // Meal buttons should be hidden
        expect(screen.queryByTitle("Quick log 1 meal")).not.toBeInTheDocument();

        // Shower button should be visible
        expect(screen.getByTitle("Book Shower")).toBeInTheDocument();
    });
});
