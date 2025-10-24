import React from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShowerQueue from "../ShowerQueue";

const hapticsMock = vi.hoisted(() => ({
  delete: vi.fn(),
  complete: vi.fn(),
  actionSuccess: vi.fn(),
  selection: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("../../utils/haptics", () => ({
  __esModule: true,
  default: hapticsMock,
}));

vi.mock("../../utils/toast", () => ({
  __esModule: true,
  default: toastMock,
}));

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
    vi.clearAllMocks();
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

    const removeButton = screen.getByLabelText("Remove Alice from shower queue");
    fireEvent.click(removeButton);

    expect(mockSetQueue).toHaveBeenCalledTimes(1);
    expect(hapticsMock.delete).toHaveBeenCalled();
    expect(toastMock.warning).toHaveBeenCalled();
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

  it("invokes refresh when pulling the queue", async () => {
    vi.useRealTimers();
    const onRefresh = vi.fn().mockResolvedValue();
    render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} onRefresh={onRefresh} />);

    const container = screen.getByTestId("shower-queue-container");
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, {
      touches: [{ clientY: 150 }],
      preventDefault: vi.fn(),
    });
    fireEvent.touchEnd(container);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      "Shower queue refreshed",
      expect.any(Object),
    );
  });

  it("marks a shower entry complete on swipe", () => {
    render(<ShowerQueue queue={initialQueue} setQueue={mockSetQueue} />);

    const item = screen.getByTestId("shower-queue-item-1");
    fireEvent.touchStart(item, { touches: [{ clientX: 160 }] });
    fireEvent.touchMove(item, {
      touches: [{ clientX: 0 }],
      preventDefault: vi.fn(),
    });
    fireEvent.touchEnd(item);

    expect(mockSetQueue).toHaveBeenCalledTimes(1);
    expect(hapticsMock.complete).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringContaining("Alice"),
      expect.any(Object),
    );
  });
});
