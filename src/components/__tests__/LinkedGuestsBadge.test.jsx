import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkedGuestsBadge from "../guest/LinkedGuestsBadge";

describe("LinkedGuestsBadge", () => {
  const mockLinkedGuests = [
    { id: "g1", name: "Jane Smith", firstName: "Jane", lastName: "Smith", preferredName: "" },
    { id: "g2", name: "Bob Wilson", firstName: "Bob", lastName: "Wilson", preferredName: "Bobby" },
  ];

  it("returns null when there are no linked guests", () => {
    const { container } = render(
      <LinkedGuestsBadge linkedGuests={[]} onSelectGuest={vi.fn()} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it("returns null when linkedGuests is undefined", () => {
    const { container } = render(
      <LinkedGuestsBadge linkedGuests={undefined} onSelectGuest={vi.fn()} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it("renders compact badge with count when compact=true", () => {
    render(
      <LinkedGuestsBadge
        linkedGuests={mockLinkedGuests}
        onSelectGuest={vi.fn()}
        compact={true}
      />
    );
    
    expect(screen.getByText("2 linked")).toBeInTheDocument();
  });

  it("renders full view with guest buttons when compact=false", () => {
    render(
      <LinkedGuestsBadge
        linkedGuests={mockLinkedGuests}
        onSelectGuest={vi.fn()}
        compact={false}
      />
    );
    
    expect(screen.getByText("Linked Guests (2)")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bobby")).toBeInTheDocument();
  });

  it("shows legal name for guests with preferred name", () => {
    render(
      <LinkedGuestsBadge
        linkedGuests={mockLinkedGuests}
        onSelectGuest={vi.fn()}
        compact={false}
      />
    );
    
    expect(screen.getByText("Bobby")).toBeInTheDocument();
    expect(screen.getByText("Bob Wilson")).toBeInTheDocument();
  });

  it("calls onSelectGuest when a guest button is clicked", async () => {
    const user = userEvent.setup();
    const onSelectGuest = vi.fn();
    
    render(
      <LinkedGuestsBadge
        linkedGuests={mockLinkedGuests}
        onSelectGuest={onSelectGuest}
        compact={false}
      />
    );
    
    const janeButton = screen.getByRole("button", { name: /Jane Smith/i });
    await user.click(janeButton);
    
    expect(onSelectGuest).toHaveBeenCalledWith(mockLinkedGuests[0]);
  });

  it("displays help text in full view", () => {
    render(
      <LinkedGuestsBadge
        linkedGuests={mockLinkedGuests}
        onSelectGuest={vi.fn()}
        compact={false}
      />
    );
    
    expect(screen.getByText("Click a linked guest to quickly assign meals")).toBeInTheDocument();
  });

  it("handles single linked guest correctly", () => {
    const singleGuest = [{ id: "g1", name: "Jane Smith", preferredName: "" }];
    
    render(
      <LinkedGuestsBadge
        linkedGuests={singleGuest}
        onSelectGuest={vi.fn()}
        compact={true}
      />
    );
    
    expect(screen.getByText("1 linked")).toBeInTheDocument();
  });

  it("renders full view by default when compact prop is not provided", () => {
    render(
      <LinkedGuestsBadge
        linkedGuests={mockLinkedGuests}
        onSelectGuest={vi.fn()}
      />
    );
    
    // Should show the full view elements
    expect(screen.getByText("Linked Guests (2)")).toBeInTheDocument();
  });
});
