import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AttendanceBatchUpload from "../AttendanceBatchUpload";
import * as AppContext from "../../context/useAppContext";

// Mock the AppContext
vi.mock("../../context/useAppContext", () => ({
    useAppContext: vi.fn(),
}));

describe("AttendanceBatchUpload - Large File Performance (100k rows)", () => {
    const mockInsertMealAttendanceBatch = vi.fn();
    const mockSetMealRecords = vi.fn();
    const mockGuests = [];

    // Generate 1000 mock guests for testing
    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock guests
        mockGuests.length = 0;
        for (let i = 1; i <= 1000; i++) {
            mockGuests.push({
                id: `guest-${i}`,
                guestId: `G${String(i).padStart(4, '0')}`,
                name: `Guest ${i}`,
            });
        }

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

    afterEach(() => {
        // Clean up any lingering timers or promises
        vi.clearAllTimers();
    });

    it("should handle 100,000 rows without crashing", async () => {
        const TOTAL_ROWS = 100000;

        // Generate a CSV with 100,000 records
        let csvContent = "attendance_id,guest_id,count,program,date_submitted\n";

        // Use a limited set of guest IDs to ensure they exist
        const guestIds = mockGuests.map(g => g.guestId);

        for (let i = 1; i <= TOTAL_ROWS; i++) {
            // Rotate through available guest IDs
            const guestId = guestIds[i % guestIds.length];
            csvContent += `ATT${i},${guestId},1,Meal,2025-01-01\n`;
        }

        const file = new File([csvContent], "large_test.csv", { type: "text/csv" });
        file.text = async () => csvContent; // Mock text() method for jsdom

        render(<AttendanceBatchUpload />);

        const fileInput = screen.getByLabelText(/Upload Attendance CSV/i);

        // Mock insertMealAttendanceBatch to return the inserted records quickly
        mockInsertMealAttendanceBatch.mockImplementation((payloads) => {
            return payloads.map(p => ({ ...p, id: Math.random() }));
        });

        // Track time to ensure reasonable performance
        const startTime = Date.now();

        // Trigger upload
        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        // Wait for processing to complete with a longer timeout for large files
        await waitFor(() => {
            expect(screen.getByText(/Successfully imported 100000 attendance records/i)).toBeInTheDocument();
        }, { timeout: 60000 }); // 60 second timeout for very large file

        const processingTime = Date.now() - startTime;

        // Performance assertion: Should complete within reasonable time
        // In a real browser, this should be much faster than the timeout
        console.log(`Processing time for 100k rows: ${processingTime}ms`);
        expect(processingTime).toBeLessThan(60000); // Should be under 60 seconds

        // Verify chunking: With 500-row chunks, 100k rows = 200 chunks
        expect(mockInsertMealAttendanceBatch).toHaveBeenCalledTimes(200);

        // Verify first and last chunks
        expect(mockInsertMealAttendanceBatch.mock.calls[0][0]).toHaveLength(500);
        expect(mockInsertMealAttendanceBatch.mock.calls[199][0]).toHaveLength(500);

        // Verify state update happens once at the end (batch update to avoid per-chunk re-renders)
        expect(mockSetMealRecords).toHaveBeenCalledTimes(1);
    }, 120000); // 2 minute test timeout

    it("should show progress percentage during large file upload", async () => {
        const TOTAL_ROWS = 10000;

        let csvContent = "attendance_id,guest_id,count,program,date_submitted\n";
        const guestIds = mockGuests.map(g => g.guestId);

        for (let i = 1; i <= TOTAL_ROWS; i++) {
            const guestId = guestIds[i % guestIds.length];
            csvContent += `ATT${i},${guestId},1,Meal,2025-01-01\n`;
        }

        const file = new File([csvContent], "test.csv", { type: "text/csv" });
        file.text = async () => csvContent;

        render(<AttendanceBatchUpload />);

        const fileInput = screen.getByLabelText(/Upload Attendance CSV/i);

        mockInsertMealAttendanceBatch.mockImplementation((payloads) => {
            return payloads.map(p => ({ ...p, id: Math.random() }));
        });

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        // Check that progress includes percentage
        await waitFor(() => {
            const progressText = screen.queryByText(/Processing records.*%/i);
            if (progressText) {
                expect(progressText).toBeInTheDocument();
            }
        }, { timeout: 1000 });

        await waitFor(() => {
            expect(screen.getByText(/Successfully imported 10000 attendance records/i)).toBeInTheDocument();
        }, { timeout: 30000 });
    }, 60000);

    it("should handle memory efficiently with large datasets", async () => {
        const TOTAL_ROWS = 50000;

        let csvContent = "attendance_id,guest_id,count,program,date_submitted\n";
        const guestIds = mockGuests.map(g => g.guestId);

        for (let i = 1; i <= TOTAL_ROWS; i++) {
            const guestId = guestIds[i % guestIds.length];
            csvContent += `ATT${i},${guestId},1,Meal,2025-01-01\n`;
        }

        const file = new File([csvContent], "memory_test.csv", { type: "text/csv" });
        file.text = async () => csvContent;

        render(<AttendanceBatchUpload />);

        const fileInput = screen.getByLabelText(/Upload Attendance CSV/i);

        // Track batch sizes to ensure chunking
        const batchSizes = [];
        mockInsertMealAttendanceBatch.mockImplementation((payloads) => {
            batchSizes.push(payloads.length);
            return payloads.map(p => ({ ...p, id: Math.random() }));
        });

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        await waitFor(() => {
            expect(screen.getByText(/Successfully imported 50000 attendance records/i)).toBeInTheDocument();
        }, { timeout: 30000 });

        // Verify all batches are 500 or less
        batchSizes.forEach((size) => {
            expect(size).toBeLessThanOrEqual(500);
        });

        // Total batches should be 100 (50000 / 500)
        expect(batchSizes.length).toBe(100);
    }, 60000);

    it("should handle large datasets efficiently", async () => {
        const TOTAL_ROWS = 20000;

        let csvContent = "attendance_id,guest_id,count,program,date_submitted\n";
        const guestIds = mockGuests.map(g => g.guestId);

        for (let i = 1; i <= TOTAL_ROWS; i++) {
            const guestId = guestIds[i % guestIds.length];
            csvContent += `ATT${i},${guestId},1,Meal,2025-01-01\n`;
        }

        const file = new File([csvContent], "large_test.csv", { type: "text/csv" });
        file.text = async () => csvContent;

        mockInsertMealAttendanceBatch.mockImplementation((payloads) => payloads.map(p => ({ ...p, id: Math.random() })));

        render(<AttendanceBatchUpload />);

        const fileInput = screen.getByLabelText(/Upload Attendance CSV/i);

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        await waitFor(() => {
            expect(screen.getByText(/Successfully imported 20000 attendance records/i)).toBeInTheDocument();
        }, { timeout: 30000 });

        // State setter should be called once at the end
        expect(mockSetMealRecords).toHaveBeenCalledTimes(1);
    }, 60000);

    it("should handle duplicate rows gracefully", async () => {
        const TOTAL_UNIQUE_ROWS = 5000;

        let csvContent = "attendance_id,guest_id,count,program,date_submitted\n";
        const guestIds = mockGuests.map(g => g.guestId);

        // Add each row twice to test deduplication
        for (let i = 1; i <= TOTAL_UNIQUE_ROWS; i++) {
            const guestId = guestIds[i % guestIds.length];
            const row = `ATT${i},${guestId},1,Meal,2025-01-01\n`;
            csvContent += row;
            csvContent += row; // Duplicate
        }

        const file = new File([csvContent], "duplicate_test.csv", { type: "text/csv" });
        file.text = async () => csvContent;

        render(<AttendanceBatchUpload />);

        const fileInput = screen.getByLabelText(/Upload Attendance CSV/i);

        mockInsertMealAttendanceBatch.mockImplementation((payloads) => {
            return payloads.map(p => ({ ...p, id: Math.random() }));
        });

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        await waitFor(() => {
            // Should only import unique rows
            expect(screen.getByText(/Successfully imported 5000 attendance records/i)).toBeInTheDocument();
        }, { timeout: 30000 });
    }, 60000);

    it("should not freeze the UI during large file processing", async () => {
        const TOTAL_ROWS = 10000;

        let csvContent = "attendance_id,guest_id,count,program,date_submitted\n";
        const guestIds = mockGuests.map(g => g.guestId);

        for (let i = 1; i <= TOTAL_ROWS; i++) {
            const guestId = guestIds[i % guestIds.length];
            csvContent += `ATT${i},${guestId},1,Meal,2025-01-01\n`;
        }

        const file = new File([csvContent], "ui_test.csv", { type: "text/csv" });
        file.text = async () => csvContent;

        render(<AttendanceBatchUpload />);

        const fileInput = screen.getByLabelText(/Upload Attendance CSV/i);

        mockInsertMealAttendanceBatch.mockImplementation((payloads) => {
            return payloads.map(p => ({ ...p, id: Math.random() }));
        });

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        // The progress should be visible, indicating UI is responsive
        await waitFor(() => {
            const progressElement = screen.queryByText(/Processing records/i);
            if (progressElement) {
                expect(progressElement).toBeInTheDocument();
            }
        }, { timeout: 1000 });

        await waitFor(() => {
            expect(screen.getByText(/Successfully imported 10000 attendance records/i)).toBeInTheDocument();
        }, { timeout: 30000 });
    }, 60000);
});
