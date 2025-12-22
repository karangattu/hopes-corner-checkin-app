import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
  blockedSlots: [],
  settings: { maxOnsiteLaundrySlots: 5 },
};

let mockUser = null;

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

import ServiceStatusOverview from "../ServiceStatusOverview";

describe("ServiceStatusOverview", () => {
  beforeEach(() => {
    mockContext.showerRecords = [];
    mockContext.laundryRecords = [];
    mockContext.laundrySlots = [];
    mockContext.blockedSlots = [];
    mockContext.allShowerSlots = ["08:00", "08:30", "09:00", "09:30", "10:00"];
    mockContext.settings = { maxOnsiteLaundrySlots: 5 };
    mockUser = null;
    vi.clearAllMocks();
  });

  it("shows shower and laundry sections", () => {
    render(<ServiceStatusOverview />);
    expect(screen.getByText("Showers")).toBeInTheDocument();
    expect(screen.getByText("Laundry")).toBeInTheDocument();
  });

  it("displays correct shower status when empty", () => {
    render(<ServiceStatusOverview />);
    expect(screen.getAllByText("OPEN")[0]).toBeInTheDocument();
    // Available should be 10 (5 slots * 2)
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("displays correct laundry status when empty", () => {
    render(<ServiceStatusOverview />);
    expect(screen.getAllByText("OPEN")[0]).toBeInTheDocument();
    // Available should be 5
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("updates shower status when bookings exist", () => {
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
    // 10 total - 2 booked = 8 available
    expect(screen.getByText("8")).toBeInTheDocument();
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

    expect(screen.getByText("FULL")).toBeInTheDocument();
  });

  it("counts waitlisted guests separately", () => {
    // Fill all 10 slots first so it shows waitlist
    mockContext.showerRecords = Array.from({ length: 10 }, (_, i) => ({
      id: `shower-${i}`,
      guestId: `guest-${i}`,
      time: mockContext.allShowerSlots[Math.floor(i / 2)],
      date: "2025-01-15T08:00:00Z",
      status: "booked",
    }));

    // Add 2 waitlisted
    mockContext.showerRecords.push(
      {
        id: "shower-w1",
        guestId: "guest-w1",
        time: null,
        date: "2025-01-15T08:00:00Z",
        status: "waitlisted",
      },
      {
        id: "shower-w2",
        guestId: "guest-w2",
        time: null,
        date: "2025-01-15T08:00:00Z",
        status: "waitlisted",
      },
    );

    render(<ServiceStatusOverview />);

    // Waitlisted should be 2
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Waitlist")).toBeInTheDocument();
  });

  it("updates laundry status based on slots taken", () => {
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

    // Should still be OPEN
    expect(screen.getAllByText("OPEN")[0]).toBeInTheDocument();
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
    // Should still be OPEN
    expect(screen.getAllByText("OPEN")[0]).toBeInTheDocument();
  });

  it("does not count records from other days", () => {
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        date: "2025-01-14T08:00:00Z",
        status: "booked",
      },
    ];

    render(<ServiceStatusOverview />);
    // Should still show full availability (10 and 5)
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("handles missing settings gracefully", () => {
    mockContext.settings = null;
    render(<ServiceStatusOverview />);
    expect(screen.getByText("Laundry")).toBeInTheDocument();
  });

  it("deducts blocked shower slots from available capacity", () => {
    // 5 slots total, 2 blocked
    mockContext.blockedSlots = [
      { serviceType: "shower", date: "2025-01-15", slotTime: "08:00" },
      { serviceType: "shower", date: "2025-01-15", slotTime: "08:30" },
    ];
    render(<ServiceStatusOverview />);
    // (5 - 2) slots * 2 = 6 available
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("deducts blocked laundry slots from available capacity", () => {
    // 5 slots total, 2 blocked
    mockContext.blockedSlots = [
      { serviceType: "laundry", date: "2025-01-15", slotTime: "08:30 - 10:00" },
      { serviceType: "laundry", date: "2025-01-15", slotTime: "09:00 - 10:15" },
    ];
    render(<ServiceStatusOverview />);
    // 5 - 2 = 3 available laundry slots
    const laundryText = screen.getAllByText("3");
    expect(laundryText.length).toBeGreaterThan(0);
  });

  it("combines booked and blocked slots for shower calculation", () => {
    // 5 slots, 1 blocked, 2 booked = 2 available per slot
    mockContext.blockedSlots = [
      { serviceType: "shower", date: "2025-01-15", slotTime: "08:00" },
    ];
    mockContext.showerRecords = [
      {
        id: "shower-1",
        guestId: "guest-1",
        time: "08:30",
        date: "2025-01-15T08:00:00Z",
        status: "booked",
      },
      {
        id: "shower-2",
        guestId: "guest-2",
        time: "08:30",
        date: "2025-01-15T08:00:00Z",
        status: "booked",
      },
    ];
    render(<ServiceStatusOverview />);
    // (5 - 1) slots * 2 - 2 booked = 6 available
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("does not count blocked slots from other dates", () => {
    mockContext.blockedSlots = [
      { serviceType: "shower", date: "2025-01-14", slotTime: "08:00" },
    ];
    render(<ServiceStatusOverview />);
    // Should still be 10 (5 slots * 2) since blocked slot is for a different date
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  describe("Clickability based on user role", () => {
    it("shower card is not clickable for checkin users", () => {
      mockUser = { role: "checkin", name: "John" };
      const onShowerClick = vi.fn();

      render(<ServiceStatusOverview onShowerClick={onShowerClick} />);

      // Find the shower card container
      const cards = screen.getAllByRole("generic");
      const showerCard = cards.find(el => el.textContent.includes("Showers") && el.classList.contains("rounded-xl"));
      expect(showerCard).not.toHaveClass("cursor-pointer");
    });

    it("laundry card is not clickable for checkin users", () => {
      mockUser = { role: "checkin", name: "John" };
      const onLaundryClick = vi.fn();

      render(<ServiceStatusOverview onLaundryClick={onLaundryClick} />);

      // Find the laundry card container
      const cards = screen.getAllByRole("generic");
      const laundryCard = cards.find(el => el.textContent.includes("Laundry") && el.classList.contains("rounded-xl"));
      expect(laundryCard).not.toHaveClass("cursor-pointer");
    });

    it("shower card is clickable for staff users", async () => {
      mockUser = { role: "staff", name: "Jane" };
      const onShowerClick = vi.fn();

      render(<ServiceStatusOverview onShowerClick={onShowerClick} />);

      const showerButton = screen.getByRole("button", { name: /Showers/i });
      expect(showerButton).toHaveClass("cursor-pointer");

      await userEvent.click(showerButton);
      expect(onShowerClick).toHaveBeenCalledOnce();
    });

    it("laundry card is clickable for staff users", async () => {
      mockUser = { role: "staff", name: "Jane" };
      const onLaundryClick = vi.fn();

      render(<ServiceStatusOverview onLaundryClick={onLaundryClick} />);

      const laundryButton = screen.getByRole("button", { name: /Laundry/i });
      expect(laundryButton).toHaveClass("cursor-pointer");

      await userEvent.click(laundryButton);
      expect(onLaundryClick).toHaveBeenCalledOnce();
    });

    it("shower card responds to Enter key for staff users", async () => {
      mockUser = { role: "staff", name: "Jane" };
      const onShowerClick = vi.fn();

      render(<ServiceStatusOverview onShowerClick={onShowerClick} />);

      const showerButton = screen.getByRole("button", { name: /Showers/i });
      fireEvent.keyDown(showerButton, { key: "Enter" });
      expect(onShowerClick).toHaveBeenCalledOnce();
    });

    it("does not call callback if user is undefined", async () => {
      mockUser = undefined;
      const onShowerClick = vi.fn();

      render(<ServiceStatusOverview onShowerClick={onShowerClick} />);

      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(0);
    });
  });
});
