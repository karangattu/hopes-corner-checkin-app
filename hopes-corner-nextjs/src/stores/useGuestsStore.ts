import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import { fetchAllPaginated } from '@/lib/utils/supabasePagination';
import toast from 'react-hot-toast';
import {
    toTitleCase,
    normalizePreferredName,
    normalizeBicycleDescription,
    normalizeHousingStatus,
    computeIsGuestBanned,
    normalizeDateInputToISO,
} from '@/lib/utils/normalizers';
import {
    mapGuestRow,
    mapGuestProxyRow,
    mapGuestWarningRow
} from '@/lib/utils/mappers';
import {
    HOUSING_STATUSES,
    AGE_GROUPS,
    GENDERS,
} from '@/lib/constants/constants';
import { clearSearchIndexCache } from '@/lib/utils/flexibleNameSearch';

const GUEST_IMPORT_CHUNK_SIZE = 100;
const MAX_LINKED_GUESTS = 3;

export interface Guest {
    id: string;
    guestId: string;
    firstName: string;
    lastName: string;
    name: string;
    preferredName: string;
    housingStatus: string;
    age: string;
    gender: string;
    location: string;
    notes: string;
    bicycleDescription: string;
    bannedAt?: string | null;
    bannedUntil?: string | null;
    banReason?: string;
    isBanned: boolean;
    bannedFromBicycle: boolean;
    bannedFromMeals: boolean;
    bannedFromShower: boolean;
    bannedFromLaundry: boolean;
    createdAt: string;
    updatedAt: string;
    docId?: string;
}

interface GuestProxy {
    id: string;
    guestId: string;
    proxyId: string;
    createdAt: string;
}

interface GuestWarning {
    id: string;
    guestId: string;
    message: string;
    severity: number;
    issuedBy?: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

interface GuestsState {
    guests: Guest[];
    guestProxies: GuestProxy[];
    warnings: GuestWarning[];

    syncGuests: (externalGuests: Guest[]) => void;
    addGuest: (guest: any) => Promise<Guest>;
    updateGuest: (id: string, updates: any) => Promise<boolean>;
    removeGuest: (id: string) => Promise<void>;
    banGuest: (guestId: string, options: any) => Promise<boolean>;
    clearGuestBan: (guestId: string) => Promise<boolean>;
    loadFromSupabase: () => Promise<void>;
    loadGuestWarningsFromSupabase: () => Promise<void>;
    loadGuestProxiesFromSupabase: () => Promise<void>;
    clearGuests: () => void;
    getWarningsForGuest: (guestId: string) => GuestWarning[];
    addGuestWarning: (guestId: string, options: any) => Promise<GuestWarning>;
    removeGuestWarning: (warningId: string) => Promise<boolean>;
    getLinkedGuests: (guestId: string) => Guest[];
    getLinkedGuestsCount: (guestId: string) => number;
    linkGuests: (guestId: string, proxyId: string) => Promise<GuestProxy>;
    unlinkGuests: (guestId: string, proxyId: string) => Promise<boolean>;

