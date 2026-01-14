import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn utility', () => {
    it('merges class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
        expect(cn('base', true && 'conditional')).toBe('base conditional');
        expect(cn('base', false && 'conditional')).toBe('base');
    });

    it('handles arrays', () => {
        expect(cn(['one', 'two'], 'three')).toBe('one two three');
    });

    it('handles undefined and null', () => {
        expect(cn('base', undefined, null, 'end')).toBe('base end');
    });

    it('handles objects', () => {
        expect(cn('base', { active: true, disabled: false })).toBe('base active');
    });

    it('merges tailwind classes correctly', () => {
        // tailwind-merge should dedupe conflicting classes
        expect(cn('p-4', 'p-2')).toBe('p-2');
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('handles empty inputs', () => {
        expect(cn()).toBe('');
        expect(cn('')).toBe('');
    });

    it('handles complex combinations', () => {
        const result = cn(
            'base-class',
            true && 'conditional-true',
            false && 'conditional-false',
            { active: true, disabled: false },
            ['array-class-1', 'array-class-2']
        );
        expect(result).toContain('base-class');
        expect(result).toContain('conditional-true');
        expect(result).not.toContain('conditional-false');
        expect(result).toContain('active');
        expect(result).not.toContain('disabled');
        expect(result).toContain('array-class-1');
    });
});
