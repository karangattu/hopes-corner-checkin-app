/**
 * Input Validation and Sanitization Utilities
 * Provides robust validation for user inputs to prevent
 * security issues and data corruption
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 * @param {string} input - The input string to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input, options = {}) => {
    if (typeof input !== "string") {
        return "";
    }

    const {
        allowHTML = false,
        maxLength = 1000,
        trim = true,
        removeNewlines = false,
    } = options;

    let sanitized = input;

    // Trim whitespace
    if (trim) {
        sanitized = sanitized.trim();
    }

    // Remove newlines if requested
    if (removeNewlines) {
        sanitized = sanitized.replace(/[\r\n]+/g, " ");
    }

    // Remove HTML tags if not allowed
    if (!allowHTML) {
        sanitized = sanitized.replace(/<[^>]*>/g, "");
    }

    // Truncate to max length
    if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
    if (typeof email !== "string") return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim().toLowerCase());
};

/**
 * Validate phone number (US format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
export const isValidPhone = (phone) => {
    if (typeof phone !== "string") return false;

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // Should be 10 or 11 digits (11 if starts with 1)
    return digits.length === 10 || (digits.length === 11 && digits[0] === "1");
};

/**
 * Sanitize phone number to consistent format
 * @param {string} phone - Phone number to sanitize
 * @returns {string} Phone number in format: (123) 456-7890
 */
export const sanitizePhone = (phone) => {
    if (typeof phone !== "string") return "";

    const digits = phone.replace(/\D/g, "");

    // Remove leading 1 if present
    const cleaned = digits.length === 11 && digits[0] === "1"
        ? digits.slice(1)
        : digits;

    if (cleaned.length !== 10) return phone; // Return original if invalid

    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
};

/**
 * Validate date string
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid date
 */
export const isValidDate = (dateStr) => {
    if (!dateStr) return false;

    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Validate number within range
 * @param {any} value - Value to validate
 * @param {object} options - Validation options
 * @returns {boolean} True if valid number in range
 */
export const isValidNumber = (value, options = {}) => {
    const {
        min = -Infinity,
        max = Infinity,
        integer = false,
        positive = false,
    } = options;

    const num = Number(value);

    if (isNaN(num) || !isFinite(num)) return false;
    if (integer && !Number.isInteger(num)) return false;
    if (positive && num <= 0) return false;
    if (num < min || num > max) return false;

    return true;
};

/**
 * Validate guest ID format (e.g., GABC123)
 * @param {string} guestId - Guest ID to validate
 * @returns {boolean} True if valid guest ID format
 */
export const isValidGuestId = (guestId) => {
    if (typeof guestId !== "string") return false;

    // Format: G followed by at least 3 alphanumeric characters
    const guestIdRegex = /^G[A-Z0-9]{3,}$/;
    return guestIdRegex.test(guestId.toUpperCase());
};

/**
 * Sanitize guest ID to standard format
 * @param {string} guestId - Guest ID to sanitize
 * @returns {string} Guest ID in uppercase
 */
export const sanitizeGuestId = (guestId) => {
    if (typeof guestId !== "string") return "";

    return guestId.trim().toUpperCase();
};

/**
 * Validate CSV file
 * @param {File} file - File to validate
 * @param {object} options - Validation options
 * @returns {object} { valid: boolean, error: string|null }
 */
export const validateCsvFile = (file, options = {}) => {
    const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        requiredExtensions = [".csv"],
    } = options;

    if (!file) {
        return { valid: false, error: "No file provided" };
    }

    if (!(file instanceof File)) {
        return { valid: false, error: "Invalid file object" };
    }

    // Check file size
    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `File size exceeds ${maxSizeMB}MB limit`
        };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = requiredExtensions.some(ext =>
        fileName.endsWith(ext.toLowerCase())
    );

    if (!hasValidExtension) {
        return {
            valid: false,
            error: `File must have one of these extensions: ${requiredExtensions.join(", ")}`
        };
    }

    return { valid: true, error: null };
};

/**
 * Escape special characters for use in SQL queries
 * (For display/logging purposes only - never use for actual SQL queries!)
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export const escapeSqlString = (str) => {
    if (typeof str !== "string") return "";

    return str
        .replace(/'/g, "''")
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
};

/**
 * Validate and sanitize object with expected schema
 * @param {object} obj - Object to validate
 * @param {object} schema - Expected schema
 * @returns {object} { valid: boolean, errors: array, sanitized: object }
 */
export const validateObject = (obj, schema) => {
    const errors = [];
    const sanitized = {};

    for (const [key, rules] of Object.entries(schema)) {
        const value = obj?.[key];
        const {
            type,
            required = false,
            validate,
            sanitize,
            default: defaultValue,
        } = rules;

        // Check required fields
        if (required && (value === undefined || value === null || value === "")) {
            errors.push(`${key} is required`);
            continue;
        }

        // Use default if not provided and not required
        if (value === undefined || value === null) {
            if (defaultValue !== undefined) {
                sanitized[key] = defaultValue;
            }
            continue;
        }

        // Type validation
        if (type) {
            const actualType = Array.isArray(value) ? "array" : typeof value;
            if (actualType !== type) {
                errors.push(`${key} must be of type ${type}, got ${actualType}`);
                continue;
            }
        }

        // Custom validation
        if (validate && !validate(value)) {
            errors.push(`${key} failed validation`);
            continue;
        }

        // Sanitization
        sanitized[key] = sanitize ? sanitize(value) : value;
    }

    return {
        valid: errors.length === 0,
        errors,
        sanitized,
    };
};

/**
 * Prevent XSS by escaping HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML
 */
export const escapeHtml = (str) => {
    if (typeof str !== "string") return "";

    const htmlEscapes = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "/": "&#x2F;",
    };

    return str.replace(/[&<>"'/]/g, char => htmlEscapes[char]);
};

/**
 * Rate limit validator to prevent abuse
 * @param {string} key - Unique key for the action
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} { allowed: boolean, remainingAttempts: number, resetTime: number }
 */
export const checkRateLimit = (key, maxAttempts = 5, windowMs = 60000) => {
    const now = Date.now();
    const storageKey = `rateLimit_${key}`;

    try {
        const stored = localStorage.getItem(storageKey);
        const data = stored ? JSON.parse(stored) : { attempts: [], resetTime: now + windowMs };

        // Filter out attempts outside the window
        data.attempts = data.attempts.filter(timestamp =>
            now - timestamp < windowMs
        );

        // Check if limit exceeded
        if (data.attempts.length >= maxAttempts) {
            return {
                allowed: false,
                remainingAttempts: 0,
                resetTime: data.attempts[0] + windowMs,
            };
        }

        // Add current attempt
        data.attempts.push(now);
        localStorage.setItem(storageKey, JSON.stringify(data));

        return {
            allowed: true,
            remainingAttempts: maxAttempts - data.attempts.length,
            resetTime: now + windowMs,
        };
    } catch (error) {
        console.error("Rate limit check failed:", error);
        // Fail open - allow the action
        return {
            allowed: true,
            remainingAttempts: maxAttempts,
            resetTime: now + windowMs,
        };
    }
};
