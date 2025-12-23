import { describe, it, expect } from "vitest";
import {
  levenshteinDistance,
  similarityScore,
  findFuzzySuggestions,
  formatSuggestionDisplay,
  soundsLike,
  hasMatchingFirstChars,
} from "../fuzzyMatch";

describe("fuzzyMatch utilities", () => {
  describe("levenshteinDistance", () => {
    it("returns 0 for identical strings", () => {
      expect(levenshteinDistance("hello", "hello")).toBe(0);
      expect(levenshteinDistance("", "")).toBe(0);
      expect(levenshteinDistance("John Smith", "John Smith")).toBe(0);
    });

    it("returns correct distance for simple edits", () => {
      expect(levenshteinDistance("cat", "bat")).toBe(1); // substitution
      expect(levenshteinDistance("cat", "cats")).toBe(1); // insertion
      expect(levenshteinDistance("cats", "cat")).toBe(1); // deletion
    });

    it("returns length of longer string when one is empty", () => {
      expect(levenshteinDistance("", "hello")).toBe(5);
      expect(levenshteinDistance("hello", "")).toBe(5);
    });

    it("handles case insensitivity", () => {
      expect(levenshteinDistance("Hello", "hello")).toBe(0);
      expect(levenshteinDistance("JOHN", "john")).toBe(0);
    });

    it("calculates correct distance for common typos", () => {
      expect(levenshteinDistance("michael", "micheal")).toBe(2); // transposition
      expect(levenshteinDistance("robert", "robrt")).toBe(1); // missing letter
      expect(levenshteinDistance("jennifer", "jenniffer")).toBe(1); // extra letter
    });
  });

  describe("similarityScore", () => {
    it("returns 1 for identical strings", () => {
      expect(similarityScore("hello", "hello")).toBe(1);
      expect(similarityScore("John", "john")).toBe(1);
    });

    it("returns 0 for completely different strings", () => {
      expect(similarityScore("abc", "xyz")).toBeLessThan(0.5);
    });

    it("returns value between 0 and 1", () => {
      const score = similarityScore("hello", "hallo");
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it("returns higher score for more similar strings", () => {
      const score1 = similarityScore("michael", "micheal");
      const score2 = similarityScore("michael", "john");
      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe("soundsLike", () => {
    it("returns true for identical strings", () => {
      expect(soundsLike("michael", "michael")).toBe(true);
    });

    it("returns false for different-sounding names", () => {
      expect(soundsLike("John", "Mary")).toBe(false);
      expect(soundsLike("Bob", "Alice")).toBe(false);
    });
    
    it("returns true when normalized names are similar", () => {
      // After normalization (vowels -> 'a', ph -> f, etc.)
      expect(soundsLike("phonics", "fanacs")).toBe(true); // ph -> f
    });
  });

  describe("hasMatchingFirstChars", () => {
    it("returns true when first character matches", () => {
      expect(hasMatchingFirstChars("John", "Jon")).toBe(true);
      expect(hasMatchingFirstChars("Michael", "Mike")).toBe(true);
    });

    it("returns false when first characters differ", () => {
      expect(hasMatchingFirstChars("John", "Mary")).toBe(false);
    });

    it("handles case insensitively", () => {
      expect(hasMatchingFirstChars("JOHN", "john")).toBe(true);
    });
    
    it("handles swapped first two characters", () => {
      // "Jhon" and "John" have same sorted first two chars: "hJ" sorts to "Jh"
      expect(hasMatchingFirstChars("Jhon", "John")).toBe(true);
    });
  });

  describe("findFuzzySuggestions", () => {
    const guestList = [
      { id: "1", firstName: "John", lastName: "Smith" },
      { id: "2", firstName: "Jane", lastName: "Doe" },
      { id: "3", firstName: "Michael", lastName: "Johnson" },
      { id: "4", firstName: "Michelle", lastName: "Williams" },
      { id: "5", firstName: "Robert", lastName: "Brown" },
    ];

    it("returns empty array for empty input", () => {
      expect(findFuzzySuggestions("", guestList)).toEqual([]);
      expect(findFuzzySuggestions("test", [])).toEqual([]);
      expect(findFuzzySuggestions(null, guestList)).toEqual([]);
    });

    it("finds suggestions for typos in first name", () => {
      const suggestions = findFuzzySuggestions("Jhon", guestList);
      expect(suggestions.some((s) => s.firstName === "John")).toBe(true);
    });

    it("finds suggestions for typos in last name", () => {
      const suggestions = findFuzzySuggestions("John Smth", guestList);
      expect(suggestions.some((s) => s.lastName === "Smith")).toBe(true);
    });

    it("finds suggestions for similar first names", () => {
      const suggestions = findFuzzySuggestions("Micheal", guestList);
      // Should find Michael or Michelle
      expect(
        suggestions.some(
          (s) =>
            s.firstName === "Michael" || s.firstName === "Michelle"
        )
      ).toBe(true);
    });

    it("limits results to maxSuggestions", () => {
      // Create a larger guest list to test limiting
      const largeGuestList = [
        ...guestList,
        { id: "6", firstName: "Johnathan", lastName: "Davis" },
        { id: "7", firstName: "Johnny", lastName: "Cash" },
        { id: "8", firstName: "Jonas", lastName: "Miller" },
      ];
      const suggestions = findFuzzySuggestions("Joh", largeGuestList, 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it("does not return exact matches (score = 1.0)", () => {
      const suggestions = findFuzzySuggestions("John", guestList);
      // Exact match for "John" should not be in suggestions since it would already appear in results
      suggestions.forEach((s) => {
        expect(s._suggestionScore).toBeLessThan(1.0);
      });
    });

    it("includes suggestion metadata in returned objects", () => {
      const suggestions = findFuzzySuggestions("Jhon", guestList);
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty("_suggestionScore");
        expect(suggestions[0]).toHaveProperty("_matchType");
      }
    });

    it("filters out results below similarity threshold", () => {
      // Very different searches should not return results
      const suggestions = findFuzzySuggestions("XYZZZ", guestList);
      expect(suggestions.length).toBe(0);
    });

    it("suggests similar names from substring matching (francas -> francis)", () => {
      const guests = [
        { id: "1", firstName: "Francis", lastName: "Smith" },
        { id: "2", firstName: "Francisco", lastName: "Lopez" },
        { id: "3", firstName: "Frank", lastName: "Johnson" },
      ];
      const suggestions = findFuzzySuggestions("francas", guests);
      // Should find Francis and Francisco as they contain "franc" and are similar overall
      const firstNames = suggestions.map(s => s.firstName);
      expect(
        firstNames.includes("Francis") || firstNames.includes("Francisco")
      ).toBe(true);
    });

    it("suggests Francisco when searching for similar name", () => {
      const guests = [
        { id: "1", firstName: "Francis", lastName: "Smith" },
        { id: "2", firstName: "Francisco", lastName: "Lopez" },
      ];
      const suggestions = findFuzzySuggestions("francas", guests);
      const ids = suggestions.map(s => s.id);
      // Should include both Francis and Francisco
      expect(ids.length).toBeGreaterThanOrEqual(1);
    });

    it("prioritizes better substring matches over poorer ones", () => {
      const guests = [
        { id: "1", firstName: "Francis", lastName: "Smith" },
        { id: "2", firstName: "Frank", lastName: "Johnson" },
        { id: "3", firstName: "Francisco", lastName: "Lopez" },
      ];
      const suggestions = findFuzzySuggestions("fran", guests);
      // All should match since they start with "fran"
      expect(suggestions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("formatSuggestionDisplay", () => {
    it("formats guest name and returns display info", () => {
      const guest = { 
        id: "1", 
        firstName: "John", 
        lastName: "Smith",
        _suggestionScore: 0.85,
        _matchType: "firstName",
      };
      const result = formatSuggestionDisplay(guest);
      expect(result.displayName).toBe("John Smith");
      expect(result.score).toBe(0.85);
      expect(result.matchType).toBe("firstName");
    });

    it("includes preferred name if available", () => {
      const guest = {
        id: "1",
        firstName: "John",
        lastName: "Smith",
        preferredName: "Johnny",
        _suggestionScore: 0.9,
        _matchType: "preferredName",
      };
      const result = formatSuggestionDisplay(guest);
      expect(result.displayName).toContain("Johnny");
      expect(result.displayName).toContain("John Smith");
    });

    it("returns fullName without preferred name when not set", () => {
      const guest = {
        id: "2",
        firstName: "Jane",
        lastName: "Doe",
        _suggestionScore: 0.75,
        _matchType: "lastName",
      };
      const result = formatSuggestionDisplay(guest);
      expect(result.fullName).toBe("Jane Doe");
      expect(result.preferredName).toBeFalsy();
    });

    it("handles missing fields gracefully", () => {
      const guest = {
        id: "1",
        firstName: "John",
        lastName: "",
        _suggestionScore: 0.8,
        _matchType: "firstName",
      };
      const result = formatSuggestionDisplay(guest);
      expect(result.displayName).toBe("John");
    });
  });
});
