/**
 * Lightweight client-side authentication service.
 * Stores registered users + active session in localStorage so the demo
 * collaboration site works without a backend, while still exercising a
 * real login/register/logout flow and identity propagation.
 */

const USERS_KEY = 'syncdoc:users';
const SESSION_KEY = 'syncdoc:session';

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];
const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'
];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function hash(text) {
  // Demo-grade hash — NOT production cryptography.
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return String(h);
}

function seedDefaultUser() {
  const users = readUsers();
  if (!users.some(u => u.email === 'demo@syncdoc.app')) {
    users.push({
      id: 'user-demo',
      name: 'Alex Rivers',
      email: 'demo@syncdoc.app',
      passHash: hash('demo1234'),
      color: AVATAR_COLORS[0],
      avatar: AVATARS[0]
    });
    writeUsers(users);
  }
}
seedDefaultUser();

function toSessionUser(user) {
  const safe = { ...user };
  delete safe.passHash;
  return safe;
}

export const authService = {
  /** Returns the restored session user or null. */
  restoreSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      const user = readUsers().find(u => u.id === session.userId);
      return user ? toSessionUser(user) : null;
    } catch {
      return null;
    }
  },

  async login(email, password) {
    await delay(450); // simulate network latency
    const user = readUsers().find(
      u => u.email.toLowerCase() === String(email).toLowerCase()
    );
    if (!user || user.passHash !== hash(password)) {
      throw new Error('Invalid email or password.');
    }
    const safe = toSessionUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, at: Date.now() }));
    return safe;
  },

  async register({ name, email, password }) {
    await delay(450);
    const users = readUsers();
    if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
      throw new Error('An account with that email already exists.');
    }
    if (!name || !email || password.length < 6) {
      throw new Error('Please fill all fields (password min 6 characters).');
    }
    const seed = Math.floor(Math.random() * AVATAR_COLORS.length);
    const user = {
      id: `user-${Date.now()}`,
      name,
      email,
      passHash: hash(password),
      color: AVATAR_COLORS[seed % AVATAR_COLORS.length],
      avatar: AVATARS[seed % AVATARS.length]
    };
    users.push(user);
    writeUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, at: Date.now() }));
    return toSessionUser(user);
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  }
};
