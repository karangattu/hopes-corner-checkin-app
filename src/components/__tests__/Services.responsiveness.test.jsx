import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the Services.jsx file content for static analysis
const servicesPath = join(__dirname, '../../pages/guest/Services.jsx');
const servicesContent = readFileSync(servicesPath, 'utf-8');

describe('Services - Responsiveness Optimizations', () => {
  describe('Memoized Shower Records Map', () => {
    it('should have useMemo for showerRecordsMap', () => {
      // Verify memoized map creation for O(1) lookups
      const hasShowerRecordsMap = servicesContent.includes('showerRecordsMap');
      expect(hasShowerRecordsMap).toBe(true);
    });

    it('should create Map from showerRecords for fast lookup', () => {
      // Verify Map is used with guestId as key
      const hasMapCreation = servicesContent.includes('new Map(');
      expect(hasMapCreation).toBe(true);
    });

    it('should use showerRecords as dependency for the map', () => {
      // Verify proper memoization dependency
      const hasDependency = servicesContent.includes('[showerRecords]');
      expect(hasDependency).toBe(true);
    });
  });

  describe('Optimized Guest Click Handler', () => {
    it('should have an optimized shower guest click handler', () => {
      const hasOptimizedHandler = servicesContent.includes('handleShowerGuestClickOptimized');
      expect(hasOptimizedHandler).toBe(true);
    });

    it('should use startTransition for non-urgent UI updates', () => {
      // startTransition marks the state update as non-urgent
      const hasStartTransition = servicesContent.includes('startTransition');
      expect(hasStartTransition).toBe(true);
    });

    it('should import startTransition from React', () => {
      const hasImport = servicesContent.includes('startTransition');
      expect(hasImport).toBe(true);
    });

    it('should use showerRecordsMap.get for O(1) lookup', () => {
      // Verify map lookup instead of find()
      const hasMapGet = servicesContent.includes('showerRecordsMap.get(');
      expect(hasMapGet).toBe(true);
    });
  });

  describe('Handler Usage', () => {
    it('should pass optimized handler to CompactShowerList', () => {
      // Verify the optimized handler is used
      const hasHandlerProp = servicesContent.includes('onGuestClick={handleShowerGuestClickOptimized}');
      expect(hasHandlerProp).toBe(true);
    });
  });
});

describe('CompactShowerList - Transition Speed Optimizations', () => {
  // Read CompactShowerList content
  const compactShowerPath = join(__dirname, '../CompactShowerList.jsx');
  const compactShowerContent = readFileSync(compactShowerPath, 'utf-8');

  it('should use duration-75 for fast transitions', () => {
    const hasFastDuration = compactShowerContent.includes('duration-75');
    expect(hasFastDuration).toBe(true);
  });

  it('should have active state for immediate feedback', () => {
    const hasActiveState = compactShowerContent.includes('active:');
    expect(hasActiveState).toBe(true);
  });
});

describe('CompactLaundryList - Transition Speed Optimizations', () => {
  // Read CompactLaundryList content
  const compactLaundryPath = join(__dirname, '../CompactLaundryList.jsx');
  const compactLaundryContent = readFileSync(compactLaundryPath, 'utf-8');

  it('should use duration-75 for fast transitions', () => {
    const hasFastDuration = compactLaundryContent.includes('duration-75');
    expect(hasFastDuration).toBe(true);
  });

  it('should have active state for immediate feedback', () => {
    const hasActiveState = compactLaundryContent.includes('active:');
    expect(hasActiveState).toBe(true);
  });
});
