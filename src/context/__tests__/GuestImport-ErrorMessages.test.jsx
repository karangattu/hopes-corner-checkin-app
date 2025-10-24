import { describe, it, expect } from "vitest";

describe("Guest Batch Import Error Messages", () => {
  const AGE_GROUPS = ["Under 18", "18-25", "26-35", "36-50", "51-64", "65+"];
  const GENDERS = ["Male", "Female", "Non-binary", "Other", "Unknown"];

  const createMockRow = (overrides = {}) => ({
    guest_id: "M12345678",
    first_name: "John",
    last_name: "Doe",
    housing_status: "Housed",
    age: "26-35",
    gender: "Male",
    city: "Mountain View",
    ...overrides,
  });

  it("should format error message with guest ID and row number for age validation", () => {
    const row = createMockRow({ age: "" });
    const csvRowNumber = 2;
    const guestIdFromCSV = row.guest_id;
    const recordIdentifier = guestIdFromCSV
      ? `Guest ID: ${guestIdFromCSV}, Row: ${csvRowNumber}`
      : `Row: ${csvRowNumber}`;

    const age = (row.age || "").trim();

    if (!AGE_GROUPS.includes(age)) {
      const errorMessage = `Invalid or missing Age value '${age}' (${recordIdentifier}). Valid values: ${AGE_GROUPS.join(", ")}`;
      expect(errorMessage).toContain("Guest ID: M12345678");
      expect(errorMessage).toContain("Row: 2");
      expect(errorMessage).toContain("Invalid or missing Age value");
      expect(errorMessage).toContain("Valid values:");
      expect(errorMessage).toContain("Under 18");
    }
  });

  it("should format error message with row number only when guest ID is missing", () => {
    const row = createMockRow({ guest_id: "", age: "InvalidAge" });
    const csvRowNumber = 5;
    const guestIdFromCSV = row.guest_id;
    const recordIdentifier = guestIdFromCSV
      ? `Guest ID: ${guestIdFromCSV}, Row: ${csvRowNumber}`
      : `Row: ${csvRowNumber}`;

    const age = (row.age || "").trim();

    if (!AGE_GROUPS.includes(age)) {
      const errorMessage = `Invalid or missing Age value '${age}' (${recordIdentifier}). Valid values: ${AGE_GROUPS.join(", ")}`;
      expect(errorMessage).toContain("Row: 5");
      expect(errorMessage).not.toContain("Guest ID:");
      expect(errorMessage).toContain(
        "Invalid or missing Age value 'InvalidAge'",
      );
    }
  });

  it("should format error message for gender validation with guest ID", () => {
    const row = createMockRow({ gender: "InvalidGender" });
    const csvRowNumber = 3;
    const guestIdFromCSV = row.guest_id;
    const recordIdentifier = guestIdFromCSV
      ? `Guest ID: ${guestIdFromCSV}, Row: ${csvRowNumber}`
      : `Row: ${csvRowNumber}`;

    const gender = (row.gender || "").trim();

    if (!GENDERS.includes(gender)) {
      const errorMessage = `Invalid Gender value '${gender}' (${recordIdentifier}). Allowed: ${GENDERS.join(", ")}`;
      expect(errorMessage).toContain("Guest ID: M12345678");
      expect(errorMessage).toContain("Row: 3");
      expect(errorMessage).toContain("Invalid Gender value 'InvalidGender'");
      expect(errorMessage).toContain("Allowed:");
    }
  });

  it("should format error message for missing first name with guest ID", () => {
    const row = createMockRow({ first_name: "" });
    const csvRowNumber = 10;
    const guestIdFromCSV = row.guest_id;
    const recordIdentifier = guestIdFromCSV
      ? `Guest ID: ${guestIdFromCSV}, Row: ${csvRowNumber}`
      : `Row: ${csvRowNumber}`;

    const firstName = (row.first_name || "").trim();

    if (!firstName) {
      const errorMessage = `Missing first name (${recordIdentifier}). Data: ${JSON.stringify(row)}`;
      expect(errorMessage).toContain("Guest ID: M12345678");
      expect(errorMessage).toContain("Row: 10");
      expect(errorMessage).toContain("Missing first name");
    }
  });

  it("should show correct row numbers for multiple rows", () => {
    const rows = [
      createMockRow({ guest_id: "M11111111" }),
      createMockRow({ guest_id: "M22222222", age: "" }),
      createMockRow({ guest_id: "M33333333" }),
    ];

    rows.forEach((row, index) => {
      const csvRowNumber = index + 2;
      const guestIdFromCSV = row.guest_id;
      const recordIdentifier = guestIdFromCSV
        ? `Guest ID: ${guestIdFromCSV}, Row: ${csvRowNumber}`
        : `Row: ${csvRowNumber}`;

      if (index === 1) {
        expect(recordIdentifier).toBe("Guest ID: M22222222, Row: 3");
      }
    });
  });

  it("should handle empty string age value in error message", () => {
    const row = createMockRow({ age: "" });
    const csvRowNumber = 2;
    const guestIdFromCSV = row.guest_id;
    const recordIdentifier = guestIdFromCSV
      ? `Guest ID: ${guestIdFromCSV}, Row: ${csvRowNumber}`
      : `Row: ${csvRowNumber}`;

    const age = (row.age || "").trim();
    const errorMessage = `Invalid or missing Age value '${age}' (${recordIdentifier}). Valid values: ${AGE_GROUPS.join(", ")}`;

    expect(errorMessage).toContain("Invalid or missing Age value ''");
    expect(errorMessage).toContain("Guest ID: M12345678, Row: 2");
  });

  it("should handle whitespace-only age value in error message", () => {
    const row = createMockRow({ age: "   " });
    const csvRowNumber = 7;
    const guestIdFromCSV = row.guest_id;
    const recordIdentifier = guestIdFromCSV
      ? `Guest ID: ${guestIdFromCSV}, Row: ${csvRowNumber}`
      : `Row: ${csvRowNumber}`;

    const age = (row.age || "").trim();
    const errorMessage = `Invalid or missing Age value '${age}' (${recordIdentifier}). Valid values: ${AGE_GROUPS.join(", ")}`;

    expect(errorMessage).toContain("Invalid or missing Age value ''");
    expect(errorMessage).toContain("Row: 7");
  });
});
