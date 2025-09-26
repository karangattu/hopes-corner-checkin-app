import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthContext, { AuthProvider } from '../AuthContext';

// Mock Firebase modules
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ signInWithEmailAndPassword: mockSignIn, signOut: mockSignOut, sendPasswordResetEmail: mockResetPassword })),
  signInWithEmailAndPassword: mockSignIn,
  signOut: mockSignOut,
  sendPasswordResetEmail: mockResetPassword,
}));

vi.mock('firebase/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(),
}));

vi.mock('../../firebase.js', () => ({
  auth: {},
}));

// Import after mocking
const TestComponent = () => {
  const { user, login, logout, resetPassword } = React.useContext(AuthContext);
  return (
    <div>
      <div data-testid="user">{user ? user.username : 'no user'}</div>
      <button onClick={() => login('test@example.com', 'pass')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => resetPassword('test@example.com')}>Reset</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides default user as null', () => {
    render(
      <AuthProvider useFirebaseOverride={false}>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('no user');
  });

  it('handles login with Firebase', async () => {
    const user = userEvent.setup();

    // Mock successful Firebase login
    mockSignIn.mockResolvedValue({
      user: { email: 'test@example.com', getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }) },
    });

    render(
      <AuthProvider useFirebaseOverride={true}>
        <TestComponent />
      </AuthProvider>
    );

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });
  });

  it('handles login without Firebase', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider useFirebaseOverride={false}>
        <TestComponent />
      </AuthProvider>
    );

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });
  });

  it('handles logout', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider useFirebaseOverride={false}>
        <TestComponent />
      </AuthProvider>
    );

    // First login
    await user.click(screen.getByText('Login'));
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    // Then logout
    await user.click(screen.getByText('Logout'));
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('no user');
    });
  });

  it('handles password reset', async () => {
    const user = userEvent.setup();

    mockResetPassword.mockResolvedValue();

    render(
      <AuthProvider useFirebaseOverride={true}>
        <TestComponent />
      </AuthProvider>
    );

    await user.click(screen.getByText('Reset'));

    expect(mockResetPassword).toHaveBeenCalledWith(expect.any(Object), 'test@example.com');
  });
});
