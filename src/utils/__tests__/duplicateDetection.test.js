import { describe, it, expect } from "vitest";
import { findPotentialDuplicates } from "../duplicateDetection";

describe("duplicateDetection", () => {
    const existingGuests = [
        { id: "1", firstName: "John", lastName: "Smith", preferredName: "Johnny" },
        { id: "2", firstName: "Michael", lastName: "Johnson" },
        { id: "3", firstName: "Elizabeth", lastName: "Taylor" },
        { id: "4", firstName: "Robert", lastName: "Brown" },
    ];

    it("detects exact matches (case insensitive)", () => {
        const dups = findPotentialDuplicates("john", "smith", existingGuests);
        expect(dups).toHaveLength(1);
        expect(dups[0].guest.id).toBe("1");
        expect(dups[0].confidence).toBe(1.0);
    });

    it("detects nickname matches", () => {
        // "Bill" isn't in list, but "Bob" -> "Robert" is
        const dups = findPotentialDuplicates("Bob", "Brown", existingGuests);
        expect(dups).toHaveLength(1);
        expect(dups[0].guest.id).toBe("4");
        expect(dups[0].reason).toContain("Nickname");
    });

    it("detects reverse nickname matches (Formal from Nickname)", () => {
        // User types "Liz" -> matches "Elizabeth"
        const dups = findPotentialDuplicates("Liz", "Taylor", existingGuests);
        expect(dups).toHaveLength(1);
        expect(dups[0].guest.id).toBe("3");
    });

    it("detects keyboard typos in first name", () => {
        // "Mickael" -> "Michael" (k near h? No, but let's try adjacent)
        // "Micheal" -> "Michael" (Transposition)
        const dups = findPotentialDuplicates("Micheal", "Johnson", existingGuests);
        expect(dups).toHaveLength(1);
        expect(dups[0].reason).toContain("Possible typo");
    });

    it("detects keyboard typos in last name", () => {
        // "Smitj" -> "Smith" (j near h)
        const dups = findPotentialDuplicates("John", "Smitj", existingGuests);
        expect(dups).toHaveLength(1);
        // Confidence should be high because first name is exact match
    });

    it("detects combined fuzzy first and last name", () => {
        // "Jon" (similar to John) and "Smyth" (similar to Smith)
        // This is tough. "Jon" is nickname/variant of "John".
        // "Smyth" sounds like "Smith".

        // Add specifically fuzzy last name case
        const guests = [{ id: "1", firstName: "John", lastName: "Smith" }];
        const dups = findPotentialDuplicates("Jon", "Smyth", guests);

        expect(dups).toHaveLength(1);
        expect(dups[0].reason).toContain("Nickname match");
        expect(dups[0].reason).toContain("Last name sounds similar");
    });

    it("ignores completely different names", () => {
        const dups = findPotentialDuplicates("David", "Jones", existingGuests);
        expect(dups).toHaveLength(0);
    });

    it("matches preferred name", () => {
        const dups = findPotentialDuplicates("Johnny", "Smith", existingGuests);
        expect(dups).toHaveLength(1);
        expect(dups[0].reason).toContain("Matches preferred name");
    });
});
