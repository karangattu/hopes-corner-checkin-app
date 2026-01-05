import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttendanceBatchUpload from "../AttendanceBatchUpload";
import { act } from "react";

// Partially mock Date for consistent timestamps in IDs
const MOCK_DATE = new Date("2025-01-01T12:00:00Z");

const mockGuests = [
    { id: "g1", guestId: "G100", name: "John Doe" },
    { id: "g2", guestId: "G101", name: "Jane Doe" }
];

const createMockContext = () => ({
    guests: mockGuests,
    mealRecords: [], // key for dupe check: guestId_YYYY-MM-DD
    showerRecords: [],
    laundryRecords: [],
    bicycleRecords: [],
    haircutRecords: [],
    holidayRecords: [],

    // State setters
    setMealRecords: vi.fn(),
    setShowerRecords: vi.fn(),
    setLaundryRecords: vi.fn(),
    setBicycleRecords: vi.fn(),
    setHaircutRecords: vi.fn(),
    setHolidayRecords: vi.fn(),

    // Individual adders (should NOT be called for standard records in local mode now)
    addMealRecord: vi.fn(),
    importShowerAttendanceRecord: vi.fn(),
    importLaundryAttendanceRecord: vi.fn(),
    addBicycleRecord: vi.fn(),
    addHaircutRecord: vi.fn(),
    addHolidayRecord: vi.fn(),

    // Special meal adders (still used)
    addExtraMealRecord: vi.fn(),
    addRvMealRecord: vi.fn(),
    addShelterMealRecord: vi.fn(),
    addUnitedEffortMealRecord: vi.fn(),
    addDayWorkerMealRecord: vi.fn(),
    addLunchBagRecord: vi.fn(),

    // Cloud batch insert (should NOT be called in local mode)
    insertMealAttendanceBatch: vi.fn(),
    insertShowerReservationsBatch: vi.fn(),

    supabaseEnabled: false, // Critical for testing local mode
    withPersistencePaused: async (fn) => fn(),
});

vi.mock("../../context/useAppContext", () => ({
    useAppContext: vi.fn()
}));

import { useAppContext } from "../../context/useAppContext";

describe("AttendanceBatchUpload - Local Mode Optimization", () => {
    let mockContext;

    beforeEach(() => {
        mockContext = createMockContext();
        useAppContext.mockReturnValue(mockContext);
        // Use real timers to avoid complex async/timer interactions
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("batches regular meal records locally without calling addMealRecord", async () => {
        render(<AttendanceBatchUpload />);

        const csvContent = [
            "Attendance_ID,Guest_ID,Count,Program,Date_Submitted",
            "ATT01,G100,1,Meal,2025-01-15",
            "ATT02,G101,1,Meal,2025-01-15"
        ].join("\n");

        const file = new File([csvContent], "test.csv", { type: "text/csv" });
        // Correctly mock text() since JSDOM sometimes has issues with File.text() in test envs
        Object.defineProperty(file, 'text', {
            value: () => Promise.resolve(csvContent)
        });

        const input = screen.getByLabelText(/Upload Attendance CSV/i);

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
        });

        // Wait for success message with longer timeout
        await waitFor(() => {
            expect(screen.getByText(/Successfully imported 2 attendance records/)).toBeInTheDocument();
        }, { timeout: 3000 });


        // Verify setMealRecords was called with the new records
        expect(mockContext.setMealRecords).toHaveBeenCalled();
        const updateFn = mockContext.setMealRecords.mock.calls[0][0];
        const newState = updateFn([]); // Simulate update on empty state

        expect(newState).toHaveLength(2);
        expect(newState[0]).toMatchObject({
            guestId: "g1",
            count: 1,
            // Date can vary based on timezone handling in component, but checking guestId/count is enough
            type: "guest"
        });
        expect(newState[1]).toMatchObject({
            guestId: "g2",
            count: 1
        });

        // CRITICAL: Verify addMealRecord was NOT called (proving batching logic is used)
        expect(mockContext.addMealRecord).not.toHaveBeenCalled();
        expect(mockContext.insertMealAttendanceBatch).not.toHaveBeenCalled();
    });

    it("skips duplicates efficiently using pre-loaded Set", async () => {
        // Setup existing records to trigger duplicate detection
        // The key format in the component is: `${guestId}_${pacificDateStr}`
        // For 2025-01-15, pacific date string is "2025-01-15" (assuming locale/tz mostly standard or handled)

        // We'll mock the internal map/check logic by effectively populating mealRecords
        // Note: The component logic uses `pacificDateStringFrom` which we should ensure matches.
        // Ideally we'd start with data that matches the duplicate check
        mockContext.mealRecords = [
            { guestId: "g1", date: "2025-01-15T12:00:00.000Z" } // Already has meal on this day
        ];

        useAppContext.mockReturnValue(mockContext);

        render(<AttendanceBatchUpload />);

        const csvContent = [
            "Attendance_ID,Guest_ID,Count,Program,Date_Submitted",
            "ATT01,G100,1,Meal,2025-01-15", // Duplicate
            "ATT02,G101,1,Meal,2025-01-15"  // New
        ].join("\n");

        const file = new File([csvContent], "dupe_test.csv", { type: "text/csv" });
        Object.defineProperty(file, 'text', {
            value: () => Promise.resolve(csvContent)
        });

        const input = screen.getByLabelText(/Upload Attendance CSV/i);

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
        });

        // Should only import 1 record
        await waitFor(() => {
            expect(screen.getByText(/Successfully imported 1 attendance records/)).toBeInTheDocument();
        }, { timeout: 3000 });

        // Verify only the non-duplicate was added
        expect(mockContext.setMealRecords).toHaveBeenCalled();
        const updateFn = mockContext.setMealRecords.mock.calls[0][0];
        const newState = updateFn([]);

        expect(newState).toHaveLength(1);
        expect(newState[0].guestId).toBe("g2"); // G101
    });

    it("batches shower and laundry records locally with correct 'done' status", async () => {
        render(<AttendanceBatchUpload />);

        const csvContent = [
            "Attendance_ID,Guest_ID,Count,Program,Date_Submitted",
            "ATT03,G100,1,Shower,2025-01-16",
            "ATT04,G101,1,Laundry,2025-01-16"
        ].join("\n");

        const file = new File([csvContent], "status_test.csv", { type: "text/csv" });
        Object.defineProperty(file, 'text', {
            value: () => Promise.resolve(csvContent)
        });

        const input = screen.getByLabelText(/Upload Attendance CSV/i);

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
        });

        await waitFor(() => {
            expect(screen.getByText(/Successfully imported 2 attendance records/)).toBeInTheDocument();
        }, { timeout: 3000 });

        // Verify Shower records
        expect(mockContext.setShowerRecords).toHaveBeenCalled();
        const showerUpdateFn = mockContext.setShowerRecords.mock.calls[0][0];
        const newShowerState = showerUpdateFn([]);
        expect(newShowerState).toHaveLength(1);
        expect(newShowerState[0]).toMatchObject({
            guestId: "g1",
            status: "done",
            attended: true
        });

        // Verify Laundry records
        expect(mockContext.setLaundryRecords).toHaveBeenCalled();
        const laundryUpdateFn = mockContext.setLaundryRecords.mock.calls[0][0];
        const newLaundryState = laundryUpdateFn([]);
        expect(newLaundryState).toHaveLength(1);
        expect(newLaundryState[0]).toMatchObject({
            guestId: "g2",
            status: "done",
            attended: true
        });
    });
});
