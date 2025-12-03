/**
 * Fuzzy name matching utility for guest search suggestions
 */

/**
 * Calculate the Levenshtein distance between two strings
 * This represents the minimum number of single-character edits needed to transform one string to another
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - The edit distance
 */
export const levenshteinDistance = (a, b) => {
  if (!a || !b) return Math.max((a || '').length, (b || '').length);
  
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  if (aLower === bLower) return 0;
  if (aLower.length === 0) return bLower.length;
  if (bLower.length === 0) return aLower.length;

  const matrix = [];

  // Initialize first row and column
  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
};

/**
 * Calculate similarity score between two strings (0 to 1, where 1 is identical)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Similarity score from 0 to 1
 */
export const similarityScore = (a, b) => {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
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
      .replace(/ph/g, 'f')
      .replace(/ck/g, 'k')
      .replace(/[aeiou]/g, 'a')  // Normalize vowels
      .replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1'); // Remove double consonants
  };
  
  const aNorm = normalize(a);
  const bNorm = normalize(b);
  
  return aNorm === bNorm || similarityScore(aNorm, bNorm) > 0.7;
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
    let matchType = 'none';
    
    // Score based on different matching strategies
    if (searchTokens.length === 1) {
      const token = searchTokens[0];
      
      // Check first name
      const firstNameScore = similarityScore(token, firstName);
      if (firstNameScore > bestScore) {
        bestScore = firstNameScore;
        matchType = 'firstName';
      }
      
      // Check last name
      const lastNameScore = similarityScore(token, lastName);
      if (lastNameScore > bestScore) {
        bestScore = lastNameScore;
        matchType = 'lastName';
      }
      
      // Check preferred name
      if (preferredName) {
        const preferredScore = similarityScore(token, preferredName);
        if (preferredScore > bestScore) {
          bestScore = preferredScore;
          matchType = 'preferredName';
        }
      }
      
      // Bonus for matching first characters
      if (hasMatchingFirstChars(token, firstName) || 
          hasMatchingFirstChars(token, lastName) ||
          hasMatchingFirstChars(token, preferredName)) {
        bestScore = Math.min(1, bestScore + 0.1);
      }
      
      // Check phonetic similarity
      if (soundsLike(token, firstName) || soundsLike(token, lastName)) {
        bestScore = Math.min(1, bestScore + 0.15);
      }
    } else if (searchTokens.length >= 2) {
      const [firstToken, secondToken] = searchTokens;
      
      // Score first + last name combination
      const firstMatch = similarityScore(firstToken, firstName);
      const lastMatch = similarityScore(secondToken, lastName);
      const combinedScore = (firstMatch + lastMatch) / 2;
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        matchType = 'fullName';
      }
      
      // Also try reversed order (last name first)
      const reversedFirst = similarityScore(secondToken, firstName);
      const reversedLast = similarityScore(firstToken, lastName);
      const reversedScore = (reversedFirst + reversedLast) / 2;
      
      if (reversedScore > bestScore) {
        bestScore = reversedScore;
        matchType = 'fullNameReversed';
      }
      
      // Check full name as single string
      const fullNameScore = similarityScore(searchLower, fullName);
      if (fullNameScore > bestScore) {
        bestScore = fullNameScore;
        matchType = 'fullNameString';
      }
    }
    
    return {
      guest,
      score: bestScore,
      matchType,
    };
  });
  
  // Filter to only include reasonably similar matches (score > 0.5)
  // and exclude exact matches (which would already be shown in results)
  const suggestions = scored
    .filter(item => item.score > 0.5 && item.score < 1.0)
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
