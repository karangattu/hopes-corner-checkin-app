import React, { createContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);
const envUseFirebase = import.meta.env.VITE_USE_FIREBASE === 'true';

let __authCache = null;
const ensureFirebaseAuth = async (firebaseEnabled) => {
  if (!firebaseEnabled) return null;
  if (__authCache) return __authCache;
  try {
    const mod = await import('../firebase.js');
    __authCache = mod.auth;
    return __authCache;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children, useFirebaseOverride }) => {
  const firebaseEnabled = useFirebaseOverride ?? envUseFirebase;
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hc-auth-user');
      if (saved) setUser(JSON.parse(saved));
    } catch (e) {
      console.error('Auth load error', e);
    }
  }, []);

  useEffect(() => {
    try {
      if (user) localStorage.setItem('hc-auth-user', JSON.stringify(user));
      else localStorage.removeItem('hc-auth-user');
    } catch (e) {
      console.error('Auth save error', e);
    }
  }, [user]);

  const inferRole = (emailLike) => {
    const base = (emailLike || '').toLowerCase();
    if (base.startsWith('admin')) return 'admin';
    if (base.startsWith('checkin')) return 'checkin';
    return 'staff';
  };

  const login = async (username, password) => {
    if (firebaseEnabled) {
      const auth = await ensureFirebaseAuth(firebaseEnabled);
      if (!auth) throw new Error('Authentication service unavailable');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const cred = await signInWithEmailAndPassword(auth, username, password);
      const email = cred.user?.email || username;
      let role = inferRole(email);
      try {
        const token = await cred.user.getIdTokenResult(true);
        if (token?.claims?.role) role = token.claims.role;
      } catch {
        // Ignore errors when fetching token claims
      }
      setUser({ username: email, role, name: email.split('@')[0] || 'User' });
      return true;
    }
    if (!username || !password) throw new Error('Invalid username or password');
    const base = username.toLowerCase();
    const role = inferRole(base);
    setUser({ username: base, role, name: base.charAt(0).toUpperCase() + base.slice(1) });
    return true;
  };

  const resetPassword = async (email) => {
    if (!firebaseEnabled) throw new Error('Password reset requires Firebase Auth');
    const auth = await ensureFirebaseAuth(firebaseEnabled);
    if (!auth) throw new Error('Authentication service unavailable');
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(auth, email);
    return true;
  };

  const logout = async () => {
    if (firebaseEnabled) {
      try {
        const auth = await ensureFirebaseAuth(firebaseEnabled);
        if (auth) {
          const { signOut } = await import('firebase/auth');
          await signOut(auth);
        }
      } catch {
        // Ignore errors during logout
      }
    }
    setUser(null);
  };

  const value = { user, login, logout, resetPassword, useFirebase: firebaseEnabled };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
