import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for responsive breakpoint detection.
 * Uses matchMedia API for efficient, event-driven updates.
 * 
 * @param {string} query - CSS media query string (e.g., '(max-width: 640px)')
 * @returns {boolean} - Whether the media query matches
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 640px)');
 * const isTablet = useMediaQuery('(max-width: 1024px)');
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 */
export function useMediaQuery(query) {
    // Initialize with SSR-safe check
    const getMatches = useCallback(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    }, [query]);

    const [matches, setMatches] = useState(getMatches);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);

        // Set initial value (in case it changed between render and effect)
        setMatches(mediaQuery.matches);

        // Handler for media query changes
        const handler = (event) => setMatches(event.matches);

        // Modern API with fallback for older browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handler);
        } else {
            // Fallback for older Safari
            mediaQuery.addListener(handler);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handler);
            } else {
                mediaQuery.removeListener(handler);
            }
        };
    }, [query]);

    return matches;
}

// Pre-defined breakpoint hooks for convenience
export function useIsMobile() {
    return useMediaQuery('(max-width: 640px)');
}

export function useIsTablet() {
    return useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
}

export function useIsTabletOrMobile() {
    return useMediaQuery('(max-width: 1024px)');
}

export function useIsDesktop() {
    return useMediaQuery('(min-width: 1025px)');
}

export function usePrefersReducedMotion() {
    return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export default useMediaQuery;
