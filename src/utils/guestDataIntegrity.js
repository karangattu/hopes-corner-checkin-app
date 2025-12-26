/**
 * Guest Data Integrity Monitor
 * 
 * This utility provides runtime monitoring for guest data integrity issues.
 * It helps detect the "Unknown Guest" problem early by:
 * 1. Tracking corrupted guest records
 * 2. Providing diagnostic functions for auditing
 * 3. Alerting when integrity issues are detected
 * 
 * USAGE:
 * - Import and call initGuestDataIntegrityMonitor() in your app startup
 * - Call auditGuestData(guests) periodically or after major operations
 * - Check window.__guestDataIntegrityIssues for detected problems
 */

/**
 * Initialize the global tracking array for integrity issues
 */
export const initGuestDataIntegrityMonitor = () => {
  if (typeof window !== 'undefined') {
    window.__guestDataIntegrityIssues = window.__guestDataIntegrityIssues || [];
    
    // Add a helper to get current issues
    window.getGuestIntegrityIssues = () => {
      return window.__guestDataIntegrityIssues || [];
    };
    
    // Add a helper to clear issues (useful after fixing)
    window.clearGuestIntegrityIssues = () => {
      window.__guestDataIntegrityIssues = [];
      console.log('[DATA INTEGRITY] Cleared integrity issue log');
    };
    
    console.log('[DATA INTEGRITY] Guest data integrity monitor initialized');
  }
};

/**
 * Record a data integrity issue
 * @param {object} issue - Issue details
 */
export const recordIntegrityIssue = (issue) => {
  if (typeof window !== 'undefined') {
    if (!window.__guestDataIntegrityIssues) {
      window.__guestDataIntegrityIssues = [];
    }
    
    const enrichedIssue = {
      ...issue,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack,
    };
    
    window.__guestDataIntegrityIssues.push(enrichedIssue);
    
    // Keep only last 100 issues to prevent memory leaks
    if (window.__guestDataIntegrityIssues.length > 100) {
      window.__guestDataIntegrityIssues = window.__guestDataIntegrityIssues.slice(-100);
    }
  }
};

/**
 * Audit a list of guests for data integrity issues
 * @param {Array} guests - Array of guest objects
 * @returns {object} Audit results
 */
export const auditGuestData = (guests) => {
  const issues = {
    emptyFirstName: [],
    emptyLastName: [],
    emptyFullName: [],
    completelyEmpty: [],
    missingId: [],
    missingGuestId: [],
  };
  
  if (!Array.isArray(guests)) {
    console.error('[DATA INTEGRITY AUDIT] Invalid guests array provided');
    return { valid: false, totalGuests: 0, issues };
  }
  
  guests.forEach((guest, index) => {
    if (!guest.id) {
      issues.missingId.push({ index, guest: { ...guest } });
    }
    
    if (!guest.guestId) {
      issues.missingGuestId.push({ index, id: guest.id, guest: { ...guest } });
    }
    
    const firstName = (guest.firstName || '').trim();
    const lastName = (guest.lastName || '').trim();
    const fullName = (guest.name || '').trim();
    
    if (!firstName) {
      issues.emptyFirstName.push({ 
        index, 
        id: guest.id, 
        guestId: guest.guestId,
        currentName: guest.name,
      });
    }
    
    if (!lastName) {
      issues.emptyLastName.push({ 
        index, 
        id: guest.id, 
        guestId: guest.guestId,
        currentName: guest.name,
      });
    }
    
    if (!fullName) {
      issues.emptyFullName.push({ 
        index, 
        id: guest.id, 
        guestId: guest.guestId,
        firstName: guest.firstName,
        lastName: guest.lastName,
      });
    }
    
    // The most critical issue: completely empty names
    // These guests will appear as "Unknown Guest" in the UI
    if (!firstName && !lastName && !fullName) {
      issues.completelyEmpty.push({ 
        index, 
        id: guest.id, 
        guestId: guest.guestId,
        fullGuestData: { ...guest },
      });
    }
  });
  
  const totalIssues = 
    issues.emptyFirstName.length +
    issues.emptyLastName.length +
    issues.emptyFullName.length +
    issues.missingId.length +
    issues.missingGuestId.length;
  
  const criticalIssues = issues.completelyEmpty.length;
  
  // Log summary
  if (criticalIssues > 0) {
    console.error(
      `[DATA INTEGRITY AUDIT] CRITICAL: Found ${criticalIssues} guest(s) with completely empty names!`,
      '\nThese guests will appear as "Unknown Guest" in the UI.',
      '\nAffected guests:', issues.completelyEmpty
    );
  }
  
  if (totalIssues > 0) {
    console.warn(
      `[DATA INTEGRITY AUDIT] Found ${totalIssues} data quality issues:`,
      {
        emptyFirstName: issues.emptyFirstName.length,
        emptyLastName: issues.emptyLastName.length,
        emptyFullName: issues.emptyFullName.length,
        completelyEmpty: issues.completelyEmpty.length,
        missingId: issues.missingId.length,
        missingGuestId: issues.missingGuestId.length,
      }
    );
  } else {
    console.log('[DATA INTEGRITY AUDIT] All guests passed integrity checks');
  }
  
  return {
    valid: criticalIssues === 0,
    totalGuests: guests.length,
    totalIssues,
    criticalIssues,
    issues,
  };
};

