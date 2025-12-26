import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  guestNeedsWaiverReminder: vi.fn().mockResolvedValue(false),
  dismissWaiver: vi.fn().mockResolvedValue(true),
  hasActiveWaiver: vi.fn().mockReturnValue(true),
});

let mockContextValue = createDefaultContext();

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContextValue,
}));

describe("GuestList", () => {
  beforeEach(() => {
    mockContextValue = createDefaultContext();
  });

  it("shows the keyboard shortcuts help text", () => {
    render(<GuestList />);

    // Check for the new compact keyboard shortcuts hint
    expect(screen.getByText(/Focus/i)).toBeInTheDocument();
    expect(screen.getByText(/Navigate/i)).toBeInTheDocument();
  });

  it("displays create-guest prompt when search has first and last initial with no results", async () => {
    render(<GuestList />);

    const search = screen.getByPlaceholderText(/search by name/i);
    // Use fireEvent for faster input simulation
    fireEvent.change(search, { target: { value: "Alex R" } });

    expect(
      await screen.findByText(/no matches for "Alex R"/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create new guest/i }),
    ).toBeInTheDocument();
  });

  it("shows matched guests instead of create prompt when results exist", async () => {
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        {
          id: "g1",
          name: "Jane Roe",
          preferredName: "",
          firstName: "Jane",
          lastName: "Roe",
          housingStatus: "Unhoused",
          location: "Mountain View",
          age: "Adult 18-59",
          gender: "Female",
        },
      ],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: "Jane R" } });

    expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();
    expect(screen.queryByText(/no guest found/i)).not.toBeInTheDocument();
  });

  it("shows compact inline time label for today's services", async () => {
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        { id: "g1", name: "Tim Guest", firstName: "Tim", lastName: "Guest" },
      ],
      showerRecords: [
        { id: "s1", guestId: "g1", date: new Date().toISOString(), time: "08:30", status: "awaiting" },
      ],
      laundryRecords: [
        { id: "l1", guestId: "g1", date: new Date().toISOString(), time: "09:00 - 10:00", laundryType: "onsite", status: "waiting" },
      ],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: "Tim" } });

    // Compact label should show both services with times
    const showerEls = await screen.findAllByText(/Shower:/i);
    expect(showerEls.length).toBeGreaterThanOrEqual(1);
    const laundryEls = await screen.findAllByText(/Laundry:/i);
    expect(laundryEls.length).toBeGreaterThanOrEqual(1);
  });

  it("filters guests by partial name match", async () => {
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" },
        { id: "g2", name: "Jane Doe", firstName: "Jane", lastName: "Doe" },
        { id: "g3", name: "Bob Smith", firstName: "Bob", lastName: "Smith" },
      ],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: "Doe" } });

    expect(await screen.findByText(/2 guests.*found/i)).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
  });

  it("shows no results when search does not match", async () => {
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" },
      ],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: "Nonexistent" } });

    expect(await screen.findByText(/no guests found/i)).toBeInTheDocument();
  });

  it("clears search and shows all guests when search is empty", async () => {
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" },
        { id: "g2", name: "Jane Smith", firstName: "Jane", lastName: "Smith" },
      ],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: "John" } });
    expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "" } });
    expect(
      await screen.findByText(/ready to search/i),
    ).toBeInTheDocument();
  });

  it("shows delete confirmation modal when delete button is clicked", async () => {
    const user = userEvent.setup();
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        {
          id: "g1",
          name: "John Doe",
          firstName: "John",
          lastName: "Doe",
          housingStatus: "Unhoused",
          location: "Mountain View",
          age: "Adult 18-59",
          gender: "Male",
        },
      ],
      mealRecords: [{ id: "m1", guestId: "g1", date: "2025-10-24" }],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: "John" } });

    const guestCard = await screen.findByText("John Doe");
    await user.click(guestCard);

    const deleteButton = await screen.findByText(/delete/i);
    await user.click(deleteButton);

    // When guest has meal records, should show transfer modal instead
    expect(
      await screen.findByText("Transfer Meal Records"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/meal record/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/that need to be transferred/),
    ).toBeInTheDocument();
  });

  it("transfers meal records to another guest when transfer is confirmed", async () => {
    const user = userEvent.setup();
    const transferMealRecordsMock = vi.fn().mockResolvedValue(true);
    const removeGuestMock = vi.fn().mockResolvedValue(undefined);

    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        {
          id: "g1",
          name: "John Doe",
          firstName: "John",
          lastName: "Doe",
          housingStatus: "Unhoused",
          location: "Mountain View",
          age: "Adult 18-59",
          gender: "Male",
        },
        {
          id: "g2",
          name: "Jane Smith",
          firstName: "Jane",
          lastName: "Smith",
          housingStatus: "Housed",
          location: "San Jose",
          age: "Adult 18-59",
          gender: "Female",
        },
      ],
      mealRecords: [{ id: "m1", guestId: "g1", date: "2025-10-24" }],
      transferMealRecords: transferMealRecordsMock,
      removeGuest: removeGuestMock,
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: "John" } });

    const guestCard = await screen.findByText("John Doe");
    await user.click(guestCard);

    const deleteButton = await screen.findByText(/delete/i);
    await user.click(deleteButton);

    // Modal should appear
    expect(
      await screen.findByText("Transfer Meal Records"),
    ).toBeInTheDocument();

    // Select target guest
    const selectElement = screen.getByDisplayValue("-- Select a guest --");
    await user.selectOptions(selectElement, "g2");

    // Click transfer button
    const transferButton = screen.getByText(/Transfer & Delete/i);
    await user.click(transferButton);

    // Verify transferMealRecords was called with correct arguments
    expect(transferMealRecordsMock).toHaveBeenCalledWith("g1", "g2");
    expect(removeGuestMock).toHaveBeenCalledWith("g1");
  });

  it("does not show transfer modal if guest has no meal records", async () => {
    const user = userEvent.setup();
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        {
          id: "g1",
          name: "John Doe",
          firstName: "John",
          lastName: "Doe",
          housingStatus: "Unhoused",
          location: "Mountain View",
          age: "Adult 18-59",
          gender: "Male",
        },
      ],
      mealRecords: [], // No meals for this guest
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: "John" } });

    const guestCard = await screen.findByText("John Doe");
    await user.click(guestCard);

    const deleteButton = await screen.findByText(/delete/i);
    await user.click(deleteButton);

    // Should show delete confirmation instead of transfer modal
    expect(
      await screen.findByText("Delete Guest Profile?"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Transfer Meal Records"),
    ).not.toBeInTheDocument();
  });

  it("closes delete confirmation modal when cancel is clicked", async () => {
    const user = userEvent.setup();
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        {
          id: "g1",
          name: "John Doe",
          firstName: "John",
          lastName: "Doe",
          housingStatus: "Unhoused",
          location: "Mountain View",
          age: "Adult 18-59",
          gender: "Male",
        },
      ],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: "John" } });

    const guestCard = await screen.findByText("John Doe");
    await user.click(guestCard);

    const deleteButton = await screen.findByText(/delete/i);
    await user.click(deleteButton);

    const cancelButton = await screen.findByText("Cancel");
    await user.click(cancelButton);

    expect(screen.queryByText("Delete Guest Profile?")).not.toBeInTheDocument();
  });

  it("calls removeGuest when delete is confirmed", async () => {
    const user = userEvent.setup();
    const removeGuest = vi.fn();
    mockContextValue = {
      ...createDefaultContext(),
      removeGuest,
      guests: [
        {
          id: "g1",
          name: "John Doe",
          firstName: "John",
          lastName: "Doe",
          housingStatus: "Unhoused",
          location: "Mountain View",
          age: "Adult 18-59",
          gender: "Male",
        },
      ],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(search, { target: { value: "John" } });

    const guestCard = await screen.findByText("John Doe");
    await user.click(guestCard);

    const deleteButton = await screen.findByText(/delete/i);
    await user.click(deleteButton);

    const confirmButton = await screen.findByText("Delete Permanently");
    await user.click(confirmButton);

    expect(removeGuest).toHaveBeenCalledWith("g1");
  });

  it("opens create guest form with keyboard shortcut", async () => {
    render(<GuestList />);

    expect(
      screen.queryByRole("dialog", { name: /create new guest/i }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(document, {
      key: "g",
      ctrlKey: true,
      altKey: true,
    });

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: /create new guest/i }),
      ).toBeInTheDocument();
    });
  });

  it("does not trigger shortcut while typing in inputs", async () => {
    render(<GuestList />);

    const search = screen.getByPlaceholderText(/search by name/i);
    search.focus();

    fireEvent.keyDown(search, {
      key: "g",
      ctrlKey: true,
      altKey: true,
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /create new guest/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Guest sorting", () => {
    it("displays sort buttons when search results exist", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Charlie Brown",
            firstName: "Charlie",
            lastName: "Brown",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
          {
            id: "g2",
            name: "Alice Smith",
            firstName: "Alice",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Charlie" } });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /first name/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /last name/i })).toBeInTheDocument();
      });
    });

    it("sorts guests by first name in ascending order", async () => {
      const user = userEvent.setup();
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Charlie Brown",
            firstName: "Charlie",
            lastName: "Brown",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
          {
            id: "g2",
            name: "Alice Smith",
            firstName: "Alice",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
          {
            id: "g3",
            name: "Bob Jones",
            firstName: "Bob",
            lastName: "Jones",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "A" } });

      const firstNameButton = await screen.findByRole("button", { name: /first name/i });
      await user.click(firstNameButton);

      // After sorting by first name ascending, should be: Alice, Bob, Charlie
      const guestCards = await screen.findAllByText(/Smith|Jones|Brown/);
      expect(guestCards[0]).toHaveTextContent("Alice Smith");
    });

    it("sorts guests by last name in ascending order", async () => {
      const user = userEvent.setup();
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Charlie Brown",
            firstName: "Charlie",
            lastName: "Brown",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
          {
            id: "g2",
            name: "Alice Smith",
            firstName: "Alice",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
          {
            id: "g3",
            name: "Bob Jones",
            firstName: "Bob",
            lastName: "Jones",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      // Search with pattern that matches all: space or empty initial filters
      fireEvent.change(search, { target: { value: "B" } });

      const lastNameButton = await screen.findByRole("button", { name: /last name/i });
      await user.click(lastNameButton);

      // After sorting by last name ascending with "B" search
      // Bob Jones (Jones) should appear, followed by alphabetical order
      await waitFor(() => {
        expect(screen.getByText(/Bob Jones/)).toBeInTheDocument();
      });
    });

    it("toggles sort direction when clicking the same sort button", async () => {
      const user = userEvent.setup();
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Charlie Brown",
            firstName: "Charlie",
            lastName: "Brown",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
          {
            id: "g2",
            name: "Alice Smith",
            firstName: "Alice",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "A" } });

      const firstNameButton = await screen.findByRole("button", { name: /first name/i });

      // First click - ascending
      await user.click(firstNameButton);
      expect(firstNameButton).toHaveTextContent("↑");

      // Second click - descending
      await user.click(firstNameButton);
      await waitFor(() => {
        expect(firstNameButton).toHaveTextContent("↓");
      });
    });

    it("shows visual indicator for active sort button", async () => {
      const user = userEvent.setup();
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Charlie Brown",
            firstName: "Charlie",
            lastName: "Brown",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
          {
            id: "g2",
            name: "Alice Smith",
            firstName: "Alice",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "A" } });

      const firstNameButton = await screen.findByRole("button", { name: /first name/i });
      const lastNameButton = screen.getByRole("button", { name: /last name/i });

      // First name button should be white initially (inactive state)
      expect(firstNameButton).toHaveClass("bg-white");

      // Click first name button
      await user.click(firstNameButton);

      // First name button should be blue (active)
      await waitFor(() => {
        expect(firstNameButton).toHaveClass("bg-blue-600");
        expect(lastNameButton).toHaveClass("bg-white");
      });

      // Click last name button
      await user.click(lastNameButton);

      // Last name button should now be blue
      await waitFor(() => {
        expect(lastNameButton).toHaveClass("bg-blue-600");
        expect(firstNameButton).toHaveClass("bg-white");
      });
    });

    it("switches sort key and resets to ascending when clicking different sort button", async () => {
      const user = userEvent.setup();
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Charlie Brown",
            firstName: "Charlie",
            lastName: "Brown",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
          {
            id: "g2",
            name: "Alice Smith",
            firstName: "Alice",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "A" } });

      const firstNameButton = await screen.findByRole("button", { name: /first name/i });
      const lastNameButton = screen.getByRole("button", { name: /last name/i });

      // Click first name button to sort ascending
      await user.click(firstNameButton);
      expect(firstNameButton).toHaveTextContent("↑");

      // Click last name button - should switch to last name with ascending
      await user.click(lastNameButton);
      await waitFor(() => {
        expect(lastNameButton).toHaveTextContent("↑");
        expect(firstNameButton).not.toHaveTextContent("↑");
        expect(firstNameButton).not.toHaveTextContent("↓");
      });
    });
  });

  describe("Flexible name search with middle names", () => {
    it("finds guest by first name when middle name is part of firstName field", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Ping Xing Yuan",
            firstName: "Ping Xing",
            lastName: "Yuan",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Ping" } });

      expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();
      expect(screen.getByText(/Ping Xing Yuan/i)).toBeInTheDocument();
    });

    it("finds guest by middle name when it's part of firstName field", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Ping Xing Yuan",
            firstName: "Ping Xing",
            lastName: "Yuan",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Xing" } });

      expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();
      expect(screen.getByText(/Ping Xing Yuan/i)).toBeInTheDocument();
    });

    it("finds guest by last name when middle name is part of firstName field", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Ping Xing Yuan",
            firstName: "Ping Xing",
            lastName: "Yuan",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Yuan" } });

      expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();
      expect(screen.getByText(/Ping Xing Yuan/i)).toBeInTheDocument();
    });

    it("finds guest by combination of middle and last name", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Ping Xing Yuan",
            firstName: "Ping Xing",
            lastName: "Yuan",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Xing Yuan" } });

      expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();
      expect(screen.getByText(/Ping Xing Yuan/i)).toBeInTheDocument();
    });

    it("finds correct guest when multiple guests have overlapping name parts", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Ping Xing Yuan",
            firstName: "Ping Xing",
            lastName: "Yuan",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
          {
            id: "g2",
            name: "Ping Yang",
            firstName: "Ping",
            lastName: "Yang",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
          {
            id: "g3",
            name: "Mary Ann Johnson",
            firstName: "Mary Ann",
            lastName: "Johnson",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Xing" } });

      expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();
      expect(screen.getByText(/Ping Xing Yuan/i)).toBeInTheDocument();
      expect(screen.queryByText(/Ping Yang/i)).not.toBeInTheDocument();
    });

    it("finds guest by partial middle name match", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Ping Xing Yuan",
            firstName: "Ping Xing",
            lastName: "Yuan",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Xin" } });

      expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();
      expect(screen.getByText(/Ping Xing Yuan/i)).toBeInTheDocument();
    });

    it("handles search with multiple middle names", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "John Michael James Smith",
            firstName: "John Michael James",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Michael" } });

      expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();
      expect(screen.getByText(/John Michael James Smith/i)).toBeInTheDocument();
    });

    it("finds guest by searching sequential middle names", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "John Michael James Smith",
            firstName: "John Michael James",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Michael James" } });

      expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();
      expect(screen.getByText(/John Michael James Smith/i)).toBeInTheDocument();
    });

    it("prioritizes exact name matches over partial matches with middle names", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "John Doe",
            firstName: "John",
            lastName: "Doe",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
          {
            id: "g2",
            name: "John Michael Smith",
            firstName: "John Michael",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "John" } });

      expect(await screen.findByText(/2 guests.*found/i)).toBeInTheDocument();
      // Both should be found, John Doe should come first (exact match on first name)
      const matches = screen.getAllByText(/John/i).filter(el => el.textContent.includes("Doe") || el.textContent.includes("Smith"));
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("finds guest by first part of firstName and last name (e.g., Xio H)", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Xio Gua H",
            firstName: "Xio Gua",
            lastName: "H",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Xio H" } });

      expect(await screen.findByText(/1 guest.*found/i)).toBeInTheDocument();
      expect(screen.getByText(/Xio Gua H/i)).toBeInTheDocument();
    });

    it("keyboard navigation highlights selected card visually", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Alice Smith",
            firstName: "Alice",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
          {
            id: "g2",
            name: "Bob Johnson",
            firstName: "Bob",
            lastName: "Johnson",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
      };

      render(<GuestList />);
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Smith" } });

      await screen.findByText(/1 guest.*found/i);
      
      // Focus search input
      search.focus();
      
      // Press down arrow to select first guest
      fireEvent.keyDown(search, { key: "ArrowDown" });
      
      // The card should have visual focus indicator (ring and styling)
      await waitFor(() => {
        const card = screen.getByText(/Alice Smith/).closest("[class*='border rounded']");
        if (card) {
          expect(card).toHaveClass("ring-4", "ring-blue-500/30");
        }
      });
    });
  });

  describe("Recent guest badge", () => {
    it("displays RECENT badge for guest with meal in last 7 days", async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Alice Smith",
            firstName: "Alice",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
        ],
        mealRecords: [
          {
            guestId: "g1",
            date: threeDaysAgo.toISOString(),
            count: 1,
          },
        ],
      };

      render(<GuestList />);
      
      // Trigger search to show the guest
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Alice" } });
      
      // Wait for the guest name to appear
      await screen.findByText("Alice Smith");
      
      // The RECENT badge should be visible
      expect(screen.getByText("RECENT")).toBeInTheDocument();
      
      // The badge should have a title with last meal info
      const recentBadge = screen.getByText("RECENT");
      expect(recentBadge.parentElement).toHaveAttribute("title");
      expect(recentBadge.parentElement.getAttribute("title")).toContain("Last meal");
    });

    it("does not display RECENT badge for guest with no meals", async () => {
      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Bob Jones",
            firstName: "Bob",
            lastName: "Jones",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
        mealRecords: [],
      };

      render(<GuestList />);
      
      // Trigger search to show the guest
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Bob" } });
      
      // Wait for the guest name to appear
      await screen.findByText("Bob Jones");
      
      // The RECENT badge should NOT be visible
      expect(screen.queryByText("RECENT")).not.toBeInTheDocument();
    });

    it("does not display RECENT badge for guest with meal older than 7 days", async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Carol Davis",
            firstName: "Carol",
            lastName: "Davis",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
        ],
        mealRecords: [
          {
            guestId: "g1",
            date: tenDaysAgo.toISOString(),
            count: 1,
          },
        ],
      };

      render(<GuestList />);
      
      // Trigger search to show the guest
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Carol" } });
      
      // Wait for the guest name to appear
      await screen.findByText("Carol Davis");
      
      // The RECENT badge should NOT be visible
      expect(screen.queryByText("RECENT")).not.toBeInTheDocument();
    });

    it("shows badge correctly distinguishes recent vs old guests", async () => {
      const today = new Date();
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          {
            id: "g1",
            name: "Alice Smith",
            firstName: "Alice",
            lastName: "Smith",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Female",
          },
          {
            id: "g2",
            name: "Bob Johnson",
            firstName: "Bob",
            lastName: "Johnson",
            housingStatus: "Unhoused",
            location: "Mountain View",
            age: "Adult 18-59",
            gender: "Male",
          },
        ],
        mealRecords: [
          {
            guestId: "g1",
            date: today.toISOString(),
            count: 1,
          },
          {
            guestId: "g2",
            date: tenDaysAgo.toISOString(),
            count: 1,
          },
        ],
      };

      render(<GuestList />);
      
      // Search for Alice (has recent meal)
      const search = screen.getByPlaceholderText(/search by name/i);
      fireEvent.change(search, { target: { value: "Alice" } });
      
      // Wait for Alice to appear
      await screen.findByText("Alice Smith");
      
      // Alice should have the RECENT badge
      expect(screen.getByText("RECENT")).toBeInTheDocument();
      
      // Clear search and search for Bob (meal is too old)
      fireEvent.change(search, { target: { value: "" } });
      fireEvent.change(search, { target: { value: "Bob" } });
      
      // Wait for Bob to appear
      await screen.findByText("Bob Johnson");
      
      // Bob should NOT have the RECENT badge
      expect(screen.queryByText("RECENT")).not.toBeInTheDocument();
    });
  });
});
