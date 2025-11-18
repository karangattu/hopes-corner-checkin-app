import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AppProvider } from "../AppContext";
import { useAppContext } from "../useAppContext";

vi.mock("../../supabaseClient", () => {
  const mockInsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  }));

  return {
    __esModule: true,
    supabase: {
      from: vi.fn(() => ({
        insert: mockInsert,
        update: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
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

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

describe("AppContext shower and laundry mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createGuest = async (result) => {
    let guest;
    await act(async () => {
      guest = await result.current.addGuest({
        name: "Integration Tester",
        location: "Mountain View",
        age: "Adult 18-59",
        gender: "Female",
        housingStatus: "Unhoused",
      });
    });
    return guest;
  };

  it("adds shower bookings and logs history entries", async () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    const guest = await createGuest(result);
    const initialHistoryLength = result.current.actionHistory.length;
    const slot = result.current.allShowerSlots[0];

    await act(async () => {
      await result.current.addShowerRecord(guest.id, slot);
    });

    const { showerRecords, actionHistory } = result.current;
    expect(showerRecords).toHaveLength(1);
    expect(actionHistory.length).toBe(initialHistoryLength + 1);
    expect(actionHistory[0].type).toBe("SHOWER_BOOKED");
    expect(actionHistory[0].data).toMatchObject({
      guestId: guest.id,
      time: slot,
    });
  });

  it("adds onsite laundry bookings, updates slots, and logs history", async () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    const guest = await createGuest(result);
    const initialHistoryLength = result.current.actionHistory.length;
    const slot = result.current.allLaundrySlots[0];

    await act(async () => {
      await result.current.addLaundryRecord(guest.id, slot, "onsite", "BAG-1");
    });

    const { laundryRecords, laundrySlots, LAUNDRY_STATUS, actionHistory } =
      result.current;

    expect(laundryRecords).toHaveLength(1);
    expect(laundryRecords[0]).toMatchObject({
      guestId: guest.id,
      laundryType: "onsite",
      time: slot,
      bagNumber: "BAG-1",
      status: LAUNDRY_STATUS.WAITING,
    });

    expect(laundrySlots).toHaveLength(1);
    expect(laundrySlots[0]).toMatchObject({
      guestId: guest.id,
      time: slot,
      laundryType: "onsite",
      bagNumber: "BAG-1",
      status: LAUNDRY_STATUS.WAITING,
    });

    expect(actionHistory.length).toBe(initialHistoryLength + 1);
    expect(actionHistory[0].type).toBe("LAUNDRY_BOOKED");
    expect(actionHistory[0].data).toMatchObject({
      guestId: guest.id,
      time: slot,
      laundryType: "onsite",
      bagNumber: "BAG-1",
    });
  });

  it("marks waitlisted showers complete and supports undoing the action", async () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    const guest = await createGuest(result);

    let waitlistRecord;
    await act(async () => {
      waitlistRecord = await result.current.addShowerWaitlist(guest.id);
    });

    expect(waitlistRecord.status).toBe("waitlisted");

    await act(async () => {
      const success = await result.current.updateShowerStatus(
        waitlistRecord.id,
        "done",
      );
      expect(success).toBe(true);
    });

    const updatedRecord = result.current.showerRecords.find(
      (record) => record.id === waitlistRecord.id,
    );
    expect(updatedRecord).toBeTruthy();
    expect(updatedRecord.status).toBe("done");

    const completionAction = result.current.actionHistory.find(
      (entry) =>
        entry.type === "SHOWER_WAITLIST_COMPLETED" &&
        entry.data?.recordId === waitlistRecord.id,
    );
    expect(completionAction).toBeTruthy();

    await act(async () => {
      const undone = await result.current.undoAction(completionAction.id);
      expect(undone).toBe(true);
    });

    const restoredRecord = result.current.showerRecords.find(
      (record) => record.id === waitlistRecord.id,
    );
    expect(restoredRecord).toBeTruthy();
    expect(restoredRecord.status).toBe("waitlisted");

    const historyEntryStillPresent = result.current.actionHistory.find(
      (entry) => entry.id === completionAction.id,
    );
    expect(historyEntryStillPresent).toBeUndefined();
  });
});
