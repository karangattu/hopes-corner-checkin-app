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
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "555-0001",
        dateOfBirth: "1990-01-15",
        housingStatus: "Homeless",
        notes: "Test guest",
        createdAt: "2025-01-01T00:00:00Z",
      },
      {
        id: "guest-2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "555-0002",
        dateOfBirth: "1985-05-20",
        housingStatus: "Housed",
        notes: "",
        createdAt: "2025-01-02T00:00:00Z",
      },
    ],
    mealRecords: [
      {
        id: "meal-1",
        guestId: "guest-1",
        type: "Dinner",
        date: "2025-01-10T18:00:00Z",
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
        date: "2025-01-10T09:00:00Z",
        time: "09:00-10:00",
        status: "completed",
        createdAt: "2025-01-10T09:30:00Z",
      },
    ],
    laundryRecords: [
      {
        id: "laundry-1",
        guestId: "guest-2",
        date: "2025-01-11T10:00:00Z",
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

  it("displays table data with correct columns", () => {
    render(<TableBrowser />);

    expect(screen.getByText("firstName")).toBeInTheDocument();
    expect(screen.getByText("lastName")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("phone")).toBeInTheDocument();
  });

  it("shows total row count", () => {
    render(<TableBrowser />);

    expect(screen.getByText(/Total rows:/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("switches between tables when selection changes", async () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "meals" } });

    await waitFor(() => {
      expect(select.value).toBe("meals");
    });

    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("type")).toBeInTheDocument();
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

  it("downloads CSV when download button is clicked", () => {
    render(<TableBrowser />);

    const downloadButton = screen.getByText("Download CSV");
    fireEvent.click(downloadButton);

    expect(mockExportDataAsCSV).toHaveBeenCalledTimes(1);
    expect(mockExportDataAsCSV).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          firstName: "John",
          lastName: "Doe",
        }),
      ]),
      expect.stringMatching(/guests-\d{4}-\d{2}-\d{2}\.csv/)
    );
    expect(mockToast.success).toHaveBeenCalledWith("Guests exported to CSV");
  });

  it("shows error when trying to download empty table", () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "showers" } });

    fireEvent.change(select, { target: { value: "donations" } });

    const downloadButton = screen.getByText("Download CSV");
    fireEvent.click(downloadButton);

    expect(mockToast.success).toHaveBeenCalled();
  });

  it("properly formats array values in table cells", () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "bicycles" } });

    expect(screen.getByText("Chain Repair")).toBeInTheDocument();
  });

  it("properly formats object values in table cells", () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "meals" } });

    expect(screen.getByText("Dinner")).toBeInTheDocument();
  });

  it("handles null and undefined values gracefully", () => {
    render(<TableBrowser />);

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("displays no data message when table is empty", () => {
    render(<TableBrowser />);

    expect(screen.queryByText("No data available")).not.toBeInTheDocument();
  });

  it("renders table with proper accessibility attributes", () => {
    render(<TableBrowser />);

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    const thead = table.querySelector("thead");
    expect(thead).toBeInTheDocument();

    const tbody = table.querySelector("tbody");
    expect(tbody).toBeInTheDocument();
  });

  it("exports meal table with correct format", async () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "meals" } });

    await waitFor(() => {
      expect(select.value).toBe("meals");
    });

    const downloadButton = screen.getByText("Download CSV");
    fireEvent.click(downloadButton);

    expect(mockExportDataAsCSV).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          guestId: "guest-1",
          type: "Dinner",
        }),
      ]),
      expect.stringMatching(/meals-\d{4}-\d{2}-\d{2}\.csv/)
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      "Meal Attendance exported to CSV"
    );
  });

  it("exports different tables with different filenames", async () => {
    render(<TableBrowser />);

    const select = screen.getByRole("combobox");
    const downloadButton = screen.getByText("Download CSV");

    fireEvent.click(downloadButton);
    expect(mockExportDataAsCSV).toHaveBeenCalledWith(
      expect.any(Array),
      expect.stringMatching(/guests-/)
    );

    mockExportDataAsCSV.mockClear();

    fireEvent.change(select, { target: { value: "showers" } });
    fireEvent.click(downloadButton);

    expect(mockExportDataAsCSV).toHaveBeenCalledWith(
      expect.any(Array),
      expect.stringMatching(/showers-/)
    );
  });
});
