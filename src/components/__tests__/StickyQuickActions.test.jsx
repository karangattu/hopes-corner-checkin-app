import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StickyQuickActions from "../StickyQuickActions";

describe("StickyQuickActions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders touch-friendly buttons and triggers handlers", () => {
    const onShower = vi.fn();
    const onLaundry = vi.fn();
    const onDonation = vi.fn();

    render(
      <StickyQuickActions
        device="touch"
        isVisible
        onShowerClick={onShower}
        onLaundryClick={onLaundry}
        onDonationClick={onDonation}
      />,
    );

    const showerButton = screen.getByLabelText("Add shower booking");
    fireEvent.click(showerButton);
    expect(onShower).toHaveBeenCalledTimes(1);

    const laundryButton = screen.getByLabelText("Add laundry booking");
    fireEvent.click(laundryButton);
    expect(onLaundry).toHaveBeenCalledTimes(1);

    const donationButton = screen.getByLabelText("Add donation");
    fireEvent.click(donationButton);
    expect(onDonation).toHaveBeenCalledTimes(1);
  });

  it("exposes keyboard shortcuts on pointer devices", () => {
    const onShower = vi.fn();

    render(
      <StickyQuickActions
        device="pointer"
        isVisible
        onShowerClick={onShower}
        onLaundryClick={() => {}}
        onDonationClick={() => {}}
      />,
    );

    const showerButton = screen.getByRole("button", {
      name: /Shower Booking/i,
    });

    expect(showerButton).toHaveAttribute("aria-keyshortcuts", "Shift+S");

    fireEvent.keyDown(window, { key: "S", shiftKey: true });
    expect(onShower).toHaveBeenCalledTimes(1);
  });

  it("honors visibility flag", () => {
    const { container } = render(
      <StickyQuickActions
        device="touch"
        isVisible={false}
        onShowerClick={() => {}}
        onLaundryClick={() => {}}
        onDonationClick={() => {}}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
