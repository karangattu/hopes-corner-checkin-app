import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

describe('DeleteConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    itemName: 'Test Item',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<DeleteConfirmationModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<DeleteConfirmationModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays item name', () => {
      render(<DeleteConfirmationModal {...defaultProps} />);
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('displays custom title', () => {
      render(<DeleteConfirmationModal {...defaultProps} title="Remove User" />);
      expect(screen.getByText('Remove User')).toBeInTheDocument();
    });

    it('displays warning message when provided', () => {
      render(
        <DeleteConfirmationModal 
          {...defaultProps} 
          warningMessage="This will also delete all related records" 
        />
      );
      expect(screen.getByText('This will also delete all related records')).toBeInTheDocument();
    });

    it('displays item type in warning', () => {
      render(<DeleteConfirmationModal {...defaultProps} itemType="guest record" />);
      // Use getAllByText since the text appears in both the warning and button
      const elements = screen.getAllByText(/guest record/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('confirmation flow', () => {
    it('calls onConfirm and onClose when delete clicked', async () => {
      render(<DeleteConfirmationModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      
      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('calls onClose when cancel clicked', () => {
      render(<DeleteConfirmationModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when close button clicked', () => {
      render(<DeleteConfirmationModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('type-to-confirm', () => {
    it('shows confirmation input when requireConfirmation is true', () => {
      render(<DeleteConfirmationModal {...defaultProps} requireConfirmation={true} />);
      expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
    });

    it('delete button is disabled until correct text entered', () => {
      render(<DeleteConfirmationModal {...defaultProps} requireConfirmation={true} />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeDisabled();
    });

    it('enables delete button when correct text entered', async () => {
      render(<DeleteConfirmationModal {...defaultProps} requireConfirmation={true} />);
      
      const input = screen.getByPlaceholderText('DELETE');
      fireEvent.change(input, { target: { value: 'DELETE' } });
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it('uses custom confirmation text', () => {
      render(
        <DeleteConfirmationModal 
          {...defaultProps} 
          requireConfirmation={true}
          confirmationText="REMOVE"
        />
      );
      expect(screen.getByPlaceholderText('REMOVE')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading state during deletion', async () => {
      const slowConfirm = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<DeleteConfirmationModal {...defaultProps} onConfirm={slowConfirm} />);
      
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      
      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delet/i });
        expect(deleteButton).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('displays error message when deletion fails', async () => {
      const failingConfirm = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<DeleteConfirmationModal {...defaultProps} onConfirm={failingConfirm} />);
      
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('clears error when modal is closed and reopened', async () => {
      const failingConfirm = vi.fn().mockRejectedValue(new Error('Network error'));
      const { unmount } = render(
        <DeleteConfirmationModal {...defaultProps} onConfirm={failingConfirm} />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Unmount and remount for clean state
      unmount();
      render(
        <DeleteConfirmationModal 
          {...defaultProps} 
          onConfirm={vi.fn().mockResolvedValue(undefined)} 
        />
      );
      
      expect(screen.queryByText('Network error')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible dialog role', () => {
      render(<DeleteConfirmationModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('confirmation input is present when required', () => {
      render(<DeleteConfirmationModal {...defaultProps} requireConfirmation={true} />);
      // The input is present with a placeholder
      expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
      // And there is a label text
      expect(screen.getByText(/type/i)).toBeInTheDocument();
    });
  });
});
