import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.restoreSession());

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

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout
  }), [user, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The provider and its hook intentionally live together so consumers share the same context.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
