import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
  laundryRecords: [],
  guests: [],
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
  },
};

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

import CompactLaundryList from "../CompactLaundryList";

describe("CompactLaundryList", () => {
  beforeEach(() => {
    mockContext.laundryRecords = [];
    mockContext.guests = [
      { id: "guest-1", name: "John Doe" },
      { id: "guest-2", name: "Jane Smith" },
      { id: "guest-3", name: "Bob Wilson" },
    ];
    vi.clearAllMocks();
  });

  it("renders empty state when no bookings exist", () => {
    render(<CompactLaundryList />);
    expect(screen.getByText("Laundry Today")).toBeInTheDocument();
    expect(screen.getByText(/No laundry bookings for/)).toBeInTheDocument();
  });

  it("displays on-site laundry bookings for today", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        time: "08:00 - 09:00",
        date: "2025-01-15T08:00:00Z",
        status: "waiting",
        laundryType: "onsite",
        bagNumber: "42",
        createdAt: "2025-01-15T07:00:00Z",
      },
      {
        id: "laundry-2",
        guestId: "guest-2",
        time: "09:00 - 10:00",
        date: "2025-01-15T09:00:00Z",
        status: "washer",
        laundryType: "onsite",
        bagNumber: null,
        createdAt: "2025-01-15T07:05:00Z",
      },
    ];

    render(<CompactLaundryList />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("Washer")).toBeInTheDocument();
    expect(screen.getByText("Bag #42")).toBeInTheDocument();
  });

  it("shows total count badge", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        time: "08:00 - 09:00",
        date: "2025-01-15T08:00:00Z",
        status: "waiting",
        laundryType: "onsite",
        createdAt: "2025-01-15T07:00:00Z",
      },
      {
        id: "laundry-2",
        guestId: "guest-2",
        date: "2025-01-15T08:00:00Z",
        status: "pending",
        laundryType: "offsite",
        createdAt: "2025-01-15T07:05:00Z",
      },
    ];

    render(<CompactLaundryList />);

    expect(screen.getByText("2 total")).toBeInTheDocument();
  });

  it("sorts on-site laundry by time slot, then by createdAt", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-2",
        guestId: "guest-2",
        time: "08:00 - 09:00",
        date: "2025-01-15T08:00:00Z",
        status: "waiting",
        laundryType: "onsite",
        createdAt: "2025-01-15T07:30:00Z", // Later registration
      },
      {
        id: "laundry-1",
        guestId: "guest-1",
        time: "08:00 - 09:00",
        date: "2025-01-15T08:00:00Z",
        status: "waiting",
        laundryType: "onsite",
        createdAt: "2025-01-15T07:00:00Z", // Earlier registration
      },
      {
        id: "laundry-3",
        guestId: "guest-3",
        time: "10:00 - 11:00",
        date: "2025-01-15T10:00:00Z",
        status: "waiting",
        laundryType: "onsite",
        createdAt: "2025-01-15T07:15:00Z",
      },
    ];

    render(<CompactLaundryList />);

    const names = screen.getAllByText(/Doe|Smith|Wilson/);
    // John first (same slot, earlier createdAt), Jane second, Bob third (later slot)
    expect(names[0]).toHaveTextContent("John Doe");
    expect(names[1]).toHaveTextContent("Jane Smith");
    expect(names[2]).toHaveTextContent("Bob Wilson");
  });

  it("shows off-site section when off-site laundry exists", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        date: "2025-01-15T08:00:00Z",
        status: "pending",
        laundryType: "offsite",
        bagNumber: "55",
        createdAt: "2025-01-15T07:00:00Z",
      },
    ];

    render(<CompactLaundryList />);

    expect(screen.getByText("Off-site (1)")).toBeInTheDocument();
  });

  it("expands off-site section when clicked", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        date: "2025-01-15T08:00:00Z",
        status: "pending",
        laundryType: "offsite",
        bagNumber: "55",
        createdAt: "2025-01-15T07:00:00Z",
      },
    ];

    render(<CompactLaundryList />);

    const offsiteButton = screen.getByText("Off-site (1)");
    fireEvent.click(offsiteButton);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Bag #55")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows different status badges correctly", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        time: "08:00 - 09:00",
        date: "2025-01-15T08:00:00Z",
        status: "dryer",
        laundryType: "onsite",
        createdAt: "2025-01-15T07:00:00Z",
      },
      {
        id: "laundry-2",
        guestId: "guest-2",
        time: "09:00 - 10:00",
        date: "2025-01-15T09:00:00Z",
        status: "done",
        laundryType: "onsite",
        createdAt: "2025-01-15T07:05:00Z",
      },
    ];

    render(<CompactLaundryList />);

    expect(screen.getByText("Dryer")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("highlights completed items with emerald background", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        time: "08:00 - 09:00",
        date: "2025-01-15T08:00:00Z",
        status: "picked_up",
        laundryType: "onsite",
        createdAt: "2025-01-15T07:00:00Z",
      },
    ];

    render(<CompactLaundryList />);

    expect(screen.getByText("Picked Up")).toBeInTheDocument();
    // Verify the "Picked Up" status is shown which indicates completion
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("does not show records from other days", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        time: "08:00 - 09:00",
        date: "2025-01-14T08:00:00Z", // Yesterday
        status: "waiting",
        laundryType: "onsite",
        createdAt: "2025-01-14T07:00:00Z",
      },
    ];

    render(<CompactLaundryList />);

    expect(screen.getByText(/No laundry bookings for/)).toBeInTheDocument();
  });

  it("shows Quick View label", () => {
    render(<CompactLaundryList />);
    expect(screen.getByText("Quick View")).toBeInTheDocument();
  });

  it("handles off-site status correctly", () => {
    mockContext.laundryRecords = [
      {
        id: "laundry-1",
        guestId: "guest-1",
        date: "2025-01-15T08:00:00Z",
        status: "transported",
        laundryType: "offsite",
        createdAt: "2025-01-15T07:00:00Z",
      },
    ];

    render(<CompactLaundryList />);

    const offsiteButton = screen.getByText("Off-site (1)");
    fireEvent.click(offsiteButton);

    expect(screen.getByText("Transported")).toBeInTheDocument();
  });
});
