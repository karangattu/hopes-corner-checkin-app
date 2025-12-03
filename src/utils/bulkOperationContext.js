/**
 * Global context for bulk operations
 * Allows us to suppress toasts and optimize performance during large imports
 */

class BulkOperationManager {
  constructor() {
    this.isBulkOperation = false;
    this.suppressToasts = false;
  }

  startBulkOperation() {
    this.isBulkOperation = true;
    this.suppressToasts = true;
  }

  endBulkOperation() {
    this.isBulkOperation = false;
    this.suppressToasts = false;
  }

  shouldSuppressToast() {
    return this.suppressToasts;
  }

  isInBulkOperation() {
    return this.isBulkOperation;
  }
}

export const bulkOperationManager = new BulkOperationManager();

/**
 * Wrapper function to execute code within a bulk operation context
 * Automatically flushes pending persistence writes when the operation completes
 */
export const withBulkOperation = async (fn) => {
  bulkOperationManager.startBulkOperation();
  try {
    return await fn();
  } finally {
    bulkOperationManager.endBulkOperation();

    // Flush any pending persistence writes
    try {
      const { flushPersistence } = await import('../stores/middleware/persistentStorage');
      await flushPersistence();
    } catch (error) {
      console.warn('Could not flush persistence after bulk operation:', error);
    }
  }
};
