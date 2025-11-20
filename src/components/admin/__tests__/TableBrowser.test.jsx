import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import TableBrowser from "../TableBrowser";

const { mockExportDataAsCSV, mockToast } = vi.hoisted(() => ({
  mockExportDataAsCSV: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: mockToast,
}));

vi.mock("../../../context/useAppContext", () => ({
  useAppContext: vi.fn(() => ({
    exportDataAsCSV: mockExportDataAsCSV,
    guests: [
      {
        id: "guest-1",
        guestId: "G001",
        firstName: "John",
        lastName: "Doe",
        name: "John Doe",
        email: "john@example.com",
        phone: "555-0001",
        dateOfBirth: "1990-01-15",
        housingStatus: "Homeless",
        age: "Adult 18-59",
        gender: "Male",
        notes: "Test guest",
        createdAt: "2025-01-01T00:00:00Z",
      },
      {
        id: "guest-2",
        guestId: "G002",
        firstName: "Jane",
        lastName: "Smith",
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "555-0002",
        dateOfBirth: "1985-05-20",
        housingStatus: "Housed",
        age: "Adult 18-59",
        gender: "Female",
        notes: "",
        createdAt: "2025-01-02T00:00:00Z",
      },
    ],
    mealRecords: [
      {
        id: "meal-1",
        guestId: "guest-1",
        type: "Dinner",
        date: "2025-01-10",
        count: 1,
        createdAt: "2025-01-10T18:30:00Z",
      },
    ],
    rvMealRecords: [],
    shelterMealRecords: [],
    unitedEffortMealRecords: [],
    extraMealRecords: [],
    dayWorkerMealRecords: [],
    lunchBagRecords: [],
    showerRecords: [
      {
        id: "shower-1",
        guestId: "guest-1",
        date: "2025-01-10",
        time: "09:00",
        status: "completed",
        createdAt: "2025-01-10T09:30:00Z",
      },
    ],
    laundryRecords: [
      {
        id: "laundry-1",
        guestId: "guest-2",
        date: "2025-01-11",
        time: "10:00-11:00",
        status: "pending",
        bagNumber: "Bag-001",
        createdAt: "2025-01-11T10:15:00Z",
      },
    ],
    bicycleRecords: [
      {
        id: "bike-1",
        guestId: "guest-1",
        date: "2025-01-09T14:00:00Z",
        status: "completed",
        repairType: "Chain Repair",
        repairTypes: ["Chain Repair"],
        createdAt: "2025-01-09T14:30:00Z",
      },
    ],
    donationRecords: [
      {
        id: "donation-1",
        donor: "Local Store",
        type: "Food",
        itemName: "Canned Food",
        trays: 0,
        weightLbs: 50,
        servings: 100,
        temperature: null,
        date: "2025-01-08T12:00:00Z",
        createdAt: "2025-01-08T12:30:00Z",
      },
    ],
    itemGivenRecords: [
      {
        id: "item-1",
        guestId: "guest-1",
        item: "Blanket",
        date: "2025-01-07T10:00:00Z",
        createdAt: "2025-01-07T10:30:00Z",
      },
    ],
    haircutRecords: [
      {
        id: "haircut-1",
        guestId: "guest-2",
        date: "2025-01-06T14:00:00Z",
        createdAt: "2025-01-06T14:30:00Z",
      },
    ],
    holidayRecords: [
      {
        id: "holiday-1",
        guestId: "guest-1",
        date: "2025-12-25T00:00:00Z",
        createdAt: "2025-01-05T09:00:00Z",
      },
    ],
  })),
}));

