import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DeleteConfirmationModal from "../DeleteConfirmationModal";

describe("DeleteConfirmationModal", () => {
  const mockGuest = {
    id: "123",
    firstName: "John",
    lastName: "Doe",
    name: "John Doe",
  };

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <DeleteConfirmationModal
        isOpen={false}
        guest={mockGuest}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render when isOpen is true", () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        guest={mockGuest}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Delete Guest Profile?")).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it("should show record counts when provided", () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        guest={mockGuest}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        mealCount={5}
        showerCount={3}
        laundryCount={2}
      />
    );
    expect(screen.getByText(/5 meal record/)).toBeInTheDocument();
    expect(screen.getByText(/3 shower booking/)).toBeInTheDocument();
    expect(screen.getByText(/2 laundry record/)).toBeInTheDocument();
  });

  it("should call onConfirm when delete button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmationModal
        isOpen={true}
        guest={mockGuest}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Delete Permanently"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmationModal
        isOpen={true}
        guest={mockGuest}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should show warning message about irreversibility", () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        guest={mockGuest}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  it("should use singular form for single record", () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        guest={mockGuest}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        mealCount={1}
        showerCount={1}
        laundryCount={1}
      />
    );
    expect(screen.getByText(/1 meal record$/)).toBeInTheDocument();
    expect(screen.getByText(/1 shower booking$/)).toBeInTheDocument();
    expect(screen.getByText(/1 laundry record$/)).toBeInTheDocument();
  });

  it("should not show records section when all counts are zero", () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        guest={mockGuest}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        mealCount={0}
        showerCount={0}
        laundryCount={0}
      />
    );
    expect(screen.queryByText(/meal record/)).not.toBeInTheDocument();
  });
});
