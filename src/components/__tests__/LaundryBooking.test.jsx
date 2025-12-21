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
    mockContext.laundryPickerGuest = { id: "1", name: "Alice" };
    mockContext.laundryRecords = [];
    mockContext.laundrySlots = [];
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
});
