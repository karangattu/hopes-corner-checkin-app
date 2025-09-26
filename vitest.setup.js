import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

// Cleanup DOM after each test
afterEach(() => {
  document.body.innerHTML = '';
});

// Mock URL.createObjectURL and URL.revokeObjectURL for tests that need them
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'URL', {
    value: {
      createObjectURL: vi.fn(() => 'mock-url'),
      revokeObjectURL: vi.fn(),
    },
    writable: true,
  });
}

// Make vi available globally
globalThis.vi = vi;
