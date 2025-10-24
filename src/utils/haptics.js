/**
 * Haptic Feedback Utility
 * Provides tactile feedback on mobile devices for better UX
 */

/**
 * Trigger haptic feedback if supported by the device
 * @param {string} type - Type of haptic: 'light', 'medium', 'heavy', 'success', 'warning', 'error'
 */
export const triggerHaptic = (type = 'light') => {
  // Check if we're on a mobile device and haptics are supported
  if (typeof window === 'undefined') return;

  // Vibration API (widely supported)
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10], // Double tap pattern
      warning: [20, 100, 20],
      error: [50, 100, 50, 100, 50], // More intense pattern
      selection: [5], // Very light for selections/hovers
      impact: [15], // Quick tap feedback
    };

    const pattern = patterns[type] || patterns.light;
    navigator.vibrate(pattern);
  }

  // iOS Haptic Feedback API (Safari on iOS 13+)
  // Note: This is typically accessed through WKWebView, not directly available in Safari
  // But we'll include it for completeness in case the app is wrapped in a native shell
  if (window.webkit?.messageHandlers?.haptic) {
    const intensity = {
      light: 'light',
      medium: 'medium',
      heavy: 'heavy',
      success: 'success',
      warning: 'warning',
      error: 'error',
      selection: 'selection',
      impact: 'impact',
    }[type] || 'light';

    try {
      window.webkit.messageHandlers.haptic.postMessage({ type: intensity });
    } catch {
      // Silently fail if not available
    }
  }
};

/**
 * Convenience functions for common haptic patterns
 */
export const haptics = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
  selection: () => triggerHaptic('selection'),
  impact: () => triggerHaptic('impact'),
  
  // Semantic helpers
  buttonPress: () => triggerHaptic('light'),
  buttonLongPress: () => triggerHaptic('medium'),
  actionSuccess: () => triggerHaptic('success'),
  actionError: () => triggerHaptic('error'),
  actionWarning: () => triggerHaptic('warning'),
  menuSelect: () => triggerHaptic('selection'),
  toggleOn: () => triggerHaptic('success'),
  toggleOff: () => triggerHaptic('light'),
  swipe: () => triggerHaptic('selection'),
  delete: () => triggerHaptic('warning'),
  undo: () => triggerHaptic('medium'),
  refresh: () => triggerHaptic('selection'),
  complete: () => triggerHaptic('success'),
};

/**
 * Check if haptic feedback is supported
 * @returns {boolean}
 */
export const isHapticSupported = () => {
  if (typeof window === 'undefined') return false;
  return 'vibrate' in navigator || !!window.webkit?.messageHandlers?.haptic;
};

export default haptics;
