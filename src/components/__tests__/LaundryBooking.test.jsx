import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let mockContext = {
  laundryPickerGuest: { id: "1", name: "Alice" },
  setLaundryPickerGuest: vi.fn(),
  allLaundrySlots: ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5"],
  addLaundryRecord: vi.fn(),
  laundryRecords: [],
  laundrySlots: [],
  guests: [{ id: "1", name: "Alice" }],
  settings: { maxOnsiteLaundrySlots: 5 },
  blockedSlots: [],
  refreshServiceSlots: vi.fn(),
  LAUNDRY_STATUS: {
    WAITING: "waiting",
    WASHER: "washer",
    DRYER: "dryer",
    DONE: "done",
    PICKED_UP: "picked_up",
    PENDING: "pending",
    TRANSPORTED: "transported",
    RETURNED: "returned",
    OFFSITE_PICKED_UP: "offsite_picked_up",
    CANCELLED: "cancelled",
  },
};

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}));

vi.mock("../../utils/date", () => ({
  todayPacificDateString: vi.fn(() => "2025-10-09"),
  pacificDateStringFrom: vi.fn((date) => date),
}));

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: { role: "staff" } }),
}));

import LaundryBooking from "../LaundryBooking";

describe("LaundryBooking", () => {
  beforeEach(() => {
    mockContext.setLaundryPickerGuest = vi.fn();
    mockContext.addLaundryRecord = vi.fn();
    mockContext.refreshServiceSlots = vi.fn();
    mockContext.laundryPickerGuest = { id: "1", name: "Alice" };
    mockContext.laundryRecords = [];
    mockContext.laundrySlots = [];
    mockContext.blockedSlots = [];
    vi.clearAllMocks();
  });

  it("counts cancelled records towards onsite capacity", () => {
    mockContext.laundrySlots = [
      {
        id: "rec1",
        guestId: "2",
        laundryType: "onsite",
        status: "cancelled",
      },
    ];
    render(<LaundryBooking />);

    // onsiteCapacity is 5. 1 is taken by cancelled record.
    // The component shows "X slots remain today"
    expect(screen.getByText(/4 slots remain today/i)).toBeInTheDocument();
  });

  it("marks onsite as full if all slots are cancelled", () => {
    mockContext.laundrySlots = Array(5).fill(0).map((_, i) => ({
      id: `rec${i}`,
      guestId: `guest${i}`,
      laundryType: "onsite",
      status: "cancelled",
    }));
    
    render(<LaundryBooking />);

    expect(screen.getByText(/All on-site slots taken/i)).toBeInTheDocument();
  });

  describe("Blocked Slots", () => {
    it("excludes blocked slots from available laundry slots", () => {
      mockContext.blockedSlots = [
        { serviceType: "laundry", slotTime: "Slot 1", date: "2025-10-09" },
      ];
      render(<LaundryBooking />);

      // With 5 slots and 1 blocked, should only show 4 slot buttons
      // The slot grid shows each available slot
      const slotButtons = screen.getAllByRole("button", { name: /Slot \d/i });
      expect(slotButtons.length).toBe(4);
    });

    it("shows blocked slots count indicator", () => {
      mockContext.blockedSlots = [
        { serviceType: "laundry", slotTime: "Slot 1", date: "2025-10-09" },
        { serviceType: "laundry", slotTime: "Slot 2", date: "2025-10-09" },
      ];
      render(<LaundryBooking />);

      expect(screen.getByText(/2 slots blocked today/i)).toBeInTheDocument();
    });

    it("does not filter out blocked slots for other dates", () => {
      mockContext.blockedSlots = [
        { serviceType: "laundry", slotTime: "Slot 1", date: "2025-10-10" }, // Different date
      ];
      render(<LaundryBooking />);

      // All 5 slots should be available since the blocked slot is for a different date
      const slotButtons = screen.getAllByRole("button", { name: /Slot \d/i });
      expect(slotButtons.length).toBe(5);
    });

    it("does not filter out blocked shower slots", () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "Slot 1", date: "2025-10-09" }, // Shower, not laundry
      ];
      render(<LaundryBooking />);

      // All 5 laundry slots should be available since the blocked slot is for shower
      const slotButtons = screen.getAllByRole("button", { name: /Slot \d/i });
      expect(slotButtons.length).toBe(5);
    });

    it("calculates next available slot excluding blocked slots", () => {
      mockContext.blockedSlots = [
        { serviceType: "laundry", slotTime: "Slot 1", date: "2025-10-09" },
      ];
      mockContext.laundrySlots = [];
      render(<LaundryBooking />);

      // Next available should be Slot 2, not Slot 1 (which is blocked)
      // The component should show Slot 2 as the first available option
      expect(screen.queryByText("Slot 1")).not.toBeInTheDocument();
      expect(screen.getByText("Slot 2")).toBeInTheDocument();
    });
  });

  describe("Slot Refresh Functionality", () => {
    it("calls refreshServiceSlots with 'laundry' when modal opens", () => {
      const refreshSpy = vi.fn();
      mockContext.refreshServiceSlots = refreshSpy;

      render(<LaundryBooking />);

      // Should call refreshServiceSlots immediately when guest is selected
      expect(refreshSpy).toHaveBeenCalledWith("laundry");
      expect(refreshSpy).toHaveBeenCalledTimes(1);
    });

    it("does not call refreshServiceSlots when guest is null", () => {
      const refreshSpy = vi.fn();
      mockContext.refreshServiceSlots = refreshSpy;
      mockContext.laundryPickerGuest = null;

      render(<LaundryBooking />);

      // Should not call refreshServiceSlots when no guest is selected
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it("calls refreshServiceSlots again when a new guest is selected", () => {
      const refreshSpy = vi.fn();
      mockContext.refreshServiceSlots = refreshSpy;

      const { rerender } = render(<LaundryBooking />);
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      // Change the guest
      mockContext.laundryPickerGuest = { id: "2", name: "Bob" };
      rerender(<LaundryBooking />);

      // Should call refreshServiceSlots again with the new guest
      expect(refreshSpy).toHaveBeenCalledTimes(2);
      expect(refreshSpy).toHaveBeenCalledWith("laundry");
    });

    it("handles missing refreshServiceSlots gracefully", () => {
      mockContext.refreshServiceSlots = undefined;

      // Should not throw an error when refreshServiceSlots is undefined
      expect(() => render(<LaundryBooking />)).not.toThrow();
    });
  });
});
