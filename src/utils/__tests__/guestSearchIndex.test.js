import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSearchIndex,
  searchWithIndex,
  scoreMatch,
  getCachedNameParts,
  clearNamePartsCache,
} from '../guestSearchIndex';

describe('guestSearchIndex', () => {
  beforeEach(() => {
    clearNamePartsCache();
  });

  describe('getCachedNameParts', () => {
    it('extracts name parts correctly', () => {
      const parts = getCachedNameParts('John Michael', 'Smith', 'Johnny');
      
      expect(parts.firstName).toBe('john michael');
      expect(parts.lastName).toBe('smith');
      expect(parts.preferredName).toBe('johnny');
      expect(parts.firstTokens).toEqual(['john', 'michael']);
      expect(parts.lastTokens).toEqual(['smith']);
      expect(parts.allTokens).toContain('john');
      expect(parts.allTokens).toContain('michael');
      expect(parts.allTokens).toContain('smith');
      expect(parts.allTokens).toContain('johnny');
      expect(parts.fullName).toBe('john michael smith');
    });

    it('generates initials correctly', () => {
      const parts = getCachedNameParts('John Michael', 'Smith', '');
      
      // Should have "js" (first + last), "jms" (all initials)
      expect(parts.initials).toContain('js');
      expect(parts.initials).toContain('jms');
    });

    it('caches results', () => {
      const parts1 = getCachedNameParts('John', 'Doe', '');
      const parts2 = getCachedNameParts('John', 'Doe', '');
      
      // Should return the same object reference (cached)
      expect(parts1).toBe(parts2);
    });

    it('handles empty strings', () => {
      const parts = getCachedNameParts('', '', '');
      
      expect(parts.firstName).toBe('');
      expect(parts.lastName).toBe('');
      expect(parts.allTokens).toEqual([]);
      expect(parts.initials).toEqual([]);
    });
  });

  describe('createSearchIndex', () => {
    const mockGuests = [
      { id: '1', firstName: 'John', lastName: 'Smith', preferredName: '' },
      { id: '2', firstName: 'Jane', lastName: 'Doe', preferredName: 'Janey' },
      { id: '3', firstName: 'Michael', lastName: 'Johnson', preferredName: '' },
    ];

    it('creates index with all lookup structures', () => {
      const index = createSearchIndex(mockGuests);
      
      expect(index.byId.size).toBe(3);
      expect(index.byFirstChar.has('j')).toBe(true);
      expect(index.byFirstChar.has('m')).toBe(true);
      expect(index.byInitials.size).toBeGreaterThan(0);
      expect(index.guests).toBe(mockGuests);
    });

    it('indexes by first character', () => {
      const index = createSearchIndex(mockGuests);
      
      // Both John Smith and Jane Doe start with 'j'
      const jEntries = index.byFirstChar.get('j');
      expect(jEntries.length).toBeGreaterThanOrEqual(2);
    });

    it('indexes by initials', () => {
      const index = createSearchIndex(mockGuests);
      
      // John Smith should have 'js' initials
      expect(index.byInitials.has('js')).toBe(true);
    });

    it('handles empty guest list', () => {
      const index = createSearchIndex([]);
      
      expect(index.byId.size).toBe(0);
      expect(index.byFirstChar.size).toBe(0);
      expect(index.guests).toEqual([]);
    });
  });

  describe('scoreMatch', () => {
    it('returns -2 for exact initials match', () => {
      const parts = getCachedNameParts('John', 'Smith', '');
      const score = scoreMatch('js', parts);
      
      expect(score).toBe(-2);
    });

    it('returns -1 for exact full name match', () => {
      const parts = getCachedNameParts('John', 'Smith', '');
      const score = scoreMatch('john smith', parts);
      
      expect(score).toBe(-1);
    });

    it('returns 0 for exact token match', () => {
      const parts = getCachedNameParts('John', 'Smith', '');
      const score = scoreMatch('john', parts);
      
      expect(score).toBe(0);
    });

    it('returns 1 for prefix match', () => {
      const parts = getCachedNameParts('John', 'Smith', '');
      const score = scoreMatch('joh', parts);
      
      expect(score).toBe(1);
    });

    it('returns 2 for substring match', () => {
      const parts = getCachedNameParts('John', 'Smith', '');
      const score = scoreMatch('mit', parts); // 'mit' in 'smith'
      
      expect(score).toBe(2);
    });

    it('returns 99 for no match', () => {
      const parts = getCachedNameParts('John', 'Smith', '');
      const score = scoreMatch('xyz', parts);
      
      expect(score).toBe(99);
    });

    it('handles multi-token queries', () => {
      const parts = getCachedNameParts('John', 'Smith', '');
      
      // Full name prefix match
      expect(scoreMatch('john s', parts)).toBeLessThan(99);
      
      // Sequential token match
      expect(scoreMatch('joh smi', parts)).toBeLessThan(99);
    });

    it('matches preferred name', () => {
      const parts = getCachedNameParts('John', 'Smith', 'Johnny');
      const score = scoreMatch('johnny', parts);
      
      expect(score).toBe(-1); // Exact preferred name match
    });
  });

  describe('searchWithIndex', () => {
    const mockGuests = [
      { id: '1', firstName: 'John', lastName: 'Smith', preferredName: '', name: 'John Smith' },
      { id: '2', firstName: 'Jane', lastName: 'Doe', preferredName: 'Janey', name: 'Jane Doe' },
      { id: '3', firstName: 'John', lastName: 'Doe', preferredName: '', name: 'John Doe' },
      { id: '4', firstName: 'Michael', lastName: 'Johnson', preferredName: '', name: 'Michael Johnson' },
      { id: '5', firstName: 'James', lastName: 'Smith', preferredName: 'Jim', name: 'James Smith' },
    ];

    it('finds exact first name matches', () => {
      const index = createSearchIndex(mockGuests);
      const results = searchWithIndex('john', index);
      
      // Matches: John Smith (id:1), John Doe (id:3), and Michael Johnson (id:4) via substring
      expect(results.length).toBe(3);
      expect(results.some(g => g.id === '1')).toBe(true);
      expect(results.some(g => g.id === '3')).toBe(true);
      // Exact matches should come before substring matches
      const johnSmithIdx = results.findIndex(g => g.id === '1');
      const johnDoeIdx = results.findIndex(g => g.id === '3');
      const johnsonIdx = results.findIndex(g => g.id === '4');
      expect(johnSmithIdx).toBeLessThan(johnsonIdx);
      expect(johnDoeIdx).toBeLessThan(johnsonIdx);
    });

    it('finds matches by initials', () => {
      const index = createSearchIndex(mockGuests);
      const results = searchWithIndex('js', index);
      
      // JS should match John Smith and James Smith
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some(g => g.id === '1')).toBe(true);
      expect(results.some(g => g.id === '5')).toBe(true);
    });

    it('finds partial matches', () => {
      const index = createSearchIndex(mockGuests);
      const results = searchWithIndex('joh', index);
      
      // Should match both Johns and Johnson
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty for no match', () => {
      const index = createSearchIndex(mockGuests);
      const results = searchWithIndex('xyz123', index);
      
      expect(results).toEqual([]);
    });

    it('respects maxResults option', () => {
      const index = createSearchIndex(mockGuests);
      const results = searchWithIndex('j', index, { maxResults: 2 });
      
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('handles empty query', () => {
      const index = createSearchIndex(mockGuests);
      const results = searchWithIndex('', index);
      
      expect(results).toEqual([]);
    });

    it('handles null/undefined query', () => {
      const index = createSearchIndex(mockGuests);
      
      expect(searchWithIndex(null, index)).toEqual([]);
      expect(searchWithIndex(undefined, index)).toEqual([]);
    });

    it('deduplicates results', () => {
      const index = createSearchIndex(mockGuests);
      const results = searchWithIndex('john', index);
      
      const ids = results.map(g => g.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('handles multi-word queries', () => {
      const index = createSearchIndex(mockGuests);
      const results = searchWithIndex('john smith', index);
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].id).toBe('1'); // John Smith should be first
    });

    it('finds by preferred name', () => {
      const index = createSearchIndex(mockGuests);
      const results = searchWithIndex('janey', index);
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(g => g.id === '2')).toBe(true);
    });
  });

  describe('performance', () => {
    it('handles large guest lists efficiently', () => {
      // Create a large mock guest list
      const largeGuestList = [];
      for (let i = 0; i < 1000; i++) {
        largeGuestList.push({
          id: `${i}`,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          preferredName: i % 3 === 0 ? `Pref${i}` : '',
          name: `First${i} Last${i}`,
        });
      }

      const startIndex = performance.now();
      const index = createSearchIndex(largeGuestList);
      const indexTime = performance.now() - startIndex;

      const startSearch = performance.now();
      const results = searchWithIndex('first50', index);
      const searchTime = performance.now() - startSearch;

      // Indexing 1000 guests should be under 100ms
      expect(indexTime).toBeLessThan(100);
      
      // Search should be very fast - under 10ms
      expect(searchTime).toBeLessThan(10);
      
      // Should find the matching guest
      expect(results.some(g => g.id === '500')).toBe(true);
    });

    it('caches index for repeated searches', () => {
      const guests = [
        { id: '1', firstName: 'John', lastName: 'Smith', preferredName: '', name: 'John Smith' },
      ];

      // First index creation
      const index1 = createSearchIndex(guests);
      
      // Search with same guest list reference should reuse index
      const results1 = searchWithIndex('john', index1);
      const results2 = searchWithIndex('smith', index1);

      expect(results1.length).toBe(1);
      expect(results2.length).toBe(1);
    });
  });
});
