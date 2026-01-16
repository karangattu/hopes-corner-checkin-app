import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// Mock the stores
const mockGuestsStoreState = {
  guests: [],
};

const mockSettingsStoreState = {
  loadFromSupabase: vi.fn().mockResolvedValue(undefined),
};

const mockInitializeStoresFromSupabase = vi.fn().mockResolvedValue(undefined);
const mockIsSupabaseEnabled = vi.fn().mockReturnValue(true);

vi.mock("../../stores", () => ({
  useSettingsStore: {
    getState: () => mockSettingsStoreState,
  },
  useGuestsStore: {
    getState: () => mockGuestsStoreState,
  },
  initializeStoresFromSupabase: () => mockInitializeStoresFromSupabase(),
}));

vi.mock("../../supabaseClient", () => ({
  isSupabaseEnabled: () => mockIsSupabaseEnabled(),
}));

// Import hook after mocks are set up
import { useStoreInitialization } from "../useStoreInitialization";

describe("useStoreInitialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGuestsStoreState.guests = [];
    mockInitializeStoresFromSupabase.mockResolvedValue(undefined);
    mockSettingsStoreState.loadFromSupabase.mockResolvedValue(undefined);
    mockIsSupabaseEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("first-time login (no cached data)", () => {
    it("waits for data to load before marking initialized", async () => {
      // Simulate no cached data
      mockGuestsStoreState.guests = [];

      // Make the data loading take some time
      let resolveDataPromise;
      mockInitializeStoresFromSupabase.mockReturnValue(
        new Promise((resolve) => {
          resolveDataPromise = resolve;
        })
      );

      const { result } = renderHook(() => useStoreInitialization());

      // Should NOT be initialized yet (waiting for data)
      expect(result.current.isInitialized).toBe(false);

      // Complete the data loading
      await act(async () => {
        resolveDataPromise();
      });

      // Now should be initialized
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });

    it("calls initializeStoresFromSupabase when Supabase is enabled", async () => {
      mockGuestsStoreState.guests = [];
      mockIsSupabaseEnabled.mockReturnValue(true);

      const { result } = renderHook(() => useStoreInitialization());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockInitializeStoresFromSupabase).toHaveBeenCalled();
    });

    it("does not call initializeStoresFromSupabase when Supabase is disabled", async () => {
      mockGuestsStoreState.guests = [];
      mockIsSupabaseEnabled.mockReturnValue(false);

      const { result } = renderHook(() => useStoreInitialization());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockInitializeStoresFromSupabase).not.toHaveBeenCalled();
    });
  });

  describe("returning user (has cached data)", () => {
    it("marks initialized immediately when cached data exists", async () => {
      // Simulate cached data from previous session
      mockGuestsStoreState.guests = [
        { id: "g1", name: "John Doe" },
        { id: "g2", name: "Jane Doe" },
      ];

      // Make the data loading slow
      let resolveDataPromise;
      mockInitializeStoresFromSupabase.mockReturnValue(
        new Promise((resolve) => {
          resolveDataPromise = resolve;
        })
      );

      const { result } = renderHook(() => useStoreInitialization());

      // Should be initialized immediately (using cached data)
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Data loading should still be in progress
      // (background sync continues after UI is shown)
      
      // Complete the background sync
      await act(async () => {
        resolveDataPromise();
      });
    });

    it("syncs data in background after showing cached data", async () => {
      mockGuestsStoreState.guests = [{ id: "g1", name: "Cached Guest" }];

      const { result } = renderHook(() => useStoreInitialization());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Background sync should have been initiated
      expect(mockSettingsStoreState.loadFromSupabase).toHaveBeenCalled();
      expect(mockInitializeStoresFromSupabase).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("sets error state when initialization fails", async () => {
      mockGuestsStoreState.guests = [];
      const testError = new Error("Network error");
      mockInitializeStoresFromSupabase.mockRejectedValue(testError);

      const { result } = renderHook(() => useStoreInitialization());

      await waitFor(() => {
        expect(result.current.error).toBe(testError);
      });
    });

    it("still marks as initialized after error to allow fallback UI", async () => {
      mockGuestsStoreState.guests = [];
      mockInitializeStoresFromSupabase.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useStoreInitialization());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe("React 18 Strict Mode", () => {
    it("prevents double initialization with initStartedRef", async () => {
      mockGuestsStoreState.guests = [];

      // First render
      const { result, rerender } = renderHook(() => useStoreInitialization());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const callCount = mockInitializeStoresFromSupabase.mock.calls.length;

      // Rerender (simulating what Strict Mode does)
      rerender();

      // Should not have called initialize again
      expect(mockInitializeStoresFromSupabase.mock.calls.length).toBe(callCount);
    });
  });
});
