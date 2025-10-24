import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import KeyboardShortcutsHelp from "../KeyboardShortcutsHelp";

describe("KeyboardShortcutsHelp", () => {
  it("should not render when isOpen is false", () => {
    const { container } = render(
      <KeyboardShortcutsHelp isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render when isOpen is true", () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  it("should display all shortcut categories", () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();
  });

  it("should display search shortcut", () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Focus search")).toBeInTheDocument();
    expect(screen.getByText("⌘K / Ctrl+K")).toBeInTheDocument();
  });

  it("should display undo shortcut", () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Undo last action")).toBeInTheDocument();
    expect(screen.getByText("⌘Z / Ctrl+Z")).toBeInTheDocument();
  });

  it("should display create guest shortcut", () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Create new guest")).toBeInTheDocument();
    expect(screen.getByText("⌘⌥G / Ctrl+Alt+G")).toBeInTheDocument();
  });

  it("should display escape shortcut", () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Close modals/dialogs")).toBeInTheDocument();
    expect(screen.getByText("Esc")).toBeInTheDocument();
  });

  it("should display help shortcut", () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();
    const questionMarks = screen.getAllByText("?");
    expect(questionMarks.length).toBeGreaterThan(0);
  });

  it("should call onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText("Close keyboard shortcuts");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should show reminder about pressing ?", () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={vi.fn()} />);
    expect(
      screen.getByText(/Press.*anytime to view shortcuts/),
    ).toBeInTheDocument();
  });
});
