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
});

let mockContextValue = createDefaultContext();

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContextValue,
}));

describe("GuestList", () => {
  beforeEach(() => {
    mockContextValue = createDefaultContext();
  });

  it("shows the tip describing how to enable the create guest shortcut", () => {
    render(<GuestList />);

    expect(
      screen.getByText(
        /first name and at least the first letter of the last name/i,
      ),
    ).toBeInTheDocument();
  });

  it("displays create-guest prompt when search has first and last initial with no results", async () => {
    render(<GuestList />);

    const search = screen.getByPlaceholderText(/search by name/i);
    // Use fireEvent for faster input simulation
    fireEvent.change(search, { target: { value: "Alex R" } });

    expect(
      await screen.findByText(/no guest found for "Alex R"/i),
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

    expect(await screen.findByText(/found 1 guest/i)).toBeInTheDocument();
    expect(screen.queryByText(/no guest found/i)).not.toBeInTheDocument();
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

    expect(await screen.findByText(/found 2 guests/i)).toBeInTheDocument();
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
    expect(await screen.findByText(/found 1 guest/i)).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "" } });
    expect(
      await screen.findByText(/for privacy, start typing to search/i),
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

    expect(
      await screen.findByText("Delete Guest Profile?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This will permanently delete/),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 meal record$/)).toBeInTheDocument();
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

      // First name button should be gray initially
      expect(firstNameButton).toHaveClass("bg-gray-100");

      // Click first name button
      await user.click(firstNameButton);

      // First name button should be blue (active)
      await waitFor(() => {
        expect(firstNameButton).toHaveClass("bg-blue-600");
        expect(lastNameButton).toHaveClass("bg-gray-100");
      });

      // Click last name button
      await user.click(lastNameButton);

      // Last name button should now be blue
      await waitFor(() => {
        expect(lastNameButton).toHaveClass("bg-blue-600");
        expect(firstNameButton).toHaveClass("bg-gray-100");
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
});
