import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient, isSupabaseEnabled } from '@/lib/supabase/client';
import type { ItemRecord } from '@/lib/types';
import type { EssentialItemKey } from '@/lib/constants';

interface ItemDistributedRow {
    id: string;
    guest_id: string;
    item_key: EssentialItemKey;
    distributed_at: string;
}

function mapItemRow(row: ItemDistributedRow): ItemRecord {
    return {
        id: row.id,
        guestId: row.guest_id,
        item: row.item_key,
        date: row.distributed_at,
    };
}

function getNextAvailabilityDate(
    item: EssentialItemKey,
    lastDateISO: string
): Date | null {
    if (!lastDateISO) return null;
    const last = new Date(lastDateISO);
    last.setHours(0, 0, 0, 0);

    if (item === 'tshirt') {
        const day = last.getDay();
        let daysUntilNextMon = (8 - day) % 7;
        if (daysUntilNextMon === 0) daysUntilNextMon = 7;
        const next = new Date(last);
        next.setDate(last.getDate() + daysUntilNextMon);
        return next;
    }

    if (
        item === 'sleeping_bag' ||
        item === 'backpack' ||
        item === 'tent' ||
        item === 'flip_flops'
    ) {
        const next = new Date(last);
        next.setDate(next.getDate() + 30);
        next.setHours(0, 0, 0, 0);
        return next;
    }

    return null;
}

interface EssentialsState {
    itemRecords: ItemRecord[];
    isLoading: boolean;
    error: string | null;
}

interface EssentialsActions {
    giveItem: (guestId: string, item: EssentialItemKey) => Promise<ItemRecord>;
    loadFromSupabase: () => Promise<void>;
    getLastGivenItem: (guestId: string, item: EssentialItemKey) => ItemRecord | null;
    canGiveItem: (guestId: string, item: EssentialItemKey) => boolean;
    getDaysUntilAvailable: (guestId: string, item: EssentialItemKey) => number;
    clearItemRecords: () => void;
}

type EssentialsStore = EssentialsState & EssentialsActions;

export const useEssentialsStore = create<EssentialsStore>()(
    devtools(
        persist(
            immer((set, get) => ({
                itemRecords: [],
                isLoading: false,
                error: null,

                giveItem: async (
                    guestId: string,
                    item: EssentialItemKey
                ): Promise<ItemRecord> => {
                    const state = get();
                    if (!state.canGiveItem(guestId, item)) {
                        throw new Error('Limit reached for this item based on last given date.');
                    }

                    const now = new Date().toISOString();

                    if (isSupabaseEnabled()) {
                        const supabase = createClient();
                        const { data, error } = await supabase
                            .from('items_distributed')
                            .insert({ guest_id: guestId, item_key: item, distributed_at: now })
                            .select()
                            .single();

                        if (error) {
                            console.error('Failed to record distributed item:', error);
                            throw new Error('Unable to log item distribution.');
                        }

                        const record = mapItemRow(data);
                        set((state) => {
                            state.itemRecords.unshift(record);
                        });
                        return record;
                    }

                    const fallbackRecord: ItemRecord = {
                        id: `local-${Date.now()}`,
                        guestId,
                        item,
                        date: now,
                    };
                    set((state) => {
                        state.itemRecords.unshift(fallbackRecord);
                    });
                    return fallbackRecord;
                },

                loadFromSupabase: async (): Promise<void> => {
                    if (!isSupabaseEnabled()) return;

                    set((state) => {
                        state.isLoading = true;
                        state.error = null;
                    });

                    try {
                        const supabase = createClient();
                        const { data, error } = await supabase
                            .from('items_distributed')
                            .select('*')
                            .order('distributed_at', { ascending: false })
                            .limit(1000);

                        if (error) {
                            throw error;
                        }

                        set((state) => {
                            state.itemRecords = (data || []).map(mapItemRow);
                            state.isLoading = false;
                        });
                    } catch (err) {
                        const message = err instanceof Error ? err.message : 'Failed to load items';
                        set((state) => {
                            state.error = message;
                            state.isLoading = false;
                        });
                    }
                },

                getLastGivenItem: (
                    guestId: string,
                    item: EssentialItemKey
                ): ItemRecord | null => {
                    const { itemRecords } = get();
                    const recs = itemRecords.filter(
                        (r) => r.guestId === guestId && r.item === item
                    );
                    if (recs.length === 0) return null;
                    return recs.reduce((a, b) =>
                        new Date(a.date) > new Date(b.date) ? a : b
                    );
                },

                canGiveItem: (guestId: string, item: EssentialItemKey): boolean => {
                    const last = get().getLastGivenItem(guestId, item);
                    if (!last) return true;
                    const next = getNextAvailabilityDate(item, last.date);
                    if (!next) return true;
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    return now >= next;
                },

                getDaysUntilAvailable: (
                    guestId: string,
                    item: EssentialItemKey
                ): number => {
                    const last = get().getLastGivenItem(guestId, item);
                    if (!last) return 0;
                    const next = getNextAvailabilityDate(item, last.date);
                    if (!next) return 0;
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const diffMs = next.getTime() - now.getTime();
                    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    return days > 0 ? days : 0;
                },

                clearItemRecords: (): void => {
                    set((state) => {
                        state.itemRecords = [];
                        state.isLoading = false;
                        state.error = null;
                    });
                },
            })),
            {
                name: 'essentials-storage',
                partialize: (state) => ({
                    itemRecords: state.itemRecords,
                }),
            }
        ),
        { name: 'EssentialsStore' }
    )
);

export { getNextAvailabilityDate };