/**
 * Find guests that appear as "Unknown Guest" in the current state
 * @param {Array} guests - Array of guest objects
 * @returns {Array} Guests that would display as Unknown Guest
 */
export const findUnknownGuests = (guests) => {
  if (!Array.isArray(guests)) return [];
  
  return guests.filter((guest) => {
    const firstName = (guest.firstName || '').trim();
    const lastName = (guest.lastName || '').trim();
    const fullName = (guest.name || '').trim();
    
    // A guest appears as "Unknown Guest" when all name fields are empty
    return !firstName && !lastName && !fullName;
  });
};

/**
 * Create a diagnostic report for a specific guest
 * @param {object} guest - Guest object to diagnose
 * @returns {object} Diagnostic report
 */
export const diagnoseGuest = (guest) => {
  const report = {
    id: guest?.id || 'MISSING',
    guestId: guest?.guestId || 'MISSING',
    nameFields: {
      firstName: {
        value: guest?.firstName,
        isEmpty: !(guest?.firstName || '').trim(),
      },
      lastName: {
        value: guest?.lastName,
        isEmpty: !(guest?.lastName || '').trim(),
      },
      fullName: {
        value: guest?.name,
        isEmpty: !(guest?.name || '').trim(),
      },
      preferredName: {
        value: guest?.preferredName,
        isEmpty: !(guest?.preferredName || '').trim(),
      },
    },
    wouldDisplayAsUnknown: false,
    recommendations: [],
  };
  
  // Check if this guest would display as "Unknown Guest"
  const allNamesEmpty = 
    report.nameFields.firstName.isEmpty &&
    report.nameFields.lastName.isEmpty &&
    report.nameFields.fullName.isEmpty;
  
  report.wouldDisplayAsUnknown = allNamesEmpty;
  
  // Generate recommendations
  if (allNamesEmpty) {
    report.recommendations.push(
      'CRITICAL: This guest has no name data and will appear as "Unknown Guest"',
      'Action: Restore name data from backup or re-register the guest'
    );
  } else {
    if (report.nameFields.firstName.isEmpty) {
      report.recommendations.push(
        'firstName is empty - consider extracting from fullName if available'
      );
    }
    if (report.nameFields.lastName.isEmpty) {
      report.recommendations.push(
        'lastName is empty - consider extracting from fullName if available'
      );
    }
    if (report.nameFields.fullName.isEmpty && !allNamesEmpty) {
      report.recommendations.push(
        'fullName is empty but first/last name available - reconstruct fullName'
      );
    }
  }
  
  return report;
};

/**
 * Generate a repair suggestion for corrupted guests
 * @param {object} guest - Corrupted guest object
 * @returns {object|null} Suggested repair or null if cannot be repaired
 */
export const suggestRepair = (guest) => {
  if (!guest) return null;
  
  const firstName = (guest.firstName || '').trim();
  const lastName = (guest.lastName || '').trim();
  const fullName = (guest.name || '').trim();
  
  // If we have a full name but missing first/last
  if (fullName && (!firstName || !lastName)) {
    const parts = fullName.split(/\s+/);
    return {
      canRepair: true,
      repair: {
        firstName: firstName || parts[0] || '',
        lastName: lastName || parts.slice(1).join(' ') || '',
        name: fullName,
      },
      method: 'Extracted first/last name from full name',
    };
  }
  
  // If we have first and last but no full name
  if ((firstName || lastName) && !fullName) {
    return {
      canRepair: true,
      repair: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
      },
      method: 'Constructed full name from first/last name',
    };
  }
  
  // If all names are empty, cannot auto-repair
  if (!firstName && !lastName && !fullName) {
    return {
      canRepair: false,
      repair: null,
      method: null,
      reason: 'All name fields are empty - manual intervention required',
    };
  }
  
  // Guest appears to be OK
  return {
    canRepair: false,
    repair: null,
    method: null,
    reason: 'Guest data appears valid - no repair needed',
  };
};

export default {
  initGuestDataIntegrityMonitor,
  recordIntegrityIssue,
  auditGuestData,
  findUnknownGuests,
  diagnoseGuest,
  suggestRepair,
};
