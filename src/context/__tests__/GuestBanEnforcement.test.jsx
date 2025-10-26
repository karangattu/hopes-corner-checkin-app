import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AppProvider } from "../AppContext";
import { useAppContext } from "../useAppContext";

vi.mock("../../supabaseClient", () => {
  const insertChain = {
    select: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  return {
    __esModule: true,
    supabase: {
      from: vi.fn(() => ({
        insert: vi.fn(() => insertChain),
      })),
    },
    isSupabaseEnabled: () => false,
    checkIfSupabaseConfigured: () => false,
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

const AppWrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

const createFutureISO = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const createBannedGuest = async (result, overrides = {}) => {
  let guest;
  await act(async () => {
    guest = await result.current.addGuest({
      name: overrides.name || "Banned Guest",
      location: overrides.location || "Mountain View",
      age: overrides.age || "Adult 18-59",
      gender: overrides.gender || "Male",
      housingStatus: overrides.housingStatus || "Unhoused",
      banReason: overrides.banReason || "Testing ban",
      bannedUntil: overrides.bannedUntil || createFutureISO(),
    });
  });
  return guest;
};

describe("Guest ban enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const operations = [
    {
      label: "meal service",
      stateKey: "mealRecords",
      invoke: (ctx, guest) => ctx.addMealRecord(guest.id, 1),
    },
    {
      label: "extra meal service",
      stateKey: "extraMealRecords",
      invoke: (ctx, guest) => ctx.addExtraMealRecord(guest.id, 1),
    },
    {
      label: "shower booking",
      stateKey: "showerRecords",
      invoke: (ctx, guest) =>
        ctx.addShowerRecord(guest.id, ctx.allShowerSlots[0]),
    },
    {
      label: "shower waitlist",
      stateKey: "showerRecords",
      invoke: (ctx, guest) => ctx.addShowerWaitlist(guest.id),
    },
    {
      label: "laundry booking",
      stateKey: "laundryRecords",
      invoke: (ctx, guest) =>
        ctx.addLaundryRecord(
          guest.id,
          ctx.allLaundrySlots[0],
          "onsite",
          "BAG-1",
        ),
    },
    {
      label: "bicycle repair",
      stateKey: "bicycleRecords",
      invoke: (ctx, guest) =>
        ctx.addBicycleRecord(guest.id, { repairType: "Flat Tire" }),
    },
    {
      label: "holiday visit",
      stateKey: "holidayRecords",
      invoke: (ctx, guest) => ctx.addHolidayRecord(guest.id),
    },
    {
      label: "haircut visit",
      stateKey: "haircutRecords",
      invoke: (ctx, guest) => ctx.addHaircutRecord(guest.id),
    },
  ];

  it.each(operations)(
    "prevents banned guest from %s",
    async ({ invoke, stateKey }) => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppWrapper,
      });

      const bannedGuest = await createBannedGuest(result);

      let error = null;
      await act(async () => {
        try {
          await invoke(result.current, bannedGuest);
        } catch (err) {
          error = err;
        }
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("is banned from");
      expect(error.message).toContain("until");

      const stateValue = result.current[stateKey];
      expect(Array.isArray(stateValue)).toBe(true);
      expect(stateValue.length).toBe(0);
    },
  );

  it("allows non-banned guests to add meal records", async () => {
    const { result } = renderHook(() => useAppContext(), {
      wrapper: AppWrapper,
    });

    let guest;
    await act(async () => {
      guest = await result.current.addGuest({
        name: "Friendly Guest",
        location: "Mountain View",
        age: "Adult 18-59",
        gender: "Female",
        housingStatus: "Unhoused",
      });
    });

    let record;
    await act(async () => {
      record = await result.current.addMealRecord(guest.id, 1);
    });

    expect(record).toBeTruthy();
    expect(result.current.mealRecords).toHaveLength(1);
    expect(result.current.mealRecords[0].guestId).toBe(guest.id);
  });
});
