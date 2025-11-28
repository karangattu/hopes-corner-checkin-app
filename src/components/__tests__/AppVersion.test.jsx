/**
 * Tests for App Version Component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AppVersion from "../AppVersion";

// Mock the appVersion module
vi.mock("../../utils/appVersion", () => ({
  APP_VERSION: "0.0.2",
  hasUnseenUpdates: vi.fn(() => false),
  CHANGELOG: [
    {
      version: "0.0.2",
      date: "November 19, 2025",
      highlights: [
        {
          type: "fix",
          title: "Test Fix",
          description: "A test fix description.",
        },
      ],
    },
  ],
  markVersionAsSeen: vi.fn(),
}));

import { hasUnseenUpdates } from "../../utils/appVersion";

describe("AppVersion", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    hasUnseenUpdates.mockReturnValue(false);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should display version number", () => {
    render(<AppVersion />);

    expect(screen.getByText("v0.0.2")).toBeInTheDocument();
  });

  it('should display "What\'s New" button', () => {
    render(<AppVersion />);

    expect(screen.getByRole("button", { name: /what's new/i })).toBeInTheDocument();
  });

  it('should open modal when "What\'s New" button is clicked', () => {
    render(<AppVersion />);

    fireEvent.click(screen.getByRole("button", { name: /what's new/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should close modal when close button is clicked", () => {
    render(<AppVersion />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /what's new/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /got it/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should show update indicator when there are unseen updates", () => {
    hasUnseenUpdates.mockReturnValue(true);

    render(<AppVersion />);

    // Should have the pulse animation class on the indicator dot
    const button = screen.getByRole("button", { name: /what's new/i });
    expect(button.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("should not show update indicator when updates have been seen", () => {
    hasUnseenUpdates.mockReturnValue(false);

    render(<AppVersion />);

    const button = screen.getByRole("button", { name: /what's new/i });
    expect(button.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("should have highlighted styling when there are unseen updates", () => {
    hasUnseenUpdates.mockReturnValue(true);

    render(<AppVersion />);

    const button = screen.getByRole("button", { name: /what's new/i });
    expect(button).toHaveClass("bg-emerald-100");
  });

  it("should clear update indicator after viewing", () => {
    hasUnseenUpdates.mockReturnValue(true);

    render(<AppVersion />);

    // Verify update indicator is shown
    let button = screen.getByRole("button", { name: /what's new/i });
    expect(button.querySelector(".animate-pulse")).toBeInTheDocument();

    // Open and close modal
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: /got it/i }));

    // After closing, the indicator should be gone
    button = screen.getByRole("button", { name: /what's new/i });
    expect(button.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });
});
