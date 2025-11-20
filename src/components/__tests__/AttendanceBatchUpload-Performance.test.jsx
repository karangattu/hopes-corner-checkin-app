import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AttendanceBatchUpload from "../AttendanceBatchUpload";
import * as AppContext from "../../context/useAppContext";

// Mock the AppContext
vi.mock("../../context/useAppContext", () => ({
  useAppContext: vi.fn(),
}));

describe("AttendanceBatchUpload - Performance & Chunking", () => {
  const mockInsertMealAttendanceBatch = vi.fn();
  const mockSetMealRecords = vi.fn();
  const mockGuests = [
    { id: "guest-1", guestId: "G001", name: "Guest One" },
    { id: "guest-2", guestId: "G002", name: "Guest Two" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default context values
    AppContext.useAppContext.mockReturnValue({
      guests: mockGuests,
      supabaseEnabled: true,
      insertMealAttendanceBatch: mockInsertMealAttendanceBatch,
      setMealRecords: mockSetMealRecords,
      // Mock other required functions to avoid crashes
      addMealRecord: vi.fn(),
      addRvMealRecord: vi.fn(),
      addShelterMealRecord: vi.fn(),
      addUnitedEffortMealRecord: vi.fn(),
      addExtraMealRecord: vi.fn(),
      addDayWorkerMealRecord: vi.fn(),
      addLunchBagRecord: vi.fn(),
      importShowerAttendanceRecord: vi.fn(),
      importLaundryAttendanceRecord: vi.fn(),
      addBicycleRecord: vi.fn(),
      addHaircutRecord: vi.fn(),
      addHolidayRecord: vi.fn(),
      insertShowerReservationsBatch: vi.fn(),
      insertLaundryBookingsBatch: vi.fn(),
      insertBicycleRepairsBatch: vi.fn(),
      insertHaircutVisitsBatch: vi.fn(),
      insertHolidayVisitsBatch: vi.fn(),
      setShowerRecords: vi.fn(),
      setLaundryRecords: vi.fn(),
      setBicycleRecords: vi.fn(),
      setHaircutRecords: vi.fn(),
      setHolidayRecords: vi.fn(),
    });
  });

  it("should process large files in chunks without retaining entire batches in memory", async () => {
    // Generate a CSV with 1200 records (3 chunks of 500: 500, 500, 200)
    let csvContent = "attendance_id,guest_id,count,program,date_submitted\n";
    for (let i = 1; i <= 1200; i++) {
      csvContent += `ATT${i},G001,1,Meal,2025-01-01\n`;
    }

    const file = new File([csvContent], "large_test.csv", { type: "text/csv" });
    file.text = async () => csvContent; // Mock text() method for jsdom

    render(<AttendanceBatchUpload />);

    const fileInput = screen.getByLabelText(/Upload Attendance CSV/i);
    
    // Mock insertMealAttendanceBatch to return the inserted records
    mockInsertMealAttendanceBatch.mockImplementation((payloads) => {
      return payloads.map(p => ({ ...p, id: Math.random() }));
    });

    // Trigger upload
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Wait for processing to complete
    await waitFor(() => {
      expect(screen.getByText(/Successfully imported 1200 attendance records/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify chunking: insertMealAttendanceBatch should be called 3 times
    // (Chunk 1: 500, Chunk 2: 500, Chunk 3: 200)
    expect(mockInsertMealAttendanceBatch).toHaveBeenCalledTimes(3);
    expect(mockInsertMealAttendanceBatch.mock.calls[0][0]).toHaveLength(500);
    expect(mockInsertMealAttendanceBatch.mock.calls[1][0]).toHaveLength(500);
    expect(mockInsertMealAttendanceBatch.mock.calls[2][0]).toHaveLength(200);

    // Verify state update happens once at the end (batch update to avoid per-chunk re-renders)
    // This prevents performance issues during large imports
    expect(mockSetMealRecords).toHaveBeenCalledTimes(1);
  });
});
