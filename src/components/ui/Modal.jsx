import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const focusableSelectors = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
];

const getFocusable = (root) => {
  if (!root) return [];
  return Array.from(root.querySelectorAll(focusableSelectors.join(","))).filter(
    (node) =>
      node.offsetParent !== null ||
      node.getAttribute("aria-hidden") === "false",
  );
};

const usePortalNode = (isOpen) => {
  const [portalNode, setPortalNode] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setPortalNode(null);
      return undefined;
    }

    const el = document.createElement("div");
    el.setAttribute("data-modal-root", "");
    document.body.appendChild(el);
    setPortalNode(el);

    return () => {
      setPortalNode(null);
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };
  }, [isOpen]);

  return portalNode;
};

const Modal = ({
  isOpen,
  onClose,
  labelledBy,
  describedBy,
  children,
  initialFocusRef,
  restoreFocus = true,
}) => {
  const contentRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const portalNode = usePortalNode(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    previousActiveElementRef.current = document.activeElement;
    const content = contentRef.current;
    const fallbackFocus = initialFocusRef?.current;

    const focusNextFrame = () => {
      const focusables = getFocusable(content);
      if (fallbackFocus) {
        fallbackFocus.focus({ preventScroll: true });
        return;
      }
      if (focusables.length > 0) {
        focusables[0].focus({ preventScroll: true });
      } else if (content) {
        content.focus({ preventScroll: true });
      }
    };

    const frame = requestAnimationFrame(focusNextFrame);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = prevOverflow;
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus({ preventScroll: true });
      }
    };
  }, [initialFocusRef, isOpen, restoreFocus]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = getFocusable(contentRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    },
    [onClose],
  );

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) {
        onClose?.();
      }
    },
    [onClose],
  );

  const describedbyAttr = useMemo(
    () =>
      Array.isArray(describedBy)
        ? describedBy.filter(Boolean).join(" ")
        : describedBy || undefined,
    [describedBy],
  );

  if (!isOpen || !portalNode) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={contentRef}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedbyAttr}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>,
    portalNode,
  );
};

export default Modal;
