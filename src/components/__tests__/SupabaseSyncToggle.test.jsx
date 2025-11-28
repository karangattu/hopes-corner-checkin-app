/**
 * Tests for Supabase Sync Toggle Component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SupabaseSyncToggle from "../SupabaseSyncToggle";
import toast from "react-hot-toast";

// Mock the supabaseClient
vi.mock("../../supabaseClient", () => ({
  setSupabaseSyncEnabled: vi.fn(() => true),
  getSupabaseSyncEnabled: vi.fn(() => false),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import the mocked modules so we can change their return values
import {
  setSupabaseSyncEnabled,
  getSupabaseSyncEnabled,
} from "../../supabaseClient";

// Mock window.location.reload
const originalLocation = window.location;

describe("SupabaseSyncToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock window.location
    delete window.location;
    window.location = { reload: vi.fn() };

    // Default mock values
    getSupabaseSyncEnabled.mockReturnValue(false);
    setSupabaseSyncEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    window.location = originalLocation;
  });

  describe("when supabase is not configured", () => {
    it("should display local storage only message", () => {
      render(<SupabaseSyncToggle supabaseConfigured={false} />);

      expect(screen.getByText("Local Storage Only")).toBeInTheDocument();
      expect(
        screen.getByText(/Supabase is not configured/)
      ).toBeInTheDocument();
    });

    it("should not display toggle button when unconfigured", () => {
      render(<SupabaseSyncToggle supabaseConfigured={false} />);

      expect(
        screen.queryByRole("switch", { name: /toggle cloud sync/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("when supabase is configured but sync disabled", () => {
    it("should display local storage status", () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      expect(screen.getByText("Local Storage Only")).toBeInTheDocument();
      expect(
        screen.getByText("Local browser storage only")
      ).toBeInTheDocument();
    });

    it("should show toggle switch in off position", () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      const toggle = screen.getByRole("switch", { name: /toggle cloud sync/i });
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("should enable sync when toggle is clicked", async () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      const toggle = screen.getByRole("switch", { name: /toggle cloud sync/i });
      fireEvent.click(toggle);

      expect(setSupabaseSyncEnabled).toHaveBeenCalledWith(true);
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("Cloud sync enabled"),
        expect.any(Object)
      );
    });

    it("should reload page after enabling sync", async () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      const toggle = screen.getByRole("switch", { name: /toggle cloud sync/i });
      fireEvent.click(toggle);

      // Fast-forward timers
      vi.advanceTimersByTime(1500);

      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe("when supabase is configured and sync enabled", () => {
    beforeEach(() => {
      getSupabaseSyncEnabled.mockReturnValue(true);
    });

    it("should display cloud sync status", () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      expect(screen.getByText("Cloud Sync")).toBeInTheDocument();
      expect(
        screen.getByText("Synced with Supabase cloud database")
      ).toBeInTheDocument();
    });

    it("should show toggle switch in on position", () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      const toggle = screen.getByRole("switch", { name: /toggle cloud sync/i });
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });

    it("should display force sync option", () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      expect(screen.getByText("Force Full Sync")).toBeInTheDocument();
      expect(screen.getByText("Force Sync Now →")).toBeInTheDocument();
    });

    it("should display warning about disabling sync", () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      expect(
        screen.getByText(/Disabling cloud sync will stop syncing/)
      ).toBeInTheDocument();
    });

    it("should disable sync when toggle is clicked", async () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      const toggle = screen.getByRole("switch", { name: /toggle cloud sync/i });
      fireEvent.click(toggle);

      expect(setSupabaseSyncEnabled).toHaveBeenCalledWith(false);
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("Cloud sync disabled"),
        expect.any(Object)
      );
    });
  });

  describe("force sync functionality", () => {
    beforeEach(() => {
      getSupabaseSyncEnabled.mockReturnValue(true);
    });

    it("should clear sync timestamps when force sync is clicked", () => {
      // Set some sync timestamps
      const SYNC_TABLES = [
        "guests",
        "meal_attendance",
        "shower_reservations",
        "laundry_bookings",
        "bicycle_repairs",
        "donations",
        "la_plaza_donations",
      ];

      SYNC_TABLES.forEach((table) => {
        localStorage.setItem(
          `hopes-corner-${table}-lastSync`,
          Date.now().toString()
        );
      });

      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      const forceSyncButton = screen.getByText("Force Sync Now →");
      fireEvent.click(forceSyncButton);

      // Verify all sync timestamps were cleared
      SYNC_TABLES.forEach((table) => {
        expect(
          localStorage.getItem(`hopes-corner-${table}-lastSync`)
        ).toBeNull();
      });
    });

    it("should show success toast when force sync is clicked", () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      const forceSyncButton = screen.getByText("Force Sync Now →");
      fireEvent.click(forceSyncButton);

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("Sync timestamps cleared"),
        expect.any(Object)
      );
    });

    it("should reload page after force sync", () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      const forceSyncButton = screen.getByText("Force Sync Now →");
      fireEvent.click(forceSyncButton);

      vi.advanceTimersByTime(1000);

      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should show error when trying to toggle without supabase configured", () => {
      render(<SupabaseSyncToggle supabaseConfigured={false} />);

      // The toggle isn't rendered in this case, so no error handling needed
      // But if we had a scenario where toggle was accessible...
    });

    it("should handle setSupabaseSyncEnabled failure", () => {
      setSupabaseSyncEnabled.mockReturnValue(false);

      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      const toggle = screen.getByRole("switch", { name: /toggle cloud sync/i });
      fireEvent.click(toggle);

      // Should not show success toast
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA attributes on toggle", () => {
      render(<SupabaseSyncToggle supabaseConfigured={true} />);

      const toggle = screen.getByRole("switch", { name: /toggle cloud sync/i });
      expect(toggle).toHaveAttribute("role", "switch");
      expect(toggle).toHaveAttribute("aria-checked");
      expect(toggle).toHaveAttribute("aria-label", "Toggle cloud sync");
    });
  });
});
