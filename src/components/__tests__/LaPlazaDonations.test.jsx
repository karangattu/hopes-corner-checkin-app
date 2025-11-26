import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LaPlazaDonations from "../LaPlazaDonations";
import toast from "react-hot-toast";
import { useAppContext } from "../../context/useAppContext";
import { todayPacificDateString } from "../../utils/date";

vi.mock("../../context/useAppContext");

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("LaPlazaDonations Component", () => {
  const todayKey = todayPacificDateString();
  const mockContext = {
    laPlazaDonations: [],
    addLaPlazaDonation: vi.fn(),
    LA_PLAZA_CATEGORIES: [
      "Bakery",
      "Beverages",
      "Dairy",
      "Meat",
      "Mix",
      "Nonfood",
      "Prepared/Perishable",
      "Produce",
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContext.mockReturnValue(mockContext);
  });

  it("renders the component and default date", () => {
    render(<LaPlazaDonations />);
    expect(screen.getByText("La Plaza Market donations")).toBeInTheDocument();
    // The selected date element shows the ISO date key for the selected day
    expect(screen.getByText(todayKey)).toBeInTheDocument();
  });

  it("shows category options and defaults to first category", () => {
    render(<LaPlazaDonations />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(select.value).toBe(mockContext.LA_PLAZA_CATEGORIES[0]);
    // All categories present
    for (const c of mockContext.LA_PLAZA_CATEGORIES) {
      expect(screen.getByRole("option", { name: c })).toBeInTheDocument();
    }
  });

  it("requires a positive weight (lbs) before adding a donation", async () => {
    const user = userEvent.setup();
    render(<LaPlazaDonations />);
    // Leave weight blank and try to submit
    const weightInput = screen.getByPlaceholderText(/Weight \(lbs\)/i);
    await user.clear(weightInput);

    const saveButton = screen.getByRole("button", { name: /Save/i });
    await user.click(saveButton);
    expect(mockContext.addLaPlazaDonation).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("allows adding a new La Plaza donation and calls context function with correct payload", async () => {
    const user = userEvent.setup();
    mockContext.addLaPlazaDonation = vi.fn().mockResolvedValue({});
    useAppContext.mockReturnValue(mockContext);

    render(<LaPlazaDonations />);

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "Produce");
    const weightInput = screen.getByPlaceholderText(/Weight \(lbs\)/i);
    await user.clear(weightInput);
    await user.type(weightInput, "12.5");
    const notesInput = screen.getByPlaceholderText(/Notes/);
    await user.type(notesInput, "Bags of salad");

    const saveButton = screen.getByRole("button", { name: /Save/i });
    await user.click(saveButton);

    expect(mockContext.addLaPlazaDonation).toHaveBeenCalledTimes(1);
    const payload = mockContext.addLaPlazaDonation.mock.calls[0][0];
    expect(payload.category).toBe("Produce");
    expect(payload.weightLbs).toBeCloseTo(12.5);
    expect(payload.notes).toBe("Bags of salad");
    expect(payload.receivedAt).toBeTruthy();
  });

  it("navigates dates back and forward and displays entries for date", async () => {
    const user = userEvent.setup();
    const mockDateKey = "2025-01-05";
    const recordForDate = {
      id: "r1",
      category: "Bakery",
      weightLbs: 10,
      notes: "Bread bags",
      dateKey: mockDateKey,
    };
    mockContext.laPlazaDonations = [recordForDate];
    useAppContext.mockReturnValue(mockContext);
    render(<LaPlazaDonations />);

    const dateInput = screen.getByLabelText("select-date");
    await user.clear(dateInput);
    await user.type(dateInput, mockDateKey);
    // click save to ensure component reads new date and shows entries

    // The entry should appear for the selected date: check within the donations list
    const list = screen.getByRole("list");
    expect(await within(list).findByText("Bakery")).toBeInTheDocument();
    expect(within(list).getByText(/Bread bags/i)).toBeInTheDocument();
  });

  it("prev/next buttons move selected date", async () => {
    const user = userEvent.setup();
    render(<LaPlazaDonations />);
    const dateInput = screen.getByLabelText("select-date");
    const initial = dateInput.value;
    const prevBtn = screen.getByLabelText("prev-day");
    const nextBtn = screen.getByLabelText("next-day");
    await user.click(prevBtn);
    expect(dateInput.value).not.toBe(initial);
    await user.click(nextBtn);
    // Should return back to initial date
    expect(dateInput.value).toBe(initial);
  });
});
