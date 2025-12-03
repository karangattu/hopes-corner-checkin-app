import React from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LaundryList from "../LaundryList";

const hapticsMock = vi.hoisted(() => ({
  selection: vi.fn(),
  delete: vi.fn(),
  actionSuccess: vi.fn(),
  complete: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../../utils/haptics", () => ({
  __esModule: true,
  default: hapticsMock,
}));

vi.mock("../../utils/toast", () => ({
  __esModule: true,
  default: toastMock,
}));

describe("LaundryList", () => {
  let mockSetList;
  let initialList;

  beforeEach(() => {
    mockSetList = vi.fn();
    initialList = [
      { id: "1", name: "Alice", slot: "" },
      { id: "2", name: "Bob", slot: "8:30 - 9:30" },
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty list message when no guests", () => {
    render(<LaundryList list={[]} setList={mockSetList} />);
    expect(screen.getByText("Laundry list is empty.")).toBeInTheDocument();
  });

  it("renders list of guests with slots", () => {
    render(<LaundryList list={initialList} setList={mockSetList} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByText("8:30 - 9:30").length).toBeGreaterThan(0);
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("allows selecting a slot for a guest", () => {
    render(<LaundryList list={initialList} setList={mockSetList} />);

    const select = screen.getAllByRole("combobox")[0]; // First guest's select
    fireEvent.change(select, { target: { value: "9:30 - 10:30" } });

    expect(mockSetList).toHaveBeenCalledWith(expect.any(Function));
  });

  it("disables slot selection when slot is already taken", () => {
    const listWithTakenSlot = [
      { id: "1", name: "Alice", slot: "" },
      { id: "2", name: "Bob", slot: "9:30 - 10:30" },
    ];
    render(<LaundryList list={listWithTakenSlot} setList={mockSetList} />);

    const select = screen.getAllByRole("combobox")[0];
    const options = select.querySelectorAll("option");
    const takenOption = Array.from(options).find(
      (opt) => opt.value === "9:30 - 10:30",
    );
    expect(takenOption).toBeDisabled();
  });

  it("disables all selects when 5 slots are used", () => {
    const fullList = Array.from({ length: 5 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Guest ${i + 1}`,
      slot: `Slot ${i + 1}`,
    }));
    fullList.push({ id: "6", name: "New Guest", slot: "" });

    render(<LaundryList list={fullList} setList={mockSetList} />);

    const selects = screen.getAllByRole("combobox");
    const lastSelect = selects[selects.length - 1]; // New guest's select
    expect(lastSelect).toBeDisabled();
  });

  it("allows removing a guest", () => {
    render(<LaundryList list={initialList} setList={mockSetList} />);

    const removeButton = screen.getByLabelText(
      "Remove Alice from laundry list",
    );
    fireEvent.click(removeButton);

    expect(mockSetList).toHaveBeenCalledWith(expect.any(Function));
    expect(hapticsMock.delete).toHaveBeenCalled();
    expect(toastMock.warning).toHaveBeenCalled();
  });

  it("shows assigned slot next to guest name", () => {
    render(<LaundryList list={initialList} setList={mockSetList} />);

    expect(screen.getAllByText("8:30 - 9:30").length).toBeGreaterThan(0);
  });

  it("updates slots used counter correctly", () => {
    const partialList = [
      { id: "1", name: "Alice", slot: "8:30 - 9:30" },
      { id: "2", name: "Bob", slot: "9:30 - 10:30" },
      { id: "3", name: "Charlie", slot: "" },
    ];
    render(<LaundryList list={partialList} setList={mockSetList} />);

    expect(screen.getByText("2 / 5")).toBeInTheDocument();
  });

  it("invokes refresh handler after pull-to-refresh gesture", async () => {
    const onRefresh = vi.fn();
    render(
      <LaundryList
        list={initialList}
        setList={mockSetList}
        onRefresh={onRefresh}
      />,
    );

    const container = screen.getByTestId("laundry-list-container");
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, {
      touches: [{ clientY: 180 }],
      preventDefault: vi.fn(),
    });
    fireEvent.touchEnd(container);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      "Laundry list refreshed",
      expect.any(Object),
    );
  });

  it("marks a guest complete after swipe gesture", () => {
    render(<LaundryList list={initialList} setList={mockSetList} />);

    const item = screen.getByTestId("laundry-list-item-1");
    fireEvent.touchStart(item, { touches: [{ clientX: 160 }] });
    fireEvent.touchMove(item, {
      touches: [{ clientX: 0 }],
      preventDefault: vi.fn(),
    });
    fireEvent.touchEnd(item);

    expect(mockSetList).toHaveBeenCalledWith(expect.any(Function));
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringContaining("Alice"),
      expect.any(Object),
    );
    expect(hapticsMock.complete).toHaveBeenCalled();
  });

  describe("duplicate slot prevention", () => {
    it("prevents assigning the same slot to two guests", () => {
      const listWithSlot = [
        { id: "1", name: "Alice", slot: "" },
        { id: "2", name: "Bob", slot: "9:30 - 10:30" },
      ];
      
      // Create a mock that captures the updater function
      let capturedUpdater;
      const mockSetListCapture = vi.fn((updater) => {
        capturedUpdater = updater;
      });

      render(<LaundryList list={listWithSlot} setList={mockSetListCapture} />);

      // Try to assign Alice to Bob's slot
      const select = screen.getAllByRole("combobox")[0];
      fireEvent.change(select, { target: { value: "9:30 - 10:30" } });

      // Execute the captured updater with the current list
      const result = capturedUpdater(listWithSlot);

      // The list should remain unchanged since slot is already taken
      expect(result).toEqual(listWithSlot);
      expect(toastMock.error).toHaveBeenCalledWith(
        "Slot 9:30 - 10:30 is already assigned to another guest",
        expect.any(Object),
      );
    });

    it("allows assigning an available slot", () => {
      const listWithSlot = [
        { id: "1", name: "Alice", slot: "" },
        { id: "2", name: "Bob", slot: "9:30 - 10:30" },
      ];
      
      let capturedUpdater;
      const mockSetListCapture = vi.fn((updater) => {
        capturedUpdater = updater;
      });

      render(<LaundryList list={listWithSlot} setList={mockSetListCapture} />);

      // Assign Alice to an available slot
      const select = screen.getAllByRole("combobox")[0];
      fireEvent.change(select, { target: { value: "10:30 - 11:30" } });

      // Execute the captured updater with the current list
      const result = capturedUpdater(listWithSlot);

      // Alice should now have the slot
      expect(result).toEqual([
        { id: "1", name: "Alice", slot: "10:30 - 11:30" },
        { id: "2", name: "Bob", slot: "9:30 - 10:30" },
      ]);
      expect(toastMock.error).not.toHaveBeenCalled();
    });

    it("allows clearing a slot (selecting empty value)", () => {
      const listWithSlots = [
        { id: "1", name: "Alice", slot: "8:30 - 9:30" },
        { id: "2", name: "Bob", slot: "9:30 - 10:30" },
      ];
      
      let capturedUpdater;
      const mockSetListCapture = vi.fn((updater) => {
        capturedUpdater = updater;
      });

      render(<LaundryList list={listWithSlots} setList={mockSetListCapture} />);

      // Clear Alice's slot (Select Slot option has empty value)
      const select = screen.getAllByRole("combobox")[0];
      fireEvent.change(select, { target: { value: "" } });

      // Execute the captured updater with the current list
      const result = capturedUpdater(listWithSlots);

      // Alice's slot should be cleared
      expect(result).toEqual([
        { id: "1", name: "Alice", slot: "" },
        { id: "2", name: "Bob", slot: "9:30 - 10:30" },
      ]);
      expect(toastMock.error).not.toHaveBeenCalled();
    });

    it("allows reassigning a guest to their own current slot", () => {
      const listWithSlots = [
        { id: "1", name: "Alice", slot: "8:30 - 9:30" },
        { id: "2", name: "Bob", slot: "9:30 - 10:30" },
      ];
      
      let capturedUpdater;
      const mockSetListCapture = vi.fn((updater) => {
        capturedUpdater = updater;
      });

      render(<LaundryList list={listWithSlots} setList={mockSetListCapture} />);

      // Alice selects her current slot again (should be allowed)
      const select = screen.getAllByRole("combobox")[0];
      fireEvent.change(select, { target: { value: "8:30 - 9:30" } });

      // Execute the captured updater with the current list
      const result = capturedUpdater(listWithSlots);

      // List should remain the same (same slot assigned)
      expect(result).toEqual([
        { id: "1", name: "Alice", slot: "8:30 - 9:30" },
        { id: "2", name: "Bob", slot: "9:30 - 10:30" },
      ]);
      expect(toastMock.error).not.toHaveBeenCalled();
    });

    it("prevents race condition when multiple guests try to claim same slot", () => {
      const listWithoutSlots = [
        { id: "1", name: "Alice", slot: "" },
        { id: "2", name: "Bob", slot: "" },
        { id: "3", name: "Charlie", slot: "" },
      ];
      
      let capturedUpdaters = [];
      const mockSetListCapture = vi.fn((updater) => {
        capturedUpdaters.push(updater);
      });

      render(<LaundryList list={listWithoutSlots} setList={mockSetListCapture} />);

      // Simulate both Alice and Bob trying to select the same slot
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[0], { target: { value: "10:30 - 11:30" } }); // Alice
      fireEvent.change(selects[1], { target: { value: "10:30 - 11:30" } }); // Bob

      // First call should succeed
      const afterAlice = capturedUpdaters[0](listWithoutSlots);
      expect(afterAlice).toEqual([
        { id: "1", name: "Alice", slot: "10:30 - 11:30" },
        { id: "2", name: "Bob", slot: "" },
        { id: "3", name: "Charlie", slot: "" },
      ]);

      // Second call should fail because Alice now has the slot
      const afterBob = capturedUpdaters[1](afterAlice);
      expect(afterBob).toEqual(afterAlice); // List unchanged
      expect(toastMock.error).toHaveBeenCalledWith(
        "Slot 10:30 - 11:30 is already assigned to another guest",
        expect.any(Object),
      );
    });
  });
});
