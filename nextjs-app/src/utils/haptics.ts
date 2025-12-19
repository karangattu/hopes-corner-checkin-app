/**
 * Haptic Feedback Utility
 * Provides tactile feedback on mobile devices for better UX
 */

type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'impact';

interface HapticPatterns {
  [key: string]: number[];
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        haptic?: {
          postMessage: (message: { type: string }) => void;
        };
      };
    };
  }
}

/**
 * Trigger haptic feedback if supported by the device
 */
export const triggerHaptic = (type: HapticType = 'light'): void => {
  if (typeof window === 'undefined') return;

  // Vibration API (widely supported)
  if ('vibrate' in navigator) {
    const patterns: HapticPatterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      warning: [20, 100, 20],
      error: [50, 100, 50, 100, 50],
      selection: [5],
      impact: [15],
    };

    const pattern = patterns[type] || patterns.light;
    navigator.vibrate(pattern);
  }

  // iOS Haptic Feedback API (Safari on iOS 13+)
  if (window.webkit?.messageHandlers?.haptic) {
    try {
      window.webkit.messageHandlers.haptic.postMessage({ type });
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
 */
export const isHapticSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'vibrate' in navigator || !!window.webkit?.messageHandlers?.haptic;
};

export default haptics;
