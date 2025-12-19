'use client';

import { useCallback, useEffect, useRef, useState, RefObject } from 'react';
import haptics from '@/utils/haptics';

const DEFAULT_IGNORE_SCROLL_TOP = 2;

interface UsePullToRefreshOptions {
  containerRef: RefObject<HTMLElement | null>;
  onRefresh?: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
  ignoreScrollTop?: number;
}

interface UsePullToRefreshReturn {
  pullDistance: number;
  readyToRefresh: boolean;
  isRefreshing: boolean;
  resetGesture: () => void;
}

interface GestureState {
  startY: number;
  pulling: boolean;
  thresholdReached: boolean;
}

const defaultAsync = async () => {};

export function usePullToRefresh({
  containerRef,
  onRefresh = defaultAsync,
  threshold = 72,
  disabled = false,
  ignoreScrollTop = DEFAULT_IGNORE_SCROLL_TOP,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const gestureStateRef = useRef<GestureState>({
    startY: 0,
    pulling: false,
    thresholdReached: false,
  });
  const [pullDistance, setPullDistance] = useState(0);
  const [readyToRefresh, setReadyToRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const resetGesture = useCallback(() => {
    gestureStateRef.current = {
      startY: 0,
      pulling: false,
      thresholdReached: false,
    };
    setPullDistance(0);
    setReadyToRefresh(false);
  }, []);

  useEffect(() => {
    const node = containerRef?.current;
    if (!node || disabled) return undefined;

    const handleTouchStart = (event: TouchEvent) => {
      if (isRefreshing) return;
      if (node.scrollTop > ignoreScrollTop) return;
      if (!event.touches || event.touches.length !== 1) return;

      const startY = event.touches[0].clientY;
      gestureStateRef.current = {
        startY,
        pulling: true,
        thresholdReached: false,
      };
      setReadyToRefresh(false);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const state = gestureStateRef.current;
      if (!state.pulling) return;
      if (!event.touches || event.touches.length !== 1) return;

      const currentY = event.touches[0].clientY;
      const delta = currentY - state.startY;
      if (delta <= 0) {
        setPullDistance(0);
        if (state.thresholdReached) {
          state.thresholdReached = false;
          setReadyToRefresh(false);
        }
        return;
      }

      event.preventDefault();

      const eased = Math.min(delta * 0.5, threshold * 2);
      setPullDistance(eased);

      if (eased >= threshold && !state.thresholdReached) {
        state.thresholdReached = true;
        setReadyToRefresh(true);
        haptics.selection();
      } else if (eased < threshold && state.thresholdReached) {
        state.thresholdReached = false;
        setReadyToRefresh(false);
      }
    };

    const handleTouchEnd = async () => {
      const state = gestureStateRef.current;
      if (!state.pulling) return;

      const shouldRefresh = state.thresholdReached && !isRefreshing;
      resetGesture();

      if (!shouldRefresh) return;

      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    };

    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd);
    node.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
      node.removeEventListener('touchend', handleTouchEnd);
      node.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, disabled, ignoreScrollTop, isRefreshing, onRefresh, resetGesture, threshold]);

  return {
    pullDistance,
    readyToRefresh,
    isRefreshing,
    resetGesture,
  };
}

export default usePullToRefresh;
