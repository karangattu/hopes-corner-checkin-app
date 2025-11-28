/**
 * Tests for App Version Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We need to mock __APP_VERSION__ before importing the module
vi.stubGlobal("__APP_VERSION__", "1.2.3");

// Import after mocking
import {
  APP_VERSION,
  CHANGELOG,
  hasUnseenUpdates,
  markVersionAsSeen,
  getAppVersion,
} from "../appVersion";

describe("appVersion utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("APP_VERSION", () => {
    it("should be defined", () => {
      expect(APP_VERSION).toBeDefined();
    });

    it("should be a string", () => {
      expect(typeof APP_VERSION).toBe("string");
    });
  });

  describe("CHANGELOG", () => {
    it("should be an array", () => {
      expect(Array.isArray(CHANGELOG)).toBe(true);
    });

    it("should have at least one entry", () => {
      expect(CHANGELOG.length).toBeGreaterThan(0);
    });

    it("should have version and date for each entry", () => {
      CHANGELOG.forEach((entry) => {
        expect(entry).toHaveProperty("version");
        expect(entry).toHaveProperty("date");
        expect(entry).toHaveProperty("highlights");
      });
    });

    it("should have type, title, and description for each highlight", () => {
      CHANGELOG.forEach((entry) => {
        entry.highlights.forEach((highlight) => {
          expect(highlight).toHaveProperty("type");
          expect(highlight).toHaveProperty("title");
          expect(highlight).toHaveProperty("description");
        });
      });
    });

    it("should have valid types for highlights", () => {
      const validTypes = ["feature", "fix", "performance", "improvement"];
      CHANGELOG.forEach((entry) => {
        entry.highlights.forEach((highlight) => {
          expect(validTypes).toContain(highlight.type);
        });
      });
    });
  });

  describe("hasUnseenUpdates", () => {
    it("should return true when no version has been seen", () => {
      expect(hasUnseenUpdates()).toBe(true);
    });

    it("should return false when current version has been seen", () => {
      localStorage.setItem("hopes-corner-seen-version", APP_VERSION);
      expect(hasUnseenUpdates()).toBe(false);
    });

    it("should return true when different version was seen", () => {
      localStorage.setItem("hopes-corner-seen-version", "0.0.0");
      expect(hasUnseenUpdates()).toBe(true);
    });
  });

  describe("markVersionAsSeen", () => {
    it("should store current version in localStorage", () => {
      markVersionAsSeen();
      expect(localStorage.getItem("hopes-corner-seen-version")).toBe(
        APP_VERSION
      );
    });

    it("should make hasUnseenUpdates return false", () => {
      expect(hasUnseenUpdates()).toBe(true);
      markVersionAsSeen();
      expect(hasUnseenUpdates()).toBe(false);
    });
  });

  describe("getAppVersion", () => {
    it("should return the current version", () => {
      expect(getAppVersion()).toBe(APP_VERSION);
    });
  });
});
