/**
 * Tests for Last Refreshed Indicator Component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import LastRefreshedIndicator from "../LastRefreshedIndicator";

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

// Table names that match the actual localStorage keys
const SYNCED_TABLES = [
  "guests",
  "meal_attendance",
  "shower_reservations",
  "laundry_bookings",
  "bicycle_repairs",
  "holiday_visits",
  "haircut_visits",
  "items_distributed",
  "donations",
  "la_plaza_donations",
];

describe("LastRefreshedIndicator", () => {
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

  describe("when no sync has occurred", () => {
    it('should display "Never" when no sync timestamps exist', () => {
      render(<LastRefreshedIndicator />);

      expect(screen.getByText(/Never/)).toBeInTheDocument();
    });

    it('should show "Outdated" status styling for never synced state', () => {
      render(<LastRefreshedIndicator />);

      // Should have orange/stale styling
      const container = screen.getByText(/Never/).closest("div");
      expect(container).toHaveClass("bg-orange-50");
    });
  });

  describe("when recently synced", () => {
    it('should display "Just now" for sync within last minute', () => {
      // Set a sync time from 30 seconds ago
      const recentTime = Date.now() - 30 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        recentTime.toString()
      );

      render(<LastRefreshedIndicator />);

      expect(screen.getByText(/Just now/)).toBeInTheDocument();
    });

    it("should display minutes ago for sync within last hour", () => {
      // Set a sync time from 15 minutes ago
      const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        fifteenMinutesAgo.toString()
      );

      render(<LastRefreshedIndicator />);

      expect(screen.getByText(/15 mins ago/)).toBeInTheDocument();
    });

    it("should display hours ago for sync within last day", () => {
      // Set a sync time from 3 hours ago
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        threeHoursAgo.toString()
      );

      render(<LastRefreshedIndicator />);

      expect(screen.getByText(/3 hours ago/)).toBeInTheDocument();
    });

    it('should display "Yesterday" for sync from yesterday', () => {
      // Set a sync time from 25 hours ago (yesterday)
      const yesterday = Date.now() - 25 * 60 * 60 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        yesterday.toString()
      );

      render(<LastRefreshedIndicator />);

      expect(screen.getByText(/Yesterday/)).toBeInTheDocument();
    });

    it("should display days ago for older syncs", () => {
      // Set a sync time from 3 days ago
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        threeDaysAgo.toString()
      );

      render(<LastRefreshedIndicator />);

      expect(screen.getByText(/3 days ago/)).toBeInTheDocument();
    });
  });

  describe("freshness status styling", () => {
    it("should show fresh (green) styling for sync within 5 minutes", () => {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        twoMinutesAgo.toString()
      );

      render(<LastRefreshedIndicator />);

      const container = screen.getByText(/Just now|mins ago/).closest("div");
      expect(container).toHaveClass("bg-emerald-50");
    });

    it("should show recent (green) styling for sync within 30 minutes", () => {
      const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        fifteenMinutesAgo.toString()
      );

      render(<LastRefreshedIndicator />);

      const container = screen.getByText(/mins ago/).closest("div");
      expect(container).toHaveClass("bg-emerald-50");
    });

    it("should show aging (amber) styling for sync within 2 hours", () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        oneHourAgo.toString()
      );

      render(<LastRefreshedIndicator />);

      const container = screen.getByText(/hour/).closest("div");
      expect(container).toHaveClass("bg-amber-50");
    });

    it("should show stale (orange) styling for sync older than 2 hours", () => {
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        threeHoursAgo.toString()
      );

      render(<LastRefreshedIndicator />);

      const container = screen.getByText(/hours ago/).closest("div");
      expect(container).toHaveClass("bg-orange-50");
    });
  });

  describe("offline status", () => {
    it('should display "Working offline" when offline', () => {
      useOnlineStatus.mockReturnValue(false);

      render(<LastRefreshedIndicator />);

      expect(screen.getByText("Working offline")).toBeInTheDocument();
    });

    it("should show amber styling when offline", () => {
      useOnlineStatus.mockReturnValue(false);

      render(<LastRefreshedIndicator />);

      const container = screen.getByText("Working offline").closest("div");
      expect(container).toHaveClass("bg-amber-50");
    });
  });

  describe("sync disabled status", () => {
    it('should display "Sync disabled" when supabase is not enabled', () => {
      useAppContext.mockReturnValue({ supabaseEnabled: false });

      render(<LastRefreshedIndicator />);

      expect(screen.getByText("Sync disabled")).toBeInTheDocument();
    });

    it("should show gray styling when sync is disabled", () => {
      useAppContext.mockReturnValue({ supabaseEnabled: false });

      render(<LastRefreshedIndicator />);

      const container = screen.getByText("Sync disabled").closest("div");
      expect(container).toHaveClass("bg-gray-50");
    });
  });

  describe("most recent sync time across tables", () => {
    it("should show the most recent sync time across all tables", () => {
      // Set different sync times for different tables
      const oldSync = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      const recentSync = Date.now() - 5 * 60 * 1000; // 5 minutes ago

      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        oldSync.toString()
      );
      localStorage.setItem(
        "hopes-corner-meal_attendance-lastSync",
        recentSync.toString()
      );

      render(<LastRefreshedIndicator />);

      // Should show the more recent time (5 mins ago)
      expect(screen.getByText(/5 mins ago/)).toBeInTheDocument();
    });

    it("should handle invalid localStorage values gracefully", () => {
      localStorage.setItem("hopes-corner-guests-lastSync", "invalid");
      localStorage.setItem(
        "hopes-corner-meal_attendance-lastSync",
        Date.now().toString()
      );

      render(<LastRefreshedIndicator />);

      // Should still work with the valid timestamp
      expect(screen.getByText(/Just now/)).toBeInTheDocument();
    });
  });

  describe("storage event handling", () => {
    it("should update when storage event fires for sync keys", async () => {
      render(<LastRefreshedIndicator />);

      // Initially shows "Never"
      expect(screen.getByText(/Never/)).toBeInTheDocument();

      // Simulate a storage event
      const newSyncTime = Date.now();
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        newSyncTime.toString()
      );

      await act(async () => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "hopes-corner-guests-lastSync",
            newValue: newSyncTime.toString(),
          })
        );
      });

      // Should now show "Just now"
      expect(screen.getByText(/Just now/)).toBeInTheDocument();
    });
  });

  describe("singular/plural formatting", () => {
    it('should display "1 min ago" without plural s', () => {
      const oneMinuteAgo = Date.now() - 60 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        oneMinuteAgo.toString()
      );

      render(<LastRefreshedIndicator />);

      expect(screen.getByText(/1 min ago/)).toBeInTheDocument();
    });

    it('should display "1 hour ago" without plural s', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      localStorage.setItem(
        "hopes-corner-guests-lastSync",
        oneHourAgo.toString()
      );

      render(<LastRefreshedIndicator />);

      expect(screen.getByText(/1 hour ago/)).toBeInTheDocument();
    });
  });

  describe("table name matching", () => {
    it("should read from correct localStorage keys", () => {
      // Test that the component checks the correct table names
      const validTableNames = [
        "guests",
        "meal_attendance",
        "shower_reservations",
        "laundry_bookings",
        "bicycle_repairs",
        "holiday_visits",
        "haircut_visits",
        "items_distributed",
        "donations",
        "la_plaza_donations",
      ];

      // Set old timestamps for all tables
      const oldTime = Date.now() - 24 * 60 * 60 * 1000;
      validTableNames.forEach((table) => {
        localStorage.setItem(`hopes-corner-${table}-lastSync`, oldTime.toString());
      });

      // Set a recent timestamp for one table
      const recentTime = Date.now() - 60 * 1000;
      localStorage.setItem(
        "hopes-corner-donations-lastSync",
        recentTime.toString()
      );

      render(<LastRefreshedIndicator />);

      // Should show the recent time
      expect(screen.getByText(/Just now|1 min ago/)).toBeInTheDocument();
    });
  });
});
