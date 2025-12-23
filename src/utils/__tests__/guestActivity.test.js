import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getLastMealDate,
  isActiveGuest,
  getLastMealLabel,
} from "../guestActivity";

describe("guestActivity utilities", () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  describe("getLastMealDate", () => {
    it("should return isRecent false when guest has no meal records", () => {
      const result = getLastMealDate("guest123", []);
      expect(result).toEqual({
        isRecent: false,
        lastMealDate: null,
        daysAgo: null,
      });
    });

    it("should return isRecent false with null guestId", () => {
      const mealRecords = [{ guestId: "guest123", date: new Date() }];
      const result = getLastMealDate(null, mealRecords);
      expect(result).toEqual({
        isRecent: false,
        lastMealDate: null,
        daysAgo: null,
      });
    });

    it("should return isRecent false with undefined mealRecords", () => {
      const result = getLastMealDate("guest123", undefined);
      expect(result).toEqual({
        isRecent: false,
        lastMealDate: null,
        daysAgo: null,
      });
    });

    it("should find meal from today and mark as recent", () => {
      const today = new Date();
      const mealRecords = [
        {
          guestId: "guest123",
          date: today.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealDate("guest123", mealRecords);
      expect(result.isRecent).toBe(true);
      expect(result.daysAgo).toBe(0);
      expect(result.lastMealDate).not.toBeNull();
    });

    it("should find meal from 1 day ago and mark as recent", () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mealRecords = [
        {
          guestId: "guest123",
          date: oneDayAgo.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealDate("guest123", mealRecords);
      expect(result.isRecent).toBe(true);
      expect(result.daysAgo).toBe(1);
    });

    it("should find meal from 6 days ago and mark as recent", () => {
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      const mealRecords = [
        {
          guestId: "guest123",
          date: sixDaysAgo.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealDate("guest123", mealRecords);
      expect(result.isRecent).toBe(true);
      expect(result.daysAgo).toBe(6);
    });

    it("should find meal from 7 days ago and mark as NOT recent (boundary)", () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const mealRecords = [
        {
          guestId: "guest123",
          date: sevenDaysAgo.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealDate("guest123", mealRecords);
      expect(result.isRecent).toBe(false);
      expect(result.daysAgo).toBe(7);
    });

    it("should find meal from 30 days ago and mark as NOT recent", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const mealRecords = [
        {
          guestId: "guest123",
          date: thirtyDaysAgo.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealDate("guest123", mealRecords);
      expect(result.isRecent).toBe(false);
      expect(result.daysAgo).toBe(30);
    });

    it("should return the most recent meal when multiple records exist", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      const mealRecords = [
        {
          guestId: "guest123",
          date: tenDaysAgo.toISOString(),
          count: 1,
        },
        {
          guestId: "guest123",
          date: threeDaysAgo.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealDate("guest123", mealRecords);
      expect(result.isRecent).toBe(true);
      expect(result.daysAgo).toBe(3);
    });

    it("should not return meals from other guests", () => {
      const today = new Date();
      const mealRecords = [
        {
          guestId: "guest456",
          date: today.toISOString(),
          count: 1,
        },
        {
          guestId: "guest789",
          date: today.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealDate("guest123", mealRecords);
      expect(result.isRecent).toBe(false);
      expect(result.lastMealDate).toBeNull();
    });
  });

  describe("isActiveGuest", () => {
    it("should return true when guest has meal in last 7 days", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const mealRecords = [
        {
          guestId: "guest123",
          date: twoDaysAgo.toISOString(),
          count: 1,
        },
      ];

      const result = isActiveGuest("guest123", mealRecords);
      expect(result).toBe(true);
    });

    it("should return false when guest has no meals", () => {
      const result = isActiveGuest("guest123", []);
      expect(result).toBe(false);
    });

    it("should return false when guest's last meal is more than 7 days ago", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const mealRecords = [
        {
          guestId: "guest123",
          date: tenDaysAgo.toISOString(),
          count: 1,
        },
      ];

      const result = isActiveGuest("guest123", mealRecords);
      expect(result).toBe(false);
    });
  });

  describe("getLastMealLabel", () => {
    it("should return 'Today' for meal from today", () => {
      const today = new Date();
      const mealRecords = [
        {
          guestId: "guest123",
          date: today.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealLabel("guest123", mealRecords);
      expect(result).toBe("Today");
    });

    it("should return 'Yesterday' for meal from 1 day ago", () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mealRecords = [
        {
          guestId: "guest123",
          date: oneDayAgo.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealLabel("guest123", mealRecords);
      expect(result).toBe("Yesterday");
    });

    it("should return '3 days ago' for meal from 3 days ago", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const mealRecords = [
        {
          guestId: "guest123",
          date: threeDaysAgo.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealLabel("guest123", mealRecords);
      expect(result).toBe("3 days ago");
    });

    it("should return '6 days ago' for meal from 6 days ago", () => {
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      const mealRecords = [
        {
          guestId: "guest123",
          date: sixDaysAgo.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealLabel("guest123", mealRecords);
      expect(result).toBe("6 days ago");
    });

    it("should return '1 weeks ago' for meal from 10 days ago", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const mealRecords = [
        {
          guestId: "guest123",
          date: tenDaysAgo.toISOString(),
          count: 1,
        },
      ];

      const result = getLastMealLabel("guest123", mealRecords);
      expect(result).toBe("1 weeks ago");
    });

    it("should return empty string for guest with no meals", () => {
      const result = getLastMealLabel("guest123", []);
      expect(result).toBe("");
    });
  });
});
