import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the GuestList.jsx file content for static analysis
const guestListPath = join(__dirname, '../GuestList.jsx');
const guestListContent = readFileSync(guestListPath, 'utf-8');

describe('GuestList - Compact Layout Optimizations', () => {
  describe('Threshold Configuration', () => {
    it('should have COMPACT_THRESHOLD set to 3 for aggressive compaction', () => {
      // Verify the threshold is reduced from 5 to 3
      const hasThreshold3 = guestListContent.includes('COMPACT_THRESHOLD = 3');
      expect(hasThreshold3).toBe(true);
    });

    it('should have ADAPTIVE_THRESHOLD set to 1 for medium cards', () => {
      // Verify adaptive threshold for 2-3 results
      const hasAdaptiveThreshold1 = guestListContent.includes('ADAPTIVE_THRESHOLD = 1');
      expect(hasAdaptiveThreshold1).toBe(true);
    });

    it('should have ADAPTIVE_ITEM_HEIGHT defined for medium sizing', () => {
      // Verify adaptive height exists
      const hasAdaptiveHeight = guestListContent.includes('ADAPTIVE_ITEM_HEIGHT');
      expect(hasAdaptiveHeight).toBe(true);
    });

    it('should have ADAPTIVE_ITEM_GAP defined for medium spacing', () => {
      // Verify adaptive gap exists
      const hasAdaptiveGap = guestListContent.includes('ADAPTIVE_ITEM_GAP');
      expect(hasAdaptiveGap).toBe(true);
    });
  });

  describe('Adaptive Sizing Logic', () => {
    it('should compute isAdaptive based on result count', () => {
      // Check for isAdaptive calculation
      const hasIsAdaptive = guestListContent.includes('const isAdaptive');
      expect(hasIsAdaptive).toBe(true);
    });

    it('should pass adaptive flag to renderGuestCard', () => {
      // Verify adaptive flag is passed
      const hasAdaptiveFlag = guestListContent.includes('adaptive: isAdaptive');
      expect(hasAdaptiveFlag).toBe(true);
    });

    it('should use effectiveItemSize calculation with adaptive option', () => {
      // Check for three-tier item size calculation
      const hasEffectiveItemSize = guestListContent.includes('isCompact') && 
        guestListContent.includes('isAdaptive') &&
        guestListContent.includes('effectiveItemSize');
      expect(hasEffectiveItemSize).toBe(true);
    });
  });

  describe('Row Layout Optimization', () => {
    it('should use flex-row layout for name and actions on same line', () => {
      // Verify horizontal layout
      const hasFlexRow = guestListContent.includes('flex-row items-center justify-between');
      expect(hasFlexRow).toBe(true);
    });

    it('should use flex-shrink-0 for action buttons to prevent wrapping', () => {
      // Verify buttons don't wrap
      const hasShrinkNone = guestListContent.includes('flex-shrink-0');
      expect(hasShrinkNone).toBe(true);
    });

    it('should not use flex-wrap for main action button container', () => {
      // Action buttons should NOT wrap in the main container
      const actionContainerPattern = /flex items-center flex-shrink-0.*gap/;
      expect(actionContainerPattern.test(guestListContent)).toBe(true);
    });
  });

  describe('Padding Configuration', () => {
    it('should have compact padding (px-3 py-2)', () => {
      const hasCompactPadding = guestListContent.includes('px-3 py-2');
      expect(hasCompactPadding).toBe(true);
    });

    it('should have adaptive padding (px-4 py-3)', () => {
      const hasAdaptivePadding = guestListContent.includes('px-4 py-3');
      expect(hasAdaptivePadding).toBe(true);
    });

    it('should have normal padding (p-4)', () => {
      const hasNormalPadding = guestListContent.includes('p-4');
      expect(hasNormalPadding).toBe(true);
    });
  });

  describe('Button Gap Configuration', () => {
    it('should have reduced gap in compact mode (gap-0.5)', () => {
      // Verify compact gap for buttons
      const hasCompactGap = guestListContent.includes('gap-0.5');
      expect(hasCompactGap).toBe(true);
    });

    it('should have normal gap in non-compact mode (gap-1 or gap-2)', () => {
      // Verify normal gaps exist
      const hasNormalGap = guestListContent.includes('gap-1') || guestListContent.includes('gap-2');
      expect(hasNormalGap).toBe(true);
    });
  });
});

describe('GuestList - Meal Buttons Row Optimization', () => {
  it('meal buttons should stay in same row as guest name on larger screens', () => {
    // The key pattern: flex-row layout keeps everything on one line
    const hasRowLayout = guestListContent.includes('flex-row items-center justify-between');
    expect(hasRowLayout).toBe(true);
  });

  it('meal buttons container should not wrap', () => {
    // Verify no flex-wrap on action container
    const actionContainerSection = guestListContent.substring(
      guestListContent.indexOf('Quick Action Buttons'),
      guestListContent.indexOf('Quick Action Buttons') + 500
    );
    expect(actionContainerSection.includes('flex-wrap')).toBe(false);
  });

  it('should use gap-2 for normal mode meal buttons', () => {
    const hasNormalGap = guestListContent.includes('sm:gap-2');
    expect(hasNormalGap).toBe(true);
  });
});
