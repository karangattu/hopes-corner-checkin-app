/**
 * Fuzzy name matching utility for guest search suggestions
 */

/**
 * Calculate the Levenshtein distance between two strings
 * This represents the minimum number of single-character edits needed to transform one string to another
 * 
 * Uses early termination when distance exceeds maxDistance threshold
 * Uses two-row matrix instead of full matrix to reduce memory allocation
 * 
 * @param {string} a - First string
 * @param {string} b - Second string
 * @param {number} maxDistance - Optional max distance threshold for early termination
 * @returns {number} - The edit distance (or maxDistance+1 if exceeded)
 */
export const levenshteinDistance = (a, b, maxDistance = Infinity) => {
  if (!a || !b) return Math.max((a || '').length, (b || '').length);

  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 0;
  if (aLower.length === 0) return Math.min(bLower.length, maxDistance + 1);
  if (bLower.length === 0) return Math.min(aLower.length, maxDistance + 1);

  // Early exit if length difference exceeds maxDistance
  const lenDiff = Math.abs(aLower.length - bLower.length);
  if (lenDiff > maxDistance) return maxDistance + 1;

  // Ensure a is the shorter string for memory efficiency
  let shorter = aLower;
  let longer = bLower;
  if (aLower.length > bLower.length) {
    shorter = bLower;
    longer = aLower;
  }

  // Use two-row matrix instead of full matrix (O(n) space instead of O(n*m))
  let prevRow = new Array(shorter.length + 1);
  let currRow = new Array(shorter.length + 1);

  // Initialize first row
  for (let j = 0; j <= shorter.length; j++) {
    prevRow[j] = j;
  }

  // Fill in the matrix row by row
  for (let i = 1; i <= longer.length; i++) {
    currRow[0] = i;
    let rowMin = i; // Track minimum in current row for early termination

    for (let j = 1; j <= shorter.length; j++) {
      if (longer.charAt(i - 1) === shorter.charAt(j - 1)) {
        currRow[j] = prevRow[j - 1];
      } else {
        currRow[j] = 1 + Math.min(
          prevRow[j - 1], // substitution
          currRow[j - 1], // insertion
          prevRow[j]      // deletion
        );
      }
      rowMin = Math.min(rowMin, currRow[j]);
    }

    // Early termination: if minimum in row exceeds maxDistance, no point continuing
    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }

    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[shorter.length];
};

/**
 * Calculate similarity score between two strings (0 to 1, where 1 is identical)
 * 
 * Uses early termination when similarity would be below threshold
 * 
 * @param {string} a - First string
 * @param {string} b - Second string
 * @param {number} minSimilarity - Optional minimum similarity threshold (default 0)
 * @returns {number} - Similarity score from 0 to 1
 */
export const similarityScore = (a, b, minSimilarity = 0) => {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  // Calculate max allowable distance for the similarity threshold
  const maxDistance = minSimilarity > 0
    ? Math.floor(maxLen * (1 - minSimilarity))
    : Infinity;

  const distance = levenshteinDistance(a, b, maxDistance);

  // If distance exceeded threshold, return 0
  if (distance > maxDistance) return 0;

  return (maxLen - distance) / maxLen;
};

/**
 * Check if first characters of names match (for common typos)
 * @param {string} search - Search term
 * @param {string} name - Name to compare
 * @returns {boolean}
 */
export const hasMatchingFirstChars = (search, name) => {
  if (!search || !name) return false;
  const searchLower = search.toLowerCase().trim();
  const nameLower = name.toLowerCase().trim();

  // Check if first 2 characters match (catches typos like "Jhon" for "John")
  if (searchLower.length >= 2 && nameLower.length >= 2) {
    if (searchLower.charAt(0) === nameLower.charAt(0)) {
      return true;
    }
    // Also check for common letter swaps at start
    if (searchLower.slice(0, 2).split('').sort().join('') ===
      nameLower.slice(0, 2).split('').sort().join('')) {
      return true;
    }
  }
  return false;
};

