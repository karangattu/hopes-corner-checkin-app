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
