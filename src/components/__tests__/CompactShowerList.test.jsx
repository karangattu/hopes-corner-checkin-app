import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock the date utilities
vi.mock("../../utils/date", () => ({
  todayPacificDateString: vi.fn(() => "2025-01-15"),
  pacificDateStringFrom: vi.fn((date) => {
    if (!date) return null;
    // Simple mock: return the date part if ISO string
    if (typeof date === "string" && date.includes("T")) {
      return date.split("T")[0];
    }
    return date;
  }),
}));

let mockContext = {
  showerRecords: [],
  guests: [],
  allShowerSlots: ["08:00", "08:30", "09:00", "09:30", "10:00"],
};

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

import CompactShowerList from "../CompactShowerList";

describe("CompactShowerList", () => {
  beforeEach(() => {
    // Reset mock context before each test
    mockContext.showerRecords = [];
    mockContext.guests = [
      { id: "guest-1", name: "John Doe" },
      { id: "guest-2", name: "Jane Smith" },
      { id: "guest-3", name: "Bob Wilson" },
    ];
    mockContext.allShowerSlots = ["08:00", "08:30", "09:00", "09:30", "10:00"];
    vi.clearAllMocks();
  });

  it("renders empty state when no bookings exist", () => {
    render(<CompactShowerList />);
    expect(screen.getByText("Showers Today")).toBeInTheDocument();
    expect(screen.getByText("No shower bookings yet today")).toBeInTheDocument();
  });

  it("displays shower bookings for today", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: "08:00",
        date: "2025-01-15T08:00:00Z",
        status: "booked",
        createdAt: "2025-01-15T07:00:00Z",
      },
      {
        id: "shower-2",
        guestId: "guest-2",
        time: "08:30",
        date: "2025-01-15T08:30:00Z",
        status: "done",
        createdAt: "2025-01-15T07:05:00Z",
      },
    ];

    render(<CompactShowerList />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Booked")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows capacity indicator correctly", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: "08:00",
        date: "2025-01-15T08:00:00Z",
        status: "booked",
        createdAt: "2025-01-15T07:00:00Z",
      },
    ];

    render(<CompactShowerList />);

    // 5 slots * 2 capacity = 10 total, 1 booked
    expect(screen.getByText("1/10")).toBeInTheDocument();
  });

  it("sorts bookings by time slot, then by createdAt within same slot", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-2",
        time: "08:00",
        date: "2025-01-15T08:00:00Z",
        status: "booked",
        createdAt: "2025-01-15T07:10:00Z", // Later creation
      },
      {
        id: "shower-2",
        guestId: "guest-1",
        time: "08:00",
        date: "2025-01-15T08:00:00Z",
        status: "booked",
        createdAt: "2025-01-15T07:00:00Z", // Earlier creation (should appear first)
      },
      {
        id: "shower-3",
        guestId: "guest-3",
        time: "09:00",
        date: "2025-01-15T09:00:00Z",
        status: "booked",
        createdAt: "2025-01-15T07:05:00Z",
      },
    ];

    render(<CompactShowerList />);

    const names = screen.getAllByText(/Doe|Smith|Wilson/);
    // First two should be in 8:00 slot (John first due to earlier createdAt)
    // Third should be Bob in 9:00 slot
    expect(names[0]).toHaveTextContent("John Doe");
    expect(names[1]).toHaveTextContent("Jane Smith");
    expect(names[2]).toHaveTextContent("Bob Wilson");
  });

  it("shows waitlist section when waitlisted guests exist", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: null,
        date: "2025-01-15T08:00:00Z",
        status: "waitlisted",
        createdAt: "2025-01-15T07:00:00Z",
      },
    ];

    render(<CompactShowerList />);

    expect(screen.getByText("Waitlist (1)")).toBeInTheDocument();
  });

  it("expands waitlist when clicked", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: null,
        date: "2025-01-15T08:00:00Z",
        status: "waitlisted",
        createdAt: "2025-01-15T07:00:00Z",
      },
    ];

    render(<CompactShowerList />);

    const waitlistButton = screen.getByText("Waitlist (1)");
    fireEvent.click(waitlistButton);

    // After expanding, should show the guest name
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("orders waitlist by registration time", () => {
    mockContext.showerRecords = [
      {
        id: "shower-2",
        guestId: "guest-2",
        time: null,
        date: "2025-01-15T08:00:00Z",
        status: "waitlisted",
        createdAt: "2025-01-15T07:30:00Z", // Second to register
      },
      {
        id: "shower-1",
        guestId: "guest-1",
        time: null,
        date: "2025-01-15T08:00:00Z",
        status: "waitlisted",
        createdAt: "2025-01-15T07:00:00Z", // First to register
      },
    ];

    render(<CompactShowerList />);

    const waitlistButton = screen.getByText("Waitlist (2)");
    fireEvent.click(waitlistButton);

    // John should be #1 (registered first), Jane should be #2
    const positions = screen.getAllByText(/#\d/);
    expect(positions[0]).toHaveTextContent("#1");
    expect(positions[1]).toHaveTextContent("#2");
  });

  it("does not show records from other days", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: "08:00",
        date: "2025-01-14T08:00:00Z", // Yesterday
        status: "booked",
        createdAt: "2025-01-14T07:00:00Z",
      },
    ];

    render(<CompactShowerList />);

    expect(screen.getByText("No shower bookings yet today")).toBeInTheDocument();
  });

  it("shows Quick View label", () => {
    render(<CompactShowerList />);
    expect(screen.getByText("Quick View")).toBeInTheDocument();
  });
});
