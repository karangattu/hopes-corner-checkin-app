import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock @react-spring/web
vi.mock("@react-spring/web", () => ({
  useSpring: vi.fn(() => ({ opacity: 1, y: 0 })),
  useTrail: vi.fn(() => [{ opacity: 1, y: 0 }]),
  animated: {
    span: ({ children, ...props }) =>
      React.createElement("span", props, children),
  },
  config: { default: {} },
}));

import {
  useFadeInUp,
  useScaleIn,
  useStagger,
  iconHoverProps,
  SpringIcon,
} from "../animations";

describe("animations", () => {
  it("useFadeInUp returns spring config", () => {
    const result = useFadeInUp();
    expect(result).toEqual({ opacity: 1, y: 0 });
  });

  it("useScaleIn returns spring config", () => {
    const result = useScaleIn();
    expect(result).toEqual({ opacity: 1, y: 0 });
  });

  it("useStagger returns trail config", () => {
    const result = useStagger(3);
    expect(result).toEqual([{ opacity: 1, y: 0 }]);
  });

  it("iconHoverProps has correct className", () => {
    expect(iconHoverProps.className).toBe(
      "transition-transform duration-200 will-change-transform hover:scale-110",
    );
  });

  it("SpringIcon renders with animated span", () => {
    render(<SpringIcon>Test Icon</SpringIcon>);

    const span = screen.getByRole("img", { hidden: true });
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent("Test Icon");
    expect(span).toHaveClass(
      "inline-flex",
      "items-center",
      "justify-center",
      "will-change-transform",
    );
  });
});
