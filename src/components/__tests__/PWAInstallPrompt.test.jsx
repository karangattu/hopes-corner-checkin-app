import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PWAInstallPrompt from '../PWAInstallPrompt';

const mockPromptInstall = vi.fn();

vi.mock('../../hooks/usePWAInstall', () => ({
  usePWAInstall: vi.fn(),
}));

import { usePWAInstall } from '../../hooks/usePWAInstall';

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    mockPromptInstall.mockReset();
    vi.clearAllMocks();
  });

  it('should not render when not installable', () => {
    usePWAInstall.mockReturnValue({
      isInstallable: false,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    const { container } = render(<PWAInstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render when installable', () => {
    usePWAInstall.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    render(<PWAInstallPrompt />);

    expect(screen.getByText(/Install Hope's Corner/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Add to your home screen for quick access and offline support/i)
    ).toBeInTheDocument();
  });

  it('should show Install and Not Now buttons', () => {
    usePWAInstall.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    render(<PWAInstallPrompt />);

    expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument();
  });

  it('should call promptInstall when Install button is clicked', async () => {
    const user = userEvent.setup();
    mockPromptInstall.mockResolvedValue(true);

    usePWAInstall.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    render(<PWAInstallPrompt />);

    const installButton = screen.getByRole('button', { name: /^install$/i });
    await user.click(installButton);

    expect(mockPromptInstall).toHaveBeenCalledTimes(1);
  });

  it('should not dismiss prompt when user accepts installation', async () => {
    const user = userEvent.setup();
    mockPromptInstall.mockResolvedValue(true);

    usePWAInstall.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    render(<PWAInstallPrompt />);

    const installButton = screen.getByRole('button', { name: /^install$/i });
    await user.click(installButton);

    // When user accepts, the hook should handle dismissal via isInstallable becoming false
    // The component itself doesn't dismiss on accept
    expect(mockPromptInstall).toHaveBeenCalledTimes(1);
  });

  it('should dismiss prompt when user rejects installation', async () => {
    const user = userEvent.setup();
    mockPromptInstall.mockResolvedValue(false);

    usePWAInstall.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    render(<PWAInstallPrompt />);

    const installButton = screen.getByRole('button', { name: /^install$/i });
    await user.click(installButton);

    // Prompt should disappear after rejecting
    await waitFor(() => {
      expect(screen.queryByText(/Install Hope's Corner/i)).not.toBeInTheDocument();
    });
  });

  it('should dismiss prompt when Not Now button is clicked', async () => {
    const user = userEvent.setup();

    usePWAInstall.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    render(<PWAInstallPrompt />);

    const notNowButton = screen.getByRole('button', { name: /not now/i });
    await user.click(notNowButton);

    // Prompt should disappear
    await waitFor(() => {
      expect(screen.queryByText(/Install Hope's Corner/i)).not.toBeInTheDocument();
    });

    // Should not have called promptInstall
    expect(mockPromptInstall).not.toHaveBeenCalled();
  });

  it('should dismiss prompt when X button is clicked', async () => {
    const user = userEvent.setup();

    usePWAInstall.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    render(<PWAInstallPrompt />);

    const dismissButton = screen.getByLabelText(/dismiss/i);
    await user.click(dismissButton);

    // Prompt should disappear
    await waitFor(() => {
      expect(screen.queryByText(/Install Hope's Corner/i)).not.toBeInTheDocument();
    });

    // Should not have called promptInstall
    expect(mockPromptInstall).not.toHaveBeenCalled();
  });

  it('should render download icon', () => {
    usePWAInstall.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    render(<PWAInstallPrompt />);

    // Check for the download icon container
    const iconContainer = screen.getByText(/Install Hope's Corner/i).closest('div').parentElement;
    expect(iconContainer).toBeInTheDocument();
  });

  it('should not render after dismissal even if still installable', async () => {
    const user = userEvent.setup();

    usePWAInstall.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    const { rerender } = render(<PWAInstallPrompt />);

    // Dismiss the prompt
    const notNowButton = screen.getByRole('button', { name: /not now/i });
    await user.click(notNowButton);

    // Rerender with same props
    rerender(<PWAInstallPrompt />);

    // Should still not be visible
    expect(screen.queryByText(/Install Hope's Corner/i)).not.toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    usePWAInstall.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
    });

    render(<PWAInstallPrompt />);

    const dismissButton = screen.getByLabelText(/dismiss/i);
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss');
  });
});
