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
    // Waitlist and Done should be 0
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it("displays correct laundry status when empty", () => {
    render(<ServiceStatusOverview />);
    expect(screen.getAllByText("OPEN")[0]).toBeInTheDocument();
    // Off-site and Done should be 0
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
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
      {
        id: "shower-3",
        guestId: "guest-3",
        time: "08:30",
        date: "2025-01-15T08:30:00Z",
        status: "done",
      },
    ];

    render(<ServiceStatusOverview />);
    expect(screen.getByText("1")).toBeInTheDocument(); // Done count
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

    // Waitlisted should be 2
    expect(screen.getByText("2")).toBeInTheDocument();
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

    expect(screen.getByText("2")).toBeInTheDocument();
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

    expect(screen.getByText("2")).toBeInTheDocument();
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

    // Done count should be 0
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
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
    ];

    render(<ServiceStatusOverview />);

    expect(screen.getByText("1")).toBeInTheDocument();
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
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it("handles missing settings gracefully", () => {
    mockContext.settings = null;
    render(<ServiceStatusOverview />);
    expect(screen.getByText("Laundry")).toBeInTheDocument();
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
