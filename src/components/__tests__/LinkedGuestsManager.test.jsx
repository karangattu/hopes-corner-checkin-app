import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkedGuestsManager from "../guest/LinkedGuestsManager";

// Mock haptics
vi.mock("../../../utils/haptics", () => ({
  default: {
    buttonPress: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    selection: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("LinkedGuestsManager", () => {
  const mockGuest = {
    id: "g1",
    name: "John Doe",
    firstName: "John",
    lastName: "Doe",
    preferredName: "",
  };

  const mockAllGuests = [
    mockGuest,
    { id: "g2", name: "Jane Smith", firstName: "Jane", lastName: "Smith", preferredName: "" },
    { id: "g3", name: "Bob Wilson", firstName: "Bob", lastName: "Wilson", preferredName: "Bobby" },
    { id: "g4", name: "Alice Brown", firstName: "Alice", lastName: "Brown", preferredName: "" },
  ];

  const defaultProps = {
    guest: mockGuest,
    allGuests: mockAllGuests,
    linkedGuests: [],
    onLinkGuest: vi.fn(),
    onUnlinkGuest: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the component with header", () => {
    render(<LinkedGuestsManager {...defaultProps} />);
    
    expect(screen.getByText("Linked Guests")).toBeInTheDocument();
    expect(screen.getByText("0/3")).toBeInTheDocument();
  });

  it("shows empty state when no linked guests", () => {
    render(<LinkedGuestsManager {...defaultProps} />);
    
    expect(screen.getByText("No linked guests yet")).toBeInTheDocument();
    expect(screen.getByText("Link guests who pick up meals together")).toBeInTheDocument();
  });

  it("shows Link Guest button when under limit", () => {
    render(<LinkedGuestsManager {...defaultProps} />);
    
    expect(screen.getByRole("button", { name: /link guest/i })).toBeInTheDocument();
  });

  it("hides Link Guest button when at limit", () => {
    const linkedGuests = [
      { id: "g2", name: "Jane Smith", preferredName: "" },
      { id: "g3", name: "Bob Wilson", preferredName: "Bobby" },
      { id: "g4", name: "Alice Brown", preferredName: "" },
    ];

    render(<LinkedGuestsManager {...defaultProps} linkedGuests={linkedGuests} />);
    
    expect(screen.queryByRole("button", { name: /link guest/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Maximum 3 linked guests reached/i)).toBeInTheDocument();
  });

  it("displays linked guests with names", () => {
    const linkedGuests = [
      { id: "g2", name: "Jane Smith", preferredName: "" },
      { id: "g3", name: "Bob Wilson", preferredName: "Bobby" },
    ];

    render(<LinkedGuestsManager {...defaultProps} linkedGuests={linkedGuests} />);
    
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bobby")).toBeInTheDocument();
    expect(screen.getByText("(Bob Wilson)")).toBeInTheDocument();
  });

  it("shows banned badge for banned linked guest", () => {
    const linkedGuests = [
      { id: "g2", name: "Jane Smith", preferredName: "", isBanned: true },
    ];

    render(<LinkedGuestsManager {...defaultProps} linkedGuests={linkedGuests} />);
    
    expect(screen.getByText("Banned")).toBeInTheDocument();
  });

  it("opens search form when Link Guest button is clicked", async () => {
    const user = userEvent.setup();
    render(<LinkedGuestsManager {...defaultProps} />);
    
    await user.click(screen.getByRole("button", { name: /link guest/i }));
    
    expect(screen.getByPlaceholderText(/search guest to link/i)).toBeInTheDocument();
  });

  it("shows search results when searching with at least 2 characters", async () => {
    const user = userEvent.setup();
    render(<LinkedGuestsManager {...defaultProps} />);
    
    await user.click(screen.getByRole("button", { name: /link guest/i }));
    
    const searchInput = screen.getByPlaceholderText(/search guest to link/i);
    await user.type(searchInput, "Jane");
    
    expect(await screen.findByText("Jane Smith")).toBeInTheDocument();
  });

  it("excludes already linked guests from search results", async () => {
    const user = userEvent.setup();
    const linkedGuests = [{ id: "g2", name: "Jane Smith", preferredName: "" }];
    
    render(<LinkedGuestsManager {...defaultProps} linkedGuests={linkedGuests} />);
    
    await user.click(screen.getByRole("button", { name: /link guest/i }));
    
    const searchInput = screen.getByPlaceholderText(/search guest to link/i);
    await user.type(searchInput, "Jane");
    
    // Jane should not appear in search results dropdown since she's already linked
    // Wait a bit for search results to render
    await waitFor(() => {
      // Check for "no guests found" message which indicates Jane was filtered out
      expect(screen.getByText(/No guests found matching "Jane"/i)).toBeInTheDocument();
    });
  });

  it("excludes the guest themselves from search results", async () => {
    const user = userEvent.setup();
    render(<LinkedGuestsManager {...defaultProps} />);
    
    await user.click(screen.getByRole("button", { name: /link guest/i }));
    
    const searchInput = screen.getByPlaceholderText(/search guest to link/i);
    await user.type(searchInput, "John");
    
    // John (the main guest) should not appear in search results
    const buttons = screen.queryAllByRole("button");
    const johnButton = buttons.find(btn => btn.textContent?.includes("John Doe"));
    expect(johnButton).toBeUndefined();
  });

  it("calls onLinkGuest when a guest is selected", async () => {
    const user = userEvent.setup();
    const onLinkGuest = vi.fn().mockResolvedValue({});
    
    render(<LinkedGuestsManager {...defaultProps} onLinkGuest={onLinkGuest} />);
    
    await user.click(screen.getByRole("button", { name: /link guest/i }));
    
    const searchInput = screen.getByPlaceholderText(/search guest to link/i);
    await user.type(searchInput, "Jane");
    
    const janeButton = await screen.findByRole("button", { name: /Jane Smith/i });
    await user.click(janeButton);
    
    expect(onLinkGuest).toHaveBeenCalledWith("g1", "g2");
  });

  it("calls onUnlinkGuest when unlink button is clicked", async () => {
    const user = userEvent.setup();
    const onUnlinkGuest = vi.fn().mockResolvedValue(true);
    const linkedGuests = [{ id: "g2", name: "Jane Smith", preferredName: "" }];
    
    render(<LinkedGuestsManager {...defaultProps} linkedGuests={linkedGuests} onUnlinkGuest={onUnlinkGuest} />);
    
    const unlinkButton = screen.getByTitle("Unlink Jane Smith");
    await user.click(unlinkButton);
    
    expect(onUnlinkGuest).toHaveBeenCalledWith("g1", "g2");
  });

  it("closes search form when X is clicked", async () => {
    const user = userEvent.setup();
    render(<LinkedGuestsManager {...defaultProps} />);
    
    await user.click(screen.getByRole("button", { name: /link guest/i }));
    
    expect(screen.getByPlaceholderText(/search guest to link/i)).toBeInTheDocument();
    
    // Find the search form wrapper and the X button within it
    const searchContainer = screen.getByPlaceholderText(/search guest to link/i).closest('.p-3');
    const closeButton = searchContainer?.querySelector('button.p-1');
    
    if (closeButton) {
      await user.click(closeButton);
    }
    
    // Search input should be gone
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search guest to link/i)).not.toBeInTheDocument();
    });
  });

  it("shows minimum character hint when search term is less than 2 chars", async () => {
    const user = userEvent.setup();
    render(<LinkedGuestsManager {...defaultProps} />);
    
    await user.click(screen.getByRole("button", { name: /link guest/i }));
    
    const searchInput = screen.getByPlaceholderText(/search guest to link/i);
    await user.type(searchInput, "J");
    
    expect(screen.getByText(/Type at least 2 characters to search/i)).toBeInTheDocument();
  });

  it("shows no results message when search has no matches", async () => {
    const user = userEvent.setup();
    render(<LinkedGuestsManager {...defaultProps} />);
    
    await user.click(screen.getByRole("button", { name: /link guest/i }));
    
    const searchInput = screen.getByPlaceholderText(/search guest to link/i);
    await user.type(searchInput, "ZZZZZ");
    
    expect(await screen.findByText(/No guests found matching "ZZZZZ"/i)).toBeInTheDocument();
  });

  it("updates counter when linked guests change", () => {
    const { rerender } = render(<LinkedGuestsManager {...defaultProps} linkedGuests={[]} />);
    
    expect(screen.getByText("0/3")).toBeInTheDocument();
    
    rerender(
      <LinkedGuestsManager
        {...defaultProps}
        linkedGuests={[{ id: "g2", name: "Jane Smith", preferredName: "" }]}
      />
    );
    
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });
});
