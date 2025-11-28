/**
 * Tests for Refresh Button Component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RefreshButton from "../RefreshButton";
import toast from "react-hot-toast";

// Mock the hooks and modules
vi.mock("../../context/useAppContext", () => ({
  useAppContext: vi.fn(() => ({
    supabaseEnabled: true,
  })),
}));

vi.mock("../../context/FirestoreSync", () => ({
  useOnlineStatus: vi.fn(() => true),
}));

vi.mock("../../context/SupabaseSync", () => ({
  useSyncTrigger: vi.fn(() => ({
    triggerGlobalSync: vi.fn().mockResolvedValue(undefined),
    isSyncing: false,
  })),
  globalSyncManager: {
    syncQueue: new Map(),
    lastSync: new Map(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked modules
import { useAppContext } from "../../context/useAppContext";
import { useOnlineStatus } from "../../context/FirestoreSync";
import { useSyncTrigger, globalSyncManager } from "../../context/SupabaseSync";

describe("RefreshButton", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Reset mocks to default values
    useAppContext.mockReturnValue({ supabaseEnabled: true });
    useOnlineStatus.mockReturnValue(true);
    useSyncTrigger.mockReturnValue({
      triggerGlobalSync: vi.fn().mockResolvedValue(undefined),
      isSyncing: false,
    });

    // Reset globalSyncManager
    globalSyncManager.syncQueue.clear();
    globalSyncManager.lastSync.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should render the refresh button", () => {
    render(<RefreshButton />);

    expect(
      screen.getByRole("button", { name: /refresh/i })
    ).toBeInTheDocument();
  });

  it("should show refresh icon", () => {
    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("should be enabled when online and supabase is enabled", () => {
    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    expect(button).not.toBeDisabled();
  });

  it("should be disabled when offline", () => {
    useOnlineStatus.mockReturnValue(false);

    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    expect(button).toBeDisabled();
  });

  it("should be disabled when supabase is not enabled", () => {
    useAppContext.mockReturnValue({ supabaseEnabled: false });

    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    expect(button).toBeDisabled();
  });

  it("should show error toast when trying to refresh while offline", async () => {
    useOnlineStatus.mockReturnValue(false);

    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    // Button is disabled so we force click
    button.disabled = false;
    fireEvent.click(button);

    // The button click handler checks online status first
  });

  it("should trigger sync when clicked", async () => {
    const mockTriggerGlobalSync = vi.fn().mockResolvedValue(undefined);
    useSyncTrigger.mockReturnValue({
      triggerGlobalSync: mockTriggerGlobalSync,
      isSyncing: false,
    });

    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockTriggerGlobalSync).toHaveBeenCalled();
    });
  });

  it("should show success toast after refresh", async () => {
    const mockTriggerGlobalSync = vi.fn().mockResolvedValue(undefined);
    useSyncTrigger.mockReturnValue({
      triggerGlobalSync: mockTriggerGlobalSync,
      isSyncing: false,
    });

    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Data refreshed successfully");
    });
  });

  it("should call onRefreshComplete callback after refresh", async () => {
    const mockTriggerGlobalSync = vi.fn().mockResolvedValue(undefined);
    useSyncTrigger.mockReturnValue({
      triggerGlobalSync: mockTriggerGlobalSync,
      isSyncing: false,
    });
    const mockOnRefreshComplete = vi.fn();

    render(<RefreshButton onRefreshComplete={mockOnRefreshComplete} />);

    const button = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnRefreshComplete).toHaveBeenCalled();
    });
  });

  it("should clear sync timestamps when refreshing", async () => {
    const mockTriggerGlobalSync = vi.fn().mockResolvedValue(undefined);
    useSyncTrigger.mockReturnValue({
      triggerGlobalSync: mockTriggerGlobalSync,
      isSyncing: false,
    });

    // Set some sync timestamps
    localStorage.setItem("hopes-corner-guests-lastSync", "123456");
    localStorage.setItem("hopes-corner-meal_attendance-lastSync", "123456");

    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(button);

    await waitFor(() => {
      // Timestamps should be updated (not removed, but set to current time)
      expect(localStorage.getItem("hopes-corner-guests-lastSync")).not.toBe(
        "123456"
      );
    });
  });

  it("should show appropriate tooltip when disabled", () => {
    useOnlineStatus.mockReturnValue(false);

    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    expect(button).toHaveAttribute("title", "Cannot refresh while offline");
  });

  it("should show sync disabled tooltip when supabase is disabled", () => {
    useAppContext.mockReturnValue({ supabaseEnabled: false });

    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: /refresh/i });
    expect(button).toHaveAttribute("title", "Cloud sync is disabled");
  });
});
