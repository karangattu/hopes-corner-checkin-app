import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../Login';

const mockLogin = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    resetPassword: mockResetPassword,
    user: null,
    useFirebase: true,
  }),
}));

describe('Login', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockResetPassword.mockReset();
  });

  const getEmailInput = () => screen.getByRole('textbox', { name: /email/i });
  const getPasswordInput = () => screen.getByLabelText(/^password$/i);

  it('renders login form with username/email and password fields', () => {
    render(<Login />);

    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls login with email and password on form submit', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(true);

    render(<Login />);

    await user.type(getEmailInput(), 'test@example.com');
    await user.type(getPasswordInput(), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', { remember: false });
    });
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(<Login />);

    await user.type(getEmailInput(), 'wrong@example.com');
    await user.type(getPasswordInput(), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
