/**
 * Sync Error Handler
 * Classifies sync errors for user-friendly messaging and determines retry strategy
 */

/**
 * Classify sync errors for user-friendly messaging
 * @param {Error} error - The error object from sync attempt
 * @param {string} operationType - Type of operation (e.g., ADD_MEAL, ADD_SHOWER)
 * @returns {object} Classification with type, userMessage, action, severity
 */
export function classifyError(error, operationType) {
  const message = error.message?.toLowerCase() || '';
  const code = error.code || error.status;
  const errorString = error.toString?.().toLowerCase() || '';

  // Unique constraint (duplicate entry) - CHECK THIS BEFORE foreign key
  if (
    code === '23505' ||
    code === 23505 ||
    message.includes('unique') ||
    message.includes('duplicate') ||
    errorString.includes('unique')
  ) {
    return {
      type: 'CONFLICT_DUPLICATE',
      userMessage: `This ${operationType} was already recorded. Sync skipped to prevent duplicates.`,
      action: 'Check if you created this entry twice.',
      severity: 'low',
      retriable: false,
    };
  }

  // Foreign key constraint (guest/resource deleted)
  if (
    code === '23503' ||
    code === 23503 ||
    message.includes('fk_') ||
    message.includes('violates') ||
    message.includes('foreign key') ||
    message.includes('no rows updated')
  ) {
    return {
      type: 'CONFLICT_DELETED',
      userMessage: `The guest or resource for this ${operationType} no longer exists. Data was not synced.`,
      action: 'The record was likely deleted on the server. You can delete this entry.',
      severity: 'medium',
      retriable: false,
    };
  }

  // Authentication error
  if (code === 401 || message.includes('unauthorized') || message.includes('not authenticated')) {
    return {
      type: 'AUTH_EXPIRED',
      userMessage: 'Your session expired. Please log in again.',
      action: 'Log in to continue syncing.',
      severity: 'high',
      retriable: false,
    };
  }

  // Permission/forbidden error
  if (code === 403 || message.includes('forbidden') || message.includes('permission')) {
    return {
      type: 'PERMISSION_DENIED',
      userMessage: 'You do not have permission to perform this action.',
      action: 'Contact an administrator for help.',
      severity: 'high',
      retriable: false,
    };
  }

  // Database/validation constraint errors (client error)
  if (code >= 400 && code < 500 && code !== 401 && code !== 403) {
    return {
      type: 'VALIDATION_ERROR',
      userMessage: `Data validation failed for ${operationType}. Please check your input.`,
      action: 'Review and re-enter the data. Contact support if error persists.',
      severity: 'medium',
      retriable: false,
    };
  }

  // Server errors (retriable)
  if (code >= 500 || message.includes('internal server error')) {
    return {
      type: 'SERVER_ERROR',
      userMessage: 'Server error. Will retry when connection is stable.',
      action: 'Check connection or wait and the app will retry automatically.',
      severity: 'medium',
      retriable: true,
    };
  }

  // Network/timeout errors (retriable)
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('failed to fetch') ||
    message.includes('econnrefused') ||
    errorString.includes('fetch')
  ) {
    return {
      type: 'NETWORK_ERROR',
      userMessage: 'Network error. Will retry when connection is stable.',
      action: 'Check your internet connection.',
      severity: 'low',
      retriable: true,
    };
  }

  // Unknown error
  return {
    type: 'UNKNOWN_ERROR',
    userMessage: `Sync failed: ${message || 'Unknown error'}`,
    action: 'Check connection or contact support.',
    severity: 'medium',
    retriable: true,
  };
}

/**
 * Get retry strategy based on error type
 * @param {string} errorType - The error type from classifyError
 * @returns {object} Strategy with shouldRetry and maxAttempts
 */
export function getRetryStrategy(errorType) {
  const nonRetryableErrors = [
    'CONFLICT_DELETED',
    'CONFLICT_DUPLICATE',
    'AUTH_EXPIRED',
    'PERMISSION_DENIED',
    'VALIDATION_ERROR',
  ];

  const shouldRetry = !nonRetryableErrors.includes(errorType);
  const maxAttempts = shouldRetry ? 5 : 0; // 0 means don't retry

  return {
    shouldRetry,
    maxAttempts,
  };
}

/**
 * Determine if error is network-related (retriable)
 * @param {Error} error - The error object
 * @returns {boolean} True if error is network-related
 */
export function isNetworkError(error) {
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    error.code === 'PGRST301' ||
    error.code === 'ECONNREFUSED'
  );
}

/**
 * Format error details for logging
 * @param {Error} error - The error object
 * @param {string} operationType - Type of operation
 * @param {object} context - Additional context
 * @returns {object} Formatted error details
 */
export function formatErrorDetails(error, operationType, context = {}) {
  return {
    operationType,
    errorMessage: error.message,
    errorCode: error.code || error.status,
    errorType: error.name,
    timestamp: new Date().toISOString(),
    context,
  };
}
