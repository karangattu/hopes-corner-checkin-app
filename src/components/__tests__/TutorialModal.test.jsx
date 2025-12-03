import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TutorialModal from "../TutorialModal";

describe("TutorialModal", () => {
  it("should not render when isOpen is false", () => {
    const { container } = render(
      <TutorialModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render when isOpen is true", () => {
    render(<TutorialModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Welcome to Hope's Corner!")).toBeInTheDocument();
  });

  it("should display step indicator", () => {
    render(<TutorialModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Step 1 of/)).toBeInTheDocument();
  });

  it("should navigate to next step when Next button is clicked", () => {
    render(<TutorialModal isOpen={true} onClose={vi.fn()} />);

    // Should be on step 1 initially
    expect(screen.getByText("Welcome to Hope's Corner!")).toBeInTheDocument();

    // Click Next
    fireEvent.click(screen.getByText("Next"));

    // Should be on step 2
    expect(screen.getByText("Guest Check-In")).toBeInTheDocument();
  });

  it("should navigate to previous step when Back button is clicked", () => {
    render(<TutorialModal isOpen={true} onClose={vi.fn()} />);

    // Go to step 2
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Guest Check-In")).toBeInTheDocument();

    // Click Back
    fireEvent.click(screen.getByText("Back"));

    // Should be back on step 1
    expect(screen.getByText("Welcome to Hope's Corner!")).toBeInTheDocument();
  });

  it("should disable Back button on first step", () => {
    render(<TutorialModal isOpen={true} onClose={vi.fn()} />);

    const backButton = screen.getByText("Back").closest("button");
    expect(backButton).toBeDisabled();
  });

  it("should call onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<TutorialModal isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText("Close tutorial");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when Skip tutorial is clicked", () => {
    const onClose = vi.fn();
    render(<TutorialModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText("Skip tutorial"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should show Get Started button on last step", () => {
    render(<TutorialModal isOpen={true} onClose={vi.fn()} />);

    // Navigate to last step (8 steps total, so click Next 7 times)
    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByText("Next"));
    }

    expect(screen.getByText("Get Started")).toBeInTheDocument();
    expect(screen.getByText("You're Ready!")).toBeInTheDocument();
  });

  it("should close modal when Get Started is clicked on last step", () => {
    const onClose = vi.fn();
    render(<TutorialModal isOpen={true} onClose={onClose} />);

    // Navigate to last step
    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByText("Next"));
    }

    // Click Get Started
    fireEvent.click(screen.getByText("Get Started"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should allow navigation via progress dots", () => {
    render(<TutorialModal isOpen={true} onClose={vi.fn()} />);

    // Click on step 3 dot (index 2)
    const dots = screen.getAllByRole("button", { name: /Go to step/ });
    fireEvent.click(dots[2]);

    // Should be on step 3 - Managing Services
    expect(screen.getByText("Managing Services")).toBeInTheDocument();
  });

  it("should display tutorial content about showers", () => {
    render(<TutorialModal isOpen={true} onClose={vi.fn()} />);

    // Navigate to services step
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText(/Showers/)).toBeInTheDocument();
    expect(screen.getByText(/Laundry/)).toBeInTheDocument();
  });

  it("should mention common waiver in laundry tracking step", () => {
    render(<TutorialModal isOpen={true} onClose={vi.fn()} />);

    // Navigate to laundry tracking step (step 5)
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText("Next"));
    }

    expect(screen.getByText(/common waiver/i)).toBeInTheDocument();
  });

  it("should display keyboard shortcuts info", () => {
    render(<TutorialModal isOpen={true} onClose={vi.fn()} />);

    // Navigate to keyboard shortcuts step (step 7)
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText("Next"));
    }

    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    expect(screen.getByText(/Open keyboard shortcuts help/)).toBeInTheDocument();
  });

  it("should reset to step 1 when reopened after closing", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <TutorialModal isOpen={true} onClose={onClose} />
    );

    // Navigate to step 3
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));

    // Close the modal
    fireEvent.click(screen.getByText("Skip tutorial"));

    // Reopen the modal
    rerender(<TutorialModal isOpen={true} onClose={onClose} />);

    // Should be back on step 1
    expect(screen.getByText("Welcome to Hope's Corner!")).toBeInTheDocument();
  });
});
