import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePWAInstall } from '../usePWAInstall';

describe('usePWAInstall', () => {
  let mockEvent;
  let originalMatchMedia;
  let originalNavigator;

  beforeEach(() => {
    // Mock matchMedia
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Mock navigator properties
    originalNavigator = window.navigator;
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, standalone: false },
      writable: true,
      configurable: true,
    });

    // Create mock beforeinstallprompt event
    mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.promptInstall).toBeInstanceOf(Function);
  });

  it('should detect if app is already installed (standalone mode)', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
    }));

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallable).toBe(false);
  });

  it('should detect if app is already installed (iOS standalone)', () => {
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallable).toBe(false);
  });

  it('should handle beforeinstallprompt event', async () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstallable).toBe(false);

    // Trigger beforeinstallprompt event
    act(() => {
      window.dispatchEvent(
        new CustomEvent('beforeinstallprompt', { detail: mockEvent })
      );
    });

    // The event is captured through addEventListener, so we need to manually trigger it
    act(() => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, mockEvent);
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(result.current.isInstallable).toBe(true);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should prompt install and handle accepted outcome', async () => {
    const { result } = renderHook(() => usePWAInstall());

    // Simulate beforeinstallprompt event
    act(() => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, mockEvent);
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(result.current.isInstallable).toBe(true);
    });

    // Call promptInstall
    let installResult;
    await act(async () => {
      installResult = await result.current.promptInstall();
    });

    expect(mockEvent.prompt).toHaveBeenCalled();
    expect(installResult).toBe(true);
    expect(result.current.isInstallable).toBe(false);
  });

  it('should prompt install and handle dismissed outcome', async () => {
    mockEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });

    const { result } = renderHook(() => usePWAInstall());

    // Simulate beforeinstallprompt event
    act(() => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, mockEvent);
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(result.current.isInstallable).toBe(true);
    });

    // Call promptInstall
    let installResult;
    await act(async () => {
      installResult = await result.current.promptInstall();
    });

    expect(mockEvent.prompt).toHaveBeenCalled();
    expect(installResult).toBe(false);
    expect(result.current.isInstallable).toBe(false);
  });

  it('should return false when promptInstall is called without deferred prompt', async () => {
    const { result } = renderHook(() => usePWAInstall());

    // Don't trigger beforeinstallprompt event
    let installResult;
    await act(async () => {
      installResult = await result.current.promptInstall();
    });

    expect(installResult).toBe(false);
  });

  it('should handle appinstalled event', async () => {
    const { result } = renderHook(() => usePWAInstall());

    // Simulate beforeinstallprompt first
    act(() => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, mockEvent);
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(result.current.isInstallable).toBe(true);
    });

    // Simulate appinstalled event
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    await waitFor(() => {
      expect(result.current.isInstalled).toBe(true);
      expect(result.current.isInstallable).toBe(false);
    });
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => usePWAInstall());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'appinstalled',
      expect.any(Function)
    );
  });
});