/**
 * Check for phonetic similarity (handles common sound-alike names)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - Whether names sound similar
 */
export const soundsLike = (a, b) => {
  if (!a || !b) return false;

  // Simple phonetic normalization
  const normalize = (str) => {
    return str.toLowerCase()
      .trim()
      .replace(/ph/g, 'f')
      .replace(/ck/g, 'k')
      .replace(/gh/g, 'f')
      .replace(/v/g, 'f')
      .replace(/z/g, 's')
      .replace(/[aeiouy]/g, 'a')  // Normalize all vowels including semi-vowels
      .replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1'); // Remove double consonants
  };

  const aNorm = normalize(a);
  const bNorm = normalize(b);

  if (aNorm === bNorm) return true;

  // For very short names, phonetic match must be exact
  if (Math.min(aNorm.length, bNorm.length) <= 2) return false;

  return similarityScore(aNorm, bNorm) > 0.75;
};

/**
 * Check if a search token is a good substring match for a name
 * Useful for catching partial matches like "francas" -> "francis"
 * @param {string} token - Search token
 * @param {string} name - Name to check
 * @returns {number} - Similarity score from 0 to 1
 */
const getSubstringMatchScore = (token, name) => {
  if (!token || !name) return 0;
  if (token.length > name.length) return 0;

  // Prefix match is strongest (e.g., "fran" -> "francis")
  if (name.startsWith(token)) {
    // Full marks for short prefixes that are most of the name
    const prefixRatio = token.length / name.length;
    return 0.75 + (prefixRatio * 0.25);
  }

  // Check for substring match anywhere in the name
  if (name.includes(token)) {
    return 0.6;
  }

  // Check if token is very similar to a substring
  // (e.g., "francas" is similar to "francis")
  const tokenLen = token.length;
  for (let i = 0; i <= name.length - tokenLen; i++) {
    const substring = name.substring(i, i + tokenLen);
    const similarity = similarityScore(token, substring);
    if (similarity > 0.8) {
      return 0.7;
    }
  }

  return 0;
};

/**
 * Find fuzzy matches for a search term in a list of guests
 * @param {string} searchTerm - The term being searched for
 * @param {Array} guests - Array of guest objects
 * @param {number} maxSuggestions - Maximum number of suggestions to return
 * @returns {Array} - Array of suggested guests sorted by relevance
 */
