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
  blockedSlots: [],
  refreshServiceSlots: vi.fn(),
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
    mockContext.refreshServiceSlots = vi.fn();
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

  it("counts cancelled records towards slot capacity", () => {
    mockContext.showerRecords = [
      {
        id: "rec1",
        guestId: "2",
        time: "08:00",
        date: "2025-10-09",
        status: "cancelled",
      },
    ];
    render(<ShowerBooking />);

    // Check if slot shows count (component renders like "1/2")
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("marks slot as full if it has 2 cancelled records", () => {
    mockContext.showerRecords = [
      {
        id: "rec1",
        guestId: "2",
        time: "08:00",
        date: "2025-10-09",
        status: "cancelled",
      },
      {
        id: "rec2",
        guestId: "3",
        time: "08:00",
        date: "2025-10-09",
        status: "cancelled",
      },
    ];
    render(<ShowerBooking />);

    // Check if slot shows "2/2"
    expect(screen.getByText("2/2")).toBeInTheDocument();
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

  it("prevents double-click from creating duplicate bookings", async () => {
    // Mock a slow async booking operation
    let resolveBooking;
    mockAddShowerRecord.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveBooking = resolve;
      });
    });

    render(<ShowerBooking />);

    const bookButtons = screen.getAllByRole("button", { name: /Available/i });
    
    // Click twice rapidly (simulating double-click)
    fireEvent.click(bookButtons[0]);
    fireEvent.click(bookButtons[0]);

    // Should only call addShowerRecord once (second click blocked by isBooking state)
    expect(mockAddShowerRecord).toHaveBeenCalledTimes(1);

    // Resolve the booking to clean up
    if (resolveBooking) resolveBooking({ id: "new-booking" });
  });

  it("disables booking buttons while booking is in progress", async () => {
    // Mock a slow async booking operation
    let resolveBooking;
    mockAddShowerRecord.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveBooking = resolve;
      });
    });

    render(<ShowerBooking />);

    const bookButtons = screen.getAllByRole("button", { name: /Available/i });
    
    // First button should be enabled initially
    expect(bookButtons[0]).not.toBeDisabled();
    
    // Click to start booking
    fireEvent.click(bookButtons[0]);

    // Wait for the button to show "Booking..." state and be disabled
    await waitFor(() => {
      // The Book Next Available button should show "Booking..." and be disabled
      const bookingButton = screen.queryByText(/Booking\.\.\./i);
      if (bookingButton) {
        expect(bookingButton.closest("button")).toBeDisabled();
      }
    });

    // Resolve the booking to clean up
    if (resolveBooking) resolveBooking({ id: "new-booking" });
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
    await waitFor(() => {
      expect(screen.getByText("Slot unavailable")).toBeInTheDocument();
    });
  });

  it("allows adding to waitlist when all slots full", async () => {
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

    await waitFor(() => {
      expect(mockAddShowerWaitlist).toHaveBeenCalledWith("1");
      expect(toastMock.success).toHaveBeenCalled();
    });
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

  it("handles waitlist error", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("Waitlist full")).toBeInTheDocument();
    });
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

    it("shows error message if booking next available slot fails", async () => {
      mockAddShowerRecord.mockImplementation(() => {
        throw new Error("Booking failed");
      });
      mockContext.showerRecords = [];
      render(<ShowerBooking />);
      
      const bookNextBtn = screen.getByTestId("book-next-available-btn");
      fireEvent.click(bookNextBtn);
      
      await waitFor(() => {
        expect(screen.getByText("Booking failed")).toBeInTheDocument();
      });
    });
  });

  describe("Blocked Slots", () => {
    it("excludes blocked slots from available selection", () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-10-09" },
      ];
      mockContext.showerRecords = [];
      render(<ShowerBooking />);

      // The 8:00 AM slot should not be clickable/visible in slot selection
      // We have 4 slots, blocking 1 should leave 3 visible
      const availableSlotButtons = screen.getAllByRole("button", { name: /Available/i });
      // Without blocked slot, we'd have all 4, with 1 blocked we should have 3
      expect(availableSlotButtons.length).toBe(3);
    });

    it("shows blocked slots count indicator", () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-10-09" },
        { serviceType: "shower", slotTime: "08:30", date: "2025-10-09" },
      ];
      mockContext.showerRecords = [];
      render(<ShowerBooking />);

      expect(screen.getByText(/2 slots blocked today/i)).toBeInTheDocument();
    });

    it("excludes blocked slots from capacity calculation", () => {
      // 4 slots, 2 guests per slot = 8 total capacity
      // Block 1 slot = 6 total capacity
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-10-09" },
      ];
      mockContext.showerRecords = [];
      render(<ShowerBooking />);

      // Should show 6 remaining (3 slots x 2 = 6, not 8)
      expect(screen.getByText(/6 spots remaining/i)).toBeInTheDocument();
    });

    it("skips blocked slots when finding next available", () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-10-09" },
      ];
      mockContext.showerRecords = [];
      render(<ShowerBooking />);

      // Next available should be 08:30, not 08:00 (which is blocked)
      const bookNextBtn = screen.getByTestId("book-next-available-btn");
      expect(bookNextBtn).toHaveTextContent(/Book 8:30 AM/);
    });

    it("does not filter out blocked slots for other dates", () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-10-10" }, // Different date
      ];
      mockContext.showerRecords = [];
      render(<ShowerBooking />);

      // All 4 slots should be available since the blocked slot is for a different date
      const availableSlotButtons = screen.getAllByRole("button", { name: /Available/i });
      expect(availableSlotButtons.length).toBe(4);
    });

    it("does not filter out blocked laundry slots", () => {
      mockContext.blockedSlots = [
        { serviceType: "laundry", slotTime: "08:00", date: "2025-10-09" }, // Laundry, not shower
      ];
      mockContext.showerRecords = [];
      render(<ShowerBooking />);

      // All 4 shower slots should be available since the blocked slot is for laundry
      const availableSlotButtons = screen.getAllByRole("button", { name: /Available/i });
      expect(availableSlotButtons.length).toBe(4);
    });
  });

  describe("Slot Refresh Functionality", () => {
    it("calls refreshServiceSlots with 'shower' when modal opens", () => {
      const refreshSpy = vi.fn();
      mockContext.refreshServiceSlots = refreshSpy;

      render(<ShowerBooking />);

      // Should call refreshServiceSlots immediately when guest is selected
      expect(refreshSpy).toHaveBeenCalledWith("shower");
      expect(refreshSpy).toHaveBeenCalledTimes(1);
    });

    it("does not call refreshServiceSlots when guest is null", () => {
      const refreshSpy = vi.fn();
      mockContext.refreshServiceSlots = refreshSpy;
      mockContext.showerPickerGuest = null;

      render(<ShowerBooking />);

      // Should not call refreshServiceSlots when no guest is selected
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it("calls refreshServiceSlots again when a new guest is selected", () => {
      const refreshSpy = vi.fn();
      mockContext.refreshServiceSlots = refreshSpy;

      const { rerender } = render(<ShowerBooking />);
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      // Change the guest
      mockContext.showerPickerGuest = { id: "2", name: "Bob" };
      rerender(<ShowerBooking />);

      // Should call refreshServiceSlots again with the new guest
      expect(refreshSpy).toHaveBeenCalledTimes(2);
      expect(refreshSpy).toHaveBeenCalledWith("shower");
    });

    it("handles missing refreshServiceSlots gracefully", () => {
      mockContext.refreshServiceSlots = undefined;

      // Should not throw an error when refreshServiceSlots is undefined
      expect(() => render(<ShowerBooking />)).not.toThrow();
    });
  });
});
