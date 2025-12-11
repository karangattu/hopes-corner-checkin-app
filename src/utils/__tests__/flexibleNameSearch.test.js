import { describe, it, expect } from "vitest";
import {
  extractNameParts,
  scoreNameMatch,
  flexibleNameSearch,
  getSearchableTokens,
} from "../flexibleNameSearch";

describe("flexibleNameSearch", () => {
  describe("extractNameParts", () => {
    it("extracts simple first and last name", () => {
      const result = extractNameParts("John", "Doe");
      expect(result).toEqual({
        firstName: "john",
        lastName: "doe",
        firstNameParts: ["john"],
        allTokens: ["john", "doe"],
        fullName: "john doe",
      });
    });

    it("handles first name with middle name", () => {
      const result = extractNameParts("Ping Xing", "Yuan");
      expect(result).toEqual({
        firstName: "ping xing",
        lastName: "yuan",
        firstNameParts: ["ping", "xing"],
        allTokens: ["ping", "xing", "yuan"],
        fullName: "ping xing yuan",
      });
    });

    it("handles multiple middle names", () => {
      const result = extractNameParts("John Michael James", "Smith");
      expect(result).toEqual({
        firstName: "john michael james",
        lastName: "smith",
        firstNameParts: ["john", "michael", "james"],
        allTokens: ["john", "michael", "james", "smith"],
        fullName: "john michael james smith",
      });
    });

    it("normalizes whitespace", () => {
      const result = extractNameParts("  John  ", "  Doe  ");
      expect(result.firstName).toBe("john");
      expect(result.lastName).toBe("doe");
    });

    it("handles empty strings", () => {
      const result = extractNameParts("", "");
      expect(result.allTokens).toEqual([]);
    });

    it("handles only first name", () => {
      const result = extractNameParts("John", "");
      expect(result.allTokens).toEqual(["john"]);
    });

    it("handles only last name", () => {
      const result = extractNameParts("", "Doe");
      expect(result.allTokens).toEqual(["doe"]);
    });

    it("is case-insensitive", () => {
      const result1 = extractNameParts("JOHN", "DOE");
      const result2 = extractNameParts("john", "doe");
      expect(result1).toEqual(result2);
    });
  });

  describe("scoreNameMatch", () => {
    it("returns -1 for exact full name match", () => {
      const nameParts = extractNameParts("John", "Doe");
      const score = scoreNameMatch("john doe", nameParts);
      expect(score).toBe(-1);
    });

    it("returns 0 for exact single token match", () => {
      const nameParts = extractNameParts("John", "Doe");
      const score = scoreNameMatch("john", nameParts);
      expect(score).toBe(0);
    });

    it("returns 0 for exact last name match", () => {
      const nameParts = extractNameParts("John", "Doe");
      const score = scoreNameMatch("doe", nameParts);
      expect(score).toBe(0);
    });

    it("returns 1 for prefix match", () => {
      const nameParts = extractNameParts("John", "Doe");
      const score = scoreNameMatch("jo", nameParts);
      expect(score).toBe(1);
    });

    it("returns 2 for substring match (3+ chars)", () => {
      const nameParts = extractNameParts("Jonathan", "Doe");
      const score = scoreNameMatch("ath", nameParts);
      expect(score).toBe(2);
    });

    it("returns 99 for no match", () => {
      const nameParts = extractNameParts("John", "Doe");
      const score = scoreNameMatch("xyz", nameParts);
      expect(score).toBe(99);
    });

    it("matches with middle name - exact token", () => {
      const nameParts = extractNameParts("Ping Xing", "Yuan");
      const score = scoreNameMatch("xing", nameParts);
      expect(score).toBe(0); // Exact match with middle name
    });

    it("matches with middle name - prefix", () => {
      const nameParts = extractNameParts("Ping Xing", "Yuan");
      const score = scoreNameMatch("xi", nameParts);
      expect(score).toBe(1); // Prefix match with middle name
    });

    it("matches last name when first name has middle name", () => {
      const nameParts = extractNameParts("Ping Xing", "Yuan");
      const score = scoreNameMatch("yuan", nameParts);
      expect(score).toBe(0); // Exact match with last name
    });

    it("handles multi-token search with sequential match", () => {
      const nameParts = extractNameParts("Ping Xing", "Yuan");
      const score = scoreNameMatch("ping xing", nameParts);
      expect(score).toBe(0); // Exact match of sequential tokens
    });

    it("handles multi-token search prefix match", () => {
      const nameParts = extractNameParts("Ping Xing", "Yuan");
      const score = scoreNameMatch("ping xi", nameParts);
      expect(score).toBe(1); // Prefix match of sequential tokens
    });

    it("returns 99 for empty query", () => {
      const nameParts = extractNameParts("John", "Doe");
      const score = scoreNameMatch("", nameParts);
      expect(score).toBe(99);
    });
  });

  describe("flexibleNameSearch", () => {
    it("returns empty array for empty query", () => {
      const guests = [
        { id: "1", firstName: "John", lastName: "Doe", name: "John Doe" },
      ];
      const result = flexibleNameSearch("", guests);
      expect(result).toEqual([]);
    });

    it("finds guest by first name", () => {
      const guests = [
        { id: "1", firstName: "John", lastName: "Doe", name: "John Doe" },
      ];
      const result = flexibleNameSearch("john", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("finds guest by last name", () => {
      const guests = [
        { id: "1", firstName: "John", lastName: "Doe", name: "John Doe" },
      ];
      const result = flexibleNameSearch("doe", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("finds guest by full name", () => {
      const guests = [
        { id: "1", firstName: "John", lastName: "Doe", name: "John Doe" },
      ];
      const result = flexibleNameSearch("john doe", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("finds guest with middle name by first name part", () => {
      const guests = [
        {
          id: "1",
          firstName: "Ping Xing",
          lastName: "Yuan",
          name: "Ping Xing Yuan",
        },
      ];
      const result = flexibleNameSearch("ping", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("finds guest with middle name by middle name part", () => {
      const guests = [
        {
          id: "1",
          firstName: "Ping Xing",
          lastName: "Yuan",
          name: "Ping Xing Yuan",
        },
      ];
      const result = flexibleNameSearch("xing", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("finds guest with middle name by last name", () => {
      const guests = [
        {
          id: "1",
          firstName: "Ping Xing",
          lastName: "Yuan",
          name: "Ping Xing Yuan",
        },
      ];
      const result = flexibleNameSearch("yuan", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("finds guest by multiple name parts", () => {
      const guests = [
        {
          id: "1",
          firstName: "Ping Xing",
          lastName: "Yuan",
          name: "Ping Xing Yuan",
        },
      ];
      const result = flexibleNameSearch("ping xing", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("finds guest by multiple name parts including last name", () => {
      const guests = [
        {
          id: "1",
          firstName: "Ping Xing",
          lastName: "Yuan",
          name: "Ping Xing Yuan",
        },
      ];
      const result = flexibleNameSearch("xing yuan", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("returns multiple matching guests sorted by rank then name", () => {
      const guests = [
        {
          id: "1",
          firstName: "John",
          lastName: "Doe",
          name: "John Doe",
        },
        {
          id: "2",
          firstName: "Jane",
          lastName: "Doe",
          name: "Jane Doe",
        },
        {
          id: "3",
          firstName: "Bob",
          lastName: "Smith",
          name: "Bob Smith",
        },
      ];
      const result = flexibleNameSearch("doe", guests);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("2"); // Jane Doe before John Doe (alphabetical)
      expect(result[1].id).toBe("1");
    });

    it("prioritizes preferred name", () => {
      const guests = [
        {
          id: "1",
          firstName: "Jonathan",
          lastName: "Doe",
          preferredName: "John",
          name: "Jonathan Doe",
        },
      ];
      const result = flexibleNameSearch("john", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("handles case-insensitive search", () => {
      const guests = [
        {
          id: "1",
          firstName: "John",
          lastName: "Doe",
          name: "John Doe",
        },
      ];
      const result = flexibleNameSearch("JOHN", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("handles whitespace normalization", () => {
      const guests = [
        {
          id: "1",
          firstName: "John",
          lastName: "Doe",
          name: "John Doe",
        },
      ];
      const result = flexibleNameSearch("  john  ", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("finds guest with three part name by partial search", () => {
      const guests = [
        {
          id: "1",
          firstName: "John Michael",
          lastName: "Smith",
          name: "John Michael Smith",
        },
      ];
      const result = flexibleNameSearch("john mich", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("does not match unrelated names", () => {
      const guests = [
        {
          id: "1",
          firstName: "John",
          lastName: "Doe",
          name: "John Doe",
        },
      ];
      const result = flexibleNameSearch("xyz", guests);
      expect(result).toHaveLength(0);
    });

    it("ranks exact matches higher than prefix matches", () => {
      const guests = [
        {
          id: "1",
          firstName: "Jo",
          lastName: "Smith",
          name: "Jo Smith",
        },
        {
          id: "2",
          firstName: "John",
          lastName: "Doe",
          name: "John Doe",
        },
      ];
      const result = flexibleNameSearch("jo", guests);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1"); // Exact match comes first
    });

    it("handles mixed case names with middle names", () => {
      const guests = [
        {
          id: "1",
          firstName: "Mary Jane",
          lastName: "Parker",
          name: "Mary Jane Parker",
        },
      ];
      const result = flexibleNameSearch("JANE PARKER", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("finds guest when searching with partial last name after middle name", () => {
      const guests = [
        {
          id: "1",
          firstName: "Ping Xing",
          lastName: "Yuan",
          name: "Ping Xing Yuan",
        },
      ];
      const result = flexibleNameSearch("xing yua", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });
  });

  describe("getSearchableTokens", () => {
    it("returns all name tokens for simple name", () => {
      const guest = {
        id: "1",
        firstName: "John",
        lastName: "Doe",
      };
      const tokens = getSearchableTokens(guest);
      expect(tokens).toContain("john");
      expect(tokens).toContain("doe");
    });

    it("returns all name tokens for name with middle name", () => {
      const guest = {
        id: "1",
        firstName: "Ping Xing",
        lastName: "Yuan",
      };
      const tokens = getSearchableTokens(guest);
      expect(tokens).toContain("ping");
      expect(tokens).toContain("xing");
      expect(tokens).toContain("yuan");
    });

    it("includes preferred name in tokens", () => {
      const guest = {
        id: "1",
        firstName: "Jonathan",
        lastName: "Doe",
        preferredName: "John",
      };
      const tokens = getSearchableTokens(guest);
      expect(tokens).toContain("john");
      expect(tokens).toContain("jonathan");
      expect(tokens).toContain("doe");
    });

    it("does not include empty tokens", () => {
      const guest = {
        id: "1",
        firstName: "John",
        lastName: "",
      };
      const tokens = getSearchableTokens(guest);
      expect(tokens).not.toContain("");
      expect(tokens).toContain("john");
    });

    it("does not include undefined preferred name", () => {
      const guest = {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        preferredName: undefined,
      };
      const tokens = getSearchableTokens(guest);
      expect(tokens).toEqual(["john", "doe"]);
    });
  });

  describe("Real-world examples", () => {
    it("scenario: guest tells staff their first name is Ping", () => {
      const guests = [
        {
          id: "1",
          firstName: "Ping Xing",
          lastName: "Yuan",
          name: "Ping Xing Yuan",
        },
      ];
      const result = flexibleNameSearch("ping", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("scenario: guest tells staff their last name is Yuan", () => {
      const guests = [
        {
          id: "1",
          firstName: "Ping Xing",
          lastName: "Yuan",
          name: "Ping Xing Yuan",
        },
      ];
      const result = flexibleNameSearch("yuan", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("scenario: guest tells staff middle name Xing", () => {
      const guests = [
        {
          id: "1",
          firstName: "Ping Xing",
          lastName: "Yuan",
          name: "Ping Xing Yuan",
        },
      ];
      const result = flexibleNameSearch("xing", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("scenario: guest tells staff their name is Xing Yuan (middle + last)", () => {
      const guests = [
        {
          id: "1",
          firstName: "Ping Xing",
          lastName: "Yuan",
          name: "Ping Xing Yuan",
        },
      ];
      const result = flexibleNameSearch("xing yuan", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("scenario: full name with middle names", () => {
      const guests = [
        {
          id: "1",
          firstName: "John Michael",
          lastName: "Smith-Johnson",
          name: "John Michael Smith-Johnson",
        },
        {
          id: "2",
          firstName: "John",
          lastName: "Johnson",
          name: "John Johnson",
        },
      ];
      const result = flexibleNameSearch("michael smith", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("scenario: many guests, one matches by middle name", () => {
      const guests = [
        {
          id: "1",
          firstName: "John",
          lastName: "Doe",
          name: "John Doe",
        },
        {
          id: "2",
          firstName: "Jane",
          lastName: "Smith",
          name: "Jane Smith",
        },
        {
          id: "3",
          firstName: "Mary Ann",
          lastName: "Johnson",
          name: "Mary Ann Johnson",
        },
        {
          id: "4",
          firstName: "Robert James",
          lastName: "Brown",
          name: "Robert James Brown",
        },
      ];
      const result = flexibleNameSearch("james", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("4");
    });

    it("finds guest by first part of firstName and last name (e.g., Xio H)", () => {
      const guests = [
        {
          id: "1",
          firstName: "Xio Gua",
          lastName: "H",
          name: "Xio Gua H",
        },
      ];
      const result = flexibleNameSearch("xio h", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("deduplicates results when same guest matches multiple criteria", () => {
      const guests = [
        {
          id: "1",
          firstName: "John Michael",
          lastName: "Smith",
          name: "John Michael Smith",
        },
      ];
      // Search that could match in multiple ways
      const result = flexibleNameSearch("john smith", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("does not show same guest twice in results", () => {
      const guests = [
        {
          id: "1",
          firstName: "Mary Ann",
          lastName: "Johnson",
          preferredName: "Mary",
          name: "Mary Ann Johnson",
        },
      ];
      // Search that could match both preferred name and full name
      const result = flexibleNameSearch("mary", guests);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });
  });
});