describe("TableBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with initial guests table selected", () => {
    render(<TableBrowser />);

    expect(screen.getByText("Select Table")).toBeInTheDocument();
    const select = screen.getByRole("combobox");
    expect(select.value).toBe("guests");
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  it("displays table data with Supabase schema columns", () => {
    render(<TableBrowser />);

    // Check for Supabase schema column names
    expect(screen.getByText("first_name")).toBeInTheDocument();
    expect(screen.getByText("last_name")).toBeInTheDocument();
    expect(screen.getByText("external_id")).toBeInTheDocument();
    expect(screen.getByText("housing_status")).toBeInTheDocument();
  });

  it("shows total row count", () => {
    render(<TableBrowser />);

    expect(screen.getByText(/Total rows:/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("switches between tables when selection changes", async () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "meal_attendance" } });

    await waitFor(() => {
      expect(select.value).toBe("meal_attendance");
    });

    // Should show meal_type column
    expect(screen.getByText("meal_type")).toBeInTheDocument();
  });

  it("displays correct table names and row counts in dropdown", () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");

    const options = select.querySelectorAll("option");
    expect(options.length).toBeGreaterThan(0);

    const guestOption = Array.from(options).find((opt) =>
      opt.textContent.includes("Guests")
    );
    expect(guestOption).toBeInTheDocument();
    expect(guestOption.textContent).toMatch(/Guests \(2 rows\)/);
  });

  it("downloads CSV with Supabase schema columns when download button is clicked", () => {
    render(<TableBrowser />);

    const downloadButton = screen.getByText("Download CSV", { exact: false });
    fireEvent.click(downloadButton);

    expect(mockExportDataAsCSV).toHaveBeenCalledTimes(1);

    // Check that CSV has Supabase schema column names
    const csvData = mockExportDataAsCSV.mock.calls[0][0];
    expect(csvData[0]).toHaveProperty("first_name");
    expect(csvData[0]).toHaveProperty("last_name");
    expect(csvData[0]).toHaveProperty("external_id");
    expect(csvData[0]).toHaveProperty("housing_status");
    expect(csvData[0]).toHaveProperty("age_group");

    expect(mockToast.success).toHaveBeenCalledWith("Guests exported to CSV");
  });

  it("shows Supabase-ready info banner", () => {
    render(<TableBrowser />);

    expect(screen.getByText(/Supabase-Compatible Export/i)).toBeInTheDocument();
    expect(screen.getByText(/Column names match the Supabase schema exactly/i)).toBeInTheDocument();
  });

  it("consolidates meal types into single meal_attendance table", () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");

    // Should have meal_attendance table, not separate meal tables
    const options = Array.from(select.querySelectorAll("option"));
    const mealOption = options.find(opt => opt.value === "meal_attendance");

    expect(mealOption).toBeInTheDocument();
    expect(mealOption.textContent).toContain("Meal Attendance (All Types)");
  });

  it("properly formats array values as JSON in CSV", () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "bicycle_repairs" } });

    const downloadButton = screen.getByText("Download CSV", { exact: false });
    fireEvent.click(downloadButton);

    const csvData = mockExportDataAsCSV.mock.calls[0][0];

    // repair_types should be JSON stringified array
    expect(csvData[0].repair_types).toContain("Chain Repair");
  });

  it("handles null and undefined values gracefully", () => {
    render(<TableBrowser />);

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("exports meal table with Supabase schema columns", async () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "meal_attendance" } });

    await waitFor(() => {
      expect(select.value).toBe("meal_attendance");
    });

    const downloadButton = screen.getByText("Download CSV", { exact: false });
    fireEvent.click(downloadButton);

    const csvData = mockExportDataAsCSV.mock.calls[0][0];

    // Check Supabase schema columns
    expect(csvData[0]).toHaveProperty("guest_id");
    expect(csvData[0]).toHaveProperty("meal_type");
    expect(csvData[0]).toHaveProperty("quantity");
    expect(csvData[0]).toHaveProperty("served_on");

    expect(mockToast.success).toHaveBeenCalledWith(
      "Meal Attendance (All Types) exported to CSV"
    );
  });

  it("exports shower_reservations with correct Supabase columns", async () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "shower_reservations" } });

    await waitFor(() => {
      expect(select.value).toBe("shower_reservations");
    });

    const downloadButton = screen.getByText("Download CSV", { exact: false });
    fireEvent.click(downloadButton);

    const csvData = mockExportDataAsCSV.mock.calls[0][0];

    // Check Supabase schema columns
    expect(csvData[0]).toHaveProperty("guest_id");
    expect(csvData[0]).toHaveProperty("scheduled_for");
    expect(csvData[0]).toHaveProperty("scheduled_time");
    expect(csvData[0]).toHaveProperty("status");
  });

  it("exports different tables with different filenames", async () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    const downloadButton = screen.getByText("Download CSV", { exact: false });

    fireEvent.click(downloadButton);
    expect(mockExportDataAsCSV).toHaveBeenCalledWith(
      expect.any(Array),
      expect.stringMatching(/guests-/)
    );

    mockExportDataAsCSV.mockClear();

    fireEvent.change(select, { target: { value: "shower_reservations" } });

    await waitFor(() => {
      expect(select.value).toBe("shower_reservations");
    });

    fireEvent.click(downloadButton);

    expect(mockExportDataAsCSV).toHaveBeenCalledWith(
      expect.any(Array),
      expect.stringMatching(/shower_reservations-/)
    );
  });
});
