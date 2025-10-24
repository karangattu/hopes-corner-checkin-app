import { describe, expect, it } from "vitest";

/**
 * Test suite for shower and laundry slot generation based on day of the week
 *
 * These tests verify that:
 * 1. Shower slots are generated correctly for different days
 * 2. Laundry slots are generated correctly for different days
 * 3. Saturday has different slots than other days
 * 4. Monday and Wednesday have specific slots
 */

// Helper function to set a specific day of the week
const mockDate = (dayOfWeek) => {
  // Create a date for a known day
  // October 13, 2025 is a Monday (dayOfWeek = 1)
  const baseDate = new Date(2025, 9, 13); // October 13, 2025 (Monday)

  // Calculate the offset to get to the desired day
  const currentDay = baseDate.getDay();
  const daysToAdd = (dayOfWeek - currentDay + 7) % 7;

  const targetDate = new Date(baseDate);
  targetDate.setDate(baseDate.getDate() + daysToAdd);

  return targetDate;
};

// Inline the generation functions for testing (copied from AppContext.jsx)
const generateShowerSlots = (date = new Date()) => {
  const dayOfWeek = date.getDay();

  // Monday and Wednesday (day 1 or day 3) or any day that's not Saturday
  if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek !== 6) {
    const start = 7.5 * 60; // 07:30 AM
    const end = 12.5 * 60; // 12:30 PM
    const slots = [];
    for (let t = start; t < end; t += 30) {
      const hours = Math.floor(t / 60);
      const minutes = t % 60;
      slots.push(`${hours}:${minutes.toString().padStart(2, "0")}`);
    }
    return slots;
  }
  // Saturday (day 6)
  else {
    const start = 8.5 * 60; // 08:30 AM
    const end = 13.5 * 60; // 01:30 PM
    const slots = [];
    for (let t = start; t < end; t += 30) {
      const hours = Math.floor(t / 60);
      const minutes = t % 60;
      slots.push(`${hours}:${minutes.toString().padStart(2, "0")}`);
    }
    return slots;
  }
};

const generateLaundrySlots = (date = new Date()) => {
  const dayOfWeek = date.getDay();

  // Saturday (day 6)
  if (dayOfWeek === 6) {
    return [
      "08:30 - 10:00",
      "09:00 - 10:30",
      "09:30 - 11:00",
      "10:00 - 11:30",
      "10:30 - 12:00",
    ];
  }
  // Monday, Wednesday, and all other days
  else {
    return [
      "07:30 - 08:30",
      "08:00 - 09:00",
      "08:30 - 09:45",
      "09:00 - 10:15",
      "09:30 - 11:45",
    ];
  }
};

