import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GuestForm from "../GuestForm";

const mockAddGuest = vi.fn();

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => ({
    addGuest: mockAddGuest,
  }),
}));

describe("GuestForm", () => {
  beforeEach(() => {
    mockAddGuest.mockReset();
  });

  it("renders the bicycle description textarea", () => {
    render(<GuestForm />);

    expect(
      screen.getByPlaceholderText("Bike make, color, or identifying details"),
    ).toBeInTheDocument();
  });

  it("shows an error when submitting without a name", async () => {
    const user = userEvent.setup();
    render(<GuestForm />);

    await user.click(screen.getByRole("button", { name: /register guest/i }));

    expect(
      await screen.findByText(/please enter a valid guest name/i),
    ).toBeInTheDocument();
    expect(mockAddGuest).not.toHaveBeenCalled();
  });

  it("submits form successfully with valid data", async () => {
    const user = userEvent.setup();
    mockAddGuest.mockResolvedValue();

    render(<GuestForm />);

    await user.type(screen.getByLabelText(/guest name\*/i), "John Doe");
    await user.selectOptions(
      screen.getByLabelText(/housing status/i),
      "Housed",
    );
    await user.type(screen.getByLabelText(/notes/i), "Test notes");
    await user.type(
      screen.getByPlaceholderText("Bike make, color, or identifying details"),
      "Red bicycle",
    );
    await user.click(screen.getByRole("button", { name: /register guest/i }));

    expect(mockAddGuest).toHaveBeenCalledWith({
      name: "John Doe",
      housingStatus: "Housed",
      location: "",
      notes: "Test notes",
      bicycleDescription: "Red bicycle",
    });
    expect(
      await screen.findByText(/guest registered successfully/i),
    ).toBeInTheDocument();
  });

  it("resets form after successful submission", async () => {
    const user = userEvent.setup();
    mockAddGuest.mockResolvedValue();

    render(<GuestForm />);

    const nameInput = screen.getByLabelText(/guest name\*/i);
    await user.type(nameInput, "Jane Smith");
    await user.click(screen.getByRole("button", { name: /register guest/i }));

    await waitFor(() => {
      expect(nameInput).toHaveValue("");
    });
  });

  it("calls addGuest with form data on submission", async () => {
    const user = userEvent.setup();
    mockAddGuest.mockResolvedValue();

    render(<GuestForm />);

    // Fill out form
    await user.type(screen.getByLabelText(/guest name\*/i), "Test User");
    await user.selectOptions(
      screen.getByLabelText(/housing status/i),
      "Housed",
    );
    await user.type(screen.getByLabelText(/notes/i), "Test notes");

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /register guest/i,
    });
    await user.click(submitButton);

    // Verify the function was called with correct data
    expect(mockAddGuest).toHaveBeenCalledWith({
      name: "Test User",
      housingStatus: "Housed",
      location: "",
      notes: "Test notes",
      bicycleDescription: "",
    });
  });
});
