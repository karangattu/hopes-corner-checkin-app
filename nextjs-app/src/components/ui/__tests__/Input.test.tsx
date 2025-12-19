import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input, Textarea, Select, Checkbox } from '../Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" name="email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders without label', () => {
    render(<Input name="email" placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('passes required attribute to input', () => {
    render(<Input label="Email" name="email" required />);
    expect(screen.getByLabelText('Email')).toBeRequired();
  });

  it('displays error message', () => {
    render(<Input label="Email" name="email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveClass('border-red-500');
  });

  it('displays helper text', () => {
    render(<Input label="Email" name="email" helperText="We won't share your email" />);
    expect(screen.getByText("We won't share your email")).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const onChange = vi.fn();
    render(<Input label="Name" name="name" onChange={onChange} />);
    
    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'John' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('applies disabled state', () => {
    render(<Input label="Name" name="name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });

  it('renders with leftIcon', () => {
    render(<Input label="Search" name="search" leftIcon={<span data-testid="icon">🔍</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Input label="Name" name="name" className="custom-class" />);
    expect(container.querySelector('input')).toHaveClass('custom-class');
  });

  it('renders different types', () => {
    render(<Input label="Password" name="password" type="password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });
});

describe('Textarea', () => {
  it('renders with label', () => {
    render(<Textarea label="Description" name="description" />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const onChange = vi.fn();
    render(<Textarea label="Notes" name="notes" onChange={onChange} />);
    
    const textarea = screen.getByLabelText('Notes');
    fireEvent.change(textarea, { target: { value: 'Some notes' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('displays error message', () => {
    render(<Textarea label="Notes" name="notes" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('respects rows prop', () => {
    render(<Textarea label="Notes" name="notes" rows={5} />);
    expect(screen.getByLabelText('Notes')).toHaveAttribute('rows', '5');
  });

  it('applies disabled state', () => {
    render(<Textarea label="Notes" name="notes" disabled />);
    expect(screen.getByLabelText('Notes')).toBeDisabled();
  });
});

describe('Select', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('renders with label', () => {
    render(<Select label="Choice" name="choice" options={options} />);
    expect(screen.getByLabelText('Choice')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select label="Choice" name="choice" options={options} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders placeholder option when provided', () => {
    render(<Select label="Choice" name="choice" options={options} placeholder="Select an option" />);
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const onChange = vi.fn();
    render(<Select label="Choice" name="choice" options={options} onChange={onChange} />);
    
    const select = screen.getByLabelText('Choice');
    fireEvent.change(select, { target: { value: 'option2' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('displays error message', () => {
    render(<Select label="Choice" name="choice" options={options} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('applies disabled state', () => {
    render(<Select label="Choice" name="choice" options={options} disabled />);
    expect(screen.getByLabelText('Choice')).toBeDisabled();
  });

  it('renders disabled options', () => {
    const optionsWithDisabled = [
      ...options,
      { value: 'disabled', label: 'Disabled Option', disabled: true },
    ];
    render(<Select label="Choice" name="choice" options={optionsWithDisabled} />);
    const disabledOption = screen.getByText('Disabled Option');
    expect(disabledOption).toHaveAttribute('disabled');
  });
});

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Accept terms" name="terms" />);
    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
  });

  it('handles checked changes', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Accept terms" name="terms" onChange={onChange} />);
    
    const checkbox = screen.getByLabelText('Accept terms');
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalled();
  });

  it('can be pre-checked', () => {
    render(<Checkbox label="Accept terms" name="terms" checked onChange={() => {}} />);
    expect(screen.getByLabelText('Accept terms')).toBeChecked();
  });

  it('displays error message', () => {
    render(<Checkbox label="Accept terms" name="terms" error="Must accept terms" />);
    expect(screen.getByText('Must accept terms')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(<Checkbox label="Accept terms" name="terms" helperText="By checking this box..." />);
    expect(screen.getByText('By checking this box...')).toBeInTheDocument();
  });

  it('applies disabled state', () => {
    render(<Checkbox label="Accept terms" name="terms" disabled />);
    expect(screen.getByLabelText('Accept terms')).toBeDisabled();
  });
});
