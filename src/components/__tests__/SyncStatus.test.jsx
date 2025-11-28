/**
 * Tests for Sync Status Component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SyncStatus from "../SyncStatus";

// Mock the hooks
vi.mock("../../context/useAppContext", () => ({
  useAppContext: vi.fn(() => ({
    supabaseEnabled: true,
  })),
}));

vi.mock("../../context/FirestoreSync", () => ({
  useOnlineStatus: vi.fn(() => true),
}));

// Import the mocked modules so we can change their return values
import { useAppContext } from "../../context/useAppContext";
import { useOnlineStatus } from "../../context/FirestoreSync";

const DISMISS_KEY = "sync-banner-dismissals-v1";

describe("SyncStatus", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();

    // Reset mocks to default values
    useAppContext.mockReturnValue({ supabaseEnabled: true });
    useOnlineStatus.mockReturnValue(true);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("when online and supabase enabled", () => {
    it("should not render any alert", () => {
      const { container } = render(<SyncStatus />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("when supabase is disabled", () => {
    beforeEach(() => {
      useAppContext.mockReturnValue({ supabaseEnabled: false });
    });

    it("should display cloud sync paused alert", () => {
      render(<SyncStatus />);

      expect(screen.getByText("Cloud sync is paused")).toBeInTheDocument();
      expect(
        screen.getByText(/Supabase sync is currently disabled/)
      ).toBeInTheDocument();
    });

    it("should display a link to the hardening guide", () => {
      render(<SyncStatus />);

      const link = screen.getByRole("link", { name: /View hardening guide/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        "href",
        "https://github.com/karangattu/hopes-corner-checkin-app/blob/main/README.md#secure-supabase-access"
      );
    });

    it("should have warning styling (amber colors)", () => {
      render(<SyncStatus />);

      const alert = screen.getByRole("status");
      expect(alert).toHaveClass("bg-amber-50", "border-amber-200");
    });

    it("should be dismissible", () => {
      render(<SyncStatus />);

      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      fireEvent.click(dismissButton);

      // Alert should disappear
      expect(screen.queryByText("Cloud sync is paused")).not.toBeInTheDocument();
    });

    it("should persist dismissal to localStorage", () => {
      render(<SyncStatus />);

      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      fireEvent.click(dismissButton);

      const storedDismissals = JSON.parse(localStorage.getItem(DISMISS_KEY));
      expect(storedDismissals.supabaseDisabled).toBe(true);
    });

    it("should stay dismissed on re-render", () => {
      const { rerender } = render(<SyncStatus />);

      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      fireEvent.click(dismissButton);

      rerender(<SyncStatus />);

      expect(screen.queryByText("Cloud sync is paused")).not.toBeInTheDocument();
    });

    it("should clear dismissal when supabase becomes enabled", () => {
      // Start with dismissal in localStorage
      localStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ supabaseDisabled: true })
      );

      // Initial render with supabase disabled
      const { rerender } = render(<SyncStatus />);
      expect(screen.queryByText("Cloud sync is paused")).not.toBeInTheDocument();

      // Re-render with supabase enabled
      useAppContext.mockReturnValue({ supabaseEnabled: true });
      rerender(<SyncStatus />);

      // Verify dismissal was cleared
      const storedDismissals = JSON.parse(localStorage.getItem(DISMISS_KEY));
      expect(storedDismissals.supabaseDisabled).toBeUndefined();
    });
  });

  describe("when offline", () => {
    beforeEach(() => {
      useOnlineStatus.mockReturnValue(false);
    });

    it("should display working offline alert", () => {
      render(<SyncStatus />);

      expect(screen.getByText("Working offline")).toBeInTheDocument();
      expect(
        screen.getByText(/You're offline. Keep checking guests in/)
      ).toBeInTheDocument();
    });

    it("should have danger styling (red colors)", () => {
      render(<SyncStatus />);

      const alert = screen.getByRole("status");
      expect(alert).toHaveClass("bg-red-50", "border-red-200");
    });

    it("should be dismissible", () => {
      render(<SyncStatus />);

      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      fireEvent.click(dismissButton);

      expect(screen.queryByText("Working offline")).not.toBeInTheDocument();
    });

    it("should clear dismissal when coming back online", () => {
      // Start with dismissal in localStorage
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ offline: true }));

      // Initial render while offline
      const { rerender } = render(<SyncStatus />);
      expect(screen.queryByText("Working offline")).not.toBeInTheDocument();

      // Re-render when back online
      useOnlineStatus.mockReturnValue(true);
      rerender(<SyncStatus />);

      // Verify dismissal was cleared
      const storedDismissals = JSON.parse(localStorage.getItem(DISMISS_KEY));
      expect(storedDismissals.offline).toBeUndefined();
    });
  });

  describe("when both supabase disabled and offline", () => {
    beforeEach(() => {
      useAppContext.mockReturnValue({ supabaseEnabled: false });
      useOnlineStatus.mockReturnValue(false);
    });

    it("should show supabase disabled alert first (higher priority)", () => {
      render(<SyncStatus />);

      // The supabase disabled alert should be shown first
      expect(screen.getByText("Cloud sync is paused")).toBeInTheDocument();
    });

    it("should show offline alert after dismissing supabase alert", () => {
      render(<SyncStatus />);

      // Dismiss the supabase alert
      const dismissButton = screen.getByRole("button", { name: /dismiss/i });
      fireEvent.click(dismissButton);

      // Now the offline alert should be shown
      expect(screen.getByText("Working offline")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA attributes", () => {
      useAppContext.mockReturnValue({ supabaseEnabled: false });
      render(<SyncStatus />);

      const alert = screen.getByRole("status");
      expect(alert).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("localStorage error handling", () => {
    it("should handle invalid JSON in localStorage gracefully", () => {
      localStorage.setItem(DISMISS_KEY, "invalid-json");

      // Should not throw
      expect(() => render(<SyncStatus />)).not.toThrow();
    });

    it("should handle null value from localStorage gracefully", () => {
      localStorage.setItem(DISMISS_KEY, "null");

      useAppContext.mockReturnValue({ supabaseEnabled: false });

      // Should render without errors
      render(<SyncStatus />);
      expect(screen.getByText("Cloud sync is paused")).toBeInTheDocument();
    });
  });
});
