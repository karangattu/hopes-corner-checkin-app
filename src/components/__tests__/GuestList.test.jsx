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
    const user = userEvent.setup();
    render(<GuestList />);

    const search = screen.getByPlaceholderText(/search by name/i);
    await user.type(search, "Alex R");

    expect(
      await screen.findByText(/no guest found for "Alex R"/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create new guest/i }),
    ).toBeInTheDocument();
  });

  it("shows matched guests instead of create prompt when results exist", async () => {
    const user = userEvent.setup();
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
    await user.type(search, "Jane R");

    expect(await screen.findByText(/found 1 guest/i)).toBeInTheDocument();
    expect(screen.queryByText(/no guest found/i)).not.toBeInTheDocument();
  });

  it("filters guests by partial name match", async () => {
    const user = userEvent.setup();
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
    await user.type(search, "Doe");

    expect(await screen.findByText(/found 2 guests/i)).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
  });

  it("shows no results when search does not match", async () => {
    const user = userEvent.setup();
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" },
      ],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    await user.type(search, "Nonexistent");

    expect(await screen.findByText(/no guests found/i)).toBeInTheDocument();
  });

  it("clears search and shows all guests when search is empty", async () => {
    const user = userEvent.setup();
    mockContextValue = {
      ...createDefaultContext(),
      guests: [
        { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe" },
        { id: "g2", name: "Jane Smith", firstName: "Jane", lastName: "Smith" },
      ],
    };

    render(<GuestList />);
    const search = screen.getByPlaceholderText(/search by name/i);
    await user.type(search, "John");
    expect(await screen.findByText(/found 1 guest/i)).toBeInTheDocument();

    await user.clear(search);
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
    await user.type(search, "John");
    
    const guestCard = await screen.findByText("John Doe");
    await user.click(guestCard);

    const deleteButton = await screen.findByText(/delete/i);
    await user.click(deleteButton);

    expect(await screen.findByText("Delete Guest Profile?")).toBeInTheDocument();
    expect(screen.getByText(/This will permanently delete/)).toBeInTheDocument();
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
    await user.type(search, "John");
    
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
    await user.type(search, "John");
    
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
});
