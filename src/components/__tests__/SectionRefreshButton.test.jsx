import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock react-hot-toast - must be first before any imports that use it
vi.mock("react-hot-toast", () => {
  return {
    __esModule: true,
    default: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock useAppContext
const mockRefreshServiceSlots = vi.fn();
const useAppContextMock = vi.fn();

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => useAppContextMock(),
}));

// Import component and mocked toast after mocks are set up
import SectionRefreshButton from "../SectionRefreshButton";
import toast from "react-hot-toast";

const buildContext = (overrides = {}) => ({
  refreshServiceSlots: mockRefreshServiceSlots,
  supabaseEnabled: true,
  ...overrides,
});

describe("SectionRefreshButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppContextMock.mockReturnValue(buildContext());
    // Mock navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders a refresh button for shower service", () => {
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      expect(button).toBeInTheDocument();
    });

    it("renders a refresh button for laundry service", () => {
      render(<SectionRefreshButton serviceType="laundry" />);
      
      const button = screen.getByRole("button", { name: /refresh laundry/i });
      expect(button).toBeInTheDocument();
    });

    it("shows label when showLabel prop is true", () => {
      render(<SectionRefreshButton serviceType="shower" showLabel={true} />);
      
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    it("applies correct size classes", () => {
      const { rerender } = render(<SectionRefreshButton serviceType="shower" size="sm" />);
      expect(screen.getByRole("button")).toHaveClass("p-1.5");

      rerender(<SectionRefreshButton serviceType="shower" size="md" />);
      expect(screen.getByRole("button")).toHaveClass("p-2");

      rerender(<SectionRefreshButton serviceType="shower" size="lg" />);
      expect(screen.getByRole("button")).toHaveClass("p-2.5");
    });
  });

  describe("refresh functionality", () => {
    it("calls refreshServiceSlots when clicked", async () => {
      mockRefreshServiceSlots.mockResolvedValue(true);
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockRefreshServiceSlots).toHaveBeenCalledWith("shower");
      });
    });

    it("shows success toast on successful refresh for showers", async () => {
      mockRefreshServiceSlots.mockResolvedValue(true);
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Showers refreshed");
      });
    });

    it("shows success toast on successful refresh for laundry", async () => {
      mockRefreshServiceSlots.mockResolvedValue(true);
      render(<SectionRefreshButton serviceType="laundry" />);
      
      const button = screen.getByRole("button", { name: /refresh laundry/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Laundry refreshed");
      });
    });

    it("shows error toast on failed refresh", async () => {
      mockRefreshServiceSlots.mockResolvedValue(false);
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to refresh data");
      });
    });

    it("shows error toast when refresh throws an error", async () => {
      mockRefreshServiceSlots.mockRejectedValue(new Error("Network error"));
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to refresh data");
      });
    });

    it("calls onRefreshComplete callback on successful refresh", async () => {
      mockRefreshServiceSlots.mockResolvedValue(true);
      const onRefreshComplete = vi.fn();
      render(<SectionRefreshButton serviceType="shower" onRefreshComplete={onRefreshComplete} />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onRefreshComplete).toHaveBeenCalled();
      });
    });

    it("does not call onRefreshComplete callback on failed refresh", async () => {
      mockRefreshServiceSlots.mockResolvedValue(false);
      const onRefreshComplete = vi.fn();
      render(<SectionRefreshButton serviceType="shower" onRefreshComplete={onRefreshComplete} />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
      
      expect(onRefreshComplete).not.toHaveBeenCalled();
    });
  });

  describe("disabled states", () => {
    it("is disabled when offline", () => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });
      
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      expect(button).toBeDisabled();
    });

    it("is disabled when supabase is not enabled", () => {
      useAppContextMock.mockReturnValue(buildContext({ supabaseEnabled: false }));
      
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      expect(button).toBeDisabled();
    });

    it("prevents multiple simultaneous refreshes", async () => {
      // Create a promise that we can control
      let resolvePromise;
      mockRefreshServiceSlots.mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      });
      
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      
      // First click
      fireEvent.click(button);
      
      // Second click while first is still in progress
      fireEvent.click(button);
      
      // Resolve the promise
      resolvePromise(true);
      
      await waitFor(() => {
        expect(mockRefreshServiceSlots).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("loading state", () => {
    it("shows spinning icon during refresh", async () => {
      let resolvePromise;
      mockRefreshServiceSlots.mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      });
      
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      fireEvent.click(button);
      
      // Check for animate-spin class on the icon
      const icon = button.querySelector("svg");
      expect(icon).toHaveClass("animate-spin");
      
      // Resolve and cleanup
      resolvePromise(true);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it("shows 'Refreshing...' text when showLabel is true and refreshing", async () => {
      let resolvePromise;
      mockRefreshServiceSlots.mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromise = resolve;
        });
      });
      
      render(<SectionRefreshButton serviceType="shower" showLabel={true} />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      fireEvent.click(button);
      
      expect(screen.getByText("Refreshing...")).toBeInTheDocument();
      
      // Resolve and cleanup
      resolvePromise(true);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });

  describe("accessibility", () => {
    it("has proper aria-label for showers", () => {
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      expect(button).toHaveAttribute("aria-label", "Refresh showers");
    });

    it("has proper aria-label for laundry", () => {
      render(<SectionRefreshButton serviceType="laundry" />);
      
      const button = screen.getByRole("button", { name: /refresh laundry/i });
      expect(button).toHaveAttribute("aria-label", "Refresh laundry");
    });

    it("has proper title attribute", () => {
      render(<SectionRefreshButton serviceType="shower" />);
      
      const button = screen.getByRole("button", { name: /refresh showers/i });
      expect(button).toHaveAttribute("title", "Refresh showers data");
    });
  });
});
