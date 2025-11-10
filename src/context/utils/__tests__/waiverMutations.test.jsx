import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWaiverMutations } from "../../utils/waiverMutations";

describe("Waiver Mutations", () => {
  const mockSupabaseClient = {
    from: vi.fn(),
    rpc: vi.fn(),
  };

  const mockPushAction = vi.fn();
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  let waiverMutations;

  beforeEach(() => {
    vi.clearAllMocks();

    waiverMutations = createWaiverMutations({
      supabaseEnabled: true,
      supabaseClient: mockSupabaseClient,
      pushAction: mockPushAction,
      toast: mockToast,
    });
  });

  describe("fetchGuestWaivers", () => {
    it("should fetch waivers for a guest", async () => {
      const mockData = [
        {
          id: "waiver-1",
          service_type: "shower",
          signed_at: "2025-11-09T10:00:00Z",
          dismissed_at: null,
        },
        {
          id: "waiver-2",
          service_type: "laundry",
          signed_at: "2025-11-09T10:05:00Z",
          dismissed_at: "2025-11-09T10:15:00Z",
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const result = await waiverMutations.fetchGuestWaivers("guest-123");

      expect(result.shower).toBeDefined();
      expect(result.shower.service_type).toBe("shower");
      expect(result.laundry).toBeDefined();
    });

    it("should return empty object when Supabase is disabled", async () => {
      const offlineWaivers = createWaiverMutations({
        supabaseEnabled: false,
        supabaseClient: null,
        pushAction: mockPushAction,
        toast: mockToast,
      });

      const result = await offlineWaivers.fetchGuestWaivers("guest-123");

      expect(result).toEqual({ shower: null, laundry: null });
    });

    it("should handle errors gracefully", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Query failed"),
            }),
          }),
        }),
      });

      const result = await waiverMutations.fetchGuestWaivers("guest-123");

      expect(result).toEqual({ shower: null, laundry: null });
    });
  });

  describe("guestNeedsWaiverReminder", () => {
    it("should return true when guest needs waiver reminder", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await waiverMutations.guestNeedsWaiverReminder(
        "guest-123",
        "shower"
      );

      expect(result).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "guest_needs_waiver_reminder",
        {
          p_guest_id: "guest-123",
          p_service_type: "shower",
        }
      );
    });

    it("should return false when guest does not need waiver reminder", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await waiverMutations.guestNeedsWaiverReminder(
        "guest-123",
        "laundry"
      );

      expect(result).toBe(false);
    });

    it("should handle RPC errors gracefully", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: new Error("RPC failed"),
      });

      const result = await waiverMutations.guestNeedsWaiverReminder(
        "guest-123",
        "shower"
      );

      expect(result).toBe(false);
    });

    it("should return false when Supabase is disabled", async () => {
      const offlineMutations = createWaiverMutations({
        supabaseEnabled: false,
        supabaseClient: null,
        pushAction: mockPushAction,
        toast: mockToast,
      });

      const result = await offlineMutations.guestNeedsWaiverReminder(
        "guest-123",
        "shower"
      );

      expect(result).toBe(false);
    });
  });

  describe("dismissWaiver", () => {
    it("should dismiss a waiver successfully", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: "waiver-id-123",
        error: null,
      });

      const result = await waiverMutations.dismissWaiver(
        "guest-123",
        "shower"
      );

      expect(result).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("dismiss_waiver", {
        p_guest_id: "guest-123",
        p_service_type: "shower",
        p_dismissed_reason: "signed_by_staff",
      });
      expect(
        mockPushAction
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "WAIVER_DISMISSED",
          data: {
            guestId: "guest-123",
            serviceType: "shower",
            reason: "signed_by_staff",
          },
        })
      );
      expect(mockToast.success).toHaveBeenCalledWith("Shower waiver confirmed for this year");
    });

    it("should handle dismissal errors", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: new Error("Dismissal failed"),
      });

      const result = await waiverMutations.dismissWaiver(
        "guest-123",
        "laundry"
      );

      expect(result).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        "Unable to dismiss laundry waiver"
      );
    });

    it("should return false when Supabase is disabled", async () => {
      const offlineMutations = createWaiverMutations({
        supabaseEnabled: false,
        supabaseClient: null,
        pushAction: mockPushAction,
        toast: mockToast,
      });

      const result = await offlineMutations.dismissWaiver("guest-123", "shower");

      expect(result).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith("Offline mode - cannot dismiss waiver");
    });

    it("should use default reason when not provided", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: "waiver-id",
        error: null,
      });

      await waiverMutations.dismissWaiver("guest-123", "shower");

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("dismiss_waiver", {
        p_guest_id: "guest-123",
        p_service_type: "shower",
        p_dismissed_reason: "signed_by_staff",
      });
    });
  });

  describe("hasActiveWaiver", () => {
    it("should return true when guest has active waiver", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await waiverMutations.hasActiveWaiver(
        "guest-123",
        "shower"
      );

      expect(result).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("has_active_waiver", {
        p_guest_id: "guest-123",
        p_service_type: "shower",
      });
    });

    it("should return false when guest does not have active waiver", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await waiverMutations.hasActiveWaiver(
        "guest-123",
        "laundry"
      );

      expect(result).toBe(false);
    });

    it("should handle RPC errors gracefully", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: new Error("RPC failed"),
      });

      const result = await waiverMutations.hasActiveWaiver(
        "guest-123",
        "shower"
      );

      expect(result).toBe(false);
    });
  });

  describe("fetchGuestsNeedingWaivers", () => {
    it("should fetch guests needing waivers", async () => {
      const mockGuests = [
        {
          id: "guest-1",
          external_id: "ext-1",
          full_name: "John Doe",
          service_needed: "shower",
        },
        {
          id: "guest-2",
          external_id: "ext-2",
          full_name: "Jane Smith",
          service_needed: "laundry",
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({ data: mockGuests, error: null }),
          }),
        }),
      });

      const result = await waiverMutations.fetchGuestsNeedingWaivers();

      expect(result).toEqual(mockGuests);
    });

    it("should return empty array on error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Query failed"),
            }),
          }),
        }),
      });

      const result = await waiverMutations.fetchGuestsNeedingWaivers();

      expect(result).toEqual([]);
    });

    it("should return empty array when Supabase is disabled", async () => {
      const offlineMutations = createWaiverMutations({
        supabaseEnabled: false,
        supabaseClient: null,
        pushAction: mockPushAction,
        toast: mockToast,
      });

      const result = await offlineMutations.fetchGuestsNeedingWaivers();

      expect(result).toEqual([]);
    });
  });

  describe("getWaiverStatusSummary", () => {
    it("should return waiver status summary for a guest", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "waiver-1",
                  service_type: "shower",
                  dismissed_at: null,
                },
              ],
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: true, error: null }) // showerNeeds
        .mockResolvedValueOnce({ data: false, error: null }); // laundryNeeds

      const result = await waiverMutations.getWaiverStatusSummary("guest-123");

      expect(result.showerNeeds).toBe(true);
      expect(result.laundryNeeds).toBe(false);
      expect(result.showerWaiver).toBeDefined();
      expect(result.laundryWaiver).toBeNull();
    });

    it("should handle errors and return default values", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Query failed"),
            }),
          }),
        }),
      });

      mockSupabaseClient.rpc.mockRejectedValue(new Error("RPC failed"));

      const result = await waiverMutations.getWaiverStatusSummary("guest-123");

      expect(result).toEqual({
        showerNeeds: false,
        laundryNeeds: false,
        showerWaiver: null,
        laundryWaiver: null,
      });
    });

    it("should return defaults when Supabase is disabled", async () => {
      const offlineMutations = createWaiverMutations({
        supabaseEnabled: false,
        supabaseClient: null,
        pushAction: mockPushAction,
        toast: mockToast,
      });

      const result = await offlineMutations.getWaiverStatusSummary("guest-123");

      expect(result).toEqual({
        showerNeeds: false,
        laundryNeeds: false,
        showerWaiver: null,
        laundryWaiver: null,
      });
    });
  });

  describe("Integration with Action History", () => {
    it("should push action when waiver is dismissed", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: "waiver-id",
        error: null,
      });

      await waiverMutations.dismissWaiver("guest-123", "shower");

      expect(mockPushAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "WAIVER_DISMISSED",
          data: expect.objectContaining({
            guestId: "guest-123",
            serviceType: "shower",
          }),
        })
      );
    });

    it("should include reason in pushed action", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: "waiver-id",
        error: null,
      });

      await waiverMutations.dismissWaiver("guest-123", "laundry", "signed_physical");

      expect(mockPushAction).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: "signed_physical",
          }),
        })
      );
    });
  });

  describe("Toast Notifications", () => {
    it("should show success toast on waiver dismissal", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: "waiver-id",
        error: null,
      });

      await waiverMutations.dismissWaiver("guest-123", "shower");

      expect(mockToast.success).toHaveBeenCalledWith("Shower waiver confirmed for this year");
    });

    it("should show error toast on waiver dismissal failure", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: new Error("Dismissal failed"),
      });

      await waiverMutations.dismissWaiver("guest-123", "shower");

      expect(mockToast.error).toHaveBeenCalledWith(
        "Unable to dismiss shower waiver"
      );
    });

    it("should show error when dismissing in offline mode", async () => {
      const offlineMutations = createWaiverMutations({
        supabaseEnabled: false,
        supabaseClient: null,
        pushAction: mockPushAction,
        toast: mockToast,
      });

      await offlineMutations.dismissWaiver("guest-123", "shower");

      expect(mockToast.error).toHaveBeenCalledWith(
        "Offline mode - cannot dismiss waiver"
      );
    });
  });
});
