import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.restoreSession());
  // True only while we're checking a `?token=...` the backend may have just
  // redirected back with after a Google login. Keeps the landing page from
  // flashing before the session is hydrated.
  const [checkingOAuth, setCheckingOAuth] = useState(
    () => new URLSearchParams(window.location.search).has('token')
  );

  useEffect(() => {
    if (!checkingOAuth) return;

    authService
      .consumeOAuthRedirect()
      .then((u) => {
        if (u) setUser(u);
      })
      .catch((err) => console.error('Google sign-in failed:', err))
      .finally(() => setCheckingOAuth(false));
  }, [checkingOAuth]);

  const login = useCallback(async (email, password) => {
    const u = await authService.login(email, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (fields) => {
    const u = await authService.register(fields);
    setUser(u);
    return u;
  }, []);

  const loginWithGoogle = useCallback(() => {
    authService.loginWithGoogle();
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      checkingOAuth,
      login,
      register,
      loginWithGoogle,
      logout
    }),
    [user, checkingOAuth, login, register, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The provider and its hook intentionally live together so consumers share the same context.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
