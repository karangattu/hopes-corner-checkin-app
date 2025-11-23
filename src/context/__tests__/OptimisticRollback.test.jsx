import { vi } from "vitest";

vi.mock("../../supabaseClient", () => {
  let handler = () => {
    throw new Error("Supabase handler not configured for test");
  };

  const supabase = {
    from: (...args) => handler(...args),
  };

  return {
    __esModule: true,
    supabase,
    isSupabaseEnabled: () => true,
    checkIfSupabaseConfigured: () => true,
    __setSupabaseHandler: (fn) => {
      handler = fn;
    },
  };
});

vi.mock("../../utils/toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AppProvider } from "../AppContext";
import { useAppContext } from "../useAppContext";
import { __setSupabaseHandler } from "../../supabaseClient";
import enhancedToast from "../../utils/toast";

const createWrapper =
  () =>
  ({ children }) => <AppProvider>{children}</AppProvider>;

describe("Optimistic update rollbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setSupabaseHandler(() => {
      throw new Error("Supabase handler not configured for test");
    });
  });

  it("reverts guest changes when Supabase update fails", async () => {
    const insertedRowBase = {
      id: "guest-row-1",
      external_id: "guest-001",
      first_name: "Alice",
      last_name: "Smith",
      full_name: "Alice Smith",
      preferred_name: "",
      housing_status: "Unhoused",
      age_group: "Adult 18-59",
      gender: "Female",
      location: "Mountain View",
      notes: "",
      bicycle_description: "",
      created_at: "2025-10-24T00:00:00Z",
      updated_at: "2025-10-24T00:00:00Z",
    };

    __setSupabaseHandler((table) => {
      if (table === "guests") {
        return {
          select: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: [insertedRowBase], error: null }),
            }),
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              single: () => Promise.resolve({ data: null, error: null }),
            }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.reject(new Error("network down")),
              }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null }),
          }),
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      };
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppContext(), { wrapper });

    await waitFor(() => {
      const seededGuest = result.current.guests.find(
        (candidate) => candidate.id === insertedRowBase.id,
      );
      expect(seededGuest).toBeDefined();
    });

    const guest = result.current.guests.find(
      (candidate) => candidate.id === insertedRowBase.id,
    );

    enhancedToast.error.mockClear();

    let success;
    await act(async () => {
      success = await result.current.updateGuest(guest.id, {
        firstName: "Alicia",
        notes: "Changed",
      });
    });

    const storedGuest = result.current.guests.find((g) => g.id === guest.id);
    expect(success).toBe(false);
    expect(storedGuest.firstName).toBe("Alice");
    expect(storedGuest.notes).toBe("");
    expect(enhancedToast.error).toHaveBeenCalledWith(
      "Unable to update guest. Changes were reverted.",
    );
  });

  it("restores laundry status when the Supabase update fails", async () => {
    __setSupabaseHandler((table) => {
      if (table === "laundry_bookings") {
        return {
          select: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: [], error: null }),
            }),
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              single: () => Promise.resolve({ data: null, error: null }),
            }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: null,
                    error: { message: "write failed" },
                  }),
              }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null }),
          }),
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppContext(), { wrapper });

    // Wait for AppProvider to complete initial fetch
    await waitFor(() => {
      expect(result.current.laundryRecords).toBeDefined();
    });

    const { LAUNDRY_STATUS } = result.current;

    const initialRecord = {
      id: "laundry-1",
      guestId: "guest-1",
      status: LAUNDRY_STATUS.PENDING,
      laundryType: "offsite",
      bagNumber: "",
      date: "2025-10-24T00:00:00Z",
      lastUpdated: "original",
    };

    act(() => {
      result.current.setLaundryRecords([initialRecord]);
    });

    await waitFor(() => {
      expect(result.current.laundryRecords).toHaveLength(1);
    });

    enhancedToast.error.mockClear();

    let success;
    await act(async () => {
      success = await result.current.updateLaundryStatus(
        initialRecord.id,
        LAUNDRY_STATUS.RETURNED,
      );
    });

    const storedRecord = result.current.laundryRecords.find(
      (record) => record.id === initialRecord.id,
    );

    expect(success).toBe(false);
    expect(storedRecord.status).toBe(LAUNDRY_STATUS.PENDING);
    expect(storedRecord.lastUpdated).toBe("original");
    expect(enhancedToast.error).toHaveBeenCalledWith(
      "Unable to update laundry status. Changes were reverted.",
    );
  });

  it("reverts bag number changes when Supabase update fails", async () => {
    __setSupabaseHandler((table) => {
      if (table === "laundry_bookings") {
        return {
          select: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: [], error: null }),
            }),
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              single: () => Promise.resolve({ data: null, error: null }),
            }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: null,
                    error: { message: "bag update failed" },
                  }),
              }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null }),
          }),
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAppContext(), { wrapper });

    // Wait for AppProvider to complete initial fetch
    await waitFor(() => {
      expect(result.current.laundryRecords).toBeDefined();
    });

    const record = {
      id: "laundry-2",
      guestId: "guest-2",
      status: result.current.LAUNDRY_STATUS.PENDING,
      laundryType: "offsite",
      bagNumber: "15",
      date: "2025-10-24T00:00:00Z",
      lastUpdated: "initial",
    };

    act(() => {
      result.current.setLaundryRecords([record]);
    });

    await waitFor(() => {
      expect(result.current.laundryRecords).toHaveLength(1);
    });

    enhancedToast.error.mockClear();

    let success;
    await act(async () => {
      success = await result.current.updateLaundryBagNumber(record.id, "42");
    });

    const storedRecord = result.current.laundryRecords.find(
      (entry) => entry.id === record.id,
    );

    expect(success).toBe(false);
    expect(storedRecord.bagNumber).toBe("15");
    expect(storedRecord.lastUpdated).toBe("initial");
    expect(enhancedToast.error).toHaveBeenCalledWith(
      "Unable to update bag number. Changes were reverted.",
    );
  });
});
