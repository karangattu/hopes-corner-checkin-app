import { useCallback, useRef, useState } from "react";

const DEFAULT_THRESHOLD = 72;
const DEFAULT_IGNORE_SELECTOR = "button, select, input, textarea, [data-swipe-ignore]";

const clampTranslate = (value, direction) => {
  const limit = 160;
  if (direction === "left") {
    return Math.max(Math.min(value, 0), -limit);
  }
  return Math.min(Math.max(value, 0), limit);
};

const useSwipeToComplete = ({
  onComplete,
  threshold = DEFAULT_THRESHOLD,
  direction = "left",
  ignoreSelector = DEFAULT_IGNORE_SELECTOR,
} = {}) => {
  const [translateX, setTranslateX] = useState(0);
  const startXRef = useRef(0);
  const activeRef = useRef(false);
  const latestTranslateRef = useRef(0);

  const updateTranslate = useCallback((value) => {
    latestTranslateRef.current = value;
    setTranslateX(value);
  }, []);

  const handleTouchStart = useCallback(
    (event) => {
      if (!event.touches || event.touches.length !== 1) return;

      if (
        ignoreSelector &&
        event.target instanceof Element &&
        event.target.closest(ignoreSelector)
      ) {
        activeRef.current = false;
        return;
      }

      activeRef.current = true;
      startXRef.current = event.touches[0].clientX;
    },
    [ignoreSelector],
  );

  const handleTouchMove = useCallback(
    (event) => {
      if (!activeRef.current) return;
      if (!event.touches || event.touches.length !== 1) return;

      const currentX = event.touches[0].clientX;
      const delta = currentX - startXRef.current;
      const validDirection =
        (direction === "left" && delta < 0) ||
        (direction === "right" && delta > 0);

      if (!validDirection) {
        updateTranslate(0);
        return;
      }

      event.preventDefault();
      const eased = clampTranslate(delta * 0.6, direction);
      updateTranslate(eased);
    },
    [direction, updateTranslate],
  );

  const finishGesture = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;

    const magnitude = Math.abs(latestTranslateRef.current);
    if (magnitude >= threshold) {
      onComplete?.();
    }

    updateTranslate(0);
  }, [onComplete, threshold, updateTranslate]);

  return {
    translateX,
    progress: Math.min(Math.abs(translateX) / threshold, 1),
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd: finishGesture,
    handleTouchCancel: finishGesture,
  };
};

export default useSwipeToComplete;
