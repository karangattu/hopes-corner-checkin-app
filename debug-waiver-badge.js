// Debug script for WaiverBadge troubleshooting
// Paste this into your browser console while on the Services page

console.log('=== WAIVER BADGE DIAGNOSTICS ===');

// 1. Check if WaiverBadge components are mounted
const waiverBadges = document.querySelectorAll('[class*="amber"]');
console.log('Elements with amber classes:', waiverBadges.length);

// 2. Check if badge divs exist
const badgeDivs = Array.from(document.querySelectorAll('div')).filter(div => 
  div.textContent.includes('Waiver') || div.textContent.includes('⚠️')
);
console.log('Elements mentioning Waiver:', badgeDivs.length, badgeDivs);

// 3. Check console for errors
console.log('Check above for any red errors mentioning:');
console.log('- guest_needs_waiver_reminder');
console.log('- service_waivers');
console.log('- WaiverBadge');

// 4. Test if AppContext has the waiver functions
console.log('\n=== Checking if waiver functions exist ===');
console.log('Open React DevTools and look for AppContext provider');
console.log('Check if these exist in the context value:');
console.log('- guestNeedsWaiverReminder');
console.log('- dismissWaiver');

// 5. Check network requests
console.log('\n=== Next: Check Network Tab ===');
console.log('1. Open Network tab');
console.log('2. Filter by "Fetch/XHR"');
console.log('3. Refresh the Services page');
console.log('4. Look for requests containing "guest_needs_waiver_reminder"');
console.log('5. If you see 404 or errors, the DB functions are not set up');

console.log('\n=== Manual Test ===');
console.log('Try calling the function manually in console:');
console.log('(requires React DevTools to access context)');
