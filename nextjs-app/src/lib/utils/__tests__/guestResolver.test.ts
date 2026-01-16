import { describe, it, expect } from 'vitest';
import {
    resolveGuestName,
    getGuestNameSafe,
    createGuestNameResolver,
} from '../guestResolver';
import type { Guest } from '@/lib/types';

const createMockGuest = (overrides: Partial<Guest> = {}): Guest => ({
    id: 'guest-123',
    guestId: 'G001',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    preferredName: 'Johnny',
    housingStatus: 'Unhoused',
    age: 'Adult 18-59',
    gender: 'Male',
    location: 'San Jose',
    notes: '',
    bicycleDescription: '',
    bannedAt: null,
    bannedUntil: null,
    banReason: '',
    isBanned: false,
    bannedFromBicycle: false,
    bannedFromMeals: false,
    bannedFromShower: false,
    bannedFromLaundry: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    ...overrides,
});

describe('guestResolver', () => {
    describe('resolveGuestName', () => {
        it('returns Loading when guests are still loading', () => {
            const result = resolveGuestName('guest-123', [], true);
            expect(result.name).toBe('Loading...');
            expect(result.isResolved).toBe(false);
            expect(result.isLoading).toBe(true);
        });

        it('returns Loading when guests array is undefined', () => {
            const result = resolveGuestName('guest-123', undefined, false);
            expect(result.name).toBe('Loading...');
            expect(result.isResolved).toBe(false);
            expect(result.isLoading).toBe(true);
        });

        it('returns Loading when guests array is empty', () => {
            const result = resolveGuestName('guest-123', [], false);
            expect(result.name).toBe('Loading...');
            expect(result.isResolved).toBe(false);
            expect(result.isLoading).toBe(true);
        });

        it('returns Unknown Guest when guest is not found in populated array', () => {
            const guests = [createMockGuest({ id: 'other-guest' })];
            const result = resolveGuestName('guest-123', guests, false);
            expect(result.name).toBe('Unknown Guest');
            expect(result.isResolved).toBe(false);
            expect(result.isLoading).toBe(false);
        });

        it('returns resolved name when guest is found', () => {
            const guests = [createMockGuest({ id: 'guest-123', name: 'John Doe' })];
            const result = resolveGuestName('guest-123', guests, false);
            expect(result.name).toBe('John Doe');
            expect(result.isResolved).toBe(true);
            expect(result.isLoading).toBe(false);
        });

        it('falls back to preferredName when name is missing', () => {
            const guests = [
                createMockGuest({ id: 'guest-123', name: '', preferredName: 'Johnny' }),
            ];
            const result = resolveGuestName('guest-123', guests, false);
            expect(result.name).toBe('Johnny');
        });

        it('falls back to firstName lastName when other names are missing', () => {
            const guests = [
                createMockGuest({
                    id: 'guest-123',
                    name: '',
                    preferredName: '',
                    firstName: 'John',
                    lastName: 'Doe',
                }),
            ];
            const result = resolveGuestName('guest-123', guests, false);
            expect(result.name).toBe('John Doe');
        });

        it('returns Guest as last fallback', () => {
            const guests = [
                createMockGuest({
                    id: 'guest-123',
                    name: '',
                    preferredName: '',
                    firstName: '',
                    lastName: '',
                }),
            ];
            const result = resolveGuestName('guest-123', guests, false);
            expect(result.name).toBe('Guest');
        });
    });

    describe('getGuestNameSafe', () => {
        it('returns safe name string directly', () => {
            const guests = [createMockGuest({ id: 'guest-123', name: 'John Doe' })];
            const name = getGuestNameSafe('guest-123', guests, false);
            expect(name).toBe('John Doe');
        });

        it('returns Loading when guests are loading', () => {
            const name = getGuestNameSafe('guest-123', [], true);
            expect(name).toBe('Loading...');
        });
    });

    describe('createGuestNameResolver', () => {
        it('creates a reusable resolver function', () => {
            const guests = [
                createMockGuest({ id: 'guest-1', name: 'Alice' }),
                createMockGuest({ id: 'guest-2', name: 'Bob' }),
            ];
            const resolver = createGuestNameResolver(guests, false);

            expect(resolver('guest-1')).toBe('Alice');
            expect(resolver('guest-2')).toBe('Bob');
            expect(resolver('guest-3')).toBe('Unknown Guest');
        });

        it('handles loading state in resolver', () => {
            const resolver = createGuestNameResolver([], true);
            expect(resolver('guest-1')).toBe('Loading...');
        });
    });
});

describe('Race condition prevention', () => {
    it('does not display Unknown Guest when guests are still loading', () => {
        const result = resolveGuestName('guest-123', undefined, true);
        expect(result.name).not.toBe('Unknown Guest');
        expect(result.name).toBe('Loading...');
    });

    it('distinguishes between loading and truly missing guest', () => {
        const loadingResult = resolveGuestName('guest-123', [], true);
        expect(loadingResult.isLoading).toBe(true);
        expect(loadingResult.isResolved).toBe(false);

        const guests = [createMockGuest({ id: 'other-guest' })];
        const missingResult = resolveGuestName('guest-123', guests, false);
        expect(missingResult.isLoading).toBe(false);
        expect(missingResult.isResolved).toBe(false);
        expect(missingResult.name).toBe('Unknown Guest');
    });
});
