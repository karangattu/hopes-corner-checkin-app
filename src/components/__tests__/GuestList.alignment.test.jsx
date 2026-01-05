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

describe('GuestList - Alignment Tests', () => {
  it('guest card container should have items-start class for left alignment on mobile', () => {
    // Check that the flex container has items-start for mobile
    const hasItemsStart = guestListContent.includes('flex flex-col items-start');
    expect(hasItemsStart).toBe(true);
  });

  it('guest card container should not have justify-center in main flex container', () => {
    // Find the main guest card container (line with cursor-pointer flex flex-col)
    const guestCardContainerPattern = /cursor-pointer flex flex-col[^"]*"/g;
    const matches = guestListContent.match(guestCardContainerPattern);
    
    // Verify the main container doesn't have justify-center (which would center name on mobile)
    matches?.forEach(match => {
      expect(match.includes('justify-center')).toBe(false);
    });
  });

  it('guest name (h3) should not have text-center class', () => {
    // Check that h3 elements don't have text-center
    const h3Pattern = /<h3[^>]*className[^>]*text-center/;
    expect(h3Pattern.test(guestListContent)).toBe(false);
  });

  it('guest info container should take full width on mobile (w-full sm:w-auto)', () => {
    // Check for responsive width classes
    const hasResponsiveWidth = guestListContent.includes('w-full sm:w-auto');
    expect(hasResponsiveWidth).toBe(true);
  });

  it('guest name wrapper should use flex with items-baseline', () => {
    // Check for items-baseline in name heading
    const hasItemsBaseline = /h3.*items-baseline|items-baseline.*h3/.test(guestListContent);
    expect(hasItemsBaseline).toBe(true);
  });

  it('service buttons container should use justify-start for mobile alignment', () => {
    // Check for justify-start (mobile) and sm:justify-end (desktop)
    const hasJustifyStart = guestListContent.includes('justify-start');
    expect(hasJustifyStart).toBe(true);
  });

  it('flex-col container should have items-start to prevent default centering', () => {
    // The main guest card container should have both flex-col and items-start
    const pattern = /flex flex-col items-start/;
    expect(pattern.test(guestListContent)).toBe(true);
  });

  it('guest card should have sm:items-center only for larger screens, not mobile', () => {
    // Check that items-center is only applied with sm: prefix
    const hasSmItems = guestListContent.includes('sm:items-center');
    expect(hasSmItems).toBe(true);

    // Ensure items-center without prefix isn't in the main card container
    const mainCardPattern = /flex flex-col items-start.*sm:flex-row.*sm:items-center/;
    expect(mainCardPattern.test(guestListContent)).toBe(true);
  });
});

describe('GuestList - Space Efficiency Tests', () => {
  it('guest info container should use responsive width for space efficiency', () => {
    // w-full on mobile, w-auto on larger screens
    const hasResponsiveWidth = guestListContent.includes('w-full sm:w-auto');
    expect(hasResponsiveWidth).toBe(true);
  });

  it('compact mode should use reduced padding (px-3 py-2)', () => {
    // Check for compact padding classes
    const hasCompactPadding = guestListContent.includes('px-3 py-2');
    expect(hasCompactPadding).toBe(true);
  });

  it('normal mode should use standard padding (p-4)', () => {
    // Check for normal padding
    const hasNormalPadding = guestListContent.includes('p-4');
    expect(hasNormalPadding).toBe(true);
  });

  it('name section should not use mx-auto (which would center it)', () => {
    // Check that h3/name sections don't use mx-auto
    const h3MxAutoPattern = /<h3[^>]*mx-auto/;
    expect(h3MxAutoPattern.test(guestListContent)).toBe(false);
  });

  it('guest name should not have excessive margins that waste space', () => {
    // Check that name headings don't have huge margins like m-10, m-20
    const excessiveMarginPattern = /<h3[^>]*className[^>]*m-(?:1[0-9]|2[0-9]|[3-9][0-9])/;
    expect(excessiveMarginPattern.test(guestListContent)).toBe(false);
  });
});

describe('GuestList - Flexbox Direction Tests', () => {
  it('main container should use flex-col on mobile for vertical stacking', () => {
    // Ensure flex-col is present
    const hasFlexCol = guestListContent.includes('flex-col');
    expect(hasFlexCol).toBe(true);
  });

  it('main container should switch to flex-row on sm breakpoint', () => {
    // Ensure sm:flex-row is present
    const hasSmFlexRow = guestListContent.includes('sm:flex-row');
    expect(hasSmFlexRow).toBe(true);
  });

  it('button container should be full width on mobile for proper spacing', () => {
    // Buttons should use w-full sm:w-auto
    const buttonContainerPattern = /justify-start sm:justify-end.*w-full sm:w-auto|w-full sm:w-auto.*justify-start sm:justify-end/;
    expect(buttonContainerPattern.test(guestListContent)).toBe(true);
  });
});

describe('Guest List - Visual Regression Prevention', () => {
  it('should not introduce text-center class anywhere in guest cards', () => {
    // text-center should not appear in the main guest card rendering section
    const guestCardSection = guestListContent.substring(
      guestListContent.indexOf('const renderGuest'),
      guestListContent.indexOf('return (', guestListContent.indexOf('const renderGuest')) + 1000
    );
    
    expect(guestCardSection.includes('text-center')).toBe(false);
  });

  it('should maintain flex items-start for consistent left alignment', () => {
    // The critical fix: flex-col with items-start
    const criticalPattern = /flex flex-col items-start sm:flex-row/;
    expect(criticalPattern.test(guestListContent)).toBe(true);
  });

  it('guest info div should maintain responsive width classes', () => {
    // Look for the pattern near the User icon and name
    const guestInfoPattern = /flex items-center.*w-full sm:w-auto|w-full sm:w-auto.*flex items-center/s;
    expect(guestInfoPattern.test(guestListContent)).toBe(true);
  });
});

