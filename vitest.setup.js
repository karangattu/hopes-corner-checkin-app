import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import "fake-indexeddb/auto";

// Cleanup DOM after each test
afterEach(() => {
  document.body.innerHTML = "";
});

// Mock URL.createObjectURL and URL.revokeObjectURL for tests that need them
if (typeof window !== "undefined") {
  const OriginalURL = globalThis.URL;
  class MockURL extends OriginalURL {
    static createObjectURL = vi.fn(() => "mock-url");
    static revokeObjectURL = vi.fn();
  }
  globalThis.URL = MockURL;
}

// Mock navigator.serviceWorker for tests
if (typeof navigator !== "undefined" && !navigator.serviceWorker) {
  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      ready: Promise.resolve({
        sync: {
          register: vi.fn().mockResolvedValue(undefined),
        },
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
}

// Mock SyncManager if not available
if (typeof window !== "undefined" && !window.SyncManager) {
  window.SyncManager = class SyncManager {
    register() {
      return Promise.resolve();
    }
  };
}

// Make vi available globally
globalThis.vi = vi;
