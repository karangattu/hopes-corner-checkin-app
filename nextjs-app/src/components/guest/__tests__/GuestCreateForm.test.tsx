import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuestCreateForm, GuestFormData, FieldErrors } from '../GuestCreateForm';

describe('GuestCreateForm', () => {
  const defaultFormData: GuestFormData = {
    firstName: '',
    lastName: '',
    preferredName: '',
    housingStatus: 'Unhoused',
    age: '',
    gender: '',
    location: 'Mountain View',
    notes: '',
    bicycleDescription: '',
  };

  const defaultFieldErrors: FieldErrors = {};

  const mockOnChange = vi.fn();
  const mockOnNameBlur = vi.fn();
  const mockOnSubmit = vi.fn((e) => e.preventDefault());
  const mockOnCancel = vi.fn();
  const mockOnLocationChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (props: Partial<Parameters<typeof GuestCreateForm>[0]> = {}) => {
    return render(
      <GuestCreateForm
        formData={defaultFormData}
        fieldErrors={defaultFieldErrors}
        isCreating={false}
        createError={null}
        duplicateWarning={null}
        onChange={mockOnChange}
        onNameBlur={mockOnNameBlur}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onLocationChange={mockOnLocationChange}
        {...props}
      />
    );
  };

  describe('rendering', () => {
    it('renders form title', () => {
      renderForm();
      expect(screen.getByText('Create New Guest')).toBeInTheDocument();
    });

    it('renders first name input', () => {
      renderForm();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    it('renders last name input', () => {
      renderForm();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    });

    it('renders preferred name input', () => {
      renderForm();
      expect(screen.getByLabelText(/preferred name/i)).toBeInTheDocument();
    });

    it('renders housing status select', () => {
      renderForm();
      expect(screen.getByLabelText(/housing status/i)).toBeInTheDocument();
    });

    it('renders age select', () => {
      renderForm();
      expect(screen.getByLabelText(/^age/i)).toBeInTheDocument();
    });

    it('renders gender select', () => {
      renderForm();
      expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    });

    it('renders location input', () => {
      renderForm();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    });

    it('renders create button', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /^create guest$/i })).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('displays create error message', () => {
      renderForm({ createError: 'Failed to create guest' });
      expect(screen.getByText('Failed to create guest')).toBeInTheDocument();
    });

    it('displays duplicate warning message', () => {
      renderForm({ duplicateWarning: 'Guest with this name already exists' });
      expect(screen.getByText('Guest with this name already exists')).toBeInTheDocument();
    });

    it('displays field errors', () => {
      renderForm({
        fieldErrors: {
          firstName: 'First name is required',
          lastName: 'Last name is required',
        },
      });

      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('calls onChange when input values change', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/first name/i), 'J');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('calls onNameBlur when first name loses focus', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByLabelText(/first name/i));
      await user.tab();

      expect(mockOnNameBlur).toHaveBeenCalled();
    });

    it('calls onSubmit when form is submitted', () => {
      const submitHandler = vi.fn((e: React.FormEvent) => e.preventDefault());
      renderForm({
        formData: {
          ...defaultFormData,
          firstName: 'John',
          lastName: 'Doe',
          age: 'Adult 18-59',
          gender: 'Male',
        },
        onSubmit: submitHandler,
      });

      const form = screen.getByRole('dialog').querySelector('form');
      expect(form).toBeInTheDocument();
      fireEvent.submit(form!);

      expect(submitHandler).toHaveBeenCalled();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when close button is clicked', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole('button', { name: /close/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('disabled states', () => {
    it('disables inputs when isCreating is true', () => {
      renderForm({ isCreating: true });

      expect(screen.getByLabelText(/first name/i)).toBeDisabled();
    });

    it('disables submit button when isCreating is true', () => {
      renderForm({ isCreating: true });

      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    });

    it('shows "Creating..." text when isCreating is true', () => {
      renderForm({ isCreating: true });

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  describe('form data display', () => {
    it('displays provided form data values', () => {
      const formData: GuestFormData = {
        firstName: 'John',
        lastName: 'Doe',
        preferredName: 'Johnny',
        housingStatus: 'Housed',
        age: 'Adult 18-59',
        gender: 'Male',
        location: 'San Jose',
        notes: 'Some notes',
        bicycleDescription: 'Red bike',
      };

      renderForm({ formData });

      expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
      expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
      expect(screen.getByLabelText(/preferred name/i)).toHaveValue('Johnny');
    });
  });

  describe('accessibility', () => {
    it('has proper role dialog', () => {
      renderForm();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-labelledby for title', () => {
      renderForm();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'create-guest-title');
    });

    it('labels required fields', () => {
      renderForm();
      expect(screen.getByText(/first name\*/i)).toBeInTheDocument();
      expect(screen.getByText(/last name\*/i)).toBeInTheDocument();
    });
  });
});