export const findFuzzySuggestions = (searchTerm, guests, maxSuggestions = 5) => {
  if (!searchTerm || !guests || guests.length === 0) return [];

  const searchLower = searchTerm.toLowerCase().trim();
  const searchTokens = searchLower.split(/\s+/).filter(Boolean);

  if (searchTokens.length === 0) return [];

  const scored = guests.map(guest => {
    const firstName = (guest.firstName || '').toLowerCase().trim();
    const lastName = (guest.lastName || '').toLowerCase().trim();
    const preferredName = (guest.preferredName || '').toLowerCase().trim();
    const fullName = `${firstName} ${lastName}`.trim();

    let bestScore = 0;
    let matchType = "none";

    // Score based on different matching strategies
    if (searchTokens.length === 1) {
      const token = searchTokens[0];

      // 1. Base Similarity Scores (Levenshtein)
      const firstNameScore = similarityScore(token, firstName);
      const lastNameScore = similarityScore(token, lastName);
      const preferredScore = preferredName ? similarityScore(token, preferredName) : 0;

      bestScore = Math.max(firstNameScore, lastNameScore, preferredScore);

      // 2. Substring matches (catches partial name matches)
      const firstNameSubstring = getSubstringMatchScore(token, firstName);
      const lastNameSubstring = getSubstringMatchScore(token, lastName);
      const preferredSubstring = preferredName ? getSubstringMatchScore(token, preferredName) : 0;

      bestScore = Math.max(bestScore, firstNameSubstring, lastNameSubstring, preferredSubstring);

      // 3. Bonuses (only for non-exact matches)
      if (bestScore > 0 && bestScore < 1) {
        // Bonus for matching first characters
        if (hasMatchingFirstChars(token, firstName) ||
          hasMatchingFirstChars(token, lastName) ||
          (preferredName && hasMatchingFirstChars(token, preferredName))) {
          bestScore = Math.min(0.99, bestScore + 0.1);
        }

        // Check phonetic similarity
        if (soundsLike(token, firstName) ||
          soundsLike(token, lastName) ||
          (preferredName && soundsLike(token, preferredName))) {
          bestScore = Math.max(bestScore, 0.85); // High floor for phonetic matches
          bestScore = Math.min(0.99, bestScore + 0.1);
        }
      }
    } else if (searchTokens.length >= 2) {
      const [firstToken, secondToken] = searchTokens;

      // Try substring matching first for multi-token searches
      const firstSubstring = getSubstringMatchScore(firstToken, firstName);
      const secondSubstring = getSubstringMatchScore(secondToken, lastName);
      const substringCombined = (firstSubstring + secondSubstring) / 2;

      bestScore = substringCombined;

      // Score first + last name combination
      const firstMatch = similarityScore(firstToken, firstName);
      const lastMatch = similarityScore(secondToken, lastName);
      const combinedScore = (firstMatch + lastMatch) / 2;

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
      }

      // Also try reversed order (last name first)
      const reversedFirst = similarityScore(secondToken, firstName);
      const reversedLast = similarityScore(firstToken, lastName);
      const reversedScore = (reversedFirst + reversedLast) / 2;

      if (reversedScore > bestScore) {
        bestScore = reversedScore;
      }

      // Check full name as single string
      const fullNameScore = similarityScore(searchLower, fullName);
      if (fullNameScore > bestScore) {
        bestScore = fullNameScore;
      }

      // Phonetic bonus for full name
      if (bestScore > 0 && bestScore < 1) {
        const phoneticFirst = soundsLike(firstToken, firstName);
        const phoneticLast = soundsLike(secondToken, lastName);
        if (phoneticFirst && phoneticLast) {
          bestScore = Math.min(0.99, bestScore + 0.2);
        }
      }
    }

    return {
      guest,
      score: bestScore,
      matchType,
    };
  });

  // Filter to include good matches while excluding exact matches
  // Lowered threshold to 0.40 to catch more helpful suggestions
  const suggestions = scored
    .filter(item => {
      // Exclude literal exact matches (score 1.0 AND exact string match)
      const isLiteralMatch = item.score >= 0.99 && (
        searchTerm.toLowerCase().trim() === (item.guest.firstName || '').toLowerCase().trim() ||
        searchTerm.toLowerCase().trim() === (item.guest.lastName || '').toLowerCase().trim() ||
        searchTerm.toLowerCase().trim() === (item.guest.preferredName || '').toLowerCase().trim() ||
        searchTerm.toLowerCase().trim() === `${(item.guest.firstName || '').toLowerCase().trim()} ${(item.guest.lastName || '').toLowerCase().trim()}`
      );

      return item.score >= 0.40 && !isLiteralMatch;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .map(item => ({
      ...item.guest,
      _suggestionScore: item.score,
      _matchType: item.matchType,
    }));

  return suggestions;
};

/**
 * Format a suggestion display name with the matched part highlighted
 * @param {Object} guest - Guest object with suggestion metadata
 * @returns {Object} - Object with displayName and highlight info
 */
export const formatSuggestionDisplay = (guest) => {
  const preferredName = guest.preferredName?.trim();
  const fullName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim();

  const displayName = preferredName
    ? `${preferredName} (${fullName})`
    : fullName;

  return {
    displayName,
    fullName,
    preferredName,
    score: guest._suggestionScore,
    matchType: guest._matchType,
  };
};

export default {
  levenshteinDistance,
  similarityScore,
  findFuzzySuggestions,
  formatSuggestionDisplay,
  hasMatchingFirstChars,
  soundsLike,
};