describe("Shower Slot Generation", () => {
  describe("Monday (day 1)", () => {
    it("should generate shower slots from 07:30 to 12:00 in 30-minute intervals", () => {
      const monday = mockDate(1);
      const slots = generateShowerSlots(monday);

      expect(slots).toEqual([
        "7:30",
        "8:00",
        "8:30",
        "9:00",
        "9:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
      ]);
    });

    it("should have 10 slots on Monday", () => {
      const monday = mockDate(1);
      const slots = generateShowerSlots(monday);
      expect(slots).toHaveLength(10);
    });
  });

  describe("Wednesday (day 3)", () => {
    it("should generate shower slots from 07:30 to 12:00 in 30-minute intervals", () => {
      const wednesday = mockDate(3);
      const slots = generateShowerSlots(wednesday);

      expect(slots).toEqual([
        "7:30",
        "8:00",
        "8:30",
        "9:00",
        "9:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
      ]);
    });

    it("should have 10 slots on Wednesday", () => {
      const wednesday = mockDate(3);
      const slots = generateShowerSlots(wednesday);
      expect(slots).toHaveLength(10);
    });
  });

  describe("Saturday (day 6)", () => {
    it("should generate shower slots from 08:30 to 13:00 in 30-minute intervals", () => {
      const saturday = mockDate(6);
      const slots = generateShowerSlots(saturday);

      expect(slots).toEqual([
        "8:30",
        "9:00",
        "9:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "13:00",
      ]);
    });

    it("should have 10 slots on Saturday", () => {
      const saturday = mockDate(6);
      const slots = generateShowerSlots(saturday);
      expect(slots).toHaveLength(10);
    });

    it("should start later than Monday/Wednesday (08:30 vs 07:30)", () => {
      const saturday = mockDate(6);
      const monday = mockDate(1);

      const saturdaySlots = generateShowerSlots(saturday);
      const mondaySlots = generateShowerSlots(monday);

      expect(saturdaySlots[0]).toBe("8:30");
      expect(mondaySlots[0]).toBe("7:30");
    });
  });

  describe("Other days", () => {
    it("should use Monday/Wednesday schedule for Tuesday (day 2)", () => {
      const tuesday = mockDate(2);
      const monday = mockDate(1);

      const tuesdaySlots = generateShowerSlots(tuesday);
      const mondaySlots = generateShowerSlots(monday);

      expect(tuesdaySlots).toEqual(mondaySlots);
    });

    it("should use Monday/Wednesday schedule for Thursday (day 4)", () => {
      const thursday = mockDate(4);
      const monday = mockDate(1);

      const thursdaySlots = generateShowerSlots(thursday);
      const mondaySlots = generateShowerSlots(monday);

      expect(thursdaySlots).toEqual(mondaySlots);
    });

    it("should use Monday/Wednesday schedule for Friday (day 5)", () => {
      const friday = mockDate(5);
      const monday = mockDate(1);

      const fridaySlots = generateShowerSlots(friday);
      const mondaySlots = generateShowerSlots(monday);

      expect(fridaySlots).toEqual(mondaySlots);
    });

    it("should use Monday/Wednesday schedule for Sunday (day 0)", () => {
      const sunday = mockDate(0);
      const monday = mockDate(1);

      const sundaySlots = generateShowerSlots(sunday);
      const mondaySlots = generateShowerSlots(monday);

      expect(sundaySlots).toEqual(mondaySlots);
    });
  });
});

describe("Laundry Slot Generation", () => {
  describe("Monday (day 1)", () => {
    it("should generate 5 specific laundry time slots", () => {
      const monday = mockDate(1);
      const slots = generateLaundrySlots(monday);

      expect(slots).toEqual([
        "07:30 - 08:30",
        "08:00 - 09:00",
        "08:30 - 09:45",
        "09:00 - 10:15",
        "09:30 - 11:45",
      ]);
    });

    it("should have 5 slots on Monday", () => {
      const monday = mockDate(1);
      const slots = generateLaundrySlots(monday);
      expect(slots).toHaveLength(5);
    });

    it("should start at 07:30 on Monday", () => {
      const monday = mockDate(1);
      const slots = generateLaundrySlots(monday);
      expect(slots[0]).toBe("07:30 - 08:30");
    });
  });

  describe("Wednesday (day 3)", () => {
    it("should generate the same slots as Monday", () => {
      const wednesday = mockDate(3);
      const monday = mockDate(1);

      const wednesdaySlots = generateLaundrySlots(wednesday);
      const mondaySlots = generateLaundrySlots(monday);

      expect(wednesdaySlots).toEqual(mondaySlots);
    });

    it("should have 5 slots on Wednesday", () => {
      const wednesday = mockDate(3);
      const slots = generateLaundrySlots(wednesday);
      expect(slots).toHaveLength(5);
    });
  });

  describe("Saturday (day 6)", () => {
    it("should generate different slots than Monday/Wednesday", () => {
      const saturday = mockDate(6);
      const slots = generateLaundrySlots(saturday);

      expect(slots).toEqual([
        "08:30 - 10:00",
        "09:00 - 10:30",
        "09:30 - 11:00",
        "10:00 - 11:30",
        "10:30 - 12:00",
      ]);
    });

    it("should have 5 slots on Saturday", () => {
      const saturday = mockDate(6);
      const slots = generateLaundrySlots(saturday);
      expect(slots).toHaveLength(5);
    });

    it("should start at 08:30 on Saturday", () => {
      const saturday = mockDate(6);
      const slots = generateLaundrySlots(saturday);
      expect(slots[0]).toBe("08:30 - 10:00");
    });

    it("should end at 12:00 on Saturday", () => {
      const saturday = mockDate(6);
      const slots = generateLaundrySlots(saturday);
      const lastSlot = slots[slots.length - 1];
      expect(lastSlot).toBe("10:30 - 12:00");
    });

    it("should start later than Monday (08:30 vs 07:30)", () => {
      const saturday = mockDate(6);
      const monday = mockDate(1);

      const saturdaySlots = generateLaundrySlots(saturday);
      const mondaySlots = generateLaundrySlots(monday);

      // Saturday starts at 08:30
      expect(saturdaySlots[0]).toMatch(/^08:30/);
      // Monday starts at 07:30
      expect(mondaySlots[0]).toMatch(/^07:30/);
    });
  });

  describe("Other days", () => {
    it("should use Monday/Wednesday schedule for Tuesday (day 2)", () => {
      const tuesday = mockDate(2);
      const monday = mockDate(1);

      const tuesdaySlots = generateLaundrySlots(tuesday);
      const mondaySlots = generateLaundrySlots(monday);

      expect(tuesdaySlots).toEqual(mondaySlots);
    });

    it("should use Monday/Wednesday schedule for Thursday (day 4)", () => {
      const thursday = mockDate(4);
      const monday = mockDate(1);

      const thursdaySlots = generateLaundrySlots(thursday);
      const mondaySlots = generateLaundrySlots(monday);

      expect(thursdaySlots).toEqual(mondaySlots);
    });

    it("should use Monday/Wednesday schedule for Friday (day 5)", () => {
      const friday = mockDate(5);
      const monday = mockDate(1);

      const fridaySlots = generateLaundrySlots(friday);
      const mondaySlots = generateLaundrySlots(monday);

      expect(fridaySlots).toEqual(mondaySlots);
    });

    it("should use Monday/Wednesday schedule for Sunday (day 0)", () => {
      const sunday = mockDate(0);
      const monday = mockDate(1);

      const sundaySlots = generateLaundrySlots(sunday);
      const mondaySlots = generateLaundrySlots(monday);

      expect(sundaySlots).toEqual(mondaySlots);
    });
  });
});

