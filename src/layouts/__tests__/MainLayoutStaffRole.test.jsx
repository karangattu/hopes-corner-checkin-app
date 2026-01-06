import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MainLayout from "../MainLayout";

vi.mock("../../context/useAuth", () => ({
    useAuth: () => ({ user: { role: "staff", name: "Staff User" }, logout: vi.fn() }),
}));

vi.mock("../../context/useAppContext", () => ({
    useAppContext: () => ({ activeTab: "check-in", setActiveTab: vi.fn(), settings: {} }),
}));

describe("MainLayout with role 'staff'", () => {
    it("shows Check In, Services, and Dashboard nav items", () => {
        render(
            <MainLayout>
                <div>child</div>
            </MainLayout>
        );

        const checkInButtons = screen.queryAllByRole("button", { name: /Check In/i });
        const servicesButtons = screen.queryAllByRole("button", { name: /Services/i });
        const adminButtons = screen.queryAllByRole("button", { name: /Dashboard/i });

        expect(checkInButtons.length).toBeGreaterThan(0);
        expect(servicesButtons.length).toBeGreaterThan(0);
        expect(adminButtons.length).toBeGreaterThan(0);

        // Header should show the Staff label
        expect(screen.getByText(/Staff/i)).toBeInTheDocument();
    });
});
