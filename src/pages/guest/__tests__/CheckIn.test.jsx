import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the components
vi.mock("../../../components/GuestList", () => ({
  default: () => <div>Guest List Mock</div>,
}));

vi.mock("../../../components/ServiceStatusOverview", () => ({
  default: ({ onShowerClick, onLaundryClick }) => (
    <div data-testid="service-overview">
      <button onClick={onShowerClick} data-testid="shower-click-btn">
        Click Shower
      </button>
      <button onClick={onLaundryClick} data-testid="laundry-click-btn">
        Click Laundry
      </button>
    </div>
  ),
}));

let mockContext = {
  setActiveTab: vi.fn(),
};

vi.mock("../../../context/useAppContext", () => ({
  useAppContext: () => mockContext,
}));

import CheckIn from "../CheckIn";

describe("CheckIn", () => {
  beforeEach(() => {
    mockContext.setActiveTab = vi.fn();
    vi.clearAllMocks();
  });

  it("renders the check-in page", () => {
    render(<CheckIn />);
    expect(screen.getByText("Guest Search & Check-In")).toBeInTheDocument();
  });

  it("renders the service status overview", () => {
    render(<CheckIn />);
    expect(screen.getByTestId("service-overview")).toBeInTheDocument();
  });

  it("calls setActiveTab with 'services' when shower card is clicked", async () => {
    render(<CheckIn />);

    const showerBtn = screen.getByTestId("shower-click-btn");
    await userEvent.click(showerBtn);

    expect(mockContext.setActiveTab).toHaveBeenCalledWith("services");
  });

  it("calls setActiveTab with 'services' when laundry card is clicked", async () => {
    render(<CheckIn />);

    const laundryBtn = screen.getByTestId("laundry-click-btn");
    await userEvent.click(laundryBtn);

    expect(mockContext.setActiveTab).toHaveBeenCalledWith("services");
  });

  it("passes onShowerClick callback to ServiceStatusOverview", () => {
    render(<CheckIn />);

    const showerBtn = screen.getByTestId("shower-click-btn");
    expect(showerBtn).toBeInTheDocument();
  });

  it("passes onLaundryClick callback to ServiceStatusOverview", () => {
    render(<CheckIn />);

    const laundryBtn = screen.getByTestId("laundry-click-btn");
    expect(laundryBtn).toBeInTheDocument();
  });

  it("renders guest list component", () => {
    render(<CheckIn />);
    expect(screen.getByText("Guest List Mock")).toBeInTheDocument();
  });
});
