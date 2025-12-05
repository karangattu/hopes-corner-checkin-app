/**
 * Debounce utility for managing high-frequency user inputs (search, typing)
 * Helps reduce unnecessary re-renders and database hits.
 */

/**
 * Creates a debounced version of a function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Debounce delay in ms (default 300ms)
 * @returns {Function} Debounced function with cancel method
 */
export const debounce = (fn, delay = 300) => {
  let timeoutId = null;

  const debouncedFn = (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  debouncedFn.flush = (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    fn(...args);
  };

  return debouncedFn;
};

/**
 * Creates a throttled version of a function
 * Ensures it runs at most once per interval
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum time between calls in ms
 * @returns {Function} Throttled function
 */
export const throttle = (fn, limit = 200) => {
  let lastCall = 0;
  let scheduledCall = null;

  return (...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= limit) {
      lastCall = now;
      fn(...args);
    } else {
      // Schedule a call at the end of the interval if not already scheduled
      if (!scheduledCall) {
        scheduledCall = setTimeout(() => {
          lastCall = Date.now();
          scheduledCall = null;
          fn(...args);
        }, limit - timeSinceLastCall);
      }
    }
  };
};

export default { debounce, throttle };
