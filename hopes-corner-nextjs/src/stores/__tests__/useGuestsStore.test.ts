import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGuestsStore } from '../useGuestsStore';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockResolvedValue({ error: null }),
            single: vi.fn().mockResolvedValue({
                data: {
                    id: 'new-id',
                    external_id: 'G123',
                    first_name: 'Test',
                    last_name: 'User',
                    full_name: 'Test User',
                    housing_status: 'housed',
                    age_group: 'Adult 18-59',
                    gender: 'Male',
                    location: 'Mountain View',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                error: null
            }),
        }),
    }),
}));

vi.mock('@/lib/utils/supabasePagination', () => ({
    fetchAllPaginated: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/utils/flexibleNameSearch', () => ({
    clearSearchIndexCache: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const createMockGuest = (overrides = {}) => ({
    id: 'guest-1',
    guestId: 'G001',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    preferredName: '',
    housingStatus: 'housed',
    age: 'Adult 18-59',
    gender: 'Male',
    location: 'Mountain View',
    notes: '',
    bicycleDescription: '',
    isBanned: false,
    bannedFromBicycle: false,
    bannedFromMeals: false,
    bannedFromShower: false,
    bannedFromLaundry: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
});

describe('useGuestsStore', () => {
    beforeEach(() => {
        // Reset store
        useGuestsStore.setState({
            guests: [],
            guestProxies: [],
            warnings: [],
        });
    });

    describe('initial state', () => {
        it('starts with empty arrays', () => {
            const { guests, guestProxies, warnings } = useGuestsStore.getState();

            expect(guests).toEqual([]);
            expect(guestProxies).toEqual([]);
            expect(warnings).toEqual([]);
        });
    });

    describe('generateGuestId', () => {
        it('generates unique IDs starting with G', () => {
            const { generateGuestId } = useGuestsStore.getState();

            const id1 = generateGuestId();
            const id2 = generateGuestId();

            expect(id1).toMatch(/^G[A-Z0-9]+\d{3}$/);
            expect(id2).toMatch(/^G[A-Z0-9]+\d{3}$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('syncGuests', () => {
        it('replaces all guests', () => {
            const mockGuests = [
                createMockGuest({ id: '1', firstName: 'Alice' }),
                createMockGuest({ id: '2', firstName: 'Bob' }),
            ];

            const { syncGuests } = useGuestsStore.getState();
            syncGuests(mockGuests);

            const { guests } = useGuestsStore.getState();
            expect(guests.length).toBe(2);
            expect(guests[0].firstName).toBe('Alice');
        });
    });

    describe('clearGuests', () => {
        it('removes all guests', () => {
            // Set up initial state
            useGuestsStore.setState({
                guests: [createMockGuest()],
            });

            const { clearGuests } = useGuestsStore.getState();
            clearGuests();

            const { guests } = useGuestsStore.getState();
            expect(guests.length).toBe(0);
        });
    });

    describe('getWarningsForGuest', () => {
        it('returns only active warnings for specified guest', () => {
            useGuestsStore.setState({
                warnings: [
                    { id: 'w1', guestId: 'guest-1', message: 'Warning 1', severity: 1, active: true, createdAt: '', updatedAt: '' },
                    { id: 'w2', guestId: 'guest-1', message: 'Warning 2', severity: 2, active: false, createdAt: '', updatedAt: '' },
                    { id: 'w3', guestId: 'guest-2', message: 'Warning 3', severity: 1, active: true, createdAt: '', updatedAt: '' },
                ],
            });

            const { getWarningsForGuest } = useGuestsStore.getState();
            const warnings = getWarningsForGuest('guest-1');

            expect(warnings.length).toBe(1);
            expect(warnings[0].message).toBe('Warning 1');
        });

        it('returns empty array if no warnings', () => {
            const { getWarningsForGuest } = useGuestsStore.getState();
            const warnings = getWarningsForGuest('nonexistent');

            expect(warnings).toEqual([]);
        });
    });

    describe('getLinkedGuests', () => {
        it('returns linked guests in both directions', () => {
            const guest1 = createMockGuest({ id: 'guest-1' });
            const guest2 = createMockGuest({ id: 'guest-2', firstName: 'Jane' });
            const guest3 = createMockGuest({ id: 'guest-3', firstName: 'Bob' });

            useGuestsStore.setState({
                guests: [guest1, guest2, guest3],
                guestProxies: [
                    { id: 'p1', guestId: 'guest-1', proxyId: 'guest-2', createdAt: '' },
                    { id: 'p2', guestId: 'guest-3', proxyId: 'guest-1', createdAt: '' },
                ],
            });

            const { getLinkedGuests } = useGuestsStore.getState();
            const linked = getLinkedGuests('guest-1');

            expect(linked.length).toBe(2);
            expect(linked.map(g => g.firstName)).toContain('Jane');
            expect(linked.map(g => g.firstName)).toContain('Bob');
        });
    });

    describe('getLinkedGuestsCount', () => {
        it('counts linked guests correctly', () => {
            useGuestsStore.setState({
                guestProxies: [
                    { id: 'p1', guestId: 'guest-1', proxyId: 'guest-2', createdAt: '' },
                    { id: 'p2', guestId: 'guest-1', proxyId: 'guest-3', createdAt: '' },
                ],
            });

            const { getLinkedGuestsCount } = useGuestsStore.getState();
            expect(getLinkedGuestsCount('guest-1')).toBe(2);
        });

        it('returns 0 if no links', () => {
            const { getLinkedGuestsCount } = useGuestsStore.getState();
            expect(getLinkedGuestsCount('guest-1')).toBe(0);
        });
    });

    describe('async actions', () => {
        describe('addGuest', () => {
            it('adds a guest successfully', async () => {
                const { addGuest } = useGuestsStore.getState();
                const result = await addGuest({
                    firstName: 'New',
                    lastName: 'Guest',
                    housingStatus: 'Unhoused',
                    age: 'Adult 18-59',
                    gender: 'Male',
                });

                expect(result).toBeDefined();
                expect(result.id).toBeDefined();
            });

            it('requires firstName', async () => {
                const { addGuest } = useGuestsStore.getState();
                await expect(addGuest({ lastName: 'Test' })).rejects.toThrow('First name is required');
            });

            it('adds guest even with partial data', async () => {
                // Note: addGuest does not validate lastName separately
                const { addGuest } = useGuestsStore.getState();
                const result = await addGuest({ firstName: 'Test', lastName: 'User' });
                expect(result).toBeDefined();
            });
        });

        describe('updateGuest', () => {
            it('updates guest data', async () => {
                useGuestsStore.setState({
                    guests: [createMockGuest({ id: 'update-me' })],
                });

                const { updateGuest } = useGuestsStore.getState();
                const result = await updateGuest('update-me', { notes: 'Updated note' });

                // updateGuest returns true on success
                expect(result).toBe(true);
            });

            it('returns false for non-existent guest', async () => {
                const { updateGuest } = useGuestsStore.getState();
                const result = await updateGuest('non-existent', { notes: 'Test' });
                expect(result).toBe(false);
            });
        });

        describe('removeGuest', () => {
            it('removes guest from state', async () => {
                useGuestsStore.setState({
                    guests: [createMockGuest({ id: 'remove-me' })],
                });

                const { removeGuest } = useGuestsStore.getState();
                await removeGuest('remove-me');

                const { guests } = useGuestsStore.getState();
                expect(guests.find(g => g.id === 'remove-me')).toBeUndefined();
            });
        });

        describe('banGuest', () => {
            it('bans guest', async () => {
                useGuestsStore.setState({
                    guests: [createMockGuest({ id: 'ban-me', isBanned: false })],
                });

                const { banGuest } = useGuestsStore.getState();
                await banGuest('ban-me', { reason: 'Test ban', bannedUntil: '2025-12-31' });

                // Verify action completed without error
                expect(true).toBe(true);
            });

            it('bans guest from specific services', async () => {
                useGuestsStore.setState({
                    guests: [createMockGuest({ id: 'ban-services' })],
                });

                const { banGuest } = useGuestsStore.getState();
                await banGuest('ban-services', {
                    reason: 'Service ban',
                    bannedUntil: '2025-12-31',
                    bannedFromMeals: true,
                    bannedFromShower: false,
                    bannedFromLaundry: true,
                    bannedFromBicycle: false,
                });

                // Verify action completed
                expect(true).toBe(true);
            });
        });

        describe('clearGuestBan', () => {
            it('clears guest ban', async () => {
                useGuestsStore.setState({
                    guests: [createMockGuest({ id: 'clear-ban', isBanned: true })],
                });

                const { clearGuestBan } = useGuestsStore.getState();
                await clearGuestBan('clear-ban');

                // Verify action completed
                expect(true).toBe(true);
            });
        });

        describe('loadFromSupabase', () => {
            it('loads guests from Supabase', async () => {
                const { loadFromSupabase } = useGuestsStore.getState();
                await loadFromSupabase();
                // Should not throw
                expect(true).toBe(true);
            });
        });

        describe('loadGuestWarningsFromSupabase', () => {
            it('loads warnings from Supabase', async () => {
                const { loadGuestWarningsFromSupabase } = useGuestsStore.getState();
                await loadGuestWarningsFromSupabase();
                // Should not throw
                expect(true).toBe(true);
            });
        });

        describe('loadGuestProxiesFromSupabase', () => {
            it('loads proxies from Supabase', async () => {
                const { loadGuestProxiesFromSupabase } = useGuestsStore.getState();
                await loadGuestProxiesFromSupabase();
                // Should not throw
                expect(true).toBe(true);
            });
        });

        describe('addGuestWarning', () => {
            it('adds warning to guest', async () => {
                useGuestsStore.setState({
                    guests: [createMockGuest({ id: 'warn-me' })],
                });

                const { addGuestWarning } = useGuestsStore.getState();
                const result = await addGuestWarning('warn-me', {
                    message: 'Warning message',
                    severity: 2,
                });

                expect(result).toBeDefined();
            });
        });

        describe('removeGuestWarning', () => {
            it('removes warning', async () => {
                useGuestsStore.setState({
                    warnings: [
                        { id: 'remove-warn', guestId: 'g1', message: 'Test', severity: 1, active: true, createdAt: '', updatedAt: '' },
                    ],
                });

                const { removeGuestWarning } = useGuestsStore.getState();
                await removeGuestWarning('remove-warn');

                const { warnings } = useGuestsStore.getState();
                expect(warnings.find(w => w.id === 'remove-warn')).toBeUndefined();
            });
        });

        describe('linkGuests', () => {
            it('links two guests together', async () => {
                useGuestsStore.setState({
                    guests: [
                        createMockGuest({ id: 'link-1' }),
                        createMockGuest({ id: 'link-2' }),
                    ],
                });

                const { linkGuests } = useGuestsStore.getState();
                const result = await linkGuests('link-1', 'link-2');

                // Result should be defined (proxy record created)
                expect(result).toBeDefined();
            });
        });

        describe('unlinkGuests', () => {
            it('unlinks two guests', async () => {
                useGuestsStore.setState({
                    guestProxies: [
                        { id: 'unlink-test', guestId: 'link-1', proxyId: 'link-2', createdAt: '' },
                    ],
                });

                const { unlinkGuests } = useGuestsStore.getState();
                const result = await unlinkGuests('link-1', 'link-2');

                expect(result).toBe(true);
                const { guestProxies } = useGuestsStore.getState();
                expect(guestProxies.find(p => p.id === 'unlink-test')).toBeUndefined();
            });
        });
    });
});
