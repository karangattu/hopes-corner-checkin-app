import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the date utilities
vi.mock("../../utils/date", () => ({
  todayPacificDateString: vi.fn(() => "2025-01-15"),
  pacificDateStringFrom: vi.fn((date) => {
    if (!date) return null;
    if (typeof date === "string" && date.includes("T")) {
      return date.split("T")[0];
    }
    return date;
  }),
}));

let mockContext = {
  showerRecords: [],
  laundryRecords: [],
  laundrySlots: [],
  allShowerSlots: ["08:00", "08:30", "09:00", "09:30", "10:00"],
  settings: { maxOnsiteLaundrySlots: 5 },
};

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

import ServiceStatusOverview from "../ServiceStatusOverview";

describe("ServiceStatusOverview", () => {
  beforeEach(() => {
    mockContext.showerRecords = [];
    mockContext.laundryRecords = [];
    mockContext.laundrySlots = [];
    mockContext.allShowerSlots = ["08:00", "08:30", "09:00", "09:30", "10:00"];
    mockContext.settings = { maxOnsiteLaundrySlots: 5 };
    vi.clearAllMocks();
  });

  it("renders the service availability header", () => {
    render(<ServiceStatusOverview />);
    expect(screen.getByText("Today's Service Availability")).toBeInTheDocument();
  });

  it("shows shower and laundry sections", () => {
    render(<ServiceStatusOverview />);
    expect(screen.getByText("Showers")).toBeInTheDocument();
    expect(screen.getByText("Laundry")).toBeInTheDocument();
  });

  it("displays correct shower capacity when empty", () => {
    render(<ServiceStatusOverview />);
    // 5 slots * 2 = 10 capacity, 0 booked
    expect(screen.getByText("0/10")).toBeInTheDocument();
    expect(screen.getByText("10 open")).toBeInTheDocument();
  });

  it("displays correct laundry capacity when empty", () => {
    render(<ServiceStatusOverview />);
    // maxOnsiteLaundrySlots = 5
    expect(screen.getByText("0/5")).toBeInTheDocument();
    expect(screen.getByText("5 open")).toBeInTheDocument();
  });

  it("updates shower capacity when bookings exist", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: "08:00",
        date: "2025-01-15T08:00:00Z",
        status: "booked",
      },
      {
        id: "shower-2",
        guestId: "guest-2",
        time: "08:00",
        date: "2025-01-15T08:00:00Z",
        status: "booked",
      },
      {
        id: "shower-3",
        guestId: "guest-3",
        time: "08:30",
        date: "2025-01-15T08:30:00Z",
        status: "done",
      },
    ];

    render(<ServiceStatusOverview />);

    // 3 booked out of 10
    expect(screen.getByText("3/10")).toBeInTheDocument();
    expect(screen.getByText("7 open")).toBeInTheDocument();
  });

  it("shows nearly full status when few slots remain", () => {
    // Fill up most slots (8 of 10)
    mockContext.showerRecords = Array.from({ length: 8 }, (_, i) => ({
      id: `shower-${i}`,
      guestId: `guest-${i}`,
      time: mockContext.allShowerSlots[i % 5],
      date: "2025-01-15T08:00:00Z",
      status: "booked",
    }));

    render(<ServiceStatusOverview />);

    // Should show "2 left" for nearly full
    expect(screen.getByText("2 left")).toBeInTheDocument();
  });

  it("shows full status when all slots taken", () => {
    // Fill all 10 slots (5 slots * 2)
    mockContext.showerRecords = Array.from({ length: 10 }, (_, i) => ({
      id: `shower-${i}`,
      guestId: `guest-${i}`,
      time: mockContext.allShowerSlots[Math.floor(i / 2)],
      date: "2025-01-15T08:00:00Z",
      status: "booked",
    }));

    render(<ServiceStatusOverview />);

    expect(screen.getByText("Full")).toBeInTheDocument();
  });

  it("counts waitlisted guests separately", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: null,
        date: "2025-01-15T08:00:00Z",
        status: "waitlisted",
      },
      {
        id: "shower-2",
        guestId: "guest-2",
        time: null,
        date: "2025-01-15T08:00:00Z",
        status: "waitlisted",
      },
    ];

    render(<ServiceStatusOverview />);

    // Waitlisted should not count toward capacity
    expect(screen.getByText("0/10")).toBeInTheDocument();
    expect(screen.getByText("Waitlist: 2")).toBeInTheDocument();
  });

  it("shows completed shower count", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: "08:00",
        date: "2025-01-15T08:00:00Z",
        status: "done",
      },
      {
        id: "shower-2",
        guestId: "guest-2",
        time: "08:30",
        date: "2025-01-15T08:30:00Z",
        status: "done",
      },
    ];

    render(<ServiceStatusOverview />);

    expect(screen.getByText("✓ 2 done")).toBeInTheDocument();
  });

  it("updates laundry capacity based on slots taken", () => {
    mockContext.laundrySlots = [
      { guestId: "guest-1", laundryType: "onsite" },
      { guestId: "guest-2", laundryType: "onsite" },
    ];
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        date: "2025-01-15T08:00:00Z",
        status: "waiting",
        laundryType: "onsite",
      },
      {
        id: "laundry-2",
        guestId: "guest-2",
        date: "2025-01-15T08:00:00Z",
        status: "washer",
        laundryType: "onsite",
      },
    ];

    render(<ServiceStatusOverview />);

    // 2 onsite slots taken out of 5
    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByText("3 open")).toBeInTheDocument();
  });

  it("counts picked_up laundry records towards the daily limit", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        date: "2025-01-15T08:00:00Z",
        status: "picked_up",
        laundryType: "onsite",
      },
      {
        id: "laundry-2",
        guestId: "guest-2",
        date: "2025-01-15T08:00:00Z",
        status: "done",
        laundryType: "onsite",
      },
    ];

    render(<ServiceStatusOverview />);

    // Both picked_up and done should count towards the 5 daily slots
    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByText("3 open")).toBeInTheDocument();
  });

  it("shows off-site laundry count", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        date: "2025-01-15T08:00:00Z",
        status: "pending",
        laundryType: "offsite",
      },
      {
        id: "laundry-2",
        guestId: "guest-2",
        date: "2025-01-15T08:00:00Z",
        status: "transported",
        laundryType: "offsite",
      },
    ];

    render(<ServiceStatusOverview />);

    expect(screen.getByText("Off-site: 2")).toBeInTheDocument();
  });

  it("shows laundry in progress count", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        date: "2025-01-15T08:00:00Z",
        status: "waiting",
        laundryType: "onsite",
      },
      {
        id: "laundry-2",
        guestId: "guest-2",
        date: "2025-01-15T08:00:00Z",
        status: "washer",
        laundryType: "onsite",
      },
      {
        id: "laundry-3",
        guestId: "guest-3",
        date: "2025-01-15T08:00:00Z",
        status: "dryer",
        laundryType: "onsite",
      },
    ];

    render(<ServiceStatusOverview />);

    expect(screen.getByText("In progress: 3")).toBeInTheDocument();
  });

  it("shows completed laundry count", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        date: "2025-01-15T08:00:00Z",
        status: "done",
        laundryType: "onsite",
      },
      {
        id: "laundry-2",
        guestId: "guest-2",
        date: "2025-01-15T08:00:00Z",
        status: "picked_up",
        laundryType: "onsite",
      },
    ];

    render(<ServiceStatusOverview />);

    // Find the second "done" indicator (first is for showers)
    const doneIndicators = screen.getAllByText(/✓ \d+ done/);
    expect(doneIndicators.some(el => el.textContent === "✓ 2 done")).toBeTruthy();
  });

  it("does not count records from other days", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: "08:00",
        date: "2025-01-14T08:00:00Z", // Yesterday
        status: "booked",
      },
    ];

    render(<ServiceStatusOverview />);

    // Should show 0 booked since yesterday's record shouldn't count
    expect(screen.getByText("0/10")).toBeInTheDocument();
  });

  it("shows slot availability for showers", () => {
    // Fill one slot completely (2 bookings)
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: "08:00",
        date: "2025-01-15T08:00:00Z",
        status: "booked",
      },
      {
        id: "shower-2",
        guestId: "guest-2",
        time: "08:00",
        date: "2025-01-15T08:00:00Z",
        status: "booked",
      },
    ];

    render(<ServiceStatusOverview />);

    // 1 slot full, 4 slots still have space
    expect(screen.getByText("Slots open: 4")).toBeInTheDocument();
  });

  it("handles missing settings gracefully", () => {
    mockContext.settings = null;

    render(<ServiceStatusOverview />);

    // Should default to 5 slots
    expect(screen.getByText("0/5")).toBeInTheDocument();
  });
});
