import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";

// Mock Supabase
vi.mock("../../supabaseClient", () => ({
  supabase: null,
  isSupabaseEnabled: () => false,
}));

// Must import after mocks are set up
const { useGuestsStore } = await import("../useGuestsStore");

describe("useGuestsStore - Guest Proxies", () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      useGuestsStore.setState({
        guests: [
          { id: "g1", name: "John Doe", firstName: "John", lastName: "Doe", preferredName: "" },
          { id: "g2", name: "Jane Smith", firstName: "Jane", lastName: "Smith", preferredName: "" },
          { id: "g3", name: "Bob Wilson", firstName: "Bob", lastName: "Wilson", preferredName: "Bobby" },
          { id: "g4", name: "Alice Brown", firstName: "Alice", lastName: "Brown", preferredName: "" },
        ],
        guestProxies: [],
      });
    });
  });

  describe("getLinkedGuests", () => {
    it("returns empty array when guest has no linked guests", () => {
      const linkedGuests = useGuestsStore.getState().getLinkedGuests("g1");
      expect(linkedGuests).toEqual([]);
    });

    it("returns linked guests when they exist", () => {
      act(() => {
        useGuestsStore.setState({
          guestProxies: [
            { id: "p1", guestId: "g1", proxyId: "g2", createdAt: new Date().toISOString() },
            { id: "p1-reverse", guestId: "g2", proxyId: "g1", createdAt: new Date().toISOString() },
          ],
        });
      });

      const linkedGuests = useGuestsStore.getState().getLinkedGuests("g1");
      expect(linkedGuests).toHaveLength(1);
      expect(linkedGuests[0].id).toBe("g2");
    });

    it("returns linked guests from both directions of the relationship", () => {
      act(() => {
        useGuestsStore.setState({
          guestProxies: [
            { id: "p1", guestId: "g1", proxyId: "g2", createdAt: new Date().toISOString() },
            { id: "p1-reverse", guestId: "g2", proxyId: "g1", createdAt: new Date().toISOString() },
          ],
        });
      });

      // Should be symmetric
      const linkedFromG1 = useGuestsStore.getState().getLinkedGuests("g1");
      const linkedFromG2 = useGuestsStore.getState().getLinkedGuests("g2");
      
      expect(linkedFromG1).toHaveLength(1);
      expect(linkedFromG2).toHaveLength(1);
      expect(linkedFromG1[0].id).toBe("g2");
      expect(linkedFromG2[0].id).toBe("g1");
    });

    it("returns empty array for null guestId", () => {
      const linkedGuests = useGuestsStore.getState().getLinkedGuests(null);
      expect(linkedGuests).toEqual([]);
    });
  });

  describe("getLinkedGuestsCount", () => {
    it("returns 0 when guest has no linked guests", () => {
      const count = useGuestsStore.getState().getLinkedGuestsCount("g1");
      expect(count).toBe(0);
    });

    it("returns correct count when guest has linked guests", () => {
      act(() => {
        useGuestsStore.setState({
          guestProxies: [
            { id: "p1", guestId: "g1", proxyId: "g2", createdAt: new Date().toISOString() },
            { id: "p1-reverse", guestId: "g2", proxyId: "g1", createdAt: new Date().toISOString() },
            { id: "p2", guestId: "g1", proxyId: "g3", createdAt: new Date().toISOString() },
            { id: "p2-reverse", guestId: "g3", proxyId: "g1", createdAt: new Date().toISOString() },
          ],
        });
      });

      const count = useGuestsStore.getState().getLinkedGuestsCount("g1");
      expect(count).toBe(2);
    });

    it("returns 0 for null guestId", () => {
      const count = useGuestsStore.getState().getLinkedGuestsCount(null);
      expect(count).toBe(0);
    });
  });

  describe("linkGuests", () => {
    it("creates a link between two guests", async () => {
      await act(async () => {
        await useGuestsStore.getState().linkGuests("g1", "g2");
      });

      const proxies = useGuestsStore.getState().guestProxies;
      expect(proxies).toHaveLength(2); // Both directions
      
      const linkedGuests = useGuestsStore.getState().getLinkedGuests("g1");
      expect(linkedGuests).toHaveLength(1);
      expect(linkedGuests[0].id).toBe("g2");
    });

    it("throws error when linking a guest to themselves", async () => {
      await expect(
        act(async () => {
          await useGuestsStore.getState().linkGuests("g1", "g1");
        })
      ).rejects.toThrow("Cannot link a guest to themselves");
    });

    it("throws error when guest IDs are missing", async () => {
      await expect(
        act(async () => {
          await useGuestsStore.getState().linkGuests(null, "g2");
        })
      ).rejects.toThrow("Both guest IDs are required");
    });

    it("throws error when guests are already linked", async () => {
      // First link
      await act(async () => {
        await useGuestsStore.getState().linkGuests("g1", "g2");
      });

      // Try to link again
      await expect(
        act(async () => {
          await useGuestsStore.getState().linkGuests("g1", "g2");
        })
      ).rejects.toThrow("These guests are already linked");
    });

    it("throws error when guest is not found", async () => {
      await expect(
        act(async () => {
          await useGuestsStore.getState().linkGuests("g1", "nonexistent");
        })
      ).rejects.toThrow("One or both guests not found");
    });

    it("throws error when guest has reached maximum links", async () => {
      // Link 3 guests to g1 (maximum)
      await act(async () => {
        await useGuestsStore.getState().linkGuests("g1", "g2");
        await useGuestsStore.getState().linkGuests("g1", "g3");
        await useGuestsStore.getState().linkGuests("g1", "g4");
      });

      // Add a 5th guest
      act(() => {
        useGuestsStore.setState((state) => ({
          guests: [...state.guests, { id: "g5", name: "Eve Extra", firstName: "Eve", lastName: "Extra", preferredName: "" }],
        }));
      });

      // Try to link a 4th guest
      await expect(
        act(async () => {
          await useGuestsStore.getState().linkGuests("g1", "g5");
        })
      ).rejects.toThrow("already has 3 linked accounts");
    });
  });

  describe("unlinkGuests", () => {
    beforeEach(async () => {
      // Set up a link before each unlink test
      await act(async () => {
        await useGuestsStore.getState().linkGuests("g1", "g2");
      });
    });

    it("removes the link between two guests", async () => {
      // Verify link exists
      expect(useGuestsStore.getState().getLinkedGuests("g1")).toHaveLength(1);

      await act(async () => {
        await useGuestsStore.getState().unlinkGuests("g1", "g2");
      });

      const linkedGuests = useGuestsStore.getState().getLinkedGuests("g1");
      expect(linkedGuests).toHaveLength(0);
    });

    it("removes link from both directions", async () => {
      await act(async () => {
        await useGuestsStore.getState().unlinkGuests("g1", "g2");
      });

      expect(useGuestsStore.getState().getLinkedGuests("g1")).toHaveLength(0);
      expect(useGuestsStore.getState().getLinkedGuests("g2")).toHaveLength(0);
    });

    it("throws error when guests are not linked", async () => {
      await expect(
        act(async () => {
          await useGuestsStore.getState().unlinkGuests("g1", "g3");
        })
      ).rejects.toThrow("These guests are not linked");
    });

    it("throws error when guest IDs are missing", async () => {
      await expect(
        act(async () => {
          await useGuestsStore.getState().unlinkGuests(null, "g2");
        })
      ).rejects.toThrow("Both guest IDs are required");
    });
  });

  describe("clearGuestProxies", () => {
    it("clears all guest proxies", async () => {
      // Set up some links
      await act(async () => {
        await useGuestsStore.getState().linkGuests("g1", "g2");
        await useGuestsStore.getState().linkGuests("g1", "g3");
      });

      expect(useGuestsStore.getState().guestProxies.length).toBeGreaterThan(0);

      act(() => {
        useGuestsStore.getState().clearGuestProxies();
      });

      expect(useGuestsStore.getState().guestProxies).toHaveLength(0);
    });
  });
});
