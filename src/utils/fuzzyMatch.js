/**
 * Fuzzy name matching utility for guest search suggestions
 */

/**
 * Common nickname mappings (bidirectional)
 * Maps formal names to their common nicknames and vice versa
 */
export const COMMON_NICKNAMES = {
  // Male names
  william: ['bill', 'billy', 'will', 'willy', 'liam'],
  robert: ['bob', 'bobby', 'rob', 'robbie', 'bert'],
  richard: ['rick', 'ricky', 'dick', 'dickie', 'rich', 'richie'],
  james: ['jim', 'jimmy', 'jamie'],
  john: ['jack', 'johnny', 'jon'],
  michael: ['mike', 'mikey', 'mick', 'mickey'],
  joseph: ['joe', 'joey'],
  thomas: ['tom', 'tommy'],
  charles: ['charlie', 'chuck', 'chas'],
  christopher: ['chris', 'topher', 'kit'],
  daniel: ['dan', 'danny'],
  matthew: ['matt', 'matty'],
  anthony: ['tony'],
  edward: ['ed', 'eddie', 'ted', 'teddy', 'ned'],
  steven: ['steve', 'stevie'],
  stephen: ['steve', 'stevie'],
  nicholas: ['nick', 'nicky'],
  jonathan: ['jon', 'jonny', 'john'],
  benjamin: ['ben', 'benny', 'benji'],
  samuel: ['sam', 'sammy'],
  alexander: ['alex', 'al', 'xander'],
  andrew: ['andy', 'drew'],
  timothy: ['tim', 'timmy'],
  patrick: ['pat', 'paddy'],
  peter: ['pete'],
  raymond: ['ray'],
  gerald: ['gerry', 'jerry'],
  lawrence: ['larry'],
  gregory: ['greg'],
  vincent: ['vince', 'vinny'],
  francisco: ['frank', 'frankie', 'paco', 'pancho'],
  // Female names
  elizabeth: ['liz', 'lizzy', 'beth', 'betsy', 'betty', 'eliza', 'ellie'],
  jennifer: ['jen', 'jenny'],
  jessica: ['jess', 'jessie'],
  margaret: ['maggie', 'meg', 'peggy', 'marge', 'margie'],
  patricia: ['pat', 'patty', 'trish', 'tricia'],
  katherine: ['kate', 'kathy', 'kat', 'katie', 'kit', 'kitty'],
  catherine: ['kate', 'cathy', 'cat', 'katie'],
  rebecca: ['becca', 'becky'],
  christine: ['chris', 'christy', 'tina'],
  victoria: ['vicky', 'vicki', 'tori'],
  alexandra: ['alex', 'lexi', 'sandra'],
  samantha: ['sam', 'sammy'],
  deborah: ['deb', 'debbie'],
  dorothy: ['dot', 'dotty', 'dottie'],
  carolyn: ['carol', 'carrie', 'lynn'],
  suzanne: ['sue', 'suzy', 'suzie'],
  theodore: ['ted', 'teddy', 'theo'],
  // Spanish names
  jose: ['pepe', 'chepe'],
  jesus: ['chucho', 'chuy'],
  guadalupe: ['lupe', 'lupita'],
  maria: ['mari', 'mary'],
  manuel: ['manny'],
  miguel: ['mike'],
  roberto: ['beto'],
  alberto: ['beto'],
  enrique: ['henry', 'kike'],
  eduardo: ['eddie', 'lalo'],
  guillermo: ['memo', 'william', 'bill'],
  fernando: ['nando'],

  alejandro: ['alex'],
  antonio: ['tony', 'tono'],
  rafael: ['rafa'],
  ricardo: ['ricky'],
  carlos: ['charlie'],
};

// Build reverse lookup for nicknames
const nicknameLookup = new Map();
for (const [formal, nicks] of Object.entries(COMMON_NICKNAMES)) {
  nicknameLookup.set(formal, new Set([formal, ...nicks]));
  for (const nick of nicks) {
    if (!nicknameLookup.has(nick)) {
      nicknameLookup.set(nick, new Set([nick]));
    }
    nicknameLookup.get(nick).add(formal);
    // Add all other nicknames of the same formal name
    for (const otherNick of nicks) {
      nicknameLookup.get(nick).add(otherNick);
    }
  }
}

