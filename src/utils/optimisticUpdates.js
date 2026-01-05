/**
 * Optimistic Updates Utility
 * 
 * Provides helpers for implementing optimistic UI updates with automatic rollback
 * on failure. This improves perceived performance by showing changes immediately
 * while the server request completes in the background.
 */

/**
 * Executes a mutation with optimistic UI updates and rollback on failure.
 * 
 * @param {Function} optimisticUpdate - Function that updates local UI state immediately
 * @param {Function} mutation - Async function that performs the actual server operation
 * @param {Function} rollback - Function that reverts optimistic changes on failure
 * @param {Object} options - Additional options
 * @param {Function} options.onSuccess - Callback on successful mutation
 * @param {Function} options.onError - Callback on failed mutation
 * @returns {Promise} Promise that resolves when mutation completes
 */
export const executeWithOptimisticUpdate = async (
  optimisticUpdate,
  mutation,
  rollback,
  options = {}
) => {
  const { onSuccess, onError } = options;

  try {
    // Apply optimistic updates immediately
    optimisticUpdate();

    // Execute the actual mutation
    const result = await mutation();

    // Call success callback if provided
    if (onSuccess) {
      onSuccess(result);
    }

    return result;
  } catch (error) {
    // Rollback the optimistic updates on failure
    rollback();

    // Call error callback if provided
    if (onError) {
      onError(error);
    }

    // Re-throw the error so the caller can handle it if needed
    throw error;
  }
};

/**
 * Creates a snapshot of the current state for rollback purposes.
 * Useful for creating deep copies of state for restoration on error.
 * 
 * @param {*} state - The state to snapshot
 * @returns {*} A copy of the state
 */
export const createStateSnapshot = (state) => {
  if (Array.isArray(state)) {
    return [...state];
  }
  if (state !== null && typeof state === 'object') {
    return { ...state };
  }
  return state;
};

/**
 * Batch multiple optimistic updates into a single transaction.
 * Ensures all updates succeed or all rollback together.
 * 
 * @param {Array} updates - Array of {optimisticUpdate, mutation, rollback}
 * @param {Object} options - Additional options
 * @returns {Promise}
 */
export const executeBatchOptimisticUpdates = async (updates, options = {}) => {
  const { onSuccess, onError } = options;
  const appliedUpdates = [];

  try {
    // Apply all optimistic updates first
    for (const update of updates) {
      update.optimisticUpdate();
      appliedUpdates.push(update);
    }

    // Then execute all mutations
    const results = await Promise.all(
      updates.map((update) => update.mutation())
    );

    // Call success callback if provided
    if (onSuccess) {
      onSuccess(results);
    }

    return results;
  } catch (error) {
    // Rollback all applied updates
    for (const update of appliedUpdates) {
      try {
        update.rollback();
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }

    // Call error callback if provided
    if (onError) {
      onError(error);
    }

    throw error;
  }
};

/**
 * Creates a cancellable optimistic update.
 * Allows manual cancellation of optimistic changes if needed.
 * 
 * @param {Function} optimisticUpdate - Function that updates local UI state
 * @param {Function} mutation - Async function for server operation
 * @param {Function} rollback - Function to revert changes
 * @returns {Object} {execute, cancel, isApplied}
 */
export const createCancellableOptimisticUpdate = (
  optimisticUpdate,
  mutation,
  rollback
) => {
  let isApplied = false;
  let mutationPromise = null;

  const execute = async (options = {}) => {
    const { onSuccess, onError } = options;

    try {
      optimisticUpdate();
      isApplied = true;

      mutationPromise = mutation();
      const result = await mutationPromise;

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      if (isApplied) {
        rollback();
        isApplied = false;
      }

      if (onError) {
        onError(error);
      }

      throw error;
    }
  };

  const cancel = () => {
    if (isApplied) {
      rollback();
      isApplied = false;
    }
  };

  return {
    execute,
    cancel,
    get isApplied() {
      return isApplied;
    },
  };
};
