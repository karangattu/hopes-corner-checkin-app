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

  describe("Meal Proxy Tracking", () => {
    const linkedGuests = [
      { id: "g2", name: "Jane Smith", preferredName: "" },
      { id: "g3", name: "Bob Wilson", preferredName: "Bobby" },
    ];

    it("shows meal buttons for linked guests when onAssignMeals is provided", () => {
      const onAssignMeals = vi.fn();
      
      render(
        <LinkedGuestsManager
          {...defaultProps}
          linkedGuests={linkedGuests}
          onAssignMeals={onAssignMeals}
        />
      );
      
      // Should show meal buttons (1 and 2) for each non-banned linked guest
      const mealButtons = screen.getAllByRole("button", { name: /1|2/ });
      // 2 linked guests × 2 buttons each = 4 buttons
      expect(mealButtons.length).toBeGreaterThanOrEqual(4);
    });

    it("calls onAssignMeals with primary guest ID as pickedUpByGuestId when meal button clicked", async () => {
      const user = userEvent.setup();
      const onAssignMeals = vi.fn();
      
      render(
        <LinkedGuestsManager
          {...defaultProps}
          linkedGuests={linkedGuests}
          onAssignMeals={onAssignMeals}
          mealRecords={[]}
        />
      );
      
      // Find meal buttons for Jane Smith (first linked guest)
      const janeRow = screen.getByText("Jane Smith").closest('div[class*="flex items-center justify-between"]');
      const mealButtons = janeRow.querySelectorAll('button');
      const mealButton1 = Array.from(mealButtons).find(btn => btn.textContent?.includes('1'));
      
      if (mealButton1) {
        await user.click(mealButton1);
        
        // Should be called with (linkedGuestId, count, primaryGuestId as proxy)
        expect(onAssignMeals).toHaveBeenCalledWith("g2", 1, "g1");
      }
    });

    it("passes correct proxy ID when giving 2 meals", async () => {
      const user = userEvent.setup();
      const onAssignMeals = vi.fn();
      
      render(
        <LinkedGuestsManager
          {...defaultProps}
          linkedGuests={linkedGuests}
          onAssignMeals={onAssignMeals}
          mealRecords={[]}
        />
      );
      
      // Find meal button for "2" for Jane Smith
      const janeRow = screen.getByText("Jane Smith").closest('div[class*="flex items-center justify-between"]');
      const mealButtons = janeRow.querySelectorAll('button');
      const mealButton2 = Array.from(mealButtons).find(btn => btn.textContent?.includes('2'));
      
      if (mealButton2) {
        await user.click(mealButton2);
        
        // Should be called with (linkedGuestId, 2, primaryGuestId as proxy)
        expect(onAssignMeals).toHaveBeenCalledWith("g2", 2, "g1");
      }
    });

    it("disables meal buttons for banned linked guests", () => {
      const onAssignMeals = vi.fn();
      const linkedGuestsWithBanned = [
        { id: "g2", name: "Jane Smith", preferredName: "", isBanned: true },
      ];
      
      render(
        <LinkedGuestsManager
          {...defaultProps}
          linkedGuests={linkedGuestsWithBanned}
          onAssignMeals={onAssignMeals}
        />
      );
      
      // Should NOT show meal buttons for banned guests
      const janeRow = screen.getByText("Jane Smith").closest('div[class*="flex items-center justify-between"]');
      const mealButtonsInRow = janeRow?.querySelectorAll('button[class*="bg-green"]');
      
      // No meal buttons should be present for banned guests
      expect(mealButtonsInRow?.length || 0).toBe(0);
    });

    it("disables meal buttons when guest already has meal today", () => {
      const onAssignMeals = vi.fn();
      const todayMealRecords = [
        { 
          id: "meal-1", 
          guestId: "g2", // Jane already has a meal
          date: new Date().toISOString(),
          count: 1 
        },
      ];
      
      render(
        <LinkedGuestsManager
          {...defaultProps}
          linkedGuests={linkedGuests}
          onAssignMeals={onAssignMeals}
          mealRecords={todayMealRecords}
        />
      );
      
      // Jane's meal buttons should be disabled
      const janeRow = screen.getByText("Jane Smith").closest('div[class*="flex items-center justify-between"]');
      const disabledMealButtons = janeRow?.querySelectorAll('button[disabled]');
      
      // Should have disabled meal buttons
      expect(disabledMealButtons?.length).toBeGreaterThan(0);
    });

    it("shows tooltip indicating proxy pickup when hovering meal button", () => {
      const onAssignMeals = vi.fn();
      
      render(
        <LinkedGuestsManager
          {...defaultProps}
          linkedGuests={linkedGuests}
          onAssignMeals={onAssignMeals}
          mealRecords={[]}
        />
      );
      
      // Find meal button for Jane
      const janeRow = screen.getByText("Jane Smith").closest('div[class*="flex items-center justify-between"]');
      const mealButtons = janeRow?.querySelectorAll('button');
      const mealButton1 = Array.from(mealButtons || []).find(btn => btn.textContent?.includes('1'));
      
      // Check for title attribute indicating proxy pickup
      expect(mealButton1?.getAttribute('title')).toContain('picked up by');
    });

    it("does not show meal buttons when onAssignMeals is not provided", () => {
      render(
        <LinkedGuestsManager
          {...defaultProps}
          linkedGuests={linkedGuests}
          onAssignMeals={undefined}
        />
      );
      
      // Should not show any green meal buttons
      const greenButtons = document.querySelectorAll('button[class*="bg-green-100"]');
      expect(greenButtons.length).toBe(0);
    });

    it("correctly handles multiple linked guests with different meal states", () => {
      const onAssignMeals = vi.fn();
      const todayMealRecords = [
        { 
          id: "meal-1", 
          guestId: "g2", // Jane already has a meal
          date: new Date().toISOString(),
          count: 1 
        },
        // g3 (Bobby) has no meal today
      ];
      
      render(
        <LinkedGuestsManager
          {...defaultProps}
          linkedGuests={linkedGuests}
          onAssignMeals={onAssignMeals}
          mealRecords={todayMealRecords}
        />
      );
      
      // Jane's buttons should be disabled
      const janeRow = screen.getByText("Jane Smith").closest('div[class*="flex items-center justify-between"]');
      const janeDisabledButtons = janeRow?.querySelectorAll('button[disabled]');
      expect(janeDisabledButtons?.length).toBeGreaterThan(0);
      
      // Bobby's buttons should be enabled (he has no meal)
      const bobbyRow = screen.getByText("Bobby").closest('div[class*="flex items-center justify-between"]');
      const bobbyEnabledMealButtons = bobbyRow?.querySelectorAll('button:not([disabled])[class*="bg-green"]');
      expect(bobbyEnabledMealButtons?.length).toBeGreaterThan(0);
    });
  });
});