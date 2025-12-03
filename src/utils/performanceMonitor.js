/**
 * Performance monitoring utility for tracking app performance
 * Helps identify slow operations and bottlenecks
 */

class PerformanceMonitor {
  constructor() {
    this.measurements = [];
    this.isEnabled = import.meta.env.DEV;
    this.setupLongTaskObserver();
  }

  /**
   * Start timing an operation
   * @param {string} label - Label for the operation
   * @returns {function} End function to call when operation completes
   */
  startMeasurement(label) {
    const startTime = performance.now();
    const startMark = `${label}-start`;

    if (this.isEnabled) {
      performance.mark(startMark);
    }

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (this.isEnabled) {
        const endMark = `${label}-end`;
        performance.mark(endMark);

        try {
          performance.measure(label, startMark, endMark);
        } catch {
          // Mark might not exist, ignore
        }

        this.logMeasurement(label, duration);
      }

      return duration;
    };
  }

  /**
   * Measure a function execution time
   * @param {string} label - Label for the operation
   * @param {function} fn - Function to measure
   * @returns {any} Return value of the function
   */
  async measureFunction(label, fn) {
    const end = this.startMeasurement(label);
    try {
      const result = await fn();
      end();
      return result;
    } catch (error) {
      end();
      throw error;
    }
  }

  /**
   * Log a measurement
   * @param {string} label - Label for the operation
   * @param {number} duration - Duration in milliseconds
   */
  logMeasurement(label, duration) {
    const measurement = {
      label,
      duration,
      timestamp: Date.now(),
    };

    this.measurements.push(measurement);

    // Keep only last 100 measurements
    if (this.measurements.length > 100) {
      this.measurements.shift();
    }

    // Warn if operation is slow
    if (duration > 100) {
      console.warn(`⚠️ Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    } else if (duration > 50) {
      console.log(`⏱️ ${label} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Setup observer for long tasks (blocking main thread)
   */
  setupLongTaskObserver() {
    if (!this.isEnabled || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn(
            `🚨 Long task detected: ${entry.duration.toFixed(2)}ms (blocks user input)`,
            entry
          );
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      // PerformanceObserver might not support longtask
      console.log('Long task monitoring not available');
    }
  }

  /**
   * Get all measurements
   * @returns {Array} Array of measurements
   */
  getMeasurements() {
    return this.measurements;
  }

  /**
   * Get measurements for a specific label
   * @param {string} label - Label to filter by
   * @returns {Array} Filtered measurements
   */
  getMeasurementsForLabel(label) {
    return this.measurements.filter(m => m.label === label);
  }

  /**
   * Get average duration for a label
   * @param {string} label - Label to calculate average for
   * @returns {number} Average duration in milliseconds
   */
  getAverageDuration(label) {
    const filtered = this.getMeasurementsForLabel(label);
    if (filtered.length === 0) return 0;

    const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
    return sum / filtered.length;
  }

  /**
   * Clear all measurements
   */
  clear() {
    this.measurements = [];
  }

  /**
   * Get a summary of all measurements
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const groupedByLabel = this.measurements.reduce((acc, m) => {
      if (!acc[m.label]) {
        acc[m.label] = [];
      }
      acc[m.label].push(m.duration);
      return acc;
    }, {});

    const summary = {};
    for (const [label, durations] of Object.entries(groupedByLabel)) {
      const sorted = durations.sort((a, b) => a - b);
      summary[label] = {
        count: durations.length,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        median: sorted[Math.floor(sorted.length / 2)],
      };
    }

    return summary;
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    const summary = this.getSummary();
    console.table(summary);
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Add to window for easy access in dev tools
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.performanceMonitor = performanceMonitor;
  console.log('💡 Performance monitor available at window.performanceMonitor');
  console.log('   Use performanceMonitor.logSummary() to see stats');
}

export default performanceMonitor;

/**
 * React hook for measuring component render time
 * @param {string} componentName - Name of the component
 */
export function useRenderPerformance(componentName) {
  if (import.meta.env.DEV) {
    const startTime = performance.now();

    // This runs after render
    setTimeout(() => {
      const duration = performance.now() - startTime;
      if (duration > 16) { // More than one frame (60fps)
        performanceMonitor.logMeasurement(`${componentName} render`, duration);
      }
    }, 0);
  }
}

/**
 * Higher-order function to wrap async operations with performance tracking
 * @param {string} label - Label for the operation
 * @param {function} fn - Async function to wrap
 * @returns {function} Wrapped function
 */
export function withPerformanceTracking(label, fn) {
  return async (...args) => {
    const end = performanceMonitor.startMeasurement(label);
    try {
      const result = await fn(...args);
      end();
      return result;
    } catch (error) {
      end();
      throw error;
    }
  };
}