    // Helpers
    generateGuestId: () => string;
}

export const useGuestsStore = create<GuestsState>()(
    devtools(
        persist(
            immer((set, get) => ({
                // State
                guests: [],
                guestProxies: [],
                warnings: [],

                syncGuests: (externalGuests) => {
                    set((state) => {
                        state.guests = externalGuests;
                    });
                    clearSearchIndexCache();
                },

                generateGuestId: () => {
                    return (
                        'G' +
                        Date.now().toString(36).toUpperCase() +
                        Math.floor(Math.random() * 1000)
                            .toString()
                            .padStart(3, '0')
                    );
                },

                // Actions
                addGuest: async (guestData) => {
                    const { guests } = get();
                    const supabase = createClient();

                    let firstName = toTitleCase((guestData.firstName || '').trim());
                    let lastName = toTitleCase((guestData.lastName || '').trim());

                    if (!firstName && guestData.name) {
                        const nameParts = guestData.name.trim().split(/\s+/);
                        firstName = toTitleCase(nameParts[0] || '');
                        lastName = toTitleCase(nameParts.slice(1).join(' ') || '');
                    }

                    if (!firstName) {
                        throw new Error('First name is required.');
                    }

                    if (!lastName) {
                        lastName = firstName.charAt(0).toUpperCase();
                    }

                    // Prevent duplicate guests with exact same first and last name
                    const normalizedFirstName = firstName.toLowerCase().trim();
                    const normalizedLastName = lastName.toLowerCase().trim();
                    const existingDuplicate = guests.find((g) => {
                        const existingFirst = (g.firstName || '').toLowerCase().trim();
                        const existingLast = (g.lastName || '').toLowerCase().trim();
                        return existingFirst === normalizedFirstName && existingLast === normalizedLastName;
                    });

                    if (existingDuplicate) {
                        const existingName = `${existingDuplicate.firstName} ${existingDuplicate.lastName}`.trim();
                        throw new Error(
                            `A guest named "${existingName}" already exists.`
                        );
                    }

                    const legalName = `${firstName} ${lastName}`.trim();
                    const preferredName = normalizePreferredName(guestData.preferredName);
                    const bicycleDescription = normalizeBicycleDescription(guestData.bicycleDescription);


                    const finalGuestId = guestData.guestId || get().generateGuestId();

                    const payload = {
                        external_id: finalGuestId,
                        first_name: firstName,
                        last_name: lastName,
                        full_name: legalName,
                        preferred_name: preferredName,
                        housing_status: normalizeHousingStatus(guestData.housingStatus),
                        age_group: guestData.age,
                        gender: guestData.gender,
                        location: guestData.location || 'Mountain View',
                        notes: guestData.notes || '',
                        bicycle_description: bicycleDescription,
                    };

                    const { data, error } = await supabase
                        .from('guests')
                        .insert(payload)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to add guest to Supabase:', error);
                        throw new Error('Unable to save guest.');
                    }

                    const mapped = mapGuestRow(data);
                    set((state) => {
                        state.guests.push(mapped as any);
                    });
                    clearSearchIndexCache();
                    return mapped as any;
                },

                updateGuest: async (id, updates) => {
                    const { guests } = get();
                    const supabase = createClient();
                    const target = guests.find((g) => g.id === id);
                    if (!target) return false;

                    const originalGuest = { ...target };

                    const payload: any = {};
                    if (updates.firstName !== undefined) payload.first_name = toTitleCase(updates.firstName);
                    if (updates.lastName !== undefined) payload.last_name = toTitleCase(updates.lastName);
                    if (updates.name !== undefined) payload.full_name = toTitleCase(updates.name);
                    if (updates.preferredName !== undefined) payload.preferred_name = normalizePreferredName(updates.preferredName);
                    if (updates.housingStatus !== undefined) payload.housing_status = normalizeHousingStatus(updates.housingStatus);
                    if (updates.age !== undefined) payload.age_group = updates.age;
                    if (updates.gender !== undefined) payload.gender = updates.gender;
                    if (updates.location !== undefined) payload.location = updates.location;
                    if (updates.notes !== undefined) payload.notes = updates.notes;
                    if (updates.bicycleDescription !== undefined) payload.bicycle_description = normalizeBicycleDescription(updates.bicycleDescription);
                    if (updates.guestId !== undefined) payload.external_id = updates.guestId;

                    // Optimistic update
                    set((state) => {
                        const index = state.guests.findIndex((g) => g.id === id);
                        if (index !== -1) {
                            state.guests[index] = { ...state.guests[index], ...updates };
                        }
                    });

                    const { data, error } = await supabase
                        .from('guests')
                        .update(payload)
                        .eq('id', id)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to update guest in Supabase:', error);
                        set((state) => {
                            const index = state.guests.findIndex((g) => g.id === id);
                            if (index !== -1) {
                                state.guests[index] = originalGuest;
                            }
                        });
                        toast.error('Unable to update guest. Reverted changes.');
                        return false;
                    }

                    const mapped = mapGuestRow(data);
                    set((state) => {
                        const index = state.guests.findIndex((g) => g.id === id);
                        if (index !== -1) {
                            state.guests[index] = mapped as any;
                        }
                    });
                    clearSearchIndexCache();
                    return true;
                },

                removeGuest: async (id) => {
                    const supabase = createClient();

                    set((state) => {
                        state.guests = state.guests.filter((g) => g.id !== id);
                        state.guestProxies = state.guestProxies.filter(p => p.guestId !== id && p.proxyId !== id);
                        state.warnings = state.warnings.filter(w => w.guestId !== id);
                    });
                    clearSearchIndexCache();

                    // Cleanup related data in Supabase
                    await supabase.from('guest_proxies').delete().or(`guest_id.eq.${id},proxy_id.eq.${id}`);
                    await supabase.from('guest_warnings').delete().eq('guest_id', id);
                    const { error } = await supabase.from('guests').delete().eq('id', id);

                    if (error) {
                        console.error('Failed to delete guest from Supabase:', error);
                    }
                },

                banGuest: async (guestId, options) => {
                    const { guests } = get();
                    const supabase = createClient();
                    const target = guests.find((g) => g.id === guestId);
                    if (!target) return false;

                    const {
                        bannedUntil,
                        banReason = '',
                        bannedFromBicycle = false,
                        bannedFromMeals = false,
                        bannedFromShower = false,
                        bannedFromLaundry = false,
                    } = options;

                    const normalizedUntil = normalizeDateInputToISO(bannedUntil);
                    if (!normalizedUntil) throw new Error('Ban end time is required.');

                    const payload = {
                        ban_reason: banReason || null,
                        banned_until: normalizedUntil,
                        banned_at: new Date().toISOString(),
                        banned_from_bicycle: bannedFromBicycle,
                        banned_from_meals: bannedFromMeals,
                        banned_from_shower: bannedFromShower,
                        banned_from_laundry: bannedFromLaundry,
                    };

                    const { data, error } = await supabase
                        .from('guests')
                        .update(payload)
                        .eq('id', guestId)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to update ban in Supabase:', error);
                        throw new Error('Unable to update ban status.');
                    }

                    const mapped = mapGuestRow(data);
                    set((state) => {
                        const index = state.guests.findIndex((g) => g.id === guestId);
                        if (index !== -1) {
                            state.guests[index] = mapped as any;
                        }
                    });
                    return true;
                },

                clearGuestBan: async (guestId) => {
                    const supabase = createClient();
                    const payload = {
                        ban_reason: null,
                        banned_until: null,
                        banned_at: null,
                        banned_from_bicycle: false,
                        banned_from_meals: false,
                        banned_from_shower: false,
                        banned_from_laundry: false,
                    };

                    const { data, error } = await supabase
                        .from('guests')
                        .update(payload)
                        .eq('id', guestId)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to clear ban in Supabase:', error);
                        throw new Error('Unable to clear ban.');
                    }

                    const mapped = mapGuestRow(data);
                    set((state) => {
                        const index = state.guests.findIndex((g) => g.id === guestId);
                        if (index !== -1) {
                            state.guests[index] = mapped as any;
                        }
                    });
                    return true;
                },

                loadFromSupabase: async () => {
                    const supabase = createClient();
                    try {
                        const guestsData = await fetchAllPaginated(supabase, {
                            table: 'guests',
                            select: '*',
                            orderBy: 'updated_at',
                            ascending: false,
                            pageSize: 1000,
                            mapper: mapGuestRow,
                        });

                        set((state) => {
                            state.guests = (guestsData || []).map((g: any) => ({
                                ...g,
                                housingStatus: normalizeHousingStatus(g.housingStatus),
                            })) as any;
                        });
                        clearSearchIndexCache();
                    } catch (error) {
                        console.error('Failed to load guests from Supabase:', error);
                    }
                },

                loadGuestWarningsFromSupabase: async () => {
                    const supabase = createClient();
                    try {
                        const warningsData = await fetchAllPaginated(supabase, {
                            table: 'guest_warnings',
                            select: '*',
                            orderBy: 'created_at',
                            ascending: false,
                            pageSize: 1000,
                            mapper: mapGuestWarningRow,
                        });

                        set((state) => {
                            state.warnings = (warningsData || []) as any;
                        });
                    } catch (error) {
                        console.error('Failed to load guest warnings from Supabase:', error);
                    }
                },

                loadGuestProxiesFromSupabase: async () => {
                    const supabase = createClient();
                    try {
                        const { data, error } = await supabase
                            .from('guest_proxies')
                            .select('*');

                        if (error) throw error;

                        set((state) => {
                            state.guestProxies = (data || []).map(mapGuestProxyRow) as any;
                        });
                    } catch (error) {
                        console.error('Failed to load guest proxies from Supabase:', error);
                    }
                },

                clearGuests: () => {
                    set((state) => {
                        state.guests = [];
                    });
                    clearSearchIndexCache();
                },

                getWarningsForGuest: (guestId) => {
                    const { warnings } = get();
                    return (warnings || []).filter((w) => w.guestId === guestId && w.active);
                },

                addGuestWarning: async (guestId, { message, severity = 1, issuedBy = null } = {}) => {
                    const supabase = createClient();
                    const payload = {
                        guest_id: guestId,
                        message: String(message).trim(),
                        severity: Number(severity) || 1,
                        issued_by: issuedBy,
                        active: true,
                    };

                    const { data, error } = await supabase
                        .from('guest_warnings')
                        .insert(payload)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to add warning to Supabase:', error);
                        throw new Error('Unable to save warning.');
                    }

                    const mapped = mapGuestWarningRow(data);
                    set((state) => {
                        state.warnings.unshift(mapped as any);
                    });
                    return mapped as any;
                },

                removeGuestWarning: async (warningId) => {
                    const supabase = createClient();

                    set((state) => {
                        state.warnings = state.warnings.filter(w => w.id !== warningId);
                    });

                    const { error } = await supabase.from('guest_warnings').delete().eq('id', warningId);
                    if (error) {
                        console.error('Failed to delete warning from Supabase:', error);
                        return false;
                    }
                    return true;
                },

                getLinkedGuests: (guestId) => {
                    const { guests, guestProxies } = get();
                    const linkedIds = guestProxies
                        .filter(p => p.guestId === guestId)
                        .map(p => p.proxyId);
                    const reverseLinkedIds = guestProxies
                        .filter(p => p.proxyId === guestId)
                        .map(p => p.guestId);

                    const allLinkedIds = new Set([...linkedIds, ...reverseLinkedIds]);
                    return guests.filter(g => g && allLinkedIds.has(g.id));
                },

                getLinkedGuestsCount: (guestId) => {
                    const { guestProxies } = get();
                    const linkedIds = new Set();
                    guestProxies.forEach(p => {
                        if (p.guestId === guestId) linkedIds.add(p.proxyId);
                        if (p.proxyId === guestId) linkedIds.add(p.guestId);
                    });
                    return linkedIds.size;
                },

                linkGuests: async (guestId, proxyId) => {
                    const supabase = createClient();

                    const { data, error } = await supabase
                        .from('guest_proxies')
                        .insert({ guest_id: guestId, proxy_id: proxyId })
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to link guests in Supabase:', error);
                        throw new Error('Failed to link guests.');
                    }

                    const mapped = mapGuestProxyRow(data);
                    set((state) => {
                        state.guestProxies.push(mapped as any);
                    });
                    return mapped as any;
                },

                unlinkGuests: async (guestId, proxyId) => {
                    const supabase = createClient();

                    const { error } = await supabase
                        .from('guest_proxies')
                        .delete()
                        .or(`and(guest_id.eq.${guestId},proxy_id.eq.${proxyId}),and(guest_id.eq.${proxyId},proxy_id.eq.${guestId})`);

                    if (error) {
                        console.error('Failed to unlink guests in Supabase:', error);
                        return false;
                    }

                    set((state) => {
                        state.guestProxies = state.guestProxies.filter(
                            p => !(p.guestId === guestId && p.proxyId === proxyId) &&
                                !(p.guestId === proxyId && p.proxyId === guestId)
                        );
                    });
                    return true;
                },
            })),
            {
                name: 'hopes-corner-guests-v2',
            }
        ),
        { name: 'GuestsStore' }
    )
);
