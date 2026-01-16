import type { Guest } from '@/lib/types';

interface GuestNameResult {
    name: string;
    isResolved: boolean;
    isLoading: boolean;
}

export function resolveGuestName(
    guestId: string,
    guests: Guest[] | undefined,
    guestsLoading: boolean = false
): GuestNameResult {
    if (guestsLoading) {
        return {
            name: 'Loading...',
            isResolved: false,
            isLoading: true,
        };
    }

    if (!guests || guests.length === 0) {
        return {
            name: 'Loading...',
            isResolved: false,
            isLoading: true,
        };
    }

    const guest = guests.find((g) => g.id === guestId);

    if (!guest) {
        return {
            name: 'Unknown Guest',
            isResolved: false,
            isLoading: false,
        };
    }

    const resolvedName =
        guest.name ||
        guest.preferredName ||
        `${guest.firstName || ''} ${guest.lastName || ''}`.trim() ||
        'Guest';

    return {
        name: resolvedName,
        isResolved: true,
        isLoading: false,
    };
}

export function getGuestNameSafe(
    guestId: string,
    guests: Guest[] | undefined,
    guestsLoading: boolean = false
): string {
    return resolveGuestName(guestId, guests, guestsLoading).name;
}

export function createGuestNameResolver(
    guests: Guest[] | undefined,
    guestsLoading: boolean = false
): (guestId: string) => string {
    return (guestId: string) => getGuestNameSafe(guestId, guests, guestsLoading);
}
