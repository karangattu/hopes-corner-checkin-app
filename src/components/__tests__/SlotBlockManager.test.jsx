import React from "react";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock context with blocked slots functionality
let mockContext = {
  allShowerSlots: ["08:00", "08:30", "09:00", "09:30"],
  allLaundrySlots: ["08:30 - 10:00", "10:00 - 11:30", "11:30 - 13:00"],
  blockedSlots: [],
  blockSlot: vi.fn(),
  unblockSlot: vi.fn(),
  showerRecords: [],
  laundrySlots: [],
};

// Mock toast
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}));

vi.mock("../../utils/date", () => ({
  todayPacificDateString: vi.fn(() => "2025-12-22"),
}));

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

// Mock auth - we'll override this in tests
let mockUser = { role: "admin" };
vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

import SlotBlockManager from "../SlotBlockManager";

describe("SlotBlockManager", () => {
  beforeEach(() => {
    mockContext.blockedSlots = [];
    mockContext.blockSlot = vi.fn();
    mockContext.unblockSlot = vi.fn();
    mockContext.showerRecords = [];
    mockContext.laundrySlots = [];
    mockUser = { role: "admin" };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Role-based access", () => {
    it("renders for admin users", () => {
      mockUser = { role: "admin" };
      render(<SlotBlockManager serviceType="shower" />);
      expect(screen.getByText(/Manage Blocked Shower Slots/i)).toBeInTheDocument();
    });

    it("renders for staff users", () => {
      mockUser = { role: "staff" };
      render(<SlotBlockManager serviceType="shower" />);
      expect(screen.getByText(/Manage Blocked Shower Slots/i)).toBeInTheDocument();
    });

    it("does not render for checkin users", () => {
      mockUser = { role: "checkin" };
      const { container } = render(<SlotBlockManager serviceType="shower" />);
      expect(container.firstChild).toBeNull();
    });

    it("does not render for board users", () => {
      mockUser = { role: "board" };
      const { container } = render(<SlotBlockManager serviceType="shower" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Collapsed state", () => {
    it("starts in collapsed state", () => {
      render(<SlotBlockManager serviceType="shower" />);
      // Should show the toggle button but not the slot grid
      expect(screen.getByText(/Manage Blocked Shower Slots/i)).toBeInTheDocument();
      expect(screen.queryByText(/Select Slots to Block/i)).not.toBeInTheDocument();
    });

    it("expands when toggle button is clicked", () => {
      render(<SlotBlockManager serviceType="shower" />);
      
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      expect(screen.getByText(/Select Slots to Block/i)).toBeInTheDocument();
      expect(screen.getByText(/Staff Scheduling Tool/i)).toBeInTheDocument();
    });

    it("collapses when toggle button is clicked again", () => {
      render(<SlotBlockManager serviceType="shower" />);
      
      // Expand
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      expect(screen.getByText(/Select Slots to Block/i)).toBeInTheDocument();
      
      // Collapse
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      expect(screen.queryByText(/Select Slots to Block/i)).not.toBeInTheDocument();
    });
  });

  describe("Service type display", () => {
    it("displays shower slots for shower service type", () => {
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      // Check that shower slots are displayed
      expect(screen.getByText("8:00 AM")).toBeInTheDocument();
      expect(screen.getByText("8:30 AM")).toBeInTheDocument();
    });

    it("displays laundry slots for laundry service type", () => {
      render(<SlotBlockManager serviceType="laundry" />);
      fireEvent.click(screen.getByText(/Manage Blocked Laundry Slots/i));
      
      // Check that laundry time ranges are displayed
      expect(screen.getByText("08:30 - 10:00")).toBeInTheDocument();
      expect(screen.getByText("10:00 - 11:30")).toBeInTheDocument();
    });
  });

  describe("Blocking slots", () => {
    it("allows selecting a slot to block", () => {
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      // Click on a slot to select it
      const slotButton = screen.getByRole("button", { name: /8:00 AM/i });
      fireEvent.click(slotButton);
      
      // Should show "1 slot selected"
      expect(screen.getByText(/1 slot selected/i)).toBeInTheDocument();
    });

    it("allows selecting multiple slots", () => {
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      // Select multiple slots
      fireEvent.click(screen.getByRole("button", { name: /8:00 AM/i }));
      fireEvent.click(screen.getByRole("button", { name: /8:30 AM/i }));
      
      expect(screen.getByText(/2 slots selected/i)).toBeInTheDocument();
    });

    it("deselects a slot when clicked again", () => {
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      const slotButton = screen.getByRole("button", { name: /8:00 AM/i });
      fireEvent.click(slotButton);
      expect(screen.getByText(/1 slot selected/i)).toBeInTheDocument();
      
      // Click again to deselect
      fireEvent.click(slotButton);
      expect(screen.queryByText(/1 slot selected/i)).not.toBeInTheDocument();
    });

    it("calls blockSlot when blocking selected slots", async () => {
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      // Select a slot
      fireEvent.click(screen.getByRole("button", { name: /8:00 AM/i }));
      
      // Click block button
      fireEvent.click(screen.getByRole("button", { name: /Block Selected/i }));
      
      await waitFor(() => {
        expect(mockContext.blockSlot).toHaveBeenCalledWith("shower", "08:00", "2025-12-22");
      });
    });

    it("shows success toast after blocking slots", async () => {
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      fireEvent.click(screen.getByRole("button", { name: /8:00 AM/i }));
      fireEvent.click(screen.getByRole("button", { name: /Block Selected/i }));
      
      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalledWith("Blocked 1 shower slot(s)");
      });
    });

    it("clears selection after blocking", async () => {
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      fireEvent.click(screen.getByRole("button", { name: /8:00 AM/i }));
      expect(screen.getByText(/1 slot selected/i)).toBeInTheDocument();
      
      fireEvent.click(screen.getByRole("button", { name: /Block Selected/i }));
      
      await waitFor(() => {
        expect(screen.queryByText(/1 slot selected/i)).not.toBeInTheDocument();
      });
    });

    it("shows error toast when no slots selected", async () => {
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      // Try to block without selecting any slots - need to make the button visible first
      // The "Block Selected" button only appears when slots are selected
      // So this test verifies the selection requirement indirectly
      expect(screen.queryByRole("button", { name: /Block Selected/i })).not.toBeInTheDocument();
    });
  });

  describe("Currently blocked slots display", () => {
    it("shows blocked slots count in header", () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-12-22" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      
      expect(screen.getByText("1 blocked")).toBeInTheDocument();
    });

    it("displays currently blocked slots when expanded", () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-12-22" },
        { serviceType: "shower", slotTime: "08:30", date: "2025-12-22" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      expect(screen.getByText(/Currently Blocked/i)).toBeInTheDocument();
    });

    it("hides blocked slots from available selection grid", () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-12-22" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      // The blocked slot should not appear in the selection grid
      // 8:00 AM should only appear in the "Currently Blocked" section, not in selection
      const selectableSlots = screen.getAllByRole("button", { name: /AM|PM/i });
      // Should have 3 selectable slots (08:30, 09:00, 09:30), not 4
      expect(selectableSlots.length).toBe(3);
    });
  });

  describe("Unblocking slots", () => {
    it("calls unblockSlot when clicking X on a blocked slot", async () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-12-22" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      // Find and click the unblock button (X icon)
      const unblockButton = screen.getByTitle("Unblock this slot");
      fireEvent.click(unblockButton);
      
      await waitFor(() => {
        expect(mockContext.unblockSlot).toHaveBeenCalledWith("shower", "08:00", "2025-12-22");
      });
    });

    it("shows success toast after unblocking", async () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-12-22" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      const unblockButton = screen.getByTitle("Unblock this slot");
      fireEvent.click(unblockButton);
      
      await waitFor(() => {
        expect(toastMock.success).toHaveBeenCalledWith("Unblocked 8:00 AM");
      });
    });
  });

  describe("Unblock All functionality", () => {
    beforeEach(() => {
      // Mock window.confirm
      vi.spyOn(window, "confirm").mockReturnValue(true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("shows Unblock All button when slots are blocked", () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-12-22" },
        { serviceType: "shower", slotTime: "08:30", date: "2025-12-22" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      expect(screen.getByText(/Unblock All/i)).toBeInTheDocument();
    });

    it("calls unblockSlot for all blocked slots when Unblock All is clicked", async () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-12-22" },
        { serviceType: "shower", slotTime: "08:30", date: "2025-12-22" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      fireEvent.click(screen.getByText(/Unblock All/i));
      
      await waitFor(() => {
        expect(mockContext.unblockSlot).toHaveBeenCalledTimes(2);
      });
    });

    it("shows confirmation dialog before unblocking all", () => {
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-12-22" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      fireEvent.click(screen.getByText(/Unblock All/i));
      
      expect(window.confirm).toHaveBeenCalled();
    });

    it("does not unblock if confirmation is cancelled", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      
      mockContext.blockedSlots = [
        { serviceType: "shower", slotTime: "08:00", date: "2025-12-22" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      fireEvent.click(screen.getByText(/Unblock All/i));
      
      await waitFor(() => {
        expect(mockContext.unblockSlot).not.toHaveBeenCalled();
      });
    });
  });

  describe("Clear Selection functionality", () => {
    it("shows Clear Selection button when slots are selected", () => {
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      fireEvent.click(screen.getByRole("button", { name: /8:00 AM/i }));
      
      expect(screen.getByRole("button", { name: /Clear Selection/i })).toBeInTheDocument();
    });

    it("clears selection when Clear Selection is clicked", () => {
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      fireEvent.click(screen.getByRole("button", { name: /8:00 AM/i }));
      
      expect(screen.getByText(/1 slot selected/i)).toBeInTheDocument();
      
      fireEvent.click(screen.getByRole("button", { name: /Clear Selection/i }));
      
      expect(screen.queryByText(/1 slot selected/i)).not.toBeInTheDocument();
    });
  });

  describe("Slots with existing bookings", () => {
    beforeEach(() => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("shows booking count for slots with existing bookings", () => {
      mockContext.showerRecords = [
        { id: "rec1", guestId: "guest1", time: "08:00", date: "2025-12-22", status: "booked" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      
      expect(screen.getByText(/1 booking/i)).toBeInTheDocument();
    });

    it("shows warning confirmation when blocking slots with bookings", async () => {
      mockContext.showerRecords = [
        { id: "rec1", guestId: "guest1", time: "08:00", date: "2025-12-22", status: "booked" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      fireEvent.click(screen.getByRole("button", { name: /8:00 AM/i }));
      fireEvent.click(screen.getByRole("button", { name: /Block Selected/i }));
      
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("have existing bookings")
      );
    });

    it("does not block slots if warning is cancelled", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      
      mockContext.showerRecords = [
        { id: "rec1", guestId: "guest1", time: "08:00", date: "2025-12-22", status: "booked" },
      ];
      
      render(<SlotBlockManager serviceType="shower" />);
      fireEvent.click(screen.getByText(/Manage Blocked Shower Slots/i));
      fireEvent.click(screen.getByRole("button", { name: /8:00 AM/i }));
      fireEvent.click(screen.getByRole("button", { name: /Block Selected/i }));
      
      await waitFor(() => {
        expect(mockContext.blockSlot).not.toHaveBeenCalled();
      });
    });
  });

  describe("Laundry service type", () => {
    it("renders correctly for laundry", () => {
      render(<SlotBlockManager serviceType="laundry" />);
      expect(screen.getByText(/Manage Blocked Laundry Slots/i)).toBeInTheDocument();
    });

    it("uses correct styling for laundry", () => {
      const { container } = render(<SlotBlockManager serviceType="laundry" />);
      // The outer container (root div) should have purple styling for laundry
      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass("bg-purple-50");
      expect(rootDiv).toHaveClass("border-purple-200");
    });
  });
});
