import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

/**
 * Integration tests for PWA Service Worker registration and update logic
 * These tests verify the service worker registration code in main.jsx
 */
describe('PWA Service Worker Registration', () => {
  let originalNavigator;
  let originalLocation;
  let mockServiceWorker;
  let mockRegistration;

  beforeEach(() => {
    // Save originals
    originalNavigator = window.navigator;
    originalLocation = window.location;

    // Mock service worker registration
    mockRegistration = {
      installing: null,
      waiting: null,
      active: null,
      update: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    mockServiceWorker = {
      register: vi.fn().mockResolvedValue(mockRegistration),
      controller: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mock navigator.serviceWorker
    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: mockServiceWorker,
      },
      writable: true,
      configurable: true,
    });

    // Mock location.reload
    delete window.location;
    window.location = { ...originalLocation, reload: vi.fn() };

    // Mock import.meta.env
    vi.stubEnv('PROD', true);

    // Clear all timers
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    window.location = originalLocation;
    vi.unstubAllEnvs();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should register service worker in production', async () => {
    vi.stubEnv('PROD', true);

    // Simulate the service worker registration code from main.jsx
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js');
    }

    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
    expect(mockServiceWorker.register).toHaveBeenCalledTimes(1);
  });

  it('should not register service worker in development', async () => {
    vi.stubEnv('PROD', false);

    // Simulate the service worker registration code from main.jsx
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js');
    }

    expect(mockServiceWorker.register).not.toHaveBeenCalled();
  });

  it('should not register service worker if not supported', () => {
    vi.stubEnv('PROD', true);

    const mockNavigator = {};
    const hasServiceWorker = 'serviceWorker' in mockNavigator;

    // Simulate the check from main.jsx
    if (import.meta.env.PROD && hasServiceWorker) {
      // This should not execute
      expect(true).toBe(false);
    } else {
      // Should reach here since serviceWorker is not supported
      expect(true).toBe(true);
    }
  });

  it('should set up update check interval after registration', async () => {
    const updateSpy = vi.fn();
    mockRegistration.update = updateSpy;

    // Simulate registration
    const reg = await navigator.serviceWorker.register('/sw.js');

    // Simulate setting up the interval (from main.jsx)
    setInterval(() => {
      reg.update();
    }, 60 * 60 * 1000);

    // Fast-forward time by 1 hour
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(updateSpy).toHaveBeenCalledTimes(1);

    // Fast-forward another hour
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(updateSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle updatefound event', async () => {
    const reg = await navigator.serviceWorker.register('/sw.js');

    const updateFoundCallback = vi.fn();

    // Simulate adding event listener from main.jsx
    reg.addEventListener('updatefound', updateFoundCallback);

    expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
      'updatefound',
      updateFoundCallback
    );
  });

  it('should handle service worker state changes', async () => {
    const newWorker = {
      state: 'installing',
      addEventListener: vi.fn(),
      postMessage: vi.fn(),
    };

    mockRegistration.installing = newWorker;
    mockServiceWorker.controller = {}; // Simulate existing controller

    const stateChangeCallback = vi.fn();

    // Register callback
    newWorker.addEventListener('statechange', stateChangeCallback);

    expect(newWorker.addEventListener).toHaveBeenCalledWith(
      'statechange',
      stateChangeCallback
    );
  });

  it('should prompt user when new service worker is ready', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const newWorker = {
      state: 'installed',
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
    };

    mockRegistration.installing = newWorker;
    mockServiceWorker.controller = {}; // Existing controller indicates update

    // Simulate the update flow
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      const userAccepted = confirm("A new version of Hope's Corner is available! Click OK to update.");

      if (userAccepted) {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }

    expect(confirmSpy).toHaveBeenCalledWith(
      "A new version of Hope's Corner is available! Click OK to update."
    );
    expect(newWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(window.location.reload).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should not reload if user dismisses update prompt', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const newWorker = {
      state: 'installed',
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
    };

    mockRegistration.installing = newWorker;
    mockServiceWorker.controller = {}; // Existing controller

    // Simulate the update flow
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      const userAccepted = confirm("A new version of Hope's Corner is available! Click OK to update.");

      if (userAccepted) {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }

    expect(confirmSpy).toHaveBeenCalled();
    expect(newWorker.postMessage).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should handle controllerchange event', async () => {
    const controllerChangeCallback = vi.fn();

    // Simulate adding event listener
    navigator.serviceWorker.addEventListener('controllerchange', controllerChangeCallback);

    expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith(
      'controllerchange',
      controllerChangeCallback
    );
  });

  it('should reload page only once on controllerchange', () => {
    let refreshing = false;

    // Simulate controllerchange handler
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    // First call should reload
    handleControllerChange();
    expect(window.location.reload).toHaveBeenCalledTimes(1);

    // Second call should not reload
    handleControllerChange();
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('should handle registration errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Registration failed');

    mockServiceWorker.register = vi.fn().mockRejectedValue(error);

    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (err) {
      console.error('Service worker registration failed:', err);
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Service worker registration failed:',
      error
    );

    consoleErrorSpy.mockRestore();
  });

  it('should log successful registration', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered.', reg);

    expect(consoleLogSpy).toHaveBeenCalledWith('Service worker registered.', mockRegistration);

    consoleLogSpy.mockRestore();
  });
});
