import { describe, it, expect } from "vitest";
import {
  getMealServiceInfo,
  getMealServiceStatus,
  formatTimeRemaining,
  formatTime,
  getDayName,
  hasMealService,
} from "../mealServiceTime";

describe("mealServiceTime utility", () => {
  describe("getMealServiceInfo", () => {
    it("returns null for Sunday (no service)", () => {
      const sunday = new Date(2024, 0, 7); // January 7, 2024 is a Sunday
      expect(getMealServiceInfo(sunday)).toBeNull();
    });

    it("returns null for Tuesday (no service)", () => {
      const tuesday = new Date(2024, 0, 9); // January 9, 2024 is a Tuesday
      expect(getMealServiceInfo(tuesday)).toBeNull();
    });

    it("returns null for Thursday (no service)", () => {
      const thursday = new Date(2024, 0, 11); // January 11, 2024 is a Thursday
      expect(getMealServiceInfo(thursday)).toBeNull();
    });

    it("returns 8-9 AM for Monday", () => {
      const monday = new Date(2024, 0, 8); // January 8, 2024 is a Monday
      const info = getMealServiceInfo(monday);
      expect(info).toEqual({
        startHour: 8,
        startMinute: 0,
        endHour: 9,
        endMinute: 0,
      });
    });

    it("returns 8-9 AM for Wednesday", () => {
      const wednesday = new Date(2024, 0, 10); // January 10, 2024 is a Wednesday
      const info = getMealServiceInfo(wednesday);
      expect(info).toEqual({
        startHour: 8,
        startMinute: 0,
        endHour: 9,
        endMinute: 0,
      });
    });

    it("returns 8-9 AM for Friday", () => {
      const friday = new Date(2024, 0, 12); // January 12, 2024 is a Friday
      const info = getMealServiceInfo(friday);
      expect(info).toEqual({
        startHour: 8,
        startMinute: 0,
        endHour: 9,
        endMinute: 0,
      });
    });

    it("returns 8-10 AM for Saturday (extended hours)", () => {
      const saturday = new Date(2024, 0, 13); // January 13, 2024 is a Saturday
      const info = getMealServiceInfo(saturday);
      expect(info).toEqual({
        startHour: 8,
        startMinute: 0,
        endHour: 10,
        endMinute: 0,
      });
    });
  });

  describe("getMealServiceStatus", () => {
    describe("no-service days", () => {
      it("returns no-service type for Sunday", () => {
        const sunday = new Date(2024, 0, 7, 8, 30); // Sunday 8:30 AM
        const status = getMealServiceStatus(sunday);
        expect(status.type).toBe("no-service");
        expect(status.message).toBeNull();
        expect(status.timeRemaining).toBeNull();
      });

      it("returns no-service type for Tuesday", () => {
        const tuesday = new Date(2024, 0, 9, 8, 30); // Tuesday 8:30 AM
        const status = getMealServiceStatus(tuesday);
        expect(status.type).toBe("no-service");
      });

      it("returns no-service type for Thursday", () => {
        const thursday = new Date(2024, 0, 11, 8, 30); // Thursday 8:30 AM
        const status = getMealServiceStatus(thursday);
        expect(status.type).toBe("no-service");
      });
    });

    describe("before-service", () => {
      it("shows time until service starts on Monday morning", () => {
        const monday = new Date(2024, 0, 8, 7, 30); // Monday 7:30 AM
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("before-service");
        expect(status.timeRemaining).toBe(30);
        expect(status.message).toContain("30 min");
        expect(status.startsAt).toBe("8:00 AM");
        expect(status.endsAt).toBe("9:00 AM");
      });

      it("shows time until service starts on Saturday early morning", () => {
        const saturday = new Date(2024, 0, 13, 6, 0); // Saturday 6:00 AM
        const status = getMealServiceStatus(saturday);
        expect(status.type).toBe("before-service");
        expect(status.timeRemaining).toBe(120); // 2 hours
        expect(status.message).toContain("2 hours");
        expect(status.endsAt).toBe("10:00 AM");
      });

      it("shows correct message when service is about to start", () => {
        const monday = new Date(2024, 0, 8, 7, 55); // Monday 7:55 AM
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("before-service");
        expect(status.timeRemaining).toBe(5);
        expect(status.message).toContain("5 min");
      });
    });

    describe("during-service", () => {
      it("shows time remaining at start of service on Monday", () => {
        const monday = new Date(2024, 0, 8, 8, 0); // Monday 8:00 AM
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("during-service");
        expect(status.timeRemaining).toBe(60);
        expect(status.totalDuration).toBe(60);
        expect(status.elapsed).toBe(0);
        expect(status.endsAt).toBe("9:00 AM");
      });

      it("shows time remaining mid-service on Monday", () => {
        const monday = new Date(2024, 0, 8, 8, 30); // Monday 8:30 AM
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("during-service");
        expect(status.timeRemaining).toBe(30);
        expect(status.elapsed).toBe(30);
        expect(status.message).toContain("30 min");
      });

      it("shows time remaining on Saturday with extended hours", () => {
        const saturday = new Date(2024, 0, 13, 9, 0); // Saturday 9:00 AM
        const status = getMealServiceStatus(saturday);
        expect(status.type).toBe("during-service");
        expect(status.timeRemaining).toBe(60);
        expect(status.totalDuration).toBe(120);
        expect(status.elapsed).toBe(60);
      });

      it("shows urgent timing when less than 10 minutes remaining", () => {
        const monday = new Date(2024, 0, 8, 8, 52); // Monday 8:52 AM
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("during-service");
        expect(status.timeRemaining).toBe(8);
        expect(status.message).toContain("8 min");
      });

      it("shows warning timing when less than 20 minutes remaining", () => {
        const monday = new Date(2024, 0, 8, 8, 45); // Monday 8:45 AM
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("during-service");
        expect(status.timeRemaining).toBe(15);
      });
    });

    describe("ended", () => {
      it("shows ended status after service on Monday", () => {
        const monday = new Date(2024, 0, 8, 9, 30); // Monday 9:30 AM
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("ended");
        expect(status.message).toBe("Meal service ended for today");
        expect(status.timeRemaining).toBe(0);
      });

      it("shows ended status after service on Saturday", () => {
        const saturday = new Date(2024, 0, 13, 10, 30); // Saturday 10:30 AM
        const status = getMealServiceStatus(saturday);
        expect(status.type).toBe("ended");
        expect(status.message).toBe("Meal service ended for today");
      });

      it("shows ended status in the afternoon on service day", () => {
        const monday = new Date(2024, 0, 8, 14, 0); // Monday 2:00 PM
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("ended");
      });

      it("shows ended status at exactly end time", () => {
        const monday = new Date(2024, 0, 8, 9, 0); // Monday 9:00 AM exactly
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("ended");
      });
    });

    describe("edge cases", () => {
      it("handles midnight on service day", () => {
        const monday = new Date(2024, 0, 8, 0, 0); // Monday midnight
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("before-service");
        expect(status.timeRemaining).toBe(480); // 8 hours
      });

      it("handles one minute before end", () => {
        const monday = new Date(2024, 0, 8, 8, 59); // Monday 8:59 AM
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("during-service");
        expect(status.timeRemaining).toBe(1);
      });

      it("handles late night on service day", () => {
        const monday = new Date(2024, 0, 8, 23, 59); // Monday 11:59 PM
        const status = getMealServiceStatus(monday);
        expect(status.type).toBe("ended");
      });
    });
  });

  describe("formatTimeRemaining", () => {
    it("formats less than a minute", () => {
      expect(formatTimeRemaining(0.5)).toBe("less than a minute");
    });

    it("formats single minute", () => {
      expect(formatTimeRemaining(1)).toBe("1 min");
    });

    it("formats multiple minutes", () => {
      expect(formatTimeRemaining(30)).toBe("30 min");
    });

    it("formats exactly one hour", () => {
      expect(formatTimeRemaining(60)).toBe("1 hour");
    });

    it("formats multiple hours", () => {
      expect(formatTimeRemaining(120)).toBe("2 hours");
    });

    it("formats hours and minutes", () => {
      expect(formatTimeRemaining(90)).toBe("1h 30m");
    });

    it("formats complex duration", () => {
      expect(formatTimeRemaining(125)).toBe("2h 5m");
    });
  });

  describe("formatTime", () => {
    it("formats morning time correctly", () => {
      expect(formatTime(8, 0)).toBe("8:00 AM");
      expect(formatTime(9, 30)).toBe("9:30 AM");
    });

    it("formats afternoon time correctly", () => {
      expect(formatTime(14, 0)).toBe("2:00 PM");
      expect(formatTime(15, 45)).toBe("3:45 PM");
    });

    it("formats midnight correctly", () => {
      expect(formatTime(0, 0)).toBe("12:00 AM");
    });

    it("formats noon correctly", () => {
      expect(formatTime(12, 0)).toBe("12:00 PM");
    });

    it("pads minutes with zero", () => {
      expect(formatTime(8, 5)).toBe("8:05 AM");
    });
  });

  describe("getDayName", () => {
    it("returns correct day names", () => {
      expect(getDayName(0)).toBe("Sunday");
      expect(getDayName(1)).toBe("Monday");
      expect(getDayName(2)).toBe("Tuesday");
      expect(getDayName(3)).toBe("Wednesday");
      expect(getDayName(4)).toBe("Thursday");
      expect(getDayName(5)).toBe("Friday");
      expect(getDayName(6)).toBe("Saturday");
    });
  });

  describe("hasMealService", () => {
    it("returns false for no-service days", () => {
      expect(hasMealService(0)).toBe(false); // Sunday
      expect(hasMealService(2)).toBe(false); // Tuesday
      expect(hasMealService(4)).toBe(false); // Thursday
    });

    it("returns true for service days", () => {
      expect(hasMealService(1)).toBe(true); // Monday
      expect(hasMealService(3)).toBe(true); // Wednesday
      expect(hasMealService(5)).toBe(true); // Friday
      expect(hasMealService(6)).toBe(true); // Saturday
    });
  });
});