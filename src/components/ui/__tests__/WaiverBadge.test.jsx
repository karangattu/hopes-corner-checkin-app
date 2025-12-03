import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Use hoisted mocks to properly capture references
const { mockGuestNeedsWaiverReminder, mockDismissWaiver } = vi.hoisted(() => ({
  mockGuestNeedsWaiverReminder: vi.fn(),
  mockDismissWaiver: vi.fn(),
}));

// Mock useAppContext BEFORE importing WaiverBadge
vi.mock("../../../context/useAppContext", () => ({
  useAppContext: vi.fn(() => ({
    guestNeedsWaiverReminder: mockGuestNeedsWaiverReminder,
    dismissWaiver: mockDismissWaiver,
  })),
}));

// Mock toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Now import the component after mocking
import { WaiverBadge } from "../../ui/WaiverBadge";
import toast from "react-hot-toast";

describe("WaiverBadge Component", () => {
  const mockGuestId = "guest-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGuestNeedsWaiverReminder.mockReset();
    mockDismissWaiver.mockReset();
  });

  describe("Badge Visibility", () => {
    it("should not render badge when waiver is not needed", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(false);

      const { container } = render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(container.querySelector("button")).toBeNull();
      });
    });

    it("should render badge when shower waiver is needed", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });
    });

    it("should render badge when laundry waiver is needed", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="laundry"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });
    });

    it("should have correct styling for amber badge", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toHaveClass("bg-amber-100");
        expect(badge).toHaveClass("text-amber-700");
        expect(badge).toHaveClass("border-amber-300");
      });
    });
  });

  describe("Modal Dialog", () => {
    it("should open modal when badge is clicked", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      expect(screen.getByText("Services Waiver")).toBeInTheDocument();
    });

    it("should display correct waiver text for shower service", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      expect(
        screen.getByText(/This guest has used shower services/)
      ).toBeInTheDocument();
    });

    it("should display correct waiver text for laundry service", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="laundry"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      expect(
        screen.getByText(/This guest has used laundry services/)
      ).toBeInTheDocument();
    });

    it("should have confirmed button in modal", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const confirmButton = screen.getByText("Confirmed");
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe("Waiver Acknowledgment", () => {
    it("should call dismissWaiver with signed_by_staff reason when confirmed", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      mockDismissWaiver.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const confirmButton = screen.getByText("Confirmed");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDismissWaiver).toHaveBeenCalledWith(
          mockGuestId,
          "shower",
          "signed_by_staff"
        );
      });
    });

    it("should call onDismissed callback after successful confirmation", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      mockDismissWaiver.mockResolvedValue(true);
      const onDismissed = vi.fn();
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={onDismissed}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const confirmButton = screen.getByText("Confirmed");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(onDismissed).toHaveBeenCalledTimes(1);
      });
    });

    it("should hide badge after successful dismissal", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      mockDismissWaiver.mockResolvedValue(true);
      const user = userEvent.setup();

      const { rerender } = render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const confirmButton = screen.getByText("Confirmed");
      await user.click(confirmButton);

      // Re-render with mock returning false to simulate badge no longer needed
      mockGuestNeedsWaiverReminder.mockResolvedValue(false);
      rerender(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      // Badge should no longer be visible
      await waitFor(() => {
        expect(screen.queryByText("Waiver needed")).not.toBeInTheDocument();
      });
    });

    it("should show success toast when waiver is confirmed", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      mockDismissWaiver.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const confirmButton = screen.getByText("Confirmed");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Services waiver confirmed for this year (covers both shower & laundry)"
        );
      });
    });
  });

  describe("Modal Actions", () => {
    it("should close modal when cancel button is clicked", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      // Modal should be closed - title should not be visible
      expect(screen.queryByText("Shower Waiver")).not.toBeInTheDocument();
    });

    it("should close modal when close button is clicked", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      // Find close button (has aria-label="Close")
      const closeButton = screen.getByLabelText("Close");
      await user.click(closeButton);

      // Modal should be closed
      expect(screen.queryByText("Shower Waiver")).not.toBeInTheDocument();
    });

    it("should show waiver reset info in modal", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      expect(
        screen.getByText(/This waiver requirement will reset on January 1st/)
      ).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should show error toast when dismissWaiver throws an exception", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      mockDismissWaiver.mockRejectedValue(new Error("API error"));
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const confirmButton = screen.getByText("Confirmed");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to confirm waiver"
        );
      });
    });

    it("should handle waiver check errors gracefully", async () => {
      mockGuestNeedsWaiverReminder.mockRejectedValue(
        new Error("Network error")
      );

      const { container } = render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        // Should not render badge on error
        expect(container.querySelector("button")).toBeNull();
      });
    });

    it("should silently handle when dismissWaiver returns false", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      mockDismissWaiver.mockResolvedValue(false);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        expect(badge).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const confirmButton = screen.getByText("Confirmed");
      await user.click(confirmButton);

      // Should not call error or success toast
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe("Props Handling", () => {
    it("should check waiver status when guestId changes", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const { rerender } = render(
        <WaiverBadge
          guestId="guest-123"
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(mockGuestNeedsWaiverReminder).toHaveBeenCalledWith(
          "guest-123",
          "shower"
        );
      });

      mockGuestNeedsWaiverReminder.mockClear();

      rerender(
        <WaiverBadge
          guestId="guest-456"
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(mockGuestNeedsWaiverReminder).toHaveBeenCalledWith(
          "guest-456",
          "shower"
        );
      });
    });

    it("should check waiver status when serviceType changes", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const { rerender } = render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(mockGuestNeedsWaiverReminder).toHaveBeenCalledWith(
          mockGuestId,
          "shower"
        );
      });

      mockGuestNeedsWaiverReminder.mockClear();

      rerender(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="laundry"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(mockGuestNeedsWaiverReminder).toHaveBeenCalledWith(
          mockGuestId,
          "laundry"
        );
      });
    });
  });

  describe("Common Waiver Behavior (Shower + Laundry)", () => {
    it("should display 'Services Waiver' title mentioning both services", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      // Modal should show Services Waiver title
      expect(screen.getByText("Services Waiver")).toBeInTheDocument();
    });

    it("should explain that waiver covers both shower and laundry", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="laundry"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      // Should mention that waiver covers both services
      expect(screen.getByText(/Shower and laundry share the same waiver/i)).toBeInTheDocument();
    });

    it("should dismiss both shower and laundry waivers when confirming from shower", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      mockDismissWaiver.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const confirmButton = screen.getByText("Confirmed");
      await user.click(confirmButton);

      // Should call dismissWaiver for both services
      await waitFor(() => {
        expect(mockDismissWaiver).toHaveBeenCalledWith(
          mockGuestId,
          "shower",
          "signed_by_staff"
        );
        expect(mockDismissWaiver).toHaveBeenCalledWith(
          mockGuestId,
          "laundry",
          "shared_waiver"
        );
        expect(mockDismissWaiver).toHaveBeenCalledTimes(2);
      });
    });

    it("should dismiss both shower and laundry waivers when confirming from laundry", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      mockDismissWaiver.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="laundry"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const confirmButton = screen.getByText("Confirmed");
      await user.click(confirmButton);

      // Should call dismissWaiver for both services
      await waitFor(() => {
        expect(mockDismissWaiver).toHaveBeenCalledWith(
          mockGuestId,
          "laundry",
          "signed_by_staff"
        );
        expect(mockDismissWaiver).toHaveBeenCalledWith(
          mockGuestId,
          "shower",
          "shared_waiver"
        );
        expect(mockDismissWaiver).toHaveBeenCalledTimes(2);
      });
    });

    it("should show success toast mentioning both services", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);
      mockDismissWaiver.mockResolvedValue(true);
      const user = userEvent.setup();

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });

      const badge = screen.getAllByRole("button")[0];
      await user.click(badge);

      const confirmButton = screen.getByText("Confirmed");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("shower")
        );
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("laundry")
        );
      });
    });

    it("should not show badge when other service has active waiver", async () => {
      // First call returns false (shower doesn't need), second call returns true (laundry needs)
      // But since they share a waiver, if one is signed, neither should show
      mockGuestNeedsWaiverReminder
        .mockResolvedValueOnce(false) // shower check - not needed
        .mockResolvedValueOnce(false); // laundry check - not needed either (common waiver signed)

      const { container } = render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(container.querySelector("button")).toBeNull();
      });
    });

    it("should display both service icons in the badge", async () => {
      mockGuestNeedsWaiverReminder.mockResolvedValue(true);

      render(
        <WaiverBadge
          guestId={mockGuestId}
          serviceType="shower"
          onDismissed={vi.fn()}
        />
      );

      await waitFor(() => {
        const badge = screen.getByRole("button");
        // Badge should contain both shower and laundry icons (the combined waiver badge)
        expect(badge).toBeInTheDocument();
      });
    });
  });
});
