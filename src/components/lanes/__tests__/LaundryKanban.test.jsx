import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import LaundryKanban from "../LaundryKanban";
import { LAUNDRY_STATUS } from "../../../context/constants";

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("LaundryKanban bag enforcement", () => {
  const guest = { id: "guest-1", name: "Jane Doe" };
  const baseRecord = {
    id: "laundry-1",
    guestId: guest.id,
    status: LAUNDRY_STATUS.WAITING,
    bagNumber: "",
    offsite: false,
  };

  const setup = (overrides = {}) => {
    const props = {
      laundryRecords: [baseRecord],
      guests: [guest],
      updateLaundryStatus: vi.fn().mockResolvedValue(true),
      updateLaundryBagNumber: vi.fn().mockResolvedValue(true),
      cancelLaundryRecord: vi.fn(),
      ...overrides,
    };

    render(<LaundryKanban {...props} />);
    return props;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("calls attempt handler before leaving waiting without a bag via select", async () => {
    const attemptLaundryStatusChange = vi.fn();
    const props = setup({ attemptLaundryStatusChange });

    const toggleButton = screen.getByLabelText(
      /Expand laundry details for Jane Doe/i,
    );
    fireEvent.click(toggleButton);

    const statusSelect = screen.getByLabelText(
      /Update laundry status for Jane Doe/i,
    );
    fireEvent.change(statusSelect, {
      target: { value: LAUNDRY_STATUS.WASHER },
    });

    expect(attemptLaundryStatusChange).toHaveBeenCalledTimes(1);
    expect(attemptLaundryStatusChange.mock.calls[0][0]).toMatchObject({
      id: baseRecord.id,
    });
    expect(attemptLaundryStatusChange.mock.calls[0][1]).toBe(
      LAUNDRY_STATUS.WASHER,
    );
    expect(props.updateLaundryStatus).not.toHaveBeenCalled();
  });

  it("updates status directly when bag number already exists", async () => {
    const baggedRecord = { ...baseRecord, bagNumber: "42" };
    const attemptLaundryStatusChange = vi.fn();
    const props = setup({
      laundryRecords: [baggedRecord],
      attemptLaundryStatusChange,
    });

    const toggleButton = screen.getByLabelText(
      /Expand laundry details for Jane Doe/i,
    );
    fireEvent.click(toggleButton);

    const statusSelect = screen.getByLabelText(
      /Update laundry status for Jane Doe/i,
    );
    fireEvent.change(statusSelect, {
      target: { value: LAUNDRY_STATUS.WASHER },
    });

    expect(attemptLaundryStatusChange).not.toHaveBeenCalled();
    expect(props.updateLaundryStatus).toHaveBeenCalledWith(
      baggedRecord.id,
      LAUNDRY_STATUS.WASHER,
    );
  });

  it("prevents drag-and-drop move without bag until handled", async () => {
    const attemptLaundryStatusChange = vi.fn();
    const props = setup({ attemptLaundryStatusChange });

    const card = screen.getByTestId(`laundry-card-${baseRecord.id}`);
    const washerColumn = screen.getByTestId(
      `onsite-column-${LAUNDRY_STATUS.WASHER}`,
    );

    const dataTransfer = {
      effectAllowed: "move",
      dropEffect: "move",
      setData: vi.fn(),
      getData: vi.fn(),
    };

    await act(async () => {
      fireEvent.dragStart(card, { dataTransfer });
    });

    await act(async () => {
      fireEvent.dragOver(washerColumn, {
        dataTransfer,
        preventDefault: () => {},
      });
      fireEvent.drop(washerColumn, {
        dataTransfer,
        preventDefault: () => {},
      });
    });

    expect(attemptLaundryStatusChange).toHaveBeenCalledTimes(1);
    expect(props.updateLaundryStatus).not.toHaveBeenCalled();
  });
});

describe("LaundryKanban time tracking tooltip", () => {
  const guest = { id: "guest-1", name: "Jane Doe" };

  const setup = (overrides = {}) => {
    const props = {
      laundryRecords: [],
      guests: [guest],
      updateLaundryStatus: vi.fn().mockResolvedValue(true),
      updateLaundryBagNumber: vi.fn().mockResolvedValue(true),
      cancelLaundryRecord: vi.fn(),
      ...overrides,
    };

    render(<LaundryKanban {...props} />);
    return props;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("displays time tracker element for non-completed records with timestamps", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    const record = {
      id: "laundry-1",
      guestId: guest.id,
      status: LAUNDRY_STATUS.WAITING,
      bagNumber: "",
      laundryType: "onsite",
      createdAt: oneHourAgo,
      lastUpdated: thirtyMinsAgo,
    };

    setup({ laundryRecords: [record] });

    const timeTracker = screen.getByTestId(`laundry-time-tracker-${record.id}`);
    expect(timeTracker).toBeInTheDocument();
  });

  it("does not display time tracker for completed records", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const record = {
      id: "laundry-1",
      guestId: guest.id,
      status: LAUNDRY_STATUS.PICKED_UP,
      bagNumber: "42",
      laundryType: "onsite",
      createdAt: oneHourAgo,
      lastUpdated: oneHourAgo,
    };

    setup({ laundryRecords: [record] });

    const timeTracker = screen.queryByTestId(`laundry-time-tracker-${record.id}`);
    expect(timeTracker).not.toBeInTheDocument();
  });

  it("shows tooltip with dropoff and status time information", () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const record = {
      id: "laundry-1",
      guestId: guest.id,
      status: LAUNDRY_STATUS.WASHER,
      bagNumber: "42",
      laundryType: "onsite",
      createdAt: twoHoursAgo,
      lastUpdated: oneHourAgo,
    };

    setup({ laundryRecords: [record] });

    const timeTracker = screen.getByTestId(`laundry-time-tracker-${record.id}`);
    expect(timeTracker).toHaveAttribute("title");
    expect(timeTracker.getAttribute("title")).toContain("Dropoff:");
    expect(timeTracker.getAttribute("title")).toContain("In current status:");
  });

  it("displays time tracker for offsite records in non-completed status", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const record = {
      id: "laundry-1",
      guestId: guest.id,
      status: LAUNDRY_STATUS.PENDING,
      bagNumber: "",
      laundryType: "offsite",
      createdAt: oneHourAgo,
      lastUpdated: oneHourAgo,
    };

    setup({ laundryRecords: [record] });

    const timeTracker = screen.getByTestId(`laundry-time-tracker-${record.id}`);
    expect(timeTracker).toBeInTheDocument();
  });

  it("does not display time tracker for offsite picked-up records", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const record = {
      id: "laundry-1",
      guestId: guest.id,
      status: LAUNDRY_STATUS.OFFSITE_PICKED_UP,
      bagNumber: "",
      laundryType: "offsite",
      createdAt: oneHourAgo,
      lastUpdated: oneHourAgo,
    };

    setup({ laundryRecords: [record] });

    const timeTracker = screen.queryByTestId(`laundry-time-tracker-${record.id}`);
    expect(timeTracker).not.toBeInTheDocument();
  });

  it("handles records without timestamps gracefully", () => {
    const record = {
      id: "laundry-1",
      guestId: guest.id,
      status: LAUNDRY_STATUS.WAITING,
      bagNumber: "",
      laundryType: "onsite",
      createdAt: null,
      lastUpdated: null,
    };

    setup({ laundryRecords: [record] });

    // Should not crash and should not show time tracker without timestamps
    const timeTracker = screen.queryByTestId(`laundry-time-tracker-${record.id}`);
    expect(timeTracker).not.toBeInTheDocument();
  });

  it("shows different time formats based on elapsed time", () => {
    const now = new Date();
    // 45 minutes ago - should show just minutes
    const fortyFiveMinsAgo = new Date(now.getTime() - 45 * 60 * 1000).toISOString();

    const record = {
      id: "laundry-1",
      guestId: guest.id,
      status: LAUNDRY_STATUS.WAITING,
      bagNumber: "",
      laundryType: "onsite",
      createdAt: fortyFiveMinsAgo,
      lastUpdated: fortyFiveMinsAgo,
    };

    setup({ laundryRecords: [record] });

    const timeTracker = screen.getByTestId(`laundry-time-tracker-${record.id}`);
    // Text should include the time format (45m or similar)
    expect(timeTracker.textContent).toMatch(/\d+m/);
  });
});