/**
 * Get all nickname variants for a given name
 * @param {string} name - Name to get variants for
 * @returns {string[]} - Array of all name variants including the original
 */
export const getNicknameVariants = (name) => {
  if (!name) return [];
  const lower = name.toLowerCase().trim();
  const variants = nicknameLookup.get(lower);
  return variants ? Array.from(variants) : [lower];
};

/**
 * Check if two names are nickname variants of each other
 * @param {string} a - First name
 * @param {string} b - Second name
 * @returns {boolean}
 */
export const areNicknameVariants = (a, b) => {
  if (!a || !b) return false;
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return true;
  const variants = nicknameLookup.get(aLower);
  return variants ? variants.has(bLower) : false;
};

/**
 * QWERTY keyboard layout for adjacency detection
 */
const KEYBOARD_ROWS = [
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm'
];

// Build adjacency map
const keyboardAdjacency = new Map();
for (let row = 0; row < KEYBOARD_ROWS.length; row++) {
  for (let col = 0; col < KEYBOARD_ROWS[row].length; col++) {
    const key = KEYBOARD_ROWS[row][col];
    const adjacent = new Set();
    // Same row neighbors
    if (col > 0) adjacent.add(KEYBOARD_ROWS[row][col - 1]);
    if (col < KEYBOARD_ROWS[row].length - 1) adjacent.add(KEYBOARD_ROWS[row][col + 1]);
    // Row above
    if (row > 0) {
      const prevRow = KEYBOARD_ROWS[row - 1];
      if (col < prevRow.length) adjacent.add(prevRow[col]);
      if (col > 0 && col - 1 < prevRow.length) adjacent.add(prevRow[col - 1]);
    }
    // Row below
    if (row < KEYBOARD_ROWS.length - 1) {
      const nextRow = KEYBOARD_ROWS[row + 1];
      if (col < nextRow.length) adjacent.add(nextRow[col]);
      if (col > 0 && col - 1 < nextRow.length) adjacent.add(nextRow[col - 1]);
    }
    keyboardAdjacency.set(key, adjacent);
  }
}

/**
 * Check if a character substitution is a keyboard adjacency error
 * @param {string} a - First character
 * @param {string} b - Second character
 * @returns {boolean}
 */
export const isKeyboardAdjacent = (a, b) => {
  if (!a || !b) return false;
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const adjacent = keyboardAdjacency.get(aLower);
  return adjacent ? adjacent.has(bLower) : false;
};

/**
 * Detect if a string has a keyboard adjacency typo compared to another
 * Returns true if strings differ by exactly one keyboard-adjacent character
 * @param {string} a - First string (search term)
 * @param {string} b - Second string (name)
 * @returns {boolean}
 */
export const hasKeyboardTypo = (a, b) => {
  if (!a || !b) return false;
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower.length !== bLower.length) return false;

  let diffCount = 0;
  let isAdjacent = false;

  for (let i = 0; i < aLower.length; i++) {
    if (aLower[i] !== bLower[i]) {
      diffCount++;
      if (diffCount > 1) return false;
      isAdjacent = isKeyboardAdjacent(aLower[i], bLower[i]);
    }
  }

  return diffCount === 1 && isAdjacent;
};

/**
 * Detect if strings differ by adjacent character transposition
 * e.g., "teh" -> "the", "micheal" -> "michael"
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean}
 */
export const hasTranspositionTypo = (a, b) => {
  if (!a || !b) return false;
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower.length !== bLower.length) return false;
  if (aLower.length < 2) return false;

  let diffCount = 0;
  let firstDiffPos = -1;

  for (let i = 0; i < aLower.length; i++) {
    if (aLower[i] !== bLower[i]) {
      if (diffCount === 0) {
        firstDiffPos = i;
      }
      diffCount++;
      if (diffCount > 2) return false;
    }
  }

  if (diffCount !== 2) return false;

  // Check if it's a transposition (swapped adjacent characters)
  const secondDiffPos = firstDiffPos + 1;
  return (
    aLower[firstDiffPos] === bLower[secondDiffPos] &&
    aLower[secondDiffPos] === bLower[firstDiffPos]
  );
};

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
 * Enhanced for Spanish names and common phonetic patterns
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - Whether names sound similar
 */