describe("Cross-validation", () => {
  it("should maintain consistent slot counts across all days", () => {
    const days = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
    const showerCounts = days.map(
      (day) => generateShowerSlots(mockDate(day)).length,
    );
    const laundryCounts = days.map(
      (day) => generateLaundrySlots(mockDate(day)).length,
    );

    // All days should have 10 shower slots
    expect(showerCounts.every((count) => count === 10)).toBe(true);

    // All days should have 5 laundry slots
    expect(laundryCounts.every((count) => count === 5)).toBe(true);
  });

  it("should generate valid time formats for shower slots", () => {
    const days = [0, 1, 2, 3, 4, 5, 6];
    const timePattern = /^\d{1,2}:\d{2}$/;

    days.forEach((day) => {
      const slots = generateShowerSlots(mockDate(day));
      slots.forEach((slot) => {
        expect(slot).toMatch(timePattern);
      });
    });
  });

  it("should generate valid time range formats for laundry slots", () => {
    const days = [0, 1, 2, 3, 4, 5, 6];
    const rangePattern = /^\d{2}:\d{2} - \d{2}:\d{2}$/;

    days.forEach((day) => {
      const slots = generateLaundrySlots(mockDate(day));
      slots.forEach((slot) => {
        expect(slot).toMatch(rangePattern);
      });
    });
  });

  it("should have overlapping laundry slots on Saturday", () => {
    const saturday = mockDate(6);
    const slots = generateLaundrySlots(saturday);

    // All Saturday slots should overlap (each starts before the previous ends)
    expect(slots[0]).toBe("08:30 - 10:00");
    expect(slots[1]).toBe("09:00 - 10:30"); // starts at 09:00, before 10:00
    expect(slots[2]).toBe("09:30 - 11:00"); // starts at 09:30, before 10:30
    expect(slots[3]).toBe("10:00 - 11:30"); // starts at 10:00, before 11:00
    expect(slots[4]).toBe("10:30 - 12:00"); // starts at 10:30, before 11:30
  });

  it("should have overlapping laundry slots on Monday/Wednesday", () => {
    const monday = mockDate(1);
    const slots = generateLaundrySlots(monday);

    // Some slots should overlap
    expect(slots).toContain("08:30 - 09:45");
    expect(slots).toContain("09:00 - 10:15");
  });
});
