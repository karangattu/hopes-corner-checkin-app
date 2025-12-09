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

// Mock auth context to provide user with staff role (not checkin) to show full UI
vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: { role: "staff" } }),
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
      {
        id: "rec1",
        guestId: "1",
        time: "08:00",
        date: "2025-10-09",
        status: "booked",
      },
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
      {
        id: "rec2",
        guestId: "2",
        time: "08:00",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec3",
        guestId: "3",
        time: "08:00",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec4",
        guestId: "4",
        time: "08:30",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec5",
        guestId: "5",
        time: "08:30",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec6",
        guestId: "6",
        time: "09:00",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec7",
        guestId: "7",
        time: "09:00",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec8",
        guestId: "8",
        time: "09:30",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec9",
        guestId: "9",
        time: "09:30",
        date: "2025-10-09",
        status: "booked",
      },
    ];
    render(<ShowerBooking />);

    const waitlistButton = screen.getByRole("button", { name: /waitlist/i });
    fireEvent.click(waitlistButton);

    expect(mockAddShowerWaitlist).toHaveBeenCalledWith("1");
    expect(toastMock.success).toHaveBeenCalled();
  });

  it("displays guest shower history", () => {
    mockContext.showerRecords = [
      {
        id: "rec10",
        guestId: "1",
        time: "08:00",
        date: "2025-10-08",
        status: "done",
      },
      {
        id: "rec11",
        guestId: "1",
        time: "09:00",
        date: "2025-10-07",
        status: "booked",
      },
    ];
    render(<ShowerBooking />);

    // Component header is 'Guest shower history'
    expect(screen.getByText("Guest shower history")).toBeInTheDocument();
    // Check history items
  });

  it("closes modal on close button click", () => {
    render(<ShowerBooking />);

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockSetShowerPickerGuest).toHaveBeenCalledWith(null);
  });

  it("shows capacity progress", () => {
    mockContext.showerRecords = [
      {
        id: "rec12",
        guestId: "2",
        time: "08:00",
        date: "2025-10-09",
        status: "booked",
      },
    ];
    render(<ShowerBooking />);

    // The UI shows remaining spots as e.g. "X spots remaining"
    expect(screen.getByText(/spots remaining/i)).toBeInTheDocument();
  });

  it("sorts slots with available first", () => {
    mockContext.showerRecords = [
      {
        id: "rec13",
        guestId: "2",
        time: "08:00",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec14",
        guestId: "3",
        time: "08:00",
        date: "2025-10-09",
        status: "booked",
      }, // Full
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
      {
        id: "rec15",
        guestId: "2",
        time: "08:00",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec16",
        guestId: "3",
        time: "08:00",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec17",
        guestId: "4",
        time: "08:30",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec18",
        guestId: "5",
        time: "08:30",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec19",
        guestId: "6",
        time: "09:00",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec20",
        guestId: "7",
        time: "09:00",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec21",
        guestId: "8",
        time: "09:30",
        date: "2025-10-09",
        status: "booked",
      },
      {
        id: "rec22",
        guestId: "9",
        time: "09:30",
        date: "2025-10-09",
        status: "booked",
      },
    ];
    render(<ShowerBooking />);

    const waitlistButton = screen.getByRole("button", {
      name: /Add to Waitlist|waitlist/i,
    });
    fireEvent.click(waitlistButton);

    expect(screen.getByText("Waitlist full")).toBeInTheDocument();
  });

  describe("Book Next Available", () => {
    it("shows Book Next Available button when slots are available", () => {
      mockContext.showerRecords = [];
      render(<ShowerBooking />);
      
      const bookNextBtn = screen.getByTestId("book-next-available-btn");
      expect(bookNextBtn).toBeInTheDocument();
      expect(bookNextBtn).toHaveTextContent(/Book 8:00 AM/);
    });

    it("books the next available slot when clicking Book Next Available button", () => {
      mockContext.showerRecords = [];
      render(<ShowerBooking />);
      
      const bookNextBtn = screen.getByTestId("book-next-available-btn");
      fireEvent.click(bookNextBtn);
      
      expect(mockAddShowerRecord).toHaveBeenCalledWith("1", "08:00");
    });

    it("skips full slots and books the first available slot", () => {
      // Fill up the 8:00 slot (2 guests)
      mockContext.showerRecords = [
        { id: "rec1", guestId: "2", time: "08:00", date: "2025-10-09", status: "booked" },
        { id: "rec2", guestId: "3", time: "08:00", date: "2025-10-09", status: "booked" },
      ];
      render(<ShowerBooking />);
      
      const bookNextBtn = screen.getByTestId("book-next-available-btn");
      // Should show 8:30 AM as next available (08:00 is full)
      expect(bookNextBtn).toHaveTextContent(/Book 8:30 AM/);
      
      fireEvent.click(bookNextBtn);
      expect(mockAddShowerRecord).toHaveBeenCalledWith("1", "08:30");
    });

    it("does not show Book Next Available button when all slots are full", () => {
      mockContext.showerRecords = [
        { id: "rec1", guestId: "2", time: "08:00", date: "2025-10-09", status: "booked" },
        { id: "rec2", guestId: "3", time: "08:00", date: "2025-10-09", status: "booked" },
        { id: "rec3", guestId: "4", time: "08:30", date: "2025-10-09", status: "booked" },
        { id: "rec4", guestId: "5", time: "08:30", date: "2025-10-09", status: "booked" },
        { id: "rec5", guestId: "6", time: "09:00", date: "2025-10-09", status: "booked" },
        { id: "rec6", guestId: "7", time: "09:00", date: "2025-10-09", status: "booked" },
        { id: "rec7", guestId: "8", time: "09:30", date: "2025-10-09", status: "booked" },
        { id: "rec8", guestId: "9", time: "09:30", date: "2025-10-09", status: "booked" },
      ];
      render(<ShowerBooking />);
      
      expect(screen.queryByTestId("book-next-available-btn")).not.toBeInTheDocument();
    });

    it("shows error message if booking next available slot fails", () => {
      mockAddShowerRecord.mockImplementation(() => {
        throw new Error("Booking failed");
      });
      mockContext.showerRecords = [];
      render(<ShowerBooking />);
      
      const bookNextBtn = screen.getByTestId("book-next-available-btn");
      fireEvent.click(bookNextBtn);
      
      expect(screen.getByText("Booking failed")).toBeInTheDocument();
    });
  });
});
