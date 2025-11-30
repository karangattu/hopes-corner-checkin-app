import { describe, it, expect, beforeEach } from "vitest";
import {
  getNextMilestone,
  getPreviousMilestone,
  getMilestoneProgress,
  checkMilestoneReached,
  shouldCelebrate,
  formatMilestone,
  getCelebrationMessage,
  markMilestoneShown,
  isMilestoneShown,
  getShownMilestones,
  MILESTONES,
  SERVICE_CONFIGS,
} from "../milestones";

describe("milestones", () => {
  describe("getNextMilestone", () => {
    it("returns 100 for count 0", () => {
      expect(getNextMilestone(0)).toBe(100);
    });

    it("returns 100 for count 50", () => {
      expect(getNextMilestone(50)).toBe(100);
    });

    it("returns 250 for count 100", () => {
      expect(getNextMilestone(100)).toBe(250);
    });

    it("returns 500 for count 250", () => {
      expect(getNextMilestone(250)).toBe(500);
    });

    it("returns 1000 for count 750", () => {
      expect(getNextMilestone(750)).toBe(1000);
    });

    it("returns null when past all milestones", () => {
      expect(getNextMilestone(15000)).toBeNull();
    });
  });

  describe("getPreviousMilestone", () => {
    it("returns null for count 0", () => {
      expect(getPreviousMilestone(0)).toBeNull();
    });

    it("returns null for count 50", () => {
      expect(getPreviousMilestone(50)).toBeNull();
    });

    it("returns 100 for count 100", () => {
      expect(getPreviousMilestone(100)).toBe(100);
    });

    it("returns 100 for count 150", () => {
      expect(getPreviousMilestone(150)).toBe(100);
    });

    it("returns 1000 for count 1500", () => {
      expect(getPreviousMilestone(1500)).toBe(1500);
    });

    it("returns 10000 for count 12000", () => {
      expect(getPreviousMilestone(12000)).toBe(10000);
    });
  });

  describe("getMilestoneProgress", () => {
    it("calculates progress for count 50 (50% to 100)", () => {
      const progress = getMilestoneProgress(50);
      expect(progress.current).toBe(50);
      expect(progress.previous).toBe(0);
      expect(progress.next).toBe(100);
      expect(progress.percentage).toBe(50);
      expect(progress.remaining).toBe(50);
    });

    it("calculates progress for count 175 (50% from 100 to 250)", () => {
      const progress = getMilestoneProgress(175);
      expect(progress.current).toBe(175);
      expect(progress.previous).toBe(100);
      expect(progress.next).toBe(250);
      expect(progress.percentage).toBe(50);
      expect(progress.remaining).toBe(75);
    });

    it("returns 100% when past all milestones", () => {
      const progress = getMilestoneProgress(15000);
      expect(progress.percentage).toBe(100);
      expect(progress.next).toBeNull();
      expect(progress.remaining).toBe(0);
    });
  });

  describe("checkMilestoneReached", () => {
    it("returns 100 when crossing from 99 to 100", () => {
      expect(checkMilestoneReached(99, 100)).toBe(100);
    });

    it("returns 100 when crossing from 50 to 150", () => {
      expect(checkMilestoneReached(50, 150)).toBe(100);
    });

    it("returns 1000 when crossing from 999 to 1000", () => {
      expect(checkMilestoneReached(999, 1000)).toBe(1000);
    });

    it("returns null when no milestone crossed", () => {
      expect(checkMilestoneReached(50, 75)).toBeNull();
    });

    it("returns null when already past milestone", () => {
      expect(checkMilestoneReached(101, 150)).toBeNull();
    });

    it("returns first milestone crossed when skipping multiple", () => {
      // If jumping from 50 to 500, should return 100 (first milestone crossed)
      expect(checkMilestoneReached(50, 500)).toBe(100);
    });
  });

  describe("formatMilestone", () => {
    it("formats small numbers as-is", () => {
      expect(formatMilestone(100)).toBe("100");
      expect(formatMilestone(250)).toBe("250");
      expect(formatMilestone(500)).toBe("500");
    });

    it("formats thousands with K suffix", () => {
      expect(formatMilestone(1000)).toBe("1K");
      expect(formatMilestone(2000)).toBe("2K");
      expect(formatMilestone(5000)).toBe("5K");
      expect(formatMilestone(10000)).toBe("10K");
    });
  });

  describe("getCelebrationMessage", () => {
    it("returns appropriate message for 100 milestone", () => {
      const message = getCelebrationMessage(100, "meals");
      expect(message).toContain("100");
      expect(message).toContain("meals served");
    });

    it("returns appropriate message for 1000 milestone", () => {
      const message = getCelebrationMessage(1000, "showers");
      expect(message).toContain("1,000");
      expect(message).toContain("showers provided");
    });

    it("includes service emoji", () => {
      const message = getCelebrationMessage(100, "meals");
      expect(message).toContain("🍽️");
    });
  });

  describe("localStorage milestone tracking", () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it("getShownMilestones returns empty object initially", () => {
      expect(getShownMilestones()).toEqual({});
    });

    it("markMilestoneShown adds milestone to storage", () => {
      markMilestoneShown("meals", 100);
      const shown = getShownMilestones();
      expect(shown.meals).toContain(100);
    });

    it("isMilestoneShown returns false for unshown milestone", () => {
      expect(isMilestoneShown("meals", 100)).toBe(false);
    });

    it("isMilestoneShown returns true after marking shown", () => {
      markMilestoneShown("meals", 100);
      expect(isMilestoneShown("meals", 100)).toBe(true);
    });

    it("tracks milestones per service type", () => {
      markMilestoneShown("meals", 100);
      markMilestoneShown("showers", 250);

      expect(isMilestoneShown("meals", 100)).toBe(true);
      expect(isMilestoneShown("meals", 250)).toBe(false);
      expect(isMilestoneShown("showers", 250)).toBe(true);
      expect(isMilestoneShown("showers", 100)).toBe(false);
    });

    it("does not duplicate milestones when marked twice", () => {
      markMilestoneShown("meals", 100);
      markMilestoneShown("meals", 100);
      const shown = getShownMilestones();
      expect(shown.meals.length).toBe(1);
    });
  });

  describe("shouldCelebrate", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("returns celebration config for exact milestone", () => {
      const result = shouldCelebrate("meals", 100);
      expect(result).not.toBeNull();
      expect(result.milestone).toBe(100);
      expect(result.serviceType).toBe("meals");
      expect(result.label).toBe("meals served");
    });

    it("returns null for non-milestone count", () => {
      expect(shouldCelebrate("meals", 99)).toBeNull();
      expect(shouldCelebrate("meals", 101)).toBeNull();
    });

    it("returns null if milestone already shown", () => {
      markMilestoneShown("meals", 100);
      expect(shouldCelebrate("meals", 100)).toBeNull();
    });

    it("returns null for unknown service type", () => {
      expect(shouldCelebrate("unknown", 100)).toBeNull();
    });

    it("includes celebrationType based on milestone size", () => {
      const small = shouldCelebrate("meals", 100);
      expect(small.celebrationType).toBe("confetti");

      localStorage.clear();
      const big = shouldCelebrate("meals", 1000);
      expect(big.celebrationType).toBe("fireworks");
    });
  });

  describe("MILESTONES constant", () => {
    it("contains expected milestone values", () => {
      expect(MILESTONES).toContain(100);
      expect(MILESTONES).toContain(500);
      expect(MILESTONES).toContain(1000);
      expect(MILESTONES).toContain(10000);
    });

    it("is sorted in ascending order", () => {
      for (let i = 1; i < MILESTONES.length; i++) {
        expect(MILESTONES[i]).toBeGreaterThan(MILESTONES[i - 1]);
      }
    });
  });

  describe("SERVICE_CONFIGS constant", () => {
    it("has configuration for all expected services", () => {
      const expectedServices = ["meals", "showers", "laundry", "checkins", "donations"];
      expectedServices.forEach((service) => {
        expect(SERVICE_CONFIGS[service]).toBeDefined();
        expect(SERVICE_CONFIGS[service].label).toBeDefined();
        expect(SERVICE_CONFIGS[service].emoji).toBeDefined();
        expect(SERVICE_CONFIGS[service].color).toBeDefined();
      });
    });
  });
});