export const soundsLike = (a, b) => {
  if (!a || !b) return false;

  // Enhanced phonetic normalization including Spanish patterns
  const normalize = (str) => {
    return str.toLowerCase()
      .trim()
      // Spanish phonetic patterns
      .replace(/^h/g, '')          // Silent h at start (Hugo -> ugo)
      .replace(/ll/g, 'y')         // ll sounds like y (Guillermo)
      .replace(/ñ/g, 'ny')         // ñ sounds like ny
      .replace(/rr/g, 'r')         // Double r
      .replace(/qu/g, 'k')         // qu sounds like k
      .replace(/gue/g, 'ge')       // gue sounds like ge
      .replace(/gui/g, 'gi')       // gui sounds like gi
      // English soft g
      .replace(/g(?=[ei])/g, 'j')  // Soft g before e/i (George -> Jeorge)
      // English phonetic patterns
      .replace(/ph/g, 'f')
      .replace(/ck/g, 'k')
      .replace(/gh/g, 'f')
      .replace(/v/g, 'f')
      .replace(/z/g, 's')
      .replace(/c(?=[ei])/g, 's')  // Soft c before e/i
      .replace(/c/g, 'k')          // Hard c
      .replace(/[aeiouy]/g, 'a')   // Normalize all vowels
      .replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1'); // Remove double consonants
  };

  const aNorm = normalize(a);
  const bNorm = normalize(b);

  if (aNorm === bNorm) return true;

  // For very short names, phonetic match must be exact
  if (Math.min(aNorm.length, bNorm.length) <= 2) return false;

  return similarityScore(aNorm, bNorm) >= 0.75;
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
    const firstName = (guest.firstName || "").toLowerCase().trim();
    const lastName = (guest.lastName || "").toLowerCase().trim();
    const preferredName = (guest.preferredName || "").toLowerCase().trim();

    // All possible name tokens for this guest
    const guestTokens = [
      ...firstName.split(/\s+/).filter(Boolean),
      ...lastName.split(/\s+/).filter(Boolean),
      ...(preferredName ? preferredName.split(/\s+/).filter(Boolean) : []),
    ];

    if (guestTokens.length === 0) return { guest, score: 0 };

    // Find best match for each search token among guest tokens
    const tokenScores = searchTokens.map((sToken) => {
      let bestTokenScore = 0;

      for (const gToken of guestTokens) {
        // 1. Nickname matching (highest priority for exact nickname match)
        if (areNicknameVariants(sToken, gToken)) {
          bestTokenScore = Math.max(bestTokenScore, 0.95);
          continue;
        }

        // 2. Keyboard typo detection (high score for adjacent key typo)
        if (hasKeyboardTypo(sToken, gToken)) {
          bestTokenScore = Math.max(bestTokenScore, 0.92);
          continue;
        }

        // 3. Transposition typo (swapped characters like "micheal" -> "michael")
        if (hasTranspositionTypo(sToken, gToken)) {
          bestTokenScore = Math.max(bestTokenScore, 0.90);
          continue;
        }

        // 4. Base Similarity (Levenshtein)
        const sim = similarityScore(sToken, gToken);

        // 5. Substring/Prefix (High score for initials or partials)
        const sub = getSubstringMatchScore(sToken, gToken);

        // 6. Phonetic
        let sound = 0;
        if (soundsLike(sToken, gToken)) {
          sound = Math.max(sim, 0.85) + 0.1;
        }

        const score = Math.max(sim, sub, sound);
        if (score > bestTokenScore) {
          bestTokenScore = score;
        }
      }
      return Math.min(1.0, bestTokenScore);
    });

    // Average score across all search tokens
    const bestScore =
      tokenScores.reduce((sum, s) => sum + s, 0) / tokenScores.length;

    return {
      guest,
      score: bestScore,
      matchType: "flexible",
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
  hasMatchingFirstChars,
  soundsLike,
  findFuzzySuggestions,
  formatSuggestionDisplay,
  getSubstringMatchScore,
  // New exports
  COMMON_NICKNAMES,
  getNicknameVariants,
  areNicknameVariants,
  isKeyboardAdjacent,
  hasKeyboardTypo,
  hasTranspositionTypo,
};
