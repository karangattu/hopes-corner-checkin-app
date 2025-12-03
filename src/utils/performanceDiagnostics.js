/**
 * Performance diagnostics utility for identifying app bottlenecks
 * Usage: Run window.perfDiag.runFullDiagnostic() in the browser console
 */

class PerformanceDiagnostics {
  constructor() {
    this.results = {};
    this.isRunning = false;
  }

  /**
   * Check how many records are in the app
   */
  checkDataSize() {
    console.log('📊 Checking data size...');
    const results = {};

    try {
      // Get all keys from IndexedDB
      const keys = [
        'hopes-corner-guests',
        'hopes-corner-meal-records',
        'hopes-corner-rv-meal-records',
        'hopes-corner-shower-records',
        'hopes-corner-laundry-records',
        'hopes-corner-bicycle-records',
        'hopes-corner-holiday-records',
        'hopes-corner-haircut-records',
        'hopes-corner-item-records',
        'hopes-corner-donation-records',
      ];

      // Since we can't directly access IndexedDB synchronously,
      // we'll check localStorage as a proxy
      keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const count = Array.isArray(parsed) ? parsed.length :
                         (parsed?.state?.guests?.length ||
                          parsed?.state?.mealRecords?.length ||
                          parsed?.state?.records?.length || 0);
            results[key] = {
              count,
              sizeKB: (data.length / 1024).toFixed(2)
            };
          } catch {
            results[key] = { error: 'Failed to parse' };
          }
        }
      });

      this.results.dataSize = results;
      console.table(results);

      const totalRecords = Object.values(results)
        .reduce((sum, r) => sum + (r.count || 0), 0);

      if (totalRecords > 10000) {
        console.warn(`⚠️ LARGE DATASET DETECTED: ${totalRecords.toLocaleString()} total records`);
        console.log('💡 Recommendation: Consider enabling VITE_DISABLE_PERSISTENCE=true for local development');
      }

      return results;
    } catch (error) {
      console.error('❌ Error checking data size:', error);
      return {};
    }
  }

  /**
   * Measure component render times
   */
  measureReactPerformance() {
    console.log('🎯 Measuring React performance...');
    console.log('1. Open React DevTools');
    console.log('2. Go to "Profiler" tab');
    console.log('3. Click the record button');
    console.log('4. Perform the slow action (e.g., switch tabs, type in search)');
    console.log('5. Stop recording');
    console.log('6. Look for:');
    console.log('   - Components with >16ms render time (red/yellow bars)');
    console.log('   - Unnecessary re-renders (multiple renders in a row)');
    console.log('   - Cascading renders (one component causes many others to render)');
  }

  /**
   * Check for long tasks
   */
  async monitorLongTasks(duration = 10000) {
    console.log(`⏱️ Monitoring long tasks for ${duration / 1000} seconds...`);
    console.log('Perform your slow actions now!');

    const longTasks = [];

    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTasks.push({
              duration: entry.duration.toFixed(2) + 'ms',
              startTime: entry.startTime.toFixed(2) + 'ms',
              type: entry.entryType,
            });
            console.warn(`🚨 Long task: ${entry.duration.toFixed(2)}ms`);
          }
        });

        observer.observe({ entryTypes: ['longtask'] });

        await new Promise(resolve => setTimeout(resolve, duration));

        observer.disconnect();

        this.results.longTasks = longTasks;

        if (longTasks.length === 0) {
          console.log('✅ No long tasks detected!');
        } else {
          console.warn(`⚠️ Found ${longTasks.length} long tasks:`);
          console.table(longTasks);
        }

        return longTasks;
      } catch {
        console.warn('Long task monitoring not available in this browser');
      }
    }

    return [];
  }

  /**
   * Check memory usage
   */
  checkMemoryUsage() {
    console.log('💾 Checking memory usage...');

    if (performance.memory) {
      const memory = {
        usedMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
        totalMB: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
        limitMB: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2),
        usage: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2) + '%'
      };

      this.results.memory = memory;
      console.table([memory]);

      const usagePercent = parseFloat(memory.usage);
      if (usagePercent > 70) {
        console.warn(`⚠️ HIGH MEMORY USAGE: ${memory.usage}`);
        console.log('💡 Try closing other tabs or reloading the page');
      } else if (usagePercent > 50) {
        console.log(`⚡ Moderate memory usage: ${memory.usage}`);
      } else {
        console.log(`✅ Memory usage looks good: ${memory.usage}`);
      }

      return memory;
    } else {
      console.log('Memory API not available in this browser');
      return null;
    }
  }

  /**
   * Check for expensive selectors/filters
   */
  profileContextUsage() {
    console.log('🔍 Profiling context usage...');
    console.log('To find expensive context operations:');
    console.log('1. Open React DevTools');
    console.log('2. Go to "Profiler" tab');
    console.log('3. Look for components that re-render frequently');
    console.log('4. Check if they use useAppContext() hook');
    console.log('5. Components should only re-render when their specific data changes');
  }

  /**
   * Run a comprehensive diagnostic
   */
  async runFullDiagnostic() {
    if (this.isRunning) {
      console.warn('⚠️ Diagnostic already running...');
      return;
    }

    this.isRunning = true;
    this.results = {};

    console.log('🔍 ==== STARTING PERFORMANCE DIAGNOSTIC ====\n');

    // Step 1: Check data size
    this.checkDataSize();
    console.log('');

    // Step 2: Check memory
    this.checkMemoryUsage();
    console.log('');

    // Step 3: Instructions for React profiling
    this.measureReactPerformance();
    console.log('');

    // Step 4: Instructions for context profiling
    this.profileContextUsage();
    console.log('');

    // Step 5: Monitor long tasks
    console.log('📍 Step 5: Monitoring for long tasks...');
    await this.monitorLongTasks(10000);
    console.log('');

    console.log('🎯 ==== DIAGNOSTIC COMPLETE ====\n');
    console.log('Full results:', this.results);

    // Recommendations
    console.log('\n📋 RECOMMENDATIONS:');

    const totalRecords = Object.values(this.results.dataSize || {})
      .reduce((sum, r) => sum + (r.count || 0), 0);

    if (totalRecords > 10000) {
      console.log('1. ⚠️ CRITICAL: Large dataset detected (' + totalRecords.toLocaleString() + ' records)');
      console.log('   → Set VITE_DISABLE_PERSISTENCE=true in .env for local testing');
      console.log('   → Consider data archiving/cleanup for production');
    }

    if (this.results.longTasks && this.results.longTasks.length > 0) {
      console.log('2. ⚠️ Long tasks detected blocking the UI');
      console.log('   → Use React DevTools Profiler to find which components are slow');
      console.log('   → Look for expensive computations in useMemo/useEffect');
    }

    if (this.results.memory) {
      const usagePercent = parseFloat(this.results.memory.usage);
      if (usagePercent > 70) {
        console.log('3. ⚠️ High memory usage detected');
        console.log('   → Reload the page to clear memory');
        console.log('   → Check for memory leaks in useEffect cleanup');
      }
    }

    console.log('\n💡 To re-run: window.perfDiag.runFullDiagnostic()');
    console.log('💡 To monitor specific actions: window.perfDiag.monitorLongTasks(10000)');

    this.isRunning = false;
    return this.results;
  }

  /**
   * Quick check - just show data size and memory
   */
  quickCheck() {
    console.log('⚡ QUICK PERFORMANCE CHECK\n');
    const dataSize = this.checkDataSize();
    console.log('');
    const memory = this.checkMemoryUsage();
    console.log('\n💡 For full diagnostic: window.perfDiag.runFullDiagnostic()');
    return { dataSize, memory };
  }
}

// Create singleton
const perfDiag = new PerformanceDiagnostics();

// Expose to window in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.perfDiag = perfDiag;
  console.log('🔍 Performance diagnostics available!');
  console.log('   Quick check: window.perfDiag.quickCheck()');
  console.log('   Full diagnostic: window.perfDiag.runFullDiagnostic()');
}

export default perfDiag;
