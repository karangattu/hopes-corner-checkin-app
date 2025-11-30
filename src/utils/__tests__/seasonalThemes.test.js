import { describe, it, expect } from "vitest";
import {
  getCurrentHoliday,
  getCurrentSeason,
  getCurrentTheme,
  isSpecialOccasion,
  getThemedGreeting,
  calculateEaster,
  HOLIDAYS,
  SEASONS,
} from "../seasonalThemes";

describe("seasonalThemes", () => {
  describe("calculateEaster", () => {
    it("calculates Easter correctly for 2024", () => {
      const easter2024 = calculateEaster(2024);
      // Easter 2024 is March 31
      expect(easter2024.getMonth()).toBe(2); // March (0-indexed)
      expect(easter2024.getDate()).toBe(31);
    });

    it("calculates Easter correctly for 2025", () => {
      const easter2025 = calculateEaster(2025);
      // Easter 2025 is April 20
      expect(easter2025.getMonth()).toBe(3); // April (0-indexed)
      expect(easter2025.getDate()).toBe(20);
    });
  });

  describe("getCurrentHoliday", () => {
    it("returns Christmas for December 25", () => {
      const christmasDay = new Date(2024, 11, 25); // Dec 25, 2024
      const holiday = getCurrentHoliday(christmasDay);
      expect(holiday).not.toBeNull();
      expect(holiday.key).toBe("christmas");
      expect(holiday.name).toBe("Christmas");
      expect(holiday.emoji).toBe("🎄");
    });

    it("returns Halloween for October 31", () => {
      const halloween = new Date(2024, 9, 31); // Oct 31, 2024
      const holiday = getCurrentHoliday(halloween);
      expect(holiday).not.toBeNull();
      expect(holiday.key).toBe("halloween");
      expect(holiday.name).toBe("Halloween");
      expect(holiday.emoji).toBe("🎃");
    });

    it("returns Valentine's Day for February 14", () => {
      const valentines = new Date(2024, 1, 14); // Feb 14, 2024
      const holiday = getCurrentHoliday(valentines);
      expect(holiday).not.toBeNull();
      expect(holiday.key).toBe("valentines");
      expect(holiday.name).toBe("Valentine's Day");
      expect(holiday.emoji).toBe("💕");
    });

    it("returns New Year for January 1", () => {
      const newYear = new Date(2024, 0, 1); // Jan 1, 2024
      const holiday = getCurrentHoliday(newYear);
      expect(holiday).not.toBeNull();
      expect(holiday.key).toBe("newYear");
      expect(holiday.name).toBe("New Year");
    });

    it("returns St. Patrick's Day for March 17", () => {
      const stPatricks = new Date(2024, 2, 17); // Mar 17, 2024
      const holiday = getCurrentHoliday(stPatricks);
      expect(holiday).not.toBeNull();
      expect(holiday.key).toBe("stPatricks");
      expect(holiday.emoji).toBe("☘️");
    });

    it("returns Independence Day for July 4", () => {
      const july4 = new Date(2024, 6, 4); // Jul 4, 2024
      const holiday = getCurrentHoliday(july4);
      expect(holiday).not.toBeNull();
      expect(holiday.key).toBe("independence");
      expect(holiday.emoji).toBe("🇺🇸");
    });

    it("returns null for a regular day", () => {
      const regularDay = new Date(2024, 3, 15); // Apr 15, 2024
      const holiday = getCurrentHoliday(regularDay);
      expect(holiday).toBeNull();
    });
  });

  describe("getCurrentSeason", () => {
    it("returns spring for April", () => {
      const aprilDate = new Date(2024, 3, 15); // Apr 15
      const season = getCurrentSeason(aprilDate);
      expect(season.key).toBe("spring");
      expect(season.name).toBe("Spring");
      expect(season.emoji).toBe("🌸");
    });

    it("returns summer for July", () => {
      const julyDate = new Date(2024, 6, 15); // Jul 15
      const season = getCurrentSeason(julyDate);
      expect(season.key).toBe("summer");
      expect(season.name).toBe("Summer");
      expect(season.emoji).toBe("☀️");
    });

    it("returns fall for October", () => {
      const octoberDate = new Date(2024, 9, 15); // Oct 15
      const season = getCurrentSeason(octoberDate);
      expect(season.key).toBe("fall");
      expect(season.name).toBe("Fall");
      expect(season.emoji).toBe("🍂");
    });

    it("returns winter for January", () => {
      const januaryDate = new Date(2024, 0, 15); // Jan 15
      const season = getCurrentSeason(januaryDate);
      expect(season.key).toBe("winter");
      expect(season.name).toBe("Winter");
      expect(season.emoji).toBe("❄️");
    });

    it("returns winter for December", () => {
      const decemberDate = new Date(2024, 11, 15); // Dec 15
      const season = getCurrentSeason(decemberDate);
      expect(season.key).toBe("winter");
    });
  });

  describe("getCurrentTheme", () => {
    it("returns holiday theme on Christmas", () => {
      const christmas = new Date(2024, 11, 25);
      const theme = getCurrentTheme(christmas);
      expect(theme.type).toBe("holiday");
      expect(theme.key).toBe("christmas");
    });

    it("returns season theme on a regular day", () => {
      const regularDay = new Date(2024, 3, 15); // Mid-April
      const theme = getCurrentTheme(regularDay);
      expect(theme.type).toBe("season");
      expect(theme.key).toBe("spring");
    });

    it("includes colors and decorations", () => {
      const halloween = new Date(2024, 9, 31);
      const theme = getCurrentTheme(halloween);
      expect(theme.colors).toBeDefined();
      expect(theme.colors.length).toBeGreaterThan(0);
      expect(theme.decorations).toBeDefined();
    });
  });

  describe("isSpecialOccasion", () => {
    it("returns true for Christmas", () => {
      const christmas = new Date(2024, 11, 25);
      expect(isSpecialOccasion(christmas)).toBe(true);
    });

    it("returns true for Halloween", () => {
      const halloween = new Date(2024, 9, 31);
      expect(isSpecialOccasion(halloween)).toBe(true);
    });

    it("returns false for a regular day", () => {
      const regularDay = new Date(2024, 3, 15);
      expect(isSpecialOccasion(regularDay)).toBe(false);
    });
  });

  describe("getThemedGreeting", () => {
    it("returns holiday message for Christmas", () => {
      const christmas = new Date(2024, 11, 25);
      const greeting = getThemedGreeting(christmas);
      expect(greeting).toContain("Merry Christmas");
    });

    it("returns holiday message for Halloween", () => {
      const halloween = new Date(2024, 9, 31);
      const greeting = getThemedGreeting(halloween);
      expect(greeting).toContain("Spooky");
    });

    it("returns seasonal greeting for a regular spring day", () => {
      const springDay = new Date(2024, 3, 15);
      const greeting = getThemedGreeting(springDay);
      expect(greeting).toContain("Spring");
    });

    it("returns seasonal greeting for a regular summer day", () => {
      const summerDay = new Date(2024, 6, 15);
      const greeting = getThemedGreeting(summerDay);
      expect(greeting).toContain("cool");
    });
  });

  describe("HOLIDAYS configuration", () => {
    it("has all expected holidays configured", () => {
      const expectedHolidays = [
        "newYear",
        "valentines",
        "stPatricks",
        "easter",
        "cincoMayo",
        "independence",
        "halloween",
        "thanksgiving",
        "christmas",
        "hanukkah",
      ];
      expectedHolidays.forEach((holiday) => {
        expect(HOLIDAYS[holiday]).toBeDefined();
        expect(HOLIDAYS[holiday].name).toBeDefined();
        expect(HOLIDAYS[holiday].emoji).toBeDefined();
        expect(HOLIDAYS[holiday].colors).toBeDefined();
        expect(typeof HOLIDAYS[holiday].check).toBe("function");
      });
    });
  });

  describe("SEASONS configuration", () => {
    it("has all four seasons configured", () => {
      const expectedSeasons = ["spring", "summer", "fall", "winter"];
      expectedSeasons.forEach((season) => {
        expect(SEASONS[season]).toBeDefined();
        expect(SEASONS[season].name).toBeDefined();
        expect(SEASONS[season].emoji).toBeDefined();
        expect(SEASONS[season].colors).toBeDefined();
        expect(typeof SEASONS[season].check).toBe("function");
      });
    });
  });

  describe("Thanksgiving calculation", () => {
    it("correctly identifies Thanksgiving 2024 (November 28)", () => {
      // 2024 Thanksgiving is November 28
      const thanksgiving2024 = new Date(2024, 10, 28);
      const holiday = getCurrentHoliday(thanksgiving2024);
      expect(holiday).not.toBeNull();
      expect(holiday.key).toBe("thanksgiving");
    });

    it("does not match early November dates", () => {
      const earlyNov = new Date(2024, 10, 5);
      const holiday = getCurrentHoliday(earlyNov);
      // Should not be Thanksgiving
      expect(holiday?.key).not.toBe("thanksgiving");
    });
  });
});
