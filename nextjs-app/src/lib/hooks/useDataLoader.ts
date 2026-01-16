import { useEffect, useState, useCallback, useRef } from 'react';
import { useGuestsStore } from '@/lib/stores/useGuestsStore';
import { useServicesStore } from '@/lib/stores/useServicesStore';
import { useEssentialsStore } from '@/lib/stores/useEssentialsStore';

interface DataLoaderState {
    isLoading: boolean;
    isGuestsLoaded: boolean;
    isServicesLoaded: boolean;
    isEssentialsLoaded: boolean;
    error: string | null;
}

interface DataLoaderResult extends DataLoaderState {
    reload: () => Promise<void>;
    isReady: boolean;
}

export function useDataLoader(): DataLoaderResult {
    const [state, setState] = useState<DataLoaderState>({
        isLoading: true,
        isGuestsLoaded: false,
        isServicesLoaded: false,
        isEssentialsLoaded: false,
        error: null,
    });

    const loadingRef = useRef(false);

    const { fetchGuests, isLoading: guestsLoading } = useGuestsStore();
    const { loadFromSupabase: loadServices, isLoading: servicesLoading } = useServicesStore();
    const { loadFromSupabase: loadEssentials, isLoading: essentialsLoading } = useEssentialsStore();

    const loadData = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            await fetchGuests();
            setState((prev) => ({ ...prev, isGuestsLoaded: true }));

            await Promise.all([
                loadServices(),
                loadEssentials(),
            ]);

            setState((prev) => ({
                ...prev,
                isServicesLoaded: true,
                isEssentialsLoaded: true,
                isLoading: false,
            }));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load data';
            setState((prev) => ({
                ...prev,
                error: message,
                isLoading: false,
            }));
        } finally {
            loadingRef.current = false;
        }
    }, [fetchGuests, loadServices, loadEssentials]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const isReady = state.isGuestsLoaded && state.isServicesLoaded;

    return {
        ...state,
        isLoading: state.isLoading || guestsLoading || servicesLoading || essentialsLoading,
        reload: loadData,
        isReady,
    };
}

export default useDataLoader;
