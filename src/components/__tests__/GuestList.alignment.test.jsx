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

// Read the GuestListRow.jsx file content (where card rendering was extracted)
const guestListRowPath = join(__dirname, '../GuestListRow.jsx');
const guestListRowContent = readFileSync(guestListRowPath, 'utf-8');

// Combined content for tests that need to check either file
const combinedContent = guestListContent + '\n' + guestListRowContent;

describe('GuestList - Alignment Tests', () => {
  it('guest card container should use flex-row layout for name and actions on same line', () => {
    // Updated: Now using flex-row for horizontal layout to keep buttons on same row (in GuestListRow.jsx)
    const hasFlexRow = combinedContent.includes('flex-row items-center justify-between');
    expect(hasFlexRow).toBe(true);
  });

  it('guest card container should not have justify-center in main flex container', () => {
    // Find the main guest card container (line with cursor-pointer flex) (in GuestListRow.jsx)
    const guestCardContainerPattern = /cursor-pointer flex flex-row[^"]*"/g;
    const matches = combinedContent.match(guestCardContainerPattern);

    // Verify the main container doesn't have justify-center (which would center name on mobile)
    matches?.forEach(match => {
      expect(match.includes('justify-center')).toBe(false);
    });
  });

  it('guest name (h3) should not have text-center class', () => {
    // Check that h3 elements don't have text-center (in GuestListRow.jsx)
    const h3Pattern = /<h3[^>]*className[^>]*text-center/;
    expect(h3Pattern.test(combinedContent)).toBe(false);
  });

  it('guest info container should use flex-1 for proper space distribution', () => {
    // Check for flex-1 min-w-0 pattern which allows proper space distribution (in GuestListRow.jsx)
    const hasFlexMinW = combinedContent.includes('flex-1 min-w-0');
    expect(hasFlexMinW).toBe(true);
  });

  it('guest name wrapper should use flex with items-baseline', () => {
    // Check for items-baseline in name heading (in GuestListRow.jsx)
    const hasItemsBaseline = /h3.*items-baseline|items-baseline.*h3/.test(combinedContent);
    expect(hasItemsBaseline).toBe(true);
  });

  it('action buttons should stay in row without wrapping by using flex-shrink-0', () => {
    // Check for flex-shrink-0 to prevent buttons from wrapping (in GuestListRow.jsx)
    const hasShrinkNone = combinedContent.includes('flex-shrink-0');
    expect(hasShrinkNone).toBe(true);
  });

  it('main container should use items-center for vertical alignment', () => {
    // Check for items-center in the main card container (in GuestListRow.jsx)
    const hasItemsCenter = combinedContent.includes('items-center justify-between');
    expect(hasItemsCenter).toBe(true);
  });
});

describe('GuestList - Space Efficiency Tests', () => {
  it('compact mode should use reduced padding (px-3 py-2)', () => {
    // Check for compact padding classes (in GuestListRow.jsx)
    const hasCompactPadding = combinedContent.includes('px-3 py-2');
    expect(hasCompactPadding).toBe(true);
  });

  it('normal mode should use standard padding (p-4)', () => {
    // Check for normal padding (in GuestListRow.jsx)
    const hasNormalPadding = combinedContent.includes('p-4');
    expect(hasNormalPadding).toBe(true);
  });

  it('adaptive mode should use medium padding (px-4 py-3)', () => {
    // Check for adaptive padding classes (in GuestListRow.jsx)
    const hasAdaptivePadding = combinedContent.includes('px-4 py-3');
    expect(hasAdaptivePadding).toBe(true);
  });

  it('name section should not use mx-auto (which would center it)', () => {
    // Check that h3/name sections don't use mx-auto (in GuestListRow.jsx)
    const h3MxAutoPattern = /<h3[^>]*mx-auto/;
    expect(h3MxAutoPattern.test(combinedContent)).toBe(false);
  });

  it('guest name should not have excessive margins that waste space', () => {
    // Check that name headings don't have huge margins like m-10, m-20 (in GuestListRow.jsx)
    const excessiveMarginPattern = /<h3[^>]*className[^>]*m-(?:1[0-9]|2[0-9]|[3-9][0-9])/;
    expect(excessiveMarginPattern.test(combinedContent)).toBe(false);
  });

  it('should use COMPACT_THRESHOLD of 3 for aggressive space optimization', () => {
    // Verify the threshold is set to 3 (reduced from 5) - this is in GuestList.jsx
    const hasThreshold3 = guestListContent.includes('COMPACT_THRESHOLD = 3');
    expect(hasThreshold3).toBe(true);
  });

  it('should have ADAPTIVE_THRESHOLD for medium-sized cards', () => {
    // Verify adaptive threshold exists - this is in GuestList.jsx
    const hasAdaptiveThreshold = guestListContent.includes('ADAPTIVE_THRESHOLD');
    expect(hasAdaptiveThreshold).toBe(true);
  });
});

describe('GuestList - Flexbox Direction Tests', () => {
  it('main container should use flex-row for horizontal layout', () => {
    // Check for flex-row layout (in GuestListRow.jsx)
    const hasFlexRow = combinedContent.includes('flex-row');
    expect(hasFlexRow).toBe(true);
  });

  it('responsive breakpoints should include sm: prefix patterns', () => {
    // Check that sm: responsive patterns exist (in GuestListRow.jsx)
    const hasSmPattern = combinedContent.includes('sm:gap');
    expect(hasSmPattern).toBe(true);
  });

  it('button container should not wrap to prevent row overflow', () => {
    // Action buttons should not use flex-wrap in the main button container (in GuestListRow.jsx)
    const buttonNoWrapPattern = /flex items-center flex-shrink-0/;
    expect(buttonNoWrapPattern.test(combinedContent)).toBe(true);
  });
});

describe('Guest List - Visual Regression Prevention', () => {
  it('should not introduce text-center class anywhere in guest cards', () => {
    // text-center should not appear in the main guest card rendering
    // The only allowed text-center is in the fallback expanded content placeholder
    // which shows "Details view not fully migrated"
    const textCenterMatches = guestListRowContent.match(/text-center/g) || [];
    // Allow one instance for the fallback placeholder in expanded view
    expect(textCenterMatches.length).toBeLessThanOrEqual(1);

    // Verify the main card header/name/action areas don't have text-center
    const headerSection = guestListRowContent.substring(
      guestListRowContent.indexOf('Avatar Section'),
      guestListRowContent.indexOf('Actions Section')
    );
    expect(headerSection.includes('text-center')).toBe(false);
  });

  it('should maintain flex items-center for proper vertical alignment', () => {
    // Updated: Now checking for items-center in row layout (in GuestListRow.jsx)
    const criticalPattern = /flex-row items-center/;
    expect(criticalPattern.test(combinedContent)).toBe(true);
  });

  it('guest info div should use flex-1 min-w-0 for responsive sizing', () => {
    // Look for the pattern for responsive width (in GuestListRow.jsx)
    const guestInfoPattern = /flex-1 min-w-0/;
    expect(guestInfoPattern.test(combinedContent)).toBe(true);
  });
});
