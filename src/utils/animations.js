import React, { useEffect, useMemo, useState } from "react";
import { useSpring, useTrail, animated, config } from "@react-spring/web";

export const useFadeInUp = (deps = []) =>
  useSpring({
    from: { opacity: 0, y: 8 },
    to: { opacity: 1, y: 0 },
    config: { tension: 220, friction: 20 },
    reset: false,
    deps,
  });

export const useScaleIn = (deps = []) =>
  useSpring({
    from: { opacity: 0, scale: 0.98 },
    to: { opacity: 1, scale: 1 },
    config: { tension: 250, friction: 18 },
    reset: false,
    deps,
  });

export const useStagger = (length, open = true) =>
  useTrail(length, {
    opacity: open ? 1 : 0,
    y: open ? 0 : 8,
    config: { mass: 1, tension: 220, friction: 20 },
  });

export const iconHoverProps = {
  className:
    "transition-transform duration-200 will-change-transform hover:scale-110",
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(!!mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);
  return reduced;
};

export const useIconHoverSpring = (options = {}) => {
  const {
    scale = 1.12,
    lift = 1,
    tension = 300,
    friction = 16,
    tapDuration = 180,
  } = options;
  const prefersReduced = usePrefersReducedMotion();
  const [active, setActive] = useState(false);

  const spring = useSpring({
    to: {
      scale: prefersReduced ? 1 : active ? scale : 1,
      y: prefersReduced ? 0 : active ? -lift : 0,
    },
    config: { tension, friction },
  });

  const handlers = useMemo(
    () => ({
      onMouseEnter: () => setActive(true),
      onMouseLeave: () => setActive(false),
      onFocus: () => setActive(true),
      onBlur: () => setActive(false),
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") setActive(true);
      },
      onKeyUp: () => setActive(false),
      onTouchStart: () => {
        setActive(true);
        window.setTimeout(() => setActive(false), tapDuration);
      },
    }),
    [tapDuration],
  );

  return { style: spring, handlers };
};

export const SpringIcon = ({
  children,
  className = "",
  options = {},
  ...rest
}) => {
  const { style, handlers } = useIconHoverSpring(options);
  const mergedClass = `inline-flex items-center justify-center will-change-transform ${className}`;
  return React.createElement(
    animated.span,
    {
      style,
      className: mergedClass,
      role: rest.role || "img",
      "aria-hidden": rest["aria-hidden"] ?? "true",
      ...handlers,
      ...rest,
    },
    children,
  );
};

export { animated, config };
