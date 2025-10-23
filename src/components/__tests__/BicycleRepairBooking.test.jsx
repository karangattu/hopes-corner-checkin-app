import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BicycleRepairBooking from "../BicycleRepairBooking";

const createDefaultContext = () => ({
  bicyclePickerGuest: null,
  setBicyclePickerGuest: vi.fn(),
  addBicycleRecord: vi.fn(),
});

let mockContextValue = createDefaultContext();

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => mockContextValue,
}));

describe("BicycleRepairBooking", () => {
  beforeEach(() => {
    mockContextValue = createDefaultContext();
  });

  it("renders nothing when no guest is selected", () => {
    const { container } = render(<BicycleRepairBooking />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the stored bicycle description when available", () => {
    mockContextValue = {
      ...createDefaultContext(),
      bicyclePickerGuest: {
        id: "g1",
        name: "Alex Rider",
        bicycleDescription: "Blue Trek commuter with rear basket",
      },
    };

    render(<BicycleRepairBooking />);

    expect(
      screen.getByText(/Blue Trek commuter with rear basket/i),
    ).toBeInTheDocument();
  });

  it("warns when no bicycle description is recorded", () => {
    mockContextValue = {
      ...createDefaultContext(),
      bicyclePickerGuest: {
        id: "g2",
        name: "Sam Doe",
        bicycleDescription: "",
      },
    };

    render(<BicycleRepairBooking />);

    expect(
      screen.getByText(/no bicycle description saved/i),
    ).toBeInTheDocument();
  });

  it("submits a repair when the form is completed", async () => {
    const user = userEvent.setup();
    const addBicycleRecord = vi.fn();
    const setBicyclePickerGuest = vi.fn();

    mockContextValue = {
      bicyclePickerGuest: {
        id: "g3",
        name: "Jamie Lane",
        bicycleDescription: "Red Specialized hardtail",
      },
      addBicycleRecord,
      setBicyclePickerGuest,
    };

    render(<BicycleRepairBooking />);

    // Select "Flat Tire" checkbox
    const flatTireCheckbox = screen.getByLabelText("Flat Tire");
    await user.click(flatTireCheckbox);

    await user.click(screen.getByRole("button", { name: /log repair/i }));

    expect(addBicycleRecord).toHaveBeenCalledWith("g3", {
      repairTypes: ["Flat Tire"],
      notes: "",
    });
    expect(setBicyclePickerGuest).toHaveBeenCalledWith(null);
  });

  it("allows selecting multiple repair types", async () => {
    const user = userEvent.setup();
    const addBicycleRecord = vi.fn();

    mockContextValue = {
      bicyclePickerGuest: {
        id: "g4",
        name: "Alex Rider",
        bicycleDescription: "Blue Trek",
      },
      addBicycleRecord,
      setBicyclePickerGuest: vi.fn(),
    };

    render(<BicycleRepairBooking />);

    // Select multiple repair types
    const chainReplacementCheckbox = screen.getByLabelText("Chain Replacement");
    const brakeAdjustmentCheckbox = screen.getByLabelText("Brake Adjustment");
    await user.click(chainReplacementCheckbox);
    await user.click(brakeAdjustmentCheckbox);
    await user.click(screen.getByRole("button", { name: /log repair/i }));

    expect(addBicycleRecord).toHaveBeenCalledWith("g4", {
      repairTypes: ["Chain Replacement", "Brake Adjustment"],
      notes: "",
    });
  });

  it("includes notes in repair record", async () => {
    const user = userEvent.setup();
    const addBicycleRecord = vi.fn();

    mockContextValue = {
      bicyclePickerGuest: {
        id: "g5",
        name: "Sam Wilson",
        bicycleDescription: "Green Giant",
      },
      addBicycleRecord,
      setBicyclePickerGuest: vi.fn(),
    };

    render(<BicycleRepairBooking />);

    // Select a repair type
    const flatTireCheckbox = screen.getByLabelText("Flat Tire");
    await user.click(flatTireCheckbox);

    const notesTextarea = screen.getByLabelText(/notes/i);
    await user.type(notesTextarea, "Replaced with new chain");
    await user.click(screen.getByRole("button", { name: /log repair/i }));

    expect(addBicycleRecord).toHaveBeenCalledWith("g5", {
      repairTypes: ["Flat Tire"],
      notes: "Replaced with new chain",
    });
  });

  it("closes the form after submission", async () => {
    const user = userEvent.setup();
    const setBicyclePickerGuest = vi.fn();

    mockContextValue = {
      bicyclePickerGuest: {
        id: "g6",
        name: "Test User",
        bicycleDescription: "Test Bike",
      },
      addBicycleRecord: vi.fn(),
      setBicyclePickerGuest,
    };

    render(<BicycleRepairBooking />);

    // Select a repair type before submitting
    const flatTireCheckbox = screen.getByLabelText("Flat Tire");
    await user.click(flatTireCheckbox);

    await user.click(screen.getByRole("button", { name: /log repair/i }));

    expect(setBicyclePickerGuest).toHaveBeenCalledWith(null);
  });
});
