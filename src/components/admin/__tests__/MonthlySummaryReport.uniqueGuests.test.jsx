import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MonthlySummaryReport from "../MonthlySummaryReport";

const createDefaultContext = () => ({
  guests: [],
  mealRecords: [],
  rvMealRecords: [],
  shelterMealRecords: [],
  unitedEffortMealRecords: [],
  extraMealRecords: [],
  dayWorkerMealRecords: [],
  lunchBagRecords: [],
  showerRecords: [],
  laundryRecords: [],
  bicycleRecords: [],
  exportDataAsCSV: vi.fn(),
});

let mockContextValue = createDefaultContext();

vi.mock("../../../context/useAppContext", () => ({
  useAppContext: () => mockContextValue,
}));

describe("MonthlySummaryReport - Unique Guests and New Guests Columns", () => {
  beforeEach(() => {
    mockContextValue = createDefaultContext();
  });

  describe("Unique Guests column", () => {
    it("renders Unique Guests column header", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const testDate = new Date(currentYear, currentMonth, 15).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
          { id: "g2", name: "Jane Smith", age: "Adult 18-59" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: testDate, count: 1 },
          { id: "m2", guestId: "g2", date: testDate, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const headers = screen.getAllByRole("columnheader");
      const uniqueGuestsHeader = headers.find(h => h.textContent.includes("Unique Guests"));
      expect(uniqueGuestsHeader).toBeInTheDocument();
    });

    it("displays correct unique guest count when same guest has multiple meals", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const testDate1 = new Date(currentYear, currentMonth, 10).toISOString();
      const testDate2 = new Date(currentYear, currentMonth, 15).toISOString();
      const testDate3 = new Date(currentYear, currentMonth, 20).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: testDate1, count: 1 },
          { id: "m2", guestId: "g1", date: testDate2, count: 2 },
          { id: "m3", guestId: "g1", date: testDate3, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const headers = screen.getAllByRole("columnheader");
      const uniqueGuestsHeader = headers.find(h => h.textContent.includes("Unique Guests"));
      expect(uniqueGuestsHeader).toBeInTheDocument();

      const tables = screen.getAllByRole("table");
      const mealsTable = tables[0]; // First table is the meals table
      const cells = mealsTable.querySelectorAll("td[data-column='uniqueGuests']");
      const monthCell = cells[cells.length - 2];
      expect(monthCell.textContent).toBe("1");
    });

    it("counts unique guests correctly across multiple guests", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const testDate = new Date(currentYear, currentMonth, 15).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
          { id: "g2", name: "Jane Smith", age: "Adult 18-59" },
          { id: "g3", name: "Bob Johnson", age: "Senior 60+" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: testDate, count: 1 },
          { id: "m2", guestId: "g2", date: testDate, count: 2 },
          { id: "m3", guestId: "g3", date: testDate, count: 1 },
          { id: "m4", guestId: "g1", date: testDate, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const tables = screen.getAllByRole("table");
      const mealsTable = tables[0]; // First table is the meals table
      const cells = mealsTable.querySelectorAll("td[data-column='uniqueGuests']");
      const monthCell = cells[cells.length - 2];
      expect(monthCell.textContent).toBe("3");
    });

    it("calculates year-to-date unique guests correctly", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const month1Date = new Date(currentYear, 0, 15).toISOString();
      const month2Date = new Date(currentYear, 1, 15).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
          { id: "g2", name: "Jane Smith", age: "Adult 18-59" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: month1Date, count: 1 },
          { id: "m2", guestId: "g2", date: month2Date, count: 1 },
          { id: "m3", guestId: "g1", date: month2Date, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const tables = screen.getAllByRole("table");
      const mealsTable = tables[0]; // First table is the meals table
      const cells = mealsTable.querySelectorAll("td[data-column='uniqueGuests']");
      const ytdCell = cells[cells.length - 1];
      expect(ytdCell.textContent).toBe("2");
    });
  });

  describe("New Guests column", () => {
    it("renders New Guests column header", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const testDate = new Date(currentYear, currentMonth, 15).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: testDate, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const headers = screen.getAllByRole("columnheader");
      const newGuestsHeader = headers.find(h => h.textContent.includes("New Guests"));
      expect(newGuestsHeader).toBeInTheDocument();
    });

    it("identifies guest with first meal as new guest", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const testDate = new Date(currentYear, currentMonth, 15).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: testDate, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const tables = screen.getAllByRole("table");
      const mealsTable = tables[0]; // First table is the meals table
      const cells = mealsTable.querySelectorAll("td[data-column='newGuests']");
      const monthCell = cells[cells.length - 2];
      expect(monthCell.textContent).toBe("1");
    });

    it("does not count returning guest as new", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const previousMonth = currentMonth > 0 ? currentMonth - 1 : 11;
      const previousYear = currentMonth > 0 ? currentYear : currentYear - 1;

      const oldDate = new Date(previousYear, previousMonth, 15).toISOString();
      const newDate = new Date(currentYear, currentMonth, 15).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: oldDate, count: 1 },
          { id: "m2", guestId: "g1", date: newDate, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const tables = screen.getAllByRole("table");
      const mealsTable = tables[0]; // First table is the meals table
      const cells = mealsTable.querySelectorAll("td[data-column='newGuests']");
      const currentMonthCell = cells[cells.length - 2];
      expect(currentMonthCell.textContent).toBe("0");
    });

    it("counts multiple new guests correctly", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const testDate1 = new Date(currentYear, currentMonth, 10).toISOString();
      const testDate2 = new Date(currentYear, currentMonth, 15).toISOString();
      const testDate3 = new Date(currentYear, currentMonth, 20).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
          { id: "g2", name: "Jane Smith", age: "Adult 18-59" },
          { id: "g3", name: "Bob Johnson", age: "Senior 60+" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: testDate1, count: 1 },
          { id: "m2", guestId: "g2", date: testDate2, count: 1 },
          { id: "m3", guestId: "g3", date: testDate3, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const tables = screen.getAllByRole("table");
      const mealsTable = tables[0]; // First table is the meals table
      const cells = mealsTable.querySelectorAll("td[data-column='newGuests']");
      const monthCell = cells[cells.length - 2];
      expect(monthCell.textContent).toBe("3");
    });

    it("calculates year-to-date new guests as sum of monthly new guests", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const month1Date = new Date(currentYear, 0, 15).toISOString();
      const month2Date = new Date(currentYear, 1, 15).toISOString();
      const month3Date = new Date(currentYear, 2, 15).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
          { id: "g2", name: "Jane Smith", age: "Adult 18-59" },
          { id: "g3", name: "Bob Johnson", age: "Senior 60+" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: month1Date, count: 1 },
          { id: "m2", guestId: "g2", date: month2Date, count: 1 },
          { id: "m3", guestId: "g3", date: month3Date, count: 1 },
          { id: "m4", guestId: "g1", date: month2Date, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const tables = screen.getAllByRole("table");
      const mealsTable = tables[0]; // First table is the meals table
      const cells = mealsTable.querySelectorAll("td[data-column='newGuests']");
      const ytdCell = cells[cells.length - 1];
      expect(ytdCell.textContent).toBe("3");
    });
  });

  describe("Column positioning", () => {
    it("displays Unique Guests and New Guests columns after Saturday column", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const testDate = new Date(currentYear, currentMonth, 15).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: testDate, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const headers = screen.getAllByRole("columnheader");
      const headerTexts = headers.map((h) => h.textContent);

      const saturdayIndex = headerTexts.findIndex((text) =>
        text.includes("Saturday")
      );
      const uniqueGuestsIndex = headerTexts.findIndex((text) =>
        text.includes("Unique Guests")
      );
      const newGuestsIndex = headerTexts.findIndex((text) =>
        text.includes("New Guests")
      );

      expect(saturdayIndex).toBeGreaterThan(-1);
      expect(uniqueGuestsIndex).toBeGreaterThan(saturdayIndex);
      expect(newGuestsIndex).toBeGreaterThan(uniqueGuestsIndex);
    });

    it("displays columns with correct background colors", async () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const testDate = new Date(currentYear, currentMonth, 15).toISOString();

      mockContextValue = {
        ...createDefaultContext(),
        guests: [
          { id: "g1", name: "John Doe", age: "Adult 18-59" },
        ],
        mealRecords: [
          { id: "m1", guestId: "g1", date: testDate, count: 1 },
        ],
      };

      render(<MonthlySummaryReport />);

      await waitFor(() => {
        const tables = screen.getAllByRole("table");
        expect(tables[0]).toBeInTheDocument();
      });

      const headers = screen.getAllByRole("columnheader");
      const uniqueGuestsHeader = headers.find(h => h.textContent.includes("Unique Guests"));
      expect(uniqueGuestsHeader.className).toMatch(/bg-emerald-50/);

      const newGuestsHeader = headers.find(h => h.textContent.includes("New Guests"));
      expect(newGuestsHeader.className).toMatch(/bg-sky-50/);
    });
  });
});
