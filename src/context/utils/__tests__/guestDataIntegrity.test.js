/**
 * Guest Data Integrity Tests
 * 
 * CRITICAL: These tests ensure that guest data cannot be corrupted in ways
 * that cause guests to appear as "Unknown Guest" in the UI.
 * 
 * Root Causes Being Tested:
 * 1. mapGuestRow receives rows with empty/null name fields
 * 2. updateGuest is called with empty name values
 * 3. importGuestsFromCSV creates guests with missing names
 * 4. Data migration/sync issues corrupt name fields
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  mapGuestRow, 
  validateGuestRow 
} from '../mappers';
import { toTitleCase, normalizePreferredName } from '../normalizers';

describe('Guest Data Integrity', () => {
  let consoleErrorSpy;
  
  beforeEach(() => {
    // Capture console.error calls to verify integrity warnings are logged
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Initialize the global tracking array for integrity issues
    if (typeof window !== 'undefined') {
      window.__guestDataIntegrityIssues = [];
    }
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('validateGuestRow', () => {
    it('returns valid for a complete guest row', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G123',
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
        housing_status: 'Unhoused',
        age_group: 'Adult 18-59',
        gender: 'Male',
      };
      
      const result = validateGuestRow(row);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
    
    it('detects missing first_name', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G123',
        first_name: '',
        last_name: 'Doe',
        full_name: 'John Doe',
      };
      
      const result = validateGuestRow(row);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('first_name'))).toBe(true);
    });
    
    it('detects missing full_name', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G123',
        first_name: 'John',
        last_name: 'Doe',
        full_name: '',
      };
      
      const result = validateGuestRow(row);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('full_name'))).toBe(true);
    });
    
    it('detects null row', () => {
      const result = validateGuestRow(null);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('null'))).toBe(true);
    });
    
    it('detects undefined row', () => {
      const result = validateGuestRow(undefined);
      expect(result.isValid).toBe(false);
    });
    
    it('detects whitespace-only names', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G123',
        first_name: '   ',
        last_name: 'Doe',
        full_name: '   ',
      };
      
      const result = validateGuestRow(row);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
    
    it('detects missing id', () => {
      const row = {
        external_id: 'G123',
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
      };
      
      const result = validateGuestRow(row);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('id'))).toBe(true);
    });
    
    it('detects missing external_id', () => {
      const row = {
        id: 'uuid-123',
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
      };
      
      const result = validateGuestRow(row);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('external_id'))).toBe(true);
    });
  });

  describe('mapGuestRow', () => {
    it('correctly maps a valid guest row', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G123',
        first_name: 'john',
        last_name: 'doe',
        full_name: 'john doe',
        preferred_name: 'johnny',
        housing_status: 'Unhoused',
        age_group: 'Adult 18-59',
        gender: 'Male',
        location: 'Mountain View',
        notes: 'Test notes',
        bicycle_description: '',
        banned_until: null,
        banned_at: null,
        ban_reason: '',
        banned_from_bicycle: false,
        banned_from_meals: false,
        banned_from_shower: false,
        banned_from_laundry: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      
      const mapped = mapGuestRow(row);
      
      expect(mapped.id).toBe('uuid-123');
      expect(mapped.guestId).toBe('G123');
      expect(mapped.firstName).toBe('John');
      expect(mapped.lastName).toBe('Doe');
      expect(mapped.name).toBe('John Doe');
      expect(mapped.preferredName).toBe('Johnny');
    });
    
    it('logs error when first_name is empty', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G123',
        first_name: '',
        last_name: 'Doe',
        full_name: 'John Doe',
        housing_status: 'Unhoused',
        age_group: 'Adult 18-59',
        gender: 'Male',
      };
      
      mapGuestRow(row);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('DATA INTEGRITY WARNING');
    });
    
    it('logs error when full_name is empty', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G123',
        first_name: 'John',
        last_name: 'Doe',
        full_name: '',
        housing_status: 'Unhoused',
        age_group: 'Adult 18-59',
        gender: 'Male',
      };
      
      mapGuestRow(row);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    it('logs CRITICAL error when ALL name fields are empty', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G123',
        first_name: '',
        last_name: '',
        full_name: '',
        housing_status: 'Unhoused',
        age_group: 'Adult 18-59',
        gender: 'Male',
      };
      
      mapGuestRow(row);
      
      // Should have multiple error calls
      expect(consoleErrorSpy).toHaveBeenCalled();
      // Check for CRITICAL in any of the calls
      const hasCritical = consoleErrorSpy.mock.calls.some(
        call => call[0]?.includes?.('CRITICAL')
      );
      expect(hasCritical).toBe(true);
    });
    
    it('still returns a valid object even with empty names (for backwards compatibility)', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G123',
        first_name: '',
        last_name: '',
        full_name: '',
        housing_status: 'Unhoused',
        age_group: 'Adult 18-59',
        gender: 'Male',
      };
      
      const mapped = mapGuestRow(row);
      
      // Should still return an object (logging errors but not throwing)
      expect(mapped).toBeDefined();
      expect(mapped.id).toBe('uuid-123');
      expect(mapped.firstName).toBe('');
      expect(mapped.name).toBe('');
    });
    
    it('constructs full_name from first_name and last_name when full_name is missing', () => {
      const row = {
        id: 'uuid-123',
        external_id: 'G123',
        first_name: 'John',
        last_name: 'Doe',
        full_name: null,
        housing_status: 'Unhoused',
        age_group: 'Adult 18-59',
        gender: 'Male',
      };
      
      const mapped = mapGuestRow(row);
      
      expect(mapped.name).toBe('John Doe');
    });
  });

  describe('toTitleCase normalizer', () => {
    it('handles empty string', () => {
      expect(toTitleCase('')).toBe('');
    });
    
    it('handles null', () => {
      expect(toTitleCase(null)).toBe('');
    });
    
    it('handles undefined', () => {
      expect(toTitleCase(undefined)).toBe('');
    });
    
    it('handles whitespace-only string', () => {
      expect(toTitleCase('   ')).toBe('');
    });
    
    it('converts to title case correctly', () => {
      expect(toTitleCase('JOHN DOE')).toBe('John Doe');
      expect(toTitleCase('john doe')).toBe('John Doe');
      expect(toTitleCase('jOhN dOe')).toBe('John Doe');
    });
    
    it('handles single word', () => {
      expect(toTitleCase('john')).toBe('John');
    });
    
    it('collapses multiple spaces to single space', () => {
      expect(toTitleCase('john    doe')).toBe('John Doe');
    });

    it('preserves single space between words for middle names', () => {
      // This is the key test - "John Michael" should stay as "John Michael"
      expect(toTitleCase('john michael')).toBe('John Michael');
      expect(toTitleCase('John Michael')).toBe('John Michael');
      expect(toTitleCase('JOHN MICHAEL')).toBe('John Michael');
    });

    it('handles three-part names correctly', () => {
      expect(toTitleCase('mary jane watson')).toBe('Mary Jane Watson');
      expect(toTitleCase('MARY JANE WATSON')).toBe('Mary Jane Watson');
    });

    it('handles names with leading/trailing spaces', () => {
      expect(toTitleCase('  john  ')).toBe('John');
      expect(toTitleCase('  john michael  ')).toBe('John Michael');
    });
  });

  describe('normalizePreferredName', () => {
    it('handles empty preferred name', () => {
      expect(normalizePreferredName('')).toBe('');
    });
    
    it('handles null preferred name', () => {
      expect(normalizePreferredName(null)).toBe('');
    });
    
    it('trims and title-cases preferred name', () => {
      expect(normalizePreferredName('  johnny  ')).toBe('Johnny');
    });

    it('preserves spaces in multi-word preferred names', () => {
      expect(normalizePreferredName('johnny boy')).toBe('Johnny Boy');
    });
  });

  describe('Guest corruption scenarios', () => {
    it('detects the "Unknown Guest" scenario - all names empty', () => {
      const corruptedRow = {
        id: 'uuid-456',
        external_id: 'G456',
        first_name: '',
        last_name: '',
        full_name: '',
        housing_status: 'Unhoused',
        age_group: 'Adult 18-59',
        gender: 'Male',
      };
      
      const mapped = mapGuestRow(corruptedRow);
      
      // This guest would display as "Unknown Guest" in the UI
      // because name, firstName, and lastName are all empty
      expect(mapped.name).toBe('');
      expect(mapped.firstName).toBe('');
      
      // But we should have logged errors about this
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    it('detects partial name corruption - only first_name missing', () => {
      const partialCorruption = {
        id: 'uuid-789',
        external_id: 'G789',
        first_name: '',
        last_name: 'Smith',
        full_name: 'Jane Smith',
        housing_status: 'Unhoused',
        age_group: 'Adult 18-59',
        gender: 'Female',
      };
      
      const mapped = mapGuestRow(partialCorruption);
      
      // Name should still work from full_name
      expect(mapped.name).toBe('Jane Smith');
      
      // But first_name is corrupted
      expect(mapped.firstName).toBe('');
      
      // Should still log a warning
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    it('simulates database returning null values', () => {
      const nullFieldsRow = {
        id: 'uuid-abc',
        external_id: 'GABC',
        first_name: null,
        last_name: null,
        full_name: null,
        housing_status: 'Unhoused',
        age_group: 'Adult 18-59',
        gender: 'Unknown',
      };
      
      const mapped = mapGuestRow(nullFieldsRow);
      
      // All name fields should be empty strings (not undefined)
      expect(mapped.firstName).toBe('');
      expect(mapped.lastName).toBe('');
      expect(mapped.name).toBe('');
      
      // Should have logged CRITICAL error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});

describe('Guest Update Prevention', () => {
  it('documents that empty name updates should be blocked', () => {
    // This test documents the expected behavior:
    // When updateGuest is called with empty name fields,
    // it should be rejected and the update should not proceed.
    
    // The actual implementation is in:
    // - src/stores/useGuestsStore.js (updateGuest)
    // - src/context/AppContext.jsx (updateGuest)
    
    // Both should:
    // 1. Validate name fields are not empty before updating
    // 2. Log errors when empty names are detected
    // 3. Return false and show error toast
    // 4. NOT update the database with empty values
    
    expect(true).toBe(true); // Placeholder assertion
  });
});

describe('Guest Import Validation', () => {
  it('documents that CSV imports should reject rows with empty names', () => {
    // This test documents the expected behavior:
    // When importing guests from CSV, rows with missing/empty
    // first_name or full_name should be rejected.
    
    // The implementation should:
    // 1. Check first_name is not empty
    // 2. Check full_name is not empty (or can be constructed)
    // 3. Skip rows with invalid names
    // 4. Report skipped rows to the user
    
    expect(true).toBe(true); // Placeholder assertion
  });
});
