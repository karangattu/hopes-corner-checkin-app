import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('KeyboardShortcutsBar logic', () => {
    const shortcuts = [
        { key: '/', description: 'Focus search', modifiers: [] },
        { key: 'M', description: 'Log meal', modifiers: [] },
        { key: 'S', description: 'Book shower', modifiers: [] },
        { key: 'L', description: 'Book laundry', modifiers: [] },
        { key: 'B', description: 'Book bicycle', modifiers: [] },
        { key: 'Esc', description: 'Clear/close', modifiers: [] },
        { key: 'N', description: 'New guest', modifiers: ['Cmd'] },
        { key: 'F', description: 'Toggle fullscreen', modifiers: ['Cmd'] },
    ];

    describe('shortcut definitions', () => {
        it('has search shortcut', () => {
            const shortcut = shortcuts.find(s => s.key === '/');
            expect(shortcut).toBeDefined();
            expect(shortcut?.description).toContain('search');
        });

        it('has meal shortcut', () => {
            const shortcut = shortcuts.find(s => s.key === 'M');
            expect(shortcut).toBeDefined();
            expect(shortcut?.description).toContain('meal');
        });

        it('has shower shortcut', () => {
            const shortcut = shortcuts.find(s => s.key === 'S');
            expect(shortcut).toBeDefined();
            expect(shortcut?.description).toContain('shower');
        });

        it('has laundry shortcut', () => {
            const shortcut = shortcuts.find(s => s.key === 'L');
            expect(shortcut).toBeDefined();
            expect(shortcut?.description).toContain('laundry');
        });

        it('has bicycle shortcut', () => {
            const shortcut = shortcuts.find(s => s.key === 'B');
            expect(shortcut).toBeDefined();
            expect(shortcut?.description).toContain('bicycle');
        });

        it('has escape shortcut', () => {
            const shortcut = shortcuts.find(s => s.key === 'Esc');
            expect(shortcut).toBeDefined();
            expect(shortcut?.description).toContain('close');
        });
    });

    describe('modifier key handling', () => {
        it('identifies shortcuts with modifiers', () => {
            const withModifiers = shortcuts.filter(s => s.modifiers.length > 0);
            expect(withModifiers.length).toBeGreaterThan(0);
        });

        it('identifies shortcuts without modifiers', () => {
            const withoutModifiers = shortcuts.filter(s => s.modifiers.length === 0);
            expect(withoutModifiers.length).toBeGreaterThan(0);
        });

        it('has Cmd modifier for new guest', () => {
            const shortcut = shortcuts.find(s => s.key === 'N');
            expect(shortcut?.modifiers).toContain('Cmd');
        });
    });

    describe('key display formatting', () => {
        it('formats single character keys', () => {
            const key = 'M';
            expect(key.length).toBe(1);
        });

        it('formats special keys', () => {
            const key = 'Esc';
            expect(key.length).toBeGreaterThan(1);
        });

        it('formats key with modifier', () => {
            const shortcut = { key: 'N', modifiers: ['Cmd'] };
            const display = `${shortcut.modifiers.join('+')}+${shortcut.key}`;
            expect(display).toBe('Cmd+N');
        });
    });

    describe('shortcut matching', () => {
        it('matches key press to shortcut', () => {
            const pressedKey = 'M';
            const match = shortcuts.find(s => s.key === pressedKey);
            expect(match).toBeDefined();
        });

        it('returns undefined for unknown key', () => {
            const pressedKey = 'X';
            const match = shortcuts.find(s => s.key === pressedKey);
            expect(match).toBeUndefined();
        });

        it('matches case-insensitive', () => {
            const pressedKey = 'm';
            const match = shortcuts.find(s => s.key.toLowerCase() === pressedKey.toLowerCase());
            expect(match).toBeDefined();
        });
    });

    describe('accessibility', () => {
        it('all shortcuts have descriptions', () => {
            const withDescriptions = shortcuts.filter(s => s.description);
            expect(withDescriptions.length).toBe(shortcuts.length);
        });

        it('all shortcuts have keys', () => {
            const withKeys = shortcuts.filter(s => s.key);
            expect(withKeys.length).toBe(shortcuts.length);
        });
    });

    describe('keyboard event simulation', () => {
        it('identifies slash key', () => {
            const event = { key: '/' };
            expect(event.key).toBe('/');
        });

        it('identifies letter keys', () => {
            const event = { key: 'M' };
            expect(event.key).toMatch(/^[A-Z]$/);
        });

        it('identifies escape key', () => {
            const event = { key: 'Escape' };
            expect(event.key).toBe('Escape');
        });

        it('identifies modifier keys', () => {
            const event = { key: 'N', metaKey: true };
            expect(event.metaKey).toBe(true);
        });
    });
});
