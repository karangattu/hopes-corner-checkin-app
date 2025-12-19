'use client';

import toast from 'react-hot-toast';

interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  force?: boolean;
}

interface PromiseMessages {
  loading?: string;
  success?: string;
  error?: string;
}

/**
 * Enhanced toast utility wrapping react-hot-toast
 * Provides semantic toast methods for common scenarios
 */
export const enhancedToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, {
      duration: options?.duration ?? 4000,
    }),

  error: (message: string, options?: ToastOptions) =>
    toast.error(message, {
      duration: options?.duration ?? 4000,
    }),

  warning: (message: string, options?: ToastOptions) =>
    toast(message, {
      duration: options?.duration ?? 4000,
      icon: '⚠️',
      style: {
        background: '#fffbeb',
        border: '1px solid #fde68a',
        color: '#92400e',
      },
    }),

  info: (message: string, options?: ToastOptions) =>
    toast(message, {
      duration: options?.duration ?? 4000,
      icon: 'ℹ️',
      style: {
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        color: '#1e40af',
      },
    }),

  loading: (message: string, options?: ToastOptions) =>
    toast.loading(message, {
      duration: options?.duration ?? Infinity,
    }),

  // Quick access methods for common scenarios
  saved: (item = 'Changes') =>
    toast.success(`${item} saved successfully`),

  deleted: (item = 'Item') =>
    toast.success(`${item} deleted successfully`),

  updated: (item = 'Item') =>
    toast.success(`${item} updated successfully`),

  networkError: () =>
    toast.error('Network error. Changes saved locally.'),

  validationError: (field = 'Field') =>
    enhancedToast.warning(`${field} is required`),

  permissionError: () =>
    toast.error('Permission denied'),

  // Promise-based toast for async operations
  promise: <T,>(promise: Promise<T>, messages: PromiseMessages): Promise<T> => {
    return toast.promise(promise, {
      loading: messages.loading || 'Processing...',
      success: messages.success || 'Operation completed',
      error: messages.error || 'Operation failed',
    });
  },

  // Dismiss a specific toast or all toasts
  dismiss: (toastId?: string) => toast.dismiss(toastId),
};

export default enhancedToast;
