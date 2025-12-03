import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MainLayout from "../MainLayout";

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: { role: "board", name: "Board User" }, logout: vi.fn() }),
}));

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => ({ activeTab: "admin", setActiveTab: vi.fn(), settings: {} }),
}));

describe("MainLayout with role 'board'", () => {
  it("shows only the Admin Dashboard nav item and hides others", () => {
    render(
      <MainLayout>
        <div>child</div>
      </MainLayout>
    );

    const checkInButtons = screen.queryAllByRole("button", { name: /Check In/i });
    const servicesButtons = screen.queryAllByRole("button", { name: /Services/i });
    const adminButtons = screen.queryAllByRole("button", { name: /Admin Dashboard/i });

    expect(checkInButtons.length).toBe(0);
    expect(servicesButtons.length).toBe(0);
    expect(adminButtons.length).toBeGreaterThan(0);
    // Header should show the Board label
    expect(screen.getByText(/\(Board - read-only\)/i)).toBeInTheDocument();
  });
});
