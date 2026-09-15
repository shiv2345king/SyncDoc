import { apiClient, API_URL_BASE, AUTH_TOKEN_KEY } from './apiClient';

const USER_KEY = 'syncdoc:user';
const AVATAR_PALETTE = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];

function persistSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * The backend only returns { id, name, email, avatarUrl? }. The UI wants an
 * avatar image + a presence color, so we derive stable fallbacks here rather
 * than inventing them on the backend.
 */
function toClientUser(user) {
  const idSeed = String(user.id || '');
  const seed = idSeed.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return {
    id: user.id,
    name: user.name || user.email || 'Unnamed User',
    email: user.email || '',
    avatar:
      user.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email || 'U')}`,
    color: AVATAR_PALETTE[seed % AVATAR_PALETTE.length]
  };
}

export const authService = {
  /** Synchronously restores whatever session was cached from the last visit. */
  restoreSession() {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const raw = localStorage.getItem(USER_KEY);
      if (!token || !raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async login(email, password) {
    const data = await apiClient.post('/api/auth/login', { email, password });
    const user = toClientUser(data.user);
    persistSession(data.token, user);
    return user;
  },

  async register({ name, email, password }) {
    const data = await apiClient.post('/api/auth/signup', { name, email, password });
    const user = toClientUser(data.user);
    persistSession(data.token, user);
    return user;
  },

  /** Sends the browser to the backend's Google OAuth entry point (full redirect, not fetch). */
  loginWithGoogle() {
    window.location.href = `${API_URL_BASE}/api/auth/google`;
  },

  /**
   * Called once on app boot. If the backend just redirected back here from
   * Google with ?token=..., stash the token, fetch the real profile from
   * /api/auth/me, and scrub the token out of the visible URL.
   * Returns null if there was nothing to consume.
   */
  async consumeOAuthRedirect() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return null;

    localStorage.setItem(AUTH_TOKEN_KEY, token);

    params.delete('token');
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', cleanUrl);

    const data = await apiClient.get('/api/auth/me');
    const user = toClientUser(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};
