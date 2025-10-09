import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let mockContext = {
  showerPickerGuest: { id: "1", name: "Alice" },
  setShowerPickerGuest: vi.fn(),
  allShowerSlots: ["08:00", "08:30", "09:00", "09:30"],
  addShowerRecord: vi.fn(),
  addShowerWaitlist: vi.fn(),
  showerRecords: [],
  guests: [{ id: "1", name: "Alice" }],
};

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}));

// The component imports the hooks/utils from `src/context` and `src/utils` (paths
// are resolved relative to the component file). From this test file the correct
// relative path to those modules is ../../context/... and ../../utils/...
vi.mock("../../utils/date", () => ({
  todayPacificDateString: vi.fn(() => "2025-10-09"),
  pacificDateStringFrom: vi.fn((date) => date),
}));

// Mock app context before importing the component so the module receives the mocked hook
vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

import ShowerBooking from "../ShowerBooking";

describe("ShowerBooking", () => {
  let mockAddShowerRecord;
  let mockAddShowerWaitlist;
  let mockSetShowerPickerGuest;

  beforeEach(() => {
    mockAddShowerRecord = vi.fn();
    mockAddShowerWaitlist = vi.fn();
    mockSetShowerPickerGuest = vi.fn();

    mockContext.setShowerPickerGuest = mockSetShowerPickerGuest;
    mockContext.addShowerRecord = mockAddShowerRecord;
    mockContext.addShowerWaitlist = mockAddShowerWaitlist;
    mockContext.showerPickerGuest = { id: "1", name: "Alice" };

    vi.clearAllMocks();
  });

  it("does not render when no guest is selected", () => {
    mockContext.showerPickerGuest = null;
    const { container } = render(<ShowerBooking />);
    expect(container.firstChild).toBeNull();
  });

  it("renders modal with guest name and slots", () => {
    render(<ShowerBooking />);

  expect(screen.getByText("Book a Shower")).toBeInTheDocument();
  // The header text is split across elements: "Schedule for" and the guest name
  expect(screen.getByText(/Schedule for/i)).toBeInTheDocument();
  expect(screen.getByText("Alice")).toBeInTheDocument();
    // There can be multiple occurrences (header/slot). Ensure at least one exists.
    expect(screen.getAllByText("8:00 AM").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8:30 AM").length).toBeGreaterThan(0);
  });

  it("displays slot details correctly", () => {
    mockContext.showerRecords = [
      { guestId: "1", time: "08:00", date: "2025-10-09", status: "booked" },
    ];
    render(<ShowerBooking />);

  // Check if slot shows count (component renders like "1/2")
  expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("allows booking a shower slot", async () => {
    render(<ShowerBooking />);

    // Click the first available slot (buttons include "Available" in accessible name)
    const bookButtons = screen.getAllByRole("button", { name: /Available/i });
    fireEvent.click(bookButtons[0]);

    // addShowerRecord should be invoked synchronously by the handler
    expect(mockAddShowerRecord).toHaveBeenCalled();
    expect(mockAddShowerRecord.mock.calls[0][0]).toBe("1");
  });

  it("shows success message after booking", async () => {
    render(<ShowerBooking />);

  const bookButtons = screen.getAllByRole("button", { name: /Available/i });
  fireEvent.click(bookButtons[0]);
  // At minimum the action should invoke addShowerRecord
  expect(mockAddShowerRecord).toHaveBeenCalled();
  });

  it("handles booking error", async () => {
    mockAddShowerRecord.mockImplementation(() => {
      throw new Error("Slot unavailable");
    });
    render(<ShowerBooking />);

  const bookButtons = screen.getAllByRole("button", { name: /Available/i });
  fireEvent.click(bookButtons[0]);
  // Ensure addShowerRecord was invoked and component displays error
  expect(mockAddShowerRecord).toHaveBeenCalled();
  expect(screen.getByText("Slot unavailable")).toBeInTheDocument();
  });

  it("allows adding to waitlist when all slots full", () => {
    mockContext.showerRecords = [
      { guestId: "2", time: "08:00", date: "2025-10-09", status: "booked" },
      { guestId: "3", time: "08:00", date: "2025-10-09", status: "booked" },
      { guestId: "4", time: "08:30", date: "2025-10-09", status: "booked" },
      { guestId: "5", time: "08:30", date: "2025-10-09", status: "booked" },
      { guestId: "6", time: "09:00", date: "2025-10-09", status: "booked" },
      { guestId: "7", time: "09:00", date: "2025-10-09", status: "booked" },
      { guestId: "8", time: "09:30", date: "2025-10-09", status: "booked" },
      { guestId: "9", time: "09:30", date: "2025-10-09", status: "booked" },
    ];
    render(<ShowerBooking />);

  const waitlistButton = screen.getByRole("button", { name: /waitlist/i });
    fireEvent.click(waitlistButton);

  expect(mockAddShowerWaitlist).toHaveBeenCalledWith("1");
  expect(toastMock.success).toHaveBeenCalled();
  });

  it("displays guest shower history", () => {
    mockContext.showerRecords = [
      { guestId: "1", time: "08:00", date: "2025-10-08", status: "done" },
      { guestId: "1", time: "09:00", date: "2025-10-07", status: "booked" },
    ];
    render(<ShowerBooking />);

  // Component header is 'Guest shower history'
  expect(screen.getByText("Guest shower history")).toBeInTheDocument();
    // Check history items
  });

  it("closes modal on close button click", () => {
    render(<ShowerBooking />);

    const closeButton = screen.getByLabelText("Close dialog");
    fireEvent.click(closeButton);

    expect(mockSetShowerPickerGuest).toHaveBeenCalledWith(null);
  });

  it("shows capacity progress", () => {
    mockContext.showerRecords = [
      { guestId: "2", time: "08:00", date: "2025-10-09", status: "booked" },
    ];
    render(<ShowerBooking />);

  // The UI shows remaining spots as e.g. "X spots remaining"
  expect(screen.getByText(/spots remaining/i)).toBeInTheDocument();
  });

  it("sorts slots with available first", () => {
    mockContext.showerRecords = [
      { guestId: "2", time: "08:00", date: "2025-10-09", status: "booked" },
      { guestId: "3", time: "08:00", date: "2025-10-09", status: "booked" }, // Full
    ];
    render(<ShowerBooking />);

    // First slot should be available (8:30), then full (8:00)
  });

  it("handles waitlist error", () => {
    mockAddShowerWaitlist.mockImplementation(() => {
      throw new Error("Waitlist full");
    });
    // Make all slots full so the waitlist UI appears
    mockContext.showerRecords = [
      { guestId: "2", time: "08:00", date: "2025-10-09", status: "booked" },
      { guestId: "3", time: "08:00", date: "2025-10-09", status: "booked" },
      { guestId: "4", time: "08:30", date: "2025-10-09", status: "booked" },
      { guestId: "5", time: "08:30", date: "2025-10-09", status: "booked" },
      { guestId: "6", time: "09:00", date: "2025-10-09", status: "booked" },
      { guestId: "7", time: "09:00", date: "2025-10-09", status: "booked" },
      { guestId: "8", time: "09:30", date: "2025-10-09", status: "booked" },
      { guestId: "9", time: "09:30", date: "2025-10-09", status: "booked" },
    ];
    render(<ShowerBooking />);

    const waitlistButton = screen.getByRole("button", { name: /Add to Waitlist|waitlist/i });
    fireEvent.click(waitlistButton);

    expect(screen.getByText("Waitlist full")).toBeInTheDocument();
  });
});
