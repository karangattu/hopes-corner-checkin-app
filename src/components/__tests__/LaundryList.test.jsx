import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LaundryList from "../LaundryList";

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

    expect(mockSetList).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it("disables slot selection when slot is already taken", () => {
    const listWithTakenSlot = [
      { id: "1", name: "Alice", slot: "" },
      { id: "2", name: "Bob", slot: "9:30 - 10:30" },
    ];
    render(<LaundryList list={listWithTakenSlot} setList={mockSetList} />);

    const select = screen.getAllByRole("combobox")[0];
    const options = select.querySelectorAll("option");
    const takenOption = Array.from(options).find(opt => opt.value === "9:30 - 10:30");
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

    const removeButtons = screen.getAllByRole("button");
    fireEvent.click(removeButtons[1]); // Second button (first is select, second is remove)

    expect(mockSetList).toHaveBeenCalledWith(
      expect.any(Function)
    );
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
});