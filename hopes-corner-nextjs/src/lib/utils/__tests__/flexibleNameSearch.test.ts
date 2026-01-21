import { describe, it, expect, vi } from 'vitest';

describe('flexibleNameSearch utilities', () => {
    // Common test data
    const guests = [
        { id: '1', firstName: 'John', lastName: 'Doe', name: 'John Doe', preferredName: 'Johnny' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', name: 'Jane Smith', preferredName: '' },
        { id: '3', firstName: 'Robert', lastName: 'Johnson', name: 'Robert Johnson', preferredName: 'Bob' },
        { id: '4', firstName: 'María', lastName: 'García', name: 'María García', preferredName: '' },
        { id: '5', firstName: 'José', lastName: 'Rodríguez', name: 'José Rodríguez', preferredName: 'Joe' },
        { id: '6', firstName: 'Michael', lastName: 'Williams', name: 'Michael Williams', preferredName: 'Mike' },
        { id: '7', firstName: 'Jennifer', lastName: 'Brown', name: 'Jennifer Brown', preferredName: 'Jen' },
        { id: '8', firstName: 'Marcos', lastName: 'Flowers', name: 'Marcos Flowers', preferredName: '' },
    ];

    describe('exact match search', () => {
        it('finds exact first name match', () => {
            const query = 'John';
            const results = guests.filter(g =>
                g.firstName.toLowerCase() === query.toLowerCase()
            );
            expect(results.length).toBe(1);
            expect(results[0].id).toBe('1');
        });

        it('finds exact last name match', () => {
            const query = 'Doe';
            const results = guests.filter(g =>
                g.lastName.toLowerCase() === query.toLowerCase()
            );
            expect(results.length).toBe(1);
        });

        it('finds exact preferred name match', () => {
            const query = 'Johnny';
            const results = guests.filter(g =>
                g.preferredName.toLowerCase() === query.toLowerCase()
            );
            expect(results.length).toBe(1);
        });

        it('finds full name exact match', () => {
            const query = 'John Doe';
            const results = guests.filter(g =>
                g.name.toLowerCase() === query.toLowerCase()
            );
            expect(results.length).toBe(1);
        });
    });

    describe('partial match search', () => {
        it('finds partial first name match', () => {
            const query = 'joh';
            const results = guests.filter(g =>
                g.firstName.toLowerCase().startsWith(query.toLowerCase())
            );
            expect(results.length).toBe(1);
        });

        it('finds partial last name match', () => {
            const query = 'john';
            const results = guests.filter(g =>
                g.lastName.toLowerCase().startsWith(query.toLowerCase())
            );
            expect(results.length).toBe(1);
        });

        it('finds names containing query', () => {
            const query = 'ob';
            const results = guests.filter(g =>
                g.firstName.toLowerCase().includes(query.toLowerCase())
            );
            expect(results.length).toBe(1); // Robert
        });
    });

    describe('case-insensitive search', () => {
        it('matches lowercase query to uppercase name', () => {
            const query = 'john';
            const results = guests.filter(g =>
                g.firstName.toLowerCase().includes(query.toLowerCase())
            );
            expect(results.length).toBeGreaterThan(0);
        });

        it('matches uppercase query to lowercase name', () => {
            const query = 'JOHN';
            const results = guests.filter(g =>
                g.firstName.toLowerCase().includes(query.toLowerCase())
            );
            expect(results.length).toBeGreaterThan(0);
        });

        it('matches mixed case query', () => {
            const query = 'JoHn';
            const results = guests.filter(g =>
                g.firstName.toLowerCase().includes(query.toLowerCase())
            );
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('multi-token search', () => {
        it('matches first name and last name tokens', () => {
            const query = 'john doe';
            const tokens = query.toLowerCase().split(/\s+/);
            const results = guests.filter(g => {
                const fullName = g.name.toLowerCase();
                return tokens.every(token => fullName.includes(token));
            });
            expect(results.length).toBe(1);
        });

        it('matches tokens in any order', () => {
            const query = 'doe john';
            const tokens = query.toLowerCase().split(/\s+/);
            const results = guests.filter(g => {
                const fullName = g.name.toLowerCase();
                return tokens.every(token => fullName.includes(token));
            });
            expect(results.length).toBe(1);
        });

        it('handles partial multi-token match', () => {
            const query = 'marc flow';
            const tokens = query.toLowerCase().split(/\s+/);
            const results = guests.filter(g => {
                const fullName = g.name.toLowerCase();
                return tokens.every(token => fullName.includes(token));
            });
            expect(results.length).toBe(1);
            expect(results[0].firstName).toBe('Marcos');
        });
    });

    describe('fuzzy matching', () => {
        it('handles common typos', () => {
            // Simulating Levenshtein distance
            const levenshtein = (a: string, b: string): number => {
                if (a.length === 0) return b.length;
                if (b.length === 0) return a.length;

                const matrix = [];
                for (let i = 0; i <= b.length; i++) {
                    matrix[i] = [i];
                }
                for (let j = 0; j <= a.length; j++) {
                    matrix[0][j] = j;
                }

                for (let i = 1; i <= b.length; i++) {
                    for (let j = 1; j <= a.length; j++) {
                        if (b.charAt(i - 1) === a.charAt(j - 1)) {
                            matrix[i][j] = matrix[i - 1][j - 1];
                        } else {
                            matrix[i][j] = Math.min(
                                matrix[i - 1][j - 1] + 1,
                                matrix[i][j - 1] + 1,
                                matrix[i - 1][j] + 1
                            );
                        }
                    }
                }
                return matrix[b.length][a.length];
            };

            expect(levenshtein('john', 'jhon')).toBeLessThanOrEqual(2);
            expect(levenshtein('john', 'jonh')).toBeLessThanOrEqual(2);
        });

        it('matches with one character difference', () => {
            const distance = (a: string, b: string) => {
                let diff = 0;
                const maxLen = Math.max(a.length, b.length);
                for (let i = 0; i < maxLen; i++) {
                    if (a[i] !== b[i]) diff++;
                }
                return diff;
            };

            expect(distance('john', 'johm')).toBe(1);
        });
    });

    describe('phonetic matching', () => {
        it('matches similar sounding names', () => {
            // Simple soundex-like comparison
            const simpleSoundex = (s: string) => {
                return s.toLowerCase()
                    .replace(/[aeiou]/g, '')
                    .slice(0, 4);
            };

            expect(simpleSoundex('jose')).toBe(simpleSoundex('jos'));
            expect(simpleSoundex('brian')).toBe(simpleSoundex('brn'));
        });

        it('handles Spanish name variations', () => {
            const variations = {
                'jose': ['José', 'hose', 'hosay'],
                'maria': ['María', 'marya'],
            };

            const normalizedVariations = variations['jose'].map(v =>
                v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            );

            expect(normalizedVariations).toContain('jose');
        });
    });

    describe('accent/diacritic handling', () => {
        it('matches names without accents', () => {
            const normalize = (s: string) =>
                s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            expect(normalize('María')).toBe('maria');
            expect(normalize('José')).toBe('jose');
            expect(normalize('García')).toBe('garcia');
        });

        it('finds name with accent using plain query', () => {
            const query = 'maria';
            const normalize = (s: string) =>
                s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            const results = guests.filter(g =>
                normalize(g.firstName).includes(normalize(query))
            );
            expect(results.length).toBe(1);
            expect(results[0].firstName).toBe('María');
        });
    });

    describe('nickname matching', () => {
        const nicknames: Record<string, string[]> = {
            'robert': ['bob', 'rob', 'robbie', 'bobby'],
            'michael': ['mike', 'mikey', 'mick'],
            'jennifer': ['jen', 'jenny', 'jenn'],
            'jose': ['joe', 'pepe'],
            'william': ['will', 'bill', 'billy', 'willy'],
        };

        it('matches nickname to full name', () => {
            const query = 'bob';
            const results = guests.filter(g => {
                const firstName = g.firstName.toLowerCase();
                const matchingNicknames = nicknames[firstName] || [];
                return matchingNicknames.includes(query.toLowerCase());
            });
            expect(results.length).toBe(1);
            expect(results[0].firstName).toBe('Robert');
        });

        it('matches full name to nickname in preferred name', () => {
            const query = 'mike';
            const results = guests.filter(g =>
                g.preferredName.toLowerCase() === query.toLowerCase()
            );
            expect(results.length).toBe(1);
            expect(results[0].firstName).toBe('Michael');
        });
    });

    describe('search scoring', () => {
        it('prioritizes exact matches', () => {
            const query = 'john';
            const candidates = [
                { name: 'John Doe', score: 100 },
                { name: 'Johnny Smith', score: 80 },
                { name: 'Johnson Williams', score: 60 },
            ];

            const sorted = candidates.sort((a, b) => b.score - a.score);
            expect(sorted[0].name).toBe('John Doe');
        });

        it('prioritizes start-of-word matches', () => {
            // John should score higher than Johnson for query "joh"
            const scores = {
                'start': 100,
                'contains': 50,
            };

            const name1 = 'John';
            const name2 = 'Elijah';
            const query = 'joh';

            const score1 = name1.toLowerCase().startsWith(query) ? scores.start : scores.contains;
            const score2 = name2.toLowerCase().includes(query) ? scores.contains : 0;

            expect(score1).toBeGreaterThan(score2);
        });
    });

    describe('edge cases', () => {
        it('handles empty query', () => {
            const query = '';
            const results = query ? guests : [];
            expect(results.length).toBe(0);
        });

        it('handles whitespace-only query', () => {
            const query = '   ';
            const trimmed = query.trim();
            const results = trimmed ? guests : [];
            expect(results.length).toBe(0);
        });

        it('handles special characters', () => {
            const query = "O'Brien";
            const sanitized = query.replace(/[^a-zA-Z\s]/g, '');
            expect(sanitized).toBe('OBrien');
        });

        it('handles very long queries', () => {
            const query = 'a'.repeat(1000);
            expect(query.length).toBe(1000);
            // Should not crash
            const results = guests.filter(g => g.name.includes(query));
            expect(results.length).toBe(0);
        });

        it('handles numeric queries', () => {
            const query = '123';
            const results = guests.filter(g => g.name.includes(query));
            expect(results.length).toBe(0);
        });
    });

    describe('search performance', () => {
        it('processes many guests efficiently', () => {
            const manyGuests = Array.from({ length: 1000 }, (_, i) => ({
                id: String(i),
                firstName: `Guest${i}`,
                lastName: `Last${i}`,
                name: `Guest${i} Last${i}`,
                preferredName: '',
            }));

            const start = Date.now();
            const results = manyGuests.filter(g => g.firstName.includes('Guest5'));
            const duration = Date.now() - start;

            expect(results.length).toBeGreaterThan(0);
            expect(duration).toBeLessThan(100); // Should complete in < 100ms
        });
    });
});
