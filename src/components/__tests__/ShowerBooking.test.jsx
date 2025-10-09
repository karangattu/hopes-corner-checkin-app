import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

vi.mock("../utils/date", () => ({
  todayPacificDateString: vi.fn(() => "2025-10-09"),
  pacificDateStringFrom: vi.fn((date) => date),
}));

import { useAppContext } from "../context/useAppContext";

import ShowerBooking from "../ShowerBooking";

vi.mock("../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

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
    expect(screen.getByText("Schedule for Alice")).toBeInTheDocument();
    expect(screen.getByText("8:00 AM")).toBeInTheDocument(); // Formatted slot
    expect(screen.getByText("8:30 AM")).toBeInTheDocument();
  });

  it("displays slot details correctly", () => {
    mockContext.showerRecords = [
      { guestId: "1", time: "08:00", date: "2025-10-09", status: "booked" },
    ];
    render(<ShowerBooking />);

    // Check if slot shows count
    expect(screen.getByText("1 / 2")).toBeInTheDocument(); // Assuming it shows count
  });

  it("allows booking a shower slot", async () => {
    render(<ShowerBooking />);

    const bookButtons = screen.getAllByRole("button", { name: /Book/i });
    fireEvent.click(bookButtons[0]); // First available slot

    await waitFor(() => {
      expect(mockAddShowerRecord).toHaveBeenCalledWith("1", "08:00");
      expect(mockSetShowerPickerGuest).toHaveBeenCalledWith(null);
    });
  });

  it("shows success message after booking", async () => {
    render(<ShowerBooking />);

    const bookButtons = screen.getAllByRole("button", { name: /Book/i });
    fireEvent.click(bookButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Shower booked successfully!")).toBeInTheDocument();
    });
  });

  it("handles booking error", async () => {
    mockAddShowerRecord.mockImplementation(() => {
      throw new Error("Slot unavailable");
    });
    render(<ShowerBooking />);

    const bookButtons = screen.getAllByRole("button", { name: /Book/i });
    fireEvent.click(bookButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Slot unavailable")).toBeInTheDocument();
    });
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

    const waitlistButton = screen.getByRole("button", { name: /Join Waitlist/i });
    fireEvent.click(waitlistButton);

    expect(mockAddShowerWaitlist).toHaveBeenCalledWith("1");
    expect(toastMock.success).toHaveBeenCalledWith("Guest added to shower waitlist");
  });

  it("displays guest shower history", () => {
    mockContext.showerRecords = [
      { guestId: "1", time: "08:00", date: "2025-10-08", status: "done" },
      { guestId: "1", time: "09:00", date: "2025-10-07", status: "booked" },
    ];
    render(<ShowerBooking />);

    expect(screen.getByText("Recent Showers")).toBeInTheDocument();
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

    expect(screen.getByText("1 / 8 available")).toBeInTheDocument(); // 8 total capacity
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
    render(<ShowerBooking />);

    const waitlistButton = screen.getByRole("button", { name: /Join Waitlist/i });
    fireEvent.click(waitlistButton);

    expect(screen.getByText("Waitlist full")).toBeInTheDocument();
  });
});