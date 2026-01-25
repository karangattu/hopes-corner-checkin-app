import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import "fake-indexeddb/auto";

// Set up test environment variables for Supabase realtime tests
if (typeof import.meta !== 'undefined' && import.meta.env) {
  import.meta.env.VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
  import.meta.env.VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';
}

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
