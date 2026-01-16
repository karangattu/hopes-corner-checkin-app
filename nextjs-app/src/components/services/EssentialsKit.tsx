'use client';

import React from 'react';
import { Shirt, Bed, Backpack, Tent, Footprints } from 'lucide-react';
import { useEssentialsStore } from '@/lib/stores/useEssentialsStore';
import { ESSENTIAL_ITEMS, ESSENTIAL_ITEM_LABELS } from '@/lib/constants';
import type { EssentialItemKey } from '@/lib/constants';
import enhancedToast from '@/utils/toast';

interface EssentialsKitProps {
    guestId: string;
}

const ITEM_ICONS: Record<EssentialItemKey, React.ElementType> = {
    tshirt: Shirt,
    sleeping_bag: Bed,
    backpack: Backpack,
    tent: Tent,
    flip_flops: Footprints,
};

const ITEM_KEYS: EssentialItemKey[] = [
    ESSENTIAL_ITEMS.TSHIRT,
    ESSENTIAL_ITEMS.SLEEPING_BAG,
    ESSENTIAL_ITEMS.BACKPACK,
    ESSENTIAL_ITEMS.TENT,
    ESSENTIAL_ITEMS.FLIP_FLOPS,
];

export function EssentialsKit({ guestId }: EssentialsKitProps) {
    const { giveItem, canGiveItem, getDaysUntilAvailable, getLastGivenItem } =
        useEssentialsStore();

    const handleGiveItem = async (item: EssentialItemKey) => {
        try {
            await giveItem(guestId, item);
            enhancedToast.success(`${ESSENTIAL_ITEM_LABELS[item]} given`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to give item';
            enhancedToast.error(message);
        }
    };

    const itemsData = ITEM_KEYS.map((item) => {
        const canGive = canGiveItem(guestId, item);
        const daysRemaining = getDaysUntilAvailable(guestId, item);
        const lastRecord = getLastGivenItem(guestId, item);
        return { item, canGive, daysRemaining, lastRecord };
    });

    const availableCount = itemsData.filter((d) => d.canGive).length;

    return (
        <div className="space-y-4" data-testid="essentials-kit">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Essentials Kit
                </h4>
                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">
                    {availableCount} available
                </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {itemsData.map(({ item, canGive, daysRemaining, lastRecord }) => {
                    const Icon = ITEM_ICONS[item];
                    const label = ESSENTIAL_ITEM_LABELS[item];

                    return (
                        <div
                            key={item}
                            data-testid={`essential-item-${item}`}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${canGive
                                    ? 'bg-white dark:bg-gray-800 border-emerald-100 dark:border-emerald-800 hover:border-emerald-300'
                                    : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 opacity-75'
                                }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className={`p-2 rounded-lg ${canGive
                                            ? 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                        }`}
                                >
                                    <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                        {label}
                                    </div>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                        {canGive ? (
                                            lastRecord ? (
                                                `Last: ${new Date(lastRecord.date).toLocaleDateString()}`
                                            ) : (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                    Never given
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-amber-600 dark:text-amber-400">
                                                Available in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                disabled={!canGive}
                                onClick={() => handleGiveItem(item)}
                                data-testid={`give-${item}-btn`}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${canGive
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                Give {label.split('/')[0]}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default EssentialsKit;
