import React from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShowerQueue from "../ShowerQueue";

describe("ShowerQueue", () => {
  let mockSetQueue;
  let initialQueue;

  beforeEach(() => {
    mockSetQueue = vi.fn();
    initialQueue = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Charlie" },
    ];

    // Mock Date to have consistent slot times
    const mockDate = new Date("2025-10-09T10:00:00");
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders empty queue message when no guests", () => {
    render(<ShowerQueue queue={[]} setQueue={mockSetQueue} />);
    expect(screen.getByText("Shower queue is empty.")).toBeInTheDocument();
  });

  it("renders list of guests with slot times", () => {
    render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();

    // Check for clock icons and times (assuming 10:00 base, slots every 15 min)
    // Since lucide icons don't have testid, check for time strings
    expect(screen.getAllByText("10:00 AM")).toHaveLength(2);
    expect(screen.getByText("10:15 AM")).toBeInTheDocument();
  });

  it("marks first two guests as active (In Use)", () => {
    render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems[0]).toHaveClass("active-service");
    expect(listItems[1]).toHaveClass("active-service");
    expect(listItems[2]).not.toHaveClass("active-service");

    expect(screen.getAllByText("In Use")).toHaveLength(2);
  });

  it("allows removing a guest", () => {
    render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

    const removeButtons = screen.getAllByRole("button");
    fireEvent.click(removeButtons[0]); // First remove button

    expect(mockSetQueue).toHaveBeenCalledTimes(1);
  });

  it("calculates slot times correctly", () => {
    // Test the getSlotTime logic indirectly through rendering
    render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

    // With fake time at 10:00, rounded to 10:00
    // index 0: 10:00
    // index 1: 10:00 (floor(1/2)=0, +0)
    // index 2: 10:15 (floor(2/2)=1, +15)
    expect(screen.getAllByText("10:00 AM")).toHaveLength(2);
    expect(screen.getByText("10:15 AM")).toBeInTheDocument();
  });

  it("handles queue with less than 2 guests", () => {
    const shortQueue = [{ id: "1", name: "Alice" }];
    render(<ShowerQueue queue={shortQueue} setQueue={mockSetQueue} />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems[0]).toHaveClass("active-service");
    expect(screen.getByText("In Use")).toBeInTheDocument();
  });

  it("handles queue with exactly 2 guests", () => {
    const twoQueue = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ];
    render(<ShowerQueue queue={twoQueue} setQueue={mockSetQueue} />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems[0]).toHaveClass("active-service");
    expect(listItems[1]).toHaveClass("active-service");
    expect(screen.getAllByText("In Use")).toHaveLength(2);
  });
});
