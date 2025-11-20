import { describe, it, expect, beforeEach } from "vitest";
import {
    sanitizeString,
    isValidEmail,
    isValidPhone,
    sanitizePhone,
    isValidDate,
    isValidNumber,
    isValidGuestId,
    sanitizeGuestId,
    validateCsvFile,
    escapeSqlString,
    validateObject,
    escapeHtml,
    checkRateLimit,
} from "../validation";

describe("Input Validation Utilities", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe("sanitizeString", () => {
        it("should remove HTML tags by default", () => {
            const input = "<script>alert('xss')</script>Hello";
            expect(sanitizeString(input)).toBe("alert('xss')Hello");
        });

        it("should preserve HTML when allowed", () => {
            const input = "<b>Bold</b> text";
            expect(sanitizeString(input, { allowHTML: true })).toBe("<b>Bold</b> text");
        });

        it("should trim whitespace by default", () => {
            expect(sanitizeString("  hello  ")).toBe("hello");
        });

        it("should respect maxLength option", () => {
            const long = "a".repeat(100);
            expect(sanitizeString(long, { maxLength: 10 })).toHaveLength(10);
        });

        it("should remove newlines when requested", () => {
            const input = "line1\nline2\rline3";
            expect(sanitizeString(input, { removeNewlines: true })).toBe("line1 line2 line3");
        });

        it("should handle non-string input", () => {
            expect(sanitizeString(null)).toBe("");
            expect(sanitizeString(undefined)).toBe("");
            expect(sanitizeString(123)).toBe("");
        });

        it("should handle empty string", () => {
            expect(sanitizeString("")).toBe("");
        });
    });

    describe("isValidEmail", () => {
        it("should validate correct email formats", () => {
            expect(isValidEmail("user@example.com")).toBe(true);
            expect(isValidEmail("test.user@domain.co.uk")).toBe(true);
            expect(isValidEmail("user+tag@example.com")).toBe(true);
        });

        it("should reject invalid email formats", () => {
            expect(isValidEmail("notanemail")).toBe(false);
            expect(isValidEmail("@example.com")).toBe(false);
            expect(isValidEmail("user@")).toBe(false);
            expect(isValidEmail("user @example.com")).toBe(false);
        });

        it("should handle non-string input", () => {
            expect(isValidEmail(null)).toBe(false);
            expect(isValidEmail(undefined)).toBe(false);
            expect(isValidEmail(123)).toBe(false);
        });

        it("should handle whitespace", () => {
            expect(isValidEmail("  user@example.com  ")).toBe(true);
        });
    });

    describe("isValidPhone", () => {
        it("should validate 10-digit phone numbers", () => {
            expect(isValidPhone("1234567890")).toBe(true);
            expect(isValidPhone("(123) 456-7890")).toBe(true);
            expect(isValidPhone("123-456-7890")).toBe(true);
        });

        it("should validate 11-digit numbers starting with 1", () => {
            expect(isValidPhone("11234567890")).toBe(true);
            expect(isValidPhone("1-123-456-7890")).toBe(true);
        });

        it("should reject invalid phone numbers", () => {
            expect(isValidPhone("123")).toBe(false);
            expect(isValidPhone("21234567890")).toBe(false); // 11 digits not starting with 1
        });

        it("should handle non-string input", () => {
            expect(isValidPhone(null)).toBe(false);
            expect(isValidPhone(undefined)).toBe(false);
        });
    });

    describe("sanitizePhone", () => {
        it("should format 10-digit numbers correctly", () => {
            expect(sanitizePhone("1234567890")).toBe("(123) 456-7890");
            expect(sanitizePhone("123-456-7890")).toBe("(123) 456-7890");
        });

        it("should handle 11-digit numbers starting with 1", () => {
            expect(sanitizePhone("11234567890")).toBe("(123) 456-7890");
        });

        it("should return original if invalid", () => {
            const invalid = "123";
            expect(sanitizePhone(invalid)).toBe(invalid);
        });

        it("should handle non-string input", () => {
            expect(sanitizePhone(null)).toBe("");
            expect(sanitizePhone(123)).toBe("");
        });
    });

    describe("isValidDate", () => {
        it("should validate correct date strings", () => {
            expect(isValidDate("2025-01-01")).toBe(true);
            expect(isValidDate("2025-01-01T00:00:00Z")).toBe(true);
            expect(isValidDate(new Date().toISOString())).toBe(true);
        });

        it("should reject invalid dates", () => {
            expect(isValidDate("not-a-date")).toBe(false);
            expect(isValidDate("2025-13-01")).toBe(false);
            expect(isValidDate("")).toBe(false);
            expect(isValidDate(null)).toBe(false);
        });
    });

    describe("isValidNumber", () => {
        it("should validate numbers", () => {
            expect(isValidNumber(123)).toBe(true);
            expect(isValidNumber("456")).toBe(true);
            expect(isValidNumber(0)).toBe(true);
        });

        it("should validate number ranges", () => {
            expect(isValidNumber(5, { min: 0, max: 10 })).toBe(true);
            expect(isValidNumber(11, { min: 0, max: 10 })).toBe(false);
            expect(isValidNumber(-1, { min: 0, max: 10 })).toBe(false);
        });

        it("should validate integers when requested", () => {
            expect(isValidNumber(5, { integer: true })).toBe(true);
            expect(isValidNumber(5.5, { integer: true })).toBe(false);
        });

        it("should validate positive numbers when requested", () => {
            expect(isValidNumber(5, { positive: true })).toBe(true);
            expect(isValidNumber(0, { positive: true })).toBe(false);
            expect(isValidNumber(-5, { positive: true })).toBe(false);
        });

        it("should reject invalid numbers", () => {
            expect(isValidNumber(NaN)).toBe(false);
            expect(isValidNumber(Infinity)).toBe(false);
            expect(isValidNumber("not-a-number")).toBe(false);
        });
    });

    describe("isValidGuestId", () => {
        it("should validate correct guest ID formats", () => {
            expect(isValidGuestId("GABC123")).toBe(true);
            expect(isValidGuestId("G001")).toBe(true);
            expect(isValidGuestId("gxyz789")).toBe(true); // Case insensitive
        });

        it("should reject invalid guest IDs", () => {
            expect(isValidGuestId("ABC123")).toBe(false); // No G prefix
            expect(isValidGuestId("G12")).toBe(false); // Too short
            expect(isValidGuestId("G-123")).toBe(false); // Invalid character
        });

        it("should handle non-string input", () => {
            expect(isValidGuestId(null)).toBe(false);
            expect(isValidGuestId(123)).toBe(false);
        });
    });

    describe("sanitizeGuestId", () => {
        it("should convert to uppercase", () => {
            expect(sanitizeGuestId("gabc123")).toBe("GABC123");
        });

        it("should trim whitespace", () => {
            expect(sanitizeGuestId("  GABC123  ")).toBe("GABC123");
        });

        it("should handle non-string input", () => {
            expect(sanitizeGuestId(null)).toBe("");
            expect(sanitizeGuestId(123)).toBe("");
        });
    });

    describe("validateCsvFile", () => {
        it("should validate correct CSV files", () => {
            const file = new File(["data"], "test.csv", { type: "text/csv" });
            const result = validateCsvFile(file);
            expect(result.valid).toBe(true);
            expect(result.error).toBeNull();
        });

        it("should reject files exceeding size limit", () => {
            const largeData = "x".repeat(11 * 1024 * 1024); // 11MB
            const file = new File([largeData], "large.csv", { type: "text/csv" });
            const result = validateCsvFile(file, { maxSize: 10 * 1024 * 1024 });
            expect(result.valid).toBe(false);
            expect(result.error).toContain("exceeds");
        });

        it("should reject files with wrong extension", () => {
            const file = new File(["data"], "test.txt", { type: "text/plain" });
            const result = validateCsvFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("extension");
        });

        it("should handle null file", () => {
            const result = validateCsvFile(null);
            expect(result.valid).toBe(false);
            expect(result.error).toBe("No file provided");
        });

        it("should handle invalid file object", () => {
            const result = validateCsvFile({ name: "test.csv" });
            expect(result.valid).toBe(false);
            expect(result.error).toBe("Invalid file object");
        });
    });

    describe("escapeSqlString", () => {
        it("should escape single quotes", () => {
            expect(escapeSqlString("It's a test")).toBe("It''s a test");
        });

        it("should escape backslashes", () => {
            expect(escapeSqlString("path\\to\\file")).toBe("path\\\\to\\\\file");
        });

        it("should escape newlines, carriage returns, and tabs", () => {
            expect(escapeSqlString("line1\nline2")).toBe("line1\\nline2");
            expect(escapeSqlString("line1\rline2")).toBe("line1\\rline2");
            expect(escapeSqlString("col1\tcol2")).toBe("col1\\tcol2");
        });

        it("should handle non-string input", () => {
            expect(escapeSqlString(null)).toBe("");
            expect(escapeSqlString(123)).toBe("");
        });
    });

    describe("validateObject", () => {
        it("should validate object against schema", () => {
            const schema = {
                name: { type: "string", required: true },
                age: { type: "number", required: true },
                email: { type: "string", required: false },
            };

            const obj = { name: "John", age: 30 };
            const result = validateObject(obj, schema);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it("should detect missing required fields", () => {
            const schema = {
                name: { type: "string", required: true },
            };

            const obj = {};
            const result = validateObject(obj, schema);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain("name is required");
        });

        it("should detect type mismatches", () => {
            const schema = {
                age: { type: "number" },
            };

            const obj = { age: "thirty" };
            const result = validateObject(obj, schema);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain("must be of type number");
        });

        it("should use custom validation functions", () => {
            const schema = {
                email: {
                    type: "string",
                    validate: (val) => val.includes("@")
                },
            };

            expect(validateObject({ email: "valid@test.com" }, schema).valid).toBe(true);
            expect(validateObject({ email: "invalid" }, schema).valid).toBe(false);
        });

        it("should sanitize values", () => {
            const schema = {
                name: {
                    type: "string",
                    sanitize: (val) => val.toUpperCase()
                },
            };

            const result = validateObject({ name: "john" }, schema);
            expect(result.sanitized.name).toBe("JOHN");
        });

        it("should use default values", () => {
            const schema = {
                role: { type: "string", default: "guest" },
            };

            const result = validateObject({}, schema);
            expect(result.sanitized.role).toBe("guest");
        });
    });

    describe("escapeHtml", () => {
        it("should escape HTML special characters", () => {
            expect(escapeHtml("<script>alert('xss')</script>")).toBe(
                "&lt;script&gt;alert(&#39;xss&#39;)&lt;&#x2F;script&gt;"
            );
        });

        it("should escape ampersands", () => {
            expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
        });

        it("should escape quotes", () => {
            expect(escapeHtml('He said "hello"')).toBe("He said &quot;hello&quot;");
            expect(escapeHtml("It's working")).toBe("It&#39;s working");
        });

        it("should handle non-string input", () => {
            expect(escapeHtml(null)).toBe("");
            expect(escapeHtml(123)).toBe("");
        });
    });

    describe("checkRateLimit", () => {
        it("should allow actions below rate limit", () => {
            const result = checkRateLimit("test-action", 5, 60000);
            expect(result.allowed).toBe(true);
            expect(result.remainingAttempts).toBe(4);
        });

        it("should block actions exceeding rate limit", () => {
            const key = "spam-action";
            const maxAttempts = 3;

            // Make 3 attempts
            for (let i = 0; i < maxAttempts; i++) {
                checkRateLimit(key, maxAttempts, 60000);
            }

            // 4th attempt should be blocked
            const result = checkRateLimit(key, maxAttempts, 60000);
            expect(result.allowed).toBe(false);
            expect(result.remainingAttempts).toBe(0);
        });

        it("should reset after time window", () => {
            const key = "timed-action";
            const maxAttempts = 2;
            const windowMs = 100; // 100ms window

            // Make 2 attempts
            checkRateLimit(key, maxAttempts, windowMs);
            checkRateLimit(key, maxAttempts, windowMs);

            // Wait for window to expire
            return new Promise((resolve) => {
                setTimeout(() => {
                    const result = checkRateLimit(key, maxAttempts, windowMs);
                    expect(result.allowed).toBe(true);
                    resolve();
                }, 150);
            });
        });

        it("should handle localStorage errors gracefully", () => {
            // Fill localStorage to cause quota error
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = () => {
                throw new Error("QuotaExceededError");
            };

            const result = checkRateLimit("failing-action");
            expect(result.allowed).toBe(true); // Fail open

            localStorage.setItem = originalSetItem;
        });

        it("should track different keys separately", () => {
            checkRateLimit("action1", 1, 60000);

            const result = checkRateLimit("action2", 1, 60000);
            expect(result.allowed).toBe(true);
        });
    });
});
