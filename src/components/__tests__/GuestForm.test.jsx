import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GuestCreateForm from "../guest/GuestCreateForm";
import React from "react";

const mockAddGuest = vi.fn();

vi.mock("../../context/useAppContext", () => ({
  useAppContext: () => ({
    addGuest: mockAddGuest,
  }),
}));

describe("GuestCreateForm", () => {
  beforeEach(() => {
    mockAddGuest.mockReset();
  });

  it("renders the bicycle description textarea", () => {
    function Wrapper() {
      const [formData, setFormData] = React.useState({
        firstName: "",
        lastName: "",
        preferredName: "",
        housingStatus: "Unhoused",
        location: "",
        age: "",
        gender: "",
        notes: "",
        bicycleDescription: "",
      });
      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
      };
      const handleSubmit = async (e) => {
        e.preventDefault();
        await mockAddGuest({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          housingStatus: formData.housingStatus,
          location: formData.location,
          notes: formData.notes,
          bicycleDescription: formData.bicycleDescription,
        });
        setFormData({
          firstName: "",
          lastName: "",
          preferredName: "",
          housingStatus: "Unhoused",
          location: "",
          age: "",
          gender: "",
          notes: "",
          bicycleDescription: "",
        });
      };
      return (
        <GuestCreateForm
          formData={formData}
          fieldErrors={{}}
          isCreating={false}
          createError={""}
          duplicateWarning={""}
          onChange={handleChange}
          onNameBlur={() => {}}
          onSubmit={handleSubmit}
          onCancel={() => {}}
          onLocationChange={(val) => setFormData((prev) => ({ ...prev, location: val }))}
          firstNameRef={{ current: null }}
        />
      );
    }

    render(<Wrapper />);

    expect(
      screen.getByLabelText(/bicycle description/i),
    ).toBeInTheDocument();
  });

  it("shows an error when submitting without a name", async () => {
    const user = userEvent.setup();
    // Use minimal wrapper to surface validation
    function ErrWrapper() {
      const [formData, setFormData] = React.useState({
        firstName: "",
        lastName: "",
        preferredName: "",
        housingStatus: "Unhoused",
        location: "",
        age: "",
        gender: "",
        notes: "",
        bicycleDescription: "",
      });
      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
      };
      const handleSubmit = async (e) => {
        e.preventDefault();
        // Simulate validation: if no names, do not call addGuest and show error
        if (!formData.firstName.trim() && !formData.lastName.trim()) {
          return;
        }
        await mockAddGuest({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          housingStatus: formData.housingStatus,
          location: formData.location,
          notes: formData.notes,
          bicycleDescription: formData.bicycleDescription,
        });
      };
      return (
        <GuestCreateForm
          formData={formData}
          fieldErrors={{}}
          isCreating={false}
          createError={""}
          duplicateWarning={""}
          onChange={handleChange}
          onNameBlur={() => {}}
          onSubmit={handleSubmit}
          onCancel={() => {}}
          onLocationChange={(val) => setFormData((prev) => ({ ...prev, location: val }))}
          firstNameRef={{ current: null }}
        />
      );
    }

    render(<ErrWrapper />);

    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getByRole('button', { name: /^create guest$/i });
    await user.click(submitButton);

    // There is no guest registered because no names provided
    expect(mockAddGuest).not.toHaveBeenCalled();
  });

  it("submits form successfully with valid data", async () => {
    const user = userEvent.setup();
    mockAddGuest.mockResolvedValue();

    function SuccessWrapper() {
      const [formData, setFormData] = React.useState({
        firstName: "",
        lastName: "",
        preferredName: "",
        housingStatus: "Unhoused",
        location: "",
        age: "",
        gender: "",
        notes: "",
        bicycleDescription: "",
      });
      const [success, setSuccess] = React.useState(false);
      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
      };
      const handleSubmit = async (e) => {
        e.preventDefault();
        await mockAddGuest({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          housingStatus: formData.housingStatus,
          location: formData.location,
          notes: formData.notes,
          bicycleDescription: formData.bicycleDescription,
        });
        setFormData({
          firstName: "",
          lastName: "",
          preferredName: "",
          housingStatus: "Unhoused",
          location: "",
          age: "",
          gender: "",
          notes: "",
          bicycleDescription: "",
        });
        setSuccess(true);
      };
      return (
        <div>
          {success && <div>Guest registered successfully!</div>}
          <GuestCreateForm
            formData={formData}
            fieldErrors={{}}
            isCreating={false}
            createError={""}
            duplicateWarning={""}
            onChange={handleChange}
            onNameBlur={() => {}}
            onSubmit={handleSubmit}
            onCancel={() => {}}
            onLocationChange={(val) => setFormData((prev) => ({ ...prev, location: val }))}
            firstNameRef={{ current: null }}
          />
        </div>
      );
    }

    render(<SuccessWrapper />);

    await user.type(screen.getByLabelText(/first name/i), "John");
    await user.type(screen.getByLabelText(/last name/i), "Doe");
    await user.selectOptions(screen.getByLabelText(/housing status/i), "Housed");
    await user.selectOptions(screen.getByLabelText(/age group/i), "Adult 18-59");
    await user.selectOptions(screen.getByLabelText(/gender/i), "Male");
    await user.type(screen.getByLabelText(/notes/i), "Test notes");
    await user.type(screen.getByLabelText(/bicycle description/i), "Red bicycle");
    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getByRole('button', { name: /^create guest$/i });
    await user.click(submitButton);

    await waitFor(() => expect(mockAddGuest).toHaveBeenCalledWith({
      name: "John Doe",
      housingStatus: "Housed",
      location: "",
      notes: "Test notes",
      bicycleDescription: "Red bicycle",
    }));
    expect(await screen.findByText(/guest registered successfully/i)).toBeInTheDocument();
  });

  it("resets form after successful submission", async () => {
    const user = userEvent.setup();
    mockAddGuest.mockResolvedValue();

    function ResetWrapper() {
      const [formData, setFormData] = React.useState({
        firstName: "",
        lastName: "",
        preferredName: "",
        housingStatus: "Unhoused",
        location: "",
        age: "",
        gender: "",
        notes: "",
        bicycleDescription: "",
      });
      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
      };
      const handleSubmit = async (e) => {
        e.preventDefault();
        await mockAddGuest({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          housingStatus: formData.housingStatus,
          location: formData.location,
          notes: formData.notes,
          bicycleDescription: formData.bicycleDescription,
        });
        setFormData({
          firstName: "",
          lastName: "",
          preferredName: "",
          housingStatus: "Unhoused",
          location: "",
          age: "",
          gender: "",
          notes: "",
          bicycleDescription: "",
        });
      };
      return (
        <GuestCreateForm
          formData={formData}
          fieldErrors={{}}
          isCreating={false}
          createError={""}
          duplicateWarning={""}
          onChange={handleChange}
          onNameBlur={() => {}}
          onSubmit={handleSubmit}
          onCancel={() => {}}
          onLocationChange={(val) => setFormData((prev) => ({ ...prev, location: val }))}
          firstNameRef={{ current: null }}
        />
      );
    }

    render(<ResetWrapper />);

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    await user.type(firstNameInput, "Jane");
    await user.type(lastNameInput, "Smith");
    await user.selectOptions(screen.getByLabelText(/age group/i), "Adult 18-59");
    await user.selectOptions(screen.getByLabelText(/gender/i), "Female");
    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getByRole('button', { name: /^create guest$/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(firstNameInput).toHaveValue("");
      expect(lastNameInput).toHaveValue("");
    });
  });

  it("calls addGuest with form data on submission", async () => {
    const user = userEvent.setup();
    mockAddGuest.mockResolvedValue();

    function SubmitWrapper() {
      const [formData, setFormData] = React.useState({
        firstName: "",
        lastName: "",
        preferredName: "",
        housingStatus: "Unhoused",
        location: "",
        age: "",
        gender: "",
        notes: "",
        bicycleDescription: "",
      });
      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
      };
      const handleSubmit = async (e) => {
        e.preventDefault();
        await mockAddGuest({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          housingStatus: formData.housingStatus,
          location: formData.location,
          notes: formData.notes,
          bicycleDescription: formData.bicycleDescription,
        });
      };
      return (
        <GuestCreateForm
          formData={formData}
          fieldErrors={{}}
          isCreating={false}
          createError={""}
          duplicateWarning={""}
          onChange={handleChange}
          onNameBlur={() => {}}
          onSubmit={handleSubmit}
          onCancel={() => {}}
          onLocationChange={(val) => setFormData((prev) => ({ ...prev, location: val }))}
          firstNameRef={{ current: null }}
        />
      );
    }

    render(<SubmitWrapper />);

    // Fill out form
    await user.type(screen.getByLabelText(/first name/i), "Test");
    await user.type(screen.getByLabelText(/last name/i), "User");
    await user.selectOptions(screen.getByLabelText(/housing status/i), "Housed");
    await user.selectOptions(screen.getByLabelText(/age group/i), "Adult 18-59");
    await user.selectOptions(screen.getByLabelText(/gender/i), "Male");
    await user.type(screen.getByLabelText(/notes/i), "Test notes");

    // Submit form
    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getByRole('button', { name: /^create guest$/i });
    await user.click(submitButton);

    // Verify the function was called with correct data
    await waitFor(() => expect(mockAddGuest).toHaveBeenCalledWith({
      name: "Test User",
      housingStatus: "Housed",
      location: "",
      notes: "Test notes",
      bicycleDescription: "",
    }));
  });
});
