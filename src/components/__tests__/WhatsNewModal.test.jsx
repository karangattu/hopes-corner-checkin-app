/**
 * Tests for What's New Modal Component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WhatsNewModal from "../WhatsNewModal";

// Mock the appVersion module
vi.mock("../../utils/appVersion", () => ({
  APP_VERSION: "0.0.2",
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
        {
          type: "performance",
          title: "Test Performance",
          description: "A test performance improvement.",
        },
      ],
    },
    {
      version: "0.0.1",
      date: "September 28, 2025",
      highlights: [
        {
          type: "feature",
          title: "Test Feature",
          description: "A test feature description.",
        },
      ],
    },
  ],
  markVersionAsSeen: vi.fn(),
}));

import { markVersionAsSeen } from "../../utils/appVersion";

describe("WhatsNewModal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    document.body.style.overflow = "";
  });

  it("should not render when isOpen is false", () => {
    render(<WhatsNewModal isOpen={false} onClose={() => {}} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should render when isOpen is true", () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it('should display "What\'s New" title', () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("What's New")).toBeInTheDocument();
  });

  it("should display version number", () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("Version 0.0.2")).toBeInTheDocument();
  });

  it("should display changelog entries", () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("Test Fix")).toBeInTheDocument();
    expect(screen.getByText("A test fix description.")).toBeInTheDocument();
    expect(screen.getByText("Test Performance")).toBeInTheDocument();
    expect(screen.getByText("Test Feature")).toBeInTheDocument();
  });

  it("should display version badges", () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("v0.0.2")).toBeInTheDocument();
    expect(screen.getByText("v0.0.1")).toBeInTheDocument();
  });

  it('should display "Current" badge for current version', () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("should display type labels", () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("Bug Fix")).toBeInTheDocument();
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("New Feature")).toBeInTheDocument();
  });

  it('should display "Got it" button', () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole("button", { name: /got it/i })).toBeInTheDocument();
  });

  it('should call onClose when "Got it" button is clicked', () => {
    const mockOnClose = vi.fn();
    render(<WhatsNewModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole("button", { name: /got it/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should call onClose when close button is clicked", () => {
    const mockOnClose = vi.fn();
    render(<WhatsNewModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should call onClose when backdrop is clicked", () => {
    const mockOnClose = vi.fn();
    render(<WhatsNewModal isOpen={true} onClose={mockOnClose} />);

    // Click the backdrop (the outer dialog container)
    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should call onClose when Escape key is pressed", () => {
    const mockOnClose = vi.fn();
    render(<WhatsNewModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should mark version as seen when opened", () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    expect(markVersionAsSeen).toHaveBeenCalled();
  });

  it("should have proper accessibility attributes", () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "whats-new-title");
  });

  it("should prevent body scroll when open", () => {
    render(<WhatsNewModal isOpen={true} onClose={() => {}} />);

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("should restore body scroll when closed", () => {
    const { rerender } = render(
      <WhatsNewModal isOpen={true} onClose={() => {}} />
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(<WhatsNewModal isOpen={false} onClose={() => {}} />);

    expect(document.body.style.overflow).toBe("");
  });
});
