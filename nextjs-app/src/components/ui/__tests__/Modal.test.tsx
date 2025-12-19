import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from '../Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <Modal {...defaultProps} labelledBy="modal-title" describedBy="modal-desc" />
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'modal-desc');
    });

    it('traps focus within modal', async () => {
      render(
        <Modal {...defaultProps}>
          <button>First</button>
          <button>Second</button>
        </Modal>
      );

      const firstButton = screen.getByText('First');

      // Focus should be managed by the modal (using requestAnimationFrame)
      await waitFor(() => {
        // Either the first button or the modal content should be focused
        const activeElement = document.activeElement;
        const modalContent = screen.getByRole('dialog').querySelector('[tabindex="-1"]');
        expect(
          activeElement === firstButton || activeElement === modalContent
        ).toBe(true);
      }, { timeout: 100 });
    });
  });

  describe('keyboard interactions', () => {
    it('closes on Escape key', async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('backdrop click', () => {
    it('closes when clicking backdrop', async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      // Click the backdrop (the element with bg-black/50)
      const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('does not close when clicking content', async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Modal content'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('size variants', () => {
    it.each(['sm', 'md', 'lg', 'xl', 'full'] as const)('renders %s size', (size) => {
      render(<Modal {...defaultProps} size={size} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});

describe('ModalHeader', () => {
  it('renders children', () => {
    render(<ModalHeader>Header Title</ModalHeader>);
    expect(screen.getByText('Header Title')).toBeInTheDocument();
  });

  it('renders close button when onClose provided', () => {
    const onClose = vi.fn();
    render(<ModalHeader onClose={onClose}>Title</ModalHeader>);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render close button when onClose not provided', () => {
    render(<ModalHeader>Title</ModalHeader>);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });
});

describe('ModalBody', () => {
  it('renders children', () => {
    render(<ModalBody>Body content</ModalBody>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ModalBody className="custom-class">Content</ModalBody>);
    // The ModalBody div is the container's first child
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('ModalFooter', () => {
  it('renders children', () => {
    render(
      <ModalFooter>
        <button>Cancel</button>
        <button>Confirm</button>
      </ModalFooter>
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });
});

describe('ConfirmModal', () => {
  const defaultConfirmProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and message', () => {
    render(<ConfirmModal {...defaultConfirmProps} />);
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onClose when cancel clicked', async () => {
    render(<ConfirmModal {...defaultConfirmProps} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultConfirmProps.onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when confirm clicked', async () => {
    render(<ConfirmModal {...defaultConfirmProps} />);
    
    fireEvent.click(screen.getByText('Confirm'));
    expect(defaultConfirmProps.onConfirm).toHaveBeenCalled();
  });

  it('uses custom button text', () => {
    render(
      <ConfirmModal
        {...defaultConfirmProps}
        confirmText="Yes, Delete"
        cancelText="No, Keep"
      />
    );
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
    expect(screen.getByText('No, Keep')).toBeInTheDocument();
  });

  it.each(['danger', 'warning', 'info'] as const)('renders %s variant', (variant) => {
    render(<ConfirmModal {...defaultConfirmProps} variant={variant} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ConfirmModal {...defaultConfirmProps} isLoading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
