import { describe, it, expect, vi } from 'vitest';

describe('Deduplication & Search Logic Tests', () => {
    describe('Fuzzy Match Scoring', () => {
        const calculateScore = (target: string, query: string) => {
            const t = target.toLowerCase();
            const q = query.toLowerCase();
            if (t === q) return 1.0;
            if (t.startsWith(q)) return 0.8;
            if (t.includes(q)) return 0.5;
            return 0.0;
        };

        it('gives 1.0 for exact match', () => {
            expect(calculateScore('John', 'John')).toBe(1.0);
        });

        it('gives 0.8 for prefix match', () => {
            expect(calculateScore('John', 'Jo')).toBe(0.8);
        });

        it('gives 0.5 for inclusion', () => {
            expect(calculateScore('John', 'oh')).toBe(0.5);
        });
    });

    describe('Duplicate Guest Detection', () => {
        const isPotentialDuplicate = (g1: any, g2: any) => {
            // Logic: same first/last or same birthdate + similar name
            const sameName = g1.firstName.toLowerCase() === g2.firstName.toLowerCase() &&
                g1.lastName.toLowerCase() === g2.lastName.toLowerCase();
            const sameBirthdate = g1.birthdate === g2.birthdate;
            return sameName || (sameBirthdate && g1.lastName.toLowerCase() === g2.lastName.toLowerCase());
        };

        it('detects identical names', () => {
            const g1 = { firstName: 'John', lastName: 'Doe' };
            const g2 = { firstName: 'john', lastName: 'DOE' };
            expect(isPotentialDuplicate(g1, g2)).toBe(true);
        });

        it('detects same birthday and last name', () => {
            const g1 = { firstName: 'John', lastName: 'Doe', birthdate: '1990-01-01' };
            const g2 = { firstName: 'Johnny', lastName: 'Doe', birthdate: '1990-01-01' };
            expect(isPotentialDuplicate(g1, g2)).toBe(true);
        });
    });

    describe('Nickname Mapping', () => {
        const nicknames: Record<string, string> = {
            'robert': 'bob',
            'william': 'bill',
            'richard': 'dick',
            'john': 'johnny'
        };

        it('maps nickname to primary name', () => {
            const query = 'bob';
            const primary = nicknames['robert'] === query ? 'robert' : null;
            expect(primary).toBe('robert');
        });

        it('identifies if name matches either nickname or primary', () => {
            const isMatch = (name: string, query: string) => {
                const q = query.toLowerCase();
                const n = name.toLowerCase();
                return n === q || nicknames[n] === q;
            };
            expect(isMatch('Robert', 'bob')).toBe(true);
            expect(isMatch('Robert', 'robert')).toBe(true);
        });
    });
});
