import { describe, it, expect } from "vitest";
import {
  levenshteinDistance,
  similarityScore,
  findFuzzySuggestions,
  formatSuggestionDisplay,
  soundsLike,
  hasMatchingFirstChars,
  getNicknameVariants,
  areNicknameVariants,
  isKeyboardAdjacent,
  hasKeyboardTypo,
  hasTranspositionTypo,
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

    it("returns true when normalized names are similar (English)", () => {
      expect(soundsLike("phonics", "fanacs")).toBe(true); // ph -> f
      expect(soundsLike("kayla", "cayla")).toBe(true); // k/c check
      expect(soundsLike("jeff", "geoff")).toBe(true);
    });

    it("returns true for Spanish name variations", () => {
      // j sounds like h
      expect(soundsLike("jose", "hose")).toBe(true);
      expect(soundsLike("julio", "hulio")).toBe(true);

      // ll sounds like y
      expect(soundsLike("guillermo", "guiyermo")).toBe(true);

      // silent h
      expect(soundsLike("hugo", "ugo")).toBe(true);

      // ñ sounds like ny
      expect(soundsLike("nino", "ninyo")).toBe(true);

      // qu sounds like k
      expect(soundsLike("enrique", "enrike")).toBe(true);
    });

    it("handles common tough cases", () => {
      expect(soundsLike("stephen", "steven")).toBe(true);
      expect(soundsLike("vicki", "vicky")).toBe(true);
    });
  });

  describe("nicknameMatching", () => {
    it("identifies common nicknames", () => {
      expect(areNicknameVariants("william", "bill")).toBe(true);
      expect(areNicknameVariants("robert", "bob")).toBe(true);
      expect(areNicknameVariants("francisco", "pancho")).toBe(true);
      expect(areNicknameVariants("elizabeth", "liz")).toBe(true);
    });

    it("works bidirectionally (nickname -> formal)", () => {
      expect(areNicknameVariants("bill", "william")).toBe(true);
      expect(areNicknameVariants("pepe", "jose")).toBe(true);
    });

    it("identifies nickname to nickname of same formal name", () => {
      expect(areNicknameVariants("bill", "will")).toBe(true); // both from William
      expect(areNicknameVariants("bob", "rob")).toBe(true);   // both from Robert
    });

    it("returns normalized variants for a name", () => {
      const variants = getNicknameVariants("William");
      expect(variants).toContain("bill");
      expect(variants).toContain("will");
      expect(variants).toContain("william");
    });
  });

  describe("typoDetection", () => {
    it("detects keyboard adjacency typos", () => {
      // QWERTY adjacent keys
      expect(isKeyboardAdjacent("a", "s")).toBe(true);
      expect(isKeyboardAdjacent("m", "n")).toBe(true);
      expect(isKeyboardAdjacent("o", "p")).toBe(true);

      // Non-adjacent
      expect(isKeyboardAdjacent("a", "p")).toBe(false);
    });

    it("detects single keyboard typo in full string", () => {
      expect(hasKeyboardTypo("jihn", "john")).toBe(true); // i is next to o
      expect(hasKeyboardTypo("mickael", "michael")).toBe(false); // k not next to h
      expect(hasKeyboardTypo("david", "davis")).toBe(true); // d next to s
    });

    it("detects transposition typos (swapped chars)", () => {
      expect(hasTranspositionTypo("micheal", "michael")).toBe(true); // ea <-> ae
      expect(hasTranspositionTypo("jhon", "john")).toBe(true); // ho <-> oh
      expect(hasTranspositionTypo("flies", "files")).toBe(true); // li <-> il
    });

    it("rejects non-transposition edits", () => {
      expect(hasTranspositionTypo("michael", "michele")).toBe(false); // missing char
      expect(hasTranspositionTypo("abc", "acb")).toBe(true);
      expect(hasTranspositionTypo("abc", "cba")).toBe(false); // too many swaps
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
      { id: "4", firstName: "Victoria", lastName: "Williams" },
      { id: "5", firstName: "Robert", lastName: "Brown" },
      { id: "6", firstName: "Francisco", lastName: "Garcia" },
      { id: "7", firstName: "William", lastName: "Jones" },
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

    it("finds suggestions through nicknames", () => {
      // Searching "Bill" should find "William"
      const suggestions1 = findFuzzySuggestions("Bill", guestList);
      expect(suggestions1.some((s) => s.firstName === "William")).toBe(true);

      // Searching "Vicky" should find "Victoria"
      const suggestions2 = findFuzzySuggestions("Vicky", guestList);
      expect(suggestions2.some((s) => s.firstName === "Victoria")).toBe(true);

      // Searching "Pancho" should find "Francisco"
      const suggestions3 = findFuzzySuggestions("Pancho", guestList);
      expect(suggestions3.some((s) => s.firstName === "Francisco")).toBe(true);
    });

    it("finds suggestions through keyboard typos", () => {
      // "Jihn" -> "John" (i is next to o)
      const suggestions = findFuzzySuggestions("Jihn", guestList);
      expect(suggestions.some((s) => s.firstName === "John")).toBe(true);
    });

    it("scores nicknames higher than loose fuzzy matches", () => {
      const guests = [
        { id: "1", firstName: "William", lastName: "Smith" },
        { id: "2", firstName: "Willard", lastName: "Smith" }, // similar but not nickname
      ];
      const suggestions = findFuzzySuggestions("Bill", guests);

      const william = suggestions.find(s => s.firstName === "William");
      const willard = suggestions.find(s => s.firstName === "Willard");

      expect(william._suggestionScore).toBeGreaterThan(willard?._suggestionScore || 0);
    });

    it("finds suggestions for similar first names", () => {
      const suggestions = findFuzzySuggestions("Mike", guestList);
      // Should find Michael (nickname match)
      expect(suggestions.some((s) => s.firstName === "Michael")).toBe(true);
    });

    it("includes suggestion metadata in returned objects", () => {
      const suggestions = findFuzzySuggestions("Jhon", guestList);
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty("_suggestionScore");
        expect(suggestions[0]).toHaveProperty("_matchType");
      }
    });

    it("suggests similar names from substring matching (francas -> francis)", () => {
      const guests = [
        { id: "1", firstName: "Francis", lastName: "Smith" },
        { id: "2", firstName: "Francisco", lastName: "Lopez" },
      ];
      const suggestions = findFuzzySuggestions("francas", guests);
      const firstNames = suggestions.map(s => s.firstName);
      expect(
        firstNames.includes("Francis") || firstNames.includes("Francisco")
      ).toBe(true);
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
  });
});
