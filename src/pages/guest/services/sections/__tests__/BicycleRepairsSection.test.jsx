import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import BicycleRepairsSection from "../BicycleRepairsSection";

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../../../components/lanes/BicycleKanban", () => ({
  __esModule: true,
  default: () => <div data-testid="bicycle-kanban">Bicycle Kanban Mock</div>,
}));

describe("BicycleRepairsSection date navigation", () => {
  const BICYCLE_REPAIR_STATUS = {
    WAITING: "waiting",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
  };

  const defaultProps = {
    bicycleRepairs: [],
    bicycleViewMode: "kanban",
    onChangeViewMode: vi.fn(),
    guests: [],
    updateBicycleRecord: vi.fn(),
    deleteBicycleRecord: vi.fn(),
    setBicycleStatus: vi.fn(),
    moveBicycleRecord: vi.fn(),
    expandedCompletedBicycleCards: {},
    onToggleCompletedCard: vi.fn(),
    BICYCLE_REPAIR_STATUS,
    getGuestNameDetails: vi.fn().mockReturnValue({
      primaryName: "Test Guest",
      displayName: "Test Guest",
      guest: null,
    }),
    bicycleViewDate: "2024-01-15",
    onPreviousDate: vi.fn(),
    onNextDate: vi.fn(),
    formatServiceDayLabel: vi.fn((date) => {
      if (date === "2024-01-15") return "Today";
      if (date === "2024-01-14") return "Yesterday";
      return date;
    }),
    today: "2024-01-15",
  };

  const setup = (overrides = {}) => {
    const props = { ...defaultProps, ...overrides };
    render(<BicycleRepairsSection {...props} />);
    return props;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders date navigation controls", () => {
    setup();

    expect(screen.getByLabelText("Previous day")).toBeInTheDocument();
    expect(screen.getByLabelText("Next day")).toBeInTheDocument();
  });

  it("calls onPreviousDate when previous button is clicked", () => {
    const onPreviousDate = vi.fn();
    setup({ onPreviousDate });

    const prevButton = screen.getByLabelText("Previous day");
    fireEvent.click(prevButton);

    expect(onPreviousDate).toHaveBeenCalledTimes(1);
  });

  it("calls onNextDate when next button is clicked", () => {
    const onNextDate = vi.fn();
    setup({ onNextDate, bicycleViewDate: "2024-01-14", today: "2024-01-15" });

    const nextButton = screen.getByLabelText("Next day");
    fireEvent.click(nextButton);

    expect(onNextDate).toHaveBeenCalledTimes(1);
  });

  it("disables next button when viewing today", () => {
    setup({ bicycleViewDate: "2024-01-15", today: "2024-01-15" });

    const nextButton = screen.getByLabelText("Next day");
    expect(nextButton).toBeDisabled();
  });

  it("enables next button when viewing past date", () => {
    setup({ bicycleViewDate: "2024-01-14", today: "2024-01-15" });

    const nextButton = screen.getByLabelText("Next day");
    expect(nextButton).not.toBeDisabled();
  });

  it("shows Past badge when viewing historical date", () => {
    setup({ bicycleViewDate: "2024-01-14", today: "2024-01-15" });

    expect(screen.getByText("Past")).toBeInTheDocument();
  });

  it("does not show Past badge when viewing today", () => {
    setup({ bicycleViewDate: "2024-01-15", today: "2024-01-15" });

    expect(screen.queryByText("Past")).not.toBeInTheDocument();
  });

  it("shows Jump to Today button when viewing past date", () => {
    setup({ bicycleViewDate: "2024-01-14", today: "2024-01-15" });

    expect(screen.getByText("Jump to Today")).toBeInTheDocument();
  });

  it("does not show Jump to Today button when viewing today", () => {
    setup({ bicycleViewDate: "2024-01-15", today: "2024-01-15" });

    expect(screen.queryByText("Jump to Today")).not.toBeInTheDocument();
  });

  it("displays formatted date label", () => {
    const formatServiceDayLabel = vi.fn().mockReturnValue("Mon, Jan 15");
    setup({ formatServiceDayLabel, bicycleViewDate: "2024-01-15" });

    expect(formatServiceDayLabel).toHaveBeenCalledWith("2024-01-15");
    expect(screen.getByText("Mon, Jan 15")).toBeInTheDocument();
  });

  it("shows Today's in header when viewing today", () => {
    setup({ bicycleViewDate: "2024-01-15", today: "2024-01-15" });

    expect(screen.getByText(/Today's/)).toBeInTheDocument();
  });

  it("does not show Today's in header when viewing past date", () => {
    setup({ bicycleViewDate: "2024-01-14", today: "2024-01-15" });

    // Should show "Bicycle Repairs" without "Today's"
    const header = screen.getByRole("heading", { level: 2 });
    expect(header.textContent).not.toContain("Today's");
  });
});
