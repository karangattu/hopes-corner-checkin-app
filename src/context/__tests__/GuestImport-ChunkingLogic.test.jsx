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
import { renderHook, act } from "@testing-library/react";
import { AppProvider } from "../AppContext";
import { useAppContext } from "../useAppContext";
import { __setSupabaseHandler } from "../../supabaseClient";

const createWrapper =
  () =>
  ({ children }) => <AppProvider>{children}</AppProvider>;

const createGuestRow = (index) => ({
  Guest_ID: `G${index.toString().padStart(5, "0")}`,
  First_Name: `Guest${index}`,
  Last_Name: `Tester${index}`,
  Housing_status: "Unhoused",
  Age: "Adult 18-59",
  Gender: "Unknown",
  City: "Mountain View",
});

const createSupabaseRow = (guest, callIndex, rowIndex) => ({
  id: `supabase-${callIndex}-${rowIndex}`,
  external_id: guest.external_id,
  first_name: guest.first_name,
  last_name: guest.last_name,
  full_name: guest.full_name,
  preferred_name: guest.preferred_name,
  housing_status: guest.housing_status,
  age_group: guest.age_group,
  gender: guest.gender,
  location: guest.location,
  notes: guest.notes,
  bicycle_description: guest.bicycle_description,
  created_at: "2025-10-24T00:00:00Z",
  updated_at: "2025-10-24T00:00:00Z",
});

describe("Guest import chunking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setSupabaseHandler(() => {
      throw new Error("Supabase handler not configured for test");
    });
  });

  it("chunks guest imports into 100-row batches and merges Supabase results", async () => {
    const insertCalls = [];
    const selectCalls = [];
    let callCount = 0;

    __setSupabaseHandler((table) => {
      if (table === "guests") {
        return {
          select: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: [], error: null }),
            }),
            in: () => {
              selectCalls.push(null);
              // Return empty array for check - no existing guests
              return Promise.resolve({ data: [], error: null });
            },
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              single: () => Promise.resolve({ data: null, error: null }),
            }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          insert: (payload) => {
            insertCalls.push(payload);
            const currentCall = callCount++;
            const rows = payload.map((guest, rowIndex) =>
              createSupabaseRow(guest, currentCall, rowIndex),
            );
            return {
              select: () => Promise.resolve({ data: rows, error: null }),
            };
          },
          update: () => ({
            eq: () =>
              Promise.resolve({ data: [], error: null }),
          }),
        };
      }

      return {
        select: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null }),
          }),
          in: () =>
            Promise.resolve({ data: [], error: null }),
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

    const rows = Array.from({ length: 250 }, (_, index) =>
      createGuestRow(index),
    );

    let response;
    await act(async () => {
      response = await result.current.importGuestsFromCSV(rows);
    });

    expect(insertCalls).toHaveLength(3);
    expect(insertCalls[0]).toHaveLength(100);
    expect(insertCalls[1]).toHaveLength(100);
    expect(insertCalls[2]).toHaveLength(50);

    expect(response.failedCount).toBe(0);
    expect(response.partialFailure).toBe(false);
    expect(response.error).toBeNull();
    expect(response.importedGuests).toHaveLength(250);

    expect(result.current.guests).toHaveLength(250);
    expect(result.current.guests[0]).toMatchObject({
      firstName: "Guest0",
      lastName: "Tester0",
      guestId: "G00000",
    });
  });

  it("surfaces partial failure details when a Supabase chunk fails", async () => {
    const insertCalls = [];
    let callCount = 0;

    __setSupabaseHandler((table) => {
      if (table === "guests") {
        return {
          select: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: [], error: null }),
            }),
            in: () => {
              // Return empty array for check - no existing guests
              return Promise.resolve({ data: [], error: null });
            },
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              single: () => Promise.resolve({ data: null, error: null }),
            }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          insert: (payload) => {
            insertCalls.push(payload);
            const currentCall = callCount++;
            if (currentCall === 1) {
              return {
                select: () =>
                  Promise.resolve({
                    data: null,
                    error: { message: "chunk failed" },
                  }),
              };
            }

            const rows = payload.map((guest, rowIndex) =>
              createSupabaseRow(guest, currentCall, rowIndex),
            );
            return {
              select: () => Promise.resolve({ data: rows, error: null }),
            };
          },
          update: () => ({
            eq: () =>
              Promise.resolve({ data: [], error: null }),
          }),
        };
      }

      return {
        select: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null }),
          }),
          in: () =>
            Promise.resolve({ data: [], error: null }),
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

    const rows = Array.from({ length: 205 }, (_, index) =>
      createGuestRow(index),
    );

    let response;
    await act(async () => {
      response = await result.current.importGuestsFromCSV(rows);
    });

    expect(insertCalls).toHaveLength(2);
    expect(insertCalls[0]).toHaveLength(100);
    expect(insertCalls[1]).toHaveLength(100);

    expect(response.partialFailure).toBe(true);
    expect(response.failedCount).toBe(205 - 100);
    expect(response.importedGuests).toHaveLength(100);
    expect(response.error).toContain("Unable to sync 105 guests");

    expect(result.current.guests).toHaveLength(100);
  });
});
