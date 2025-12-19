import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, IconButton } from '../Button';
import { Plus, X } from 'lucide-react';

describe('Button', () => {
  describe('variants', () => {
    it.each(['primary', 'secondary', 'danger', 'ghost', 'outline'] as const)(
      'renders %s variant',
      (variant) => {
        render(<Button variant={variant}>Click me</Button>);
        expect(screen.getByRole('button')).toBeInTheDocument();
      }
    );
  });

  describe('sizes', () => {
    it.each(['sm', 'md', 'lg'] as const)('renders %s size', (size) => {
      render(<Button size={size}>Click me</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick} disabled>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick} isLoading>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading', () => {
      render(<Button isLoading>Click me</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows loadingText when provided', () => {
      render(<Button isLoading loadingText="Saving...">Save</Button>);
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('falls back to children when no loadingText', () => {
      render(<Button isLoading>Save</Button>);
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('renders left icon', () => {
      render(<Button leftIcon={<Plus data-testid="left-icon" />}>Add</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      render(<Button rightIcon={<X data-testid="right-icon" />}>Close</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('hides icons when loading', () => {
      render(
        <Button
          isLoading
          leftIcon={<Plus data-testid="left-icon" />}
          rightIcon={<X data-testid="right-icon" />}
        >
          Submit
        </Button>
      );
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  describe('fullWidth', () => {
    it('applies full width class', () => {
      render(<Button fullWidth>Full width</Button>);
      expect(screen.getByRole('button')).toHaveClass('w-full');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to button element', () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Click me</Button>);
      expect(ref).toHaveBeenCalled();
    });
  });
});

describe('IconButton', () => {
  it('renders icon', () => {
    render(<IconButton icon={<Plus data-testid="icon" />} label="Add item" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<IconButton icon={<Plus />} label="Add item" />);
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<IconButton icon={<Plus data-testid="icon" />} label="Add" isLoading />);
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it.each(['primary', 'secondary', 'danger', 'ghost', 'outline'] as const)(
    'renders %s variant',
    (variant) => {
      render(<IconButton icon={<Plus />} label="Add" variant={variant} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    }
  );
});
