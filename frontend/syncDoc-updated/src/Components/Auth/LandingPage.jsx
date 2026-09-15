import { useState } from 'react';
import {
  FileText,
  Users,
  Zap,
  GitBranch,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Loader2,
  MousePointer2,
  Layers
} from 'lucide-react';

export function LandingPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const switchMode = (next) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = mode === 'login'
        ? await onLogin.login(form.email, form.password)
        : await onLogin.register({ name: form.name, email: form.email, password: form.password });
      return user;
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="landing-container">
      {/* Hero / marketing side */}
      <section className="landing-hero">
        <div className="landing-brand">
          <span className="brand-mark"><FileText size={22} /></span>
          <span className="brand-name">SyncDoc</span>
        </div>

        <h1 className="landing-title">
          Write together.
          <br />
          <span className="landing-title-accent">Structure everything.</span>
        </h1>
        <p className="landing-subtitle">
          A real-time collaborative editor with live multi-user structural editing,
          AST-level conflict resolution, and per-block presence cursors.
        </p>

        <ul className="landing-features">
          <li><Users size={16} /> Live multi-user editing with peer cursors</li>
          <li><Layers size={16} /> Block-level AST nodes — headings, code, tables &amp; more</li>
          <li><GitBranch size={16} /> Automatic conflict detection &amp; resolution</li>
          <li><MousePointer2 size={16} /> Real-time cursor &amp; selection sync across sessions</li>
          <li><Zap size={16} /> CRDT-powered via Yjs — offline-safe, merge-free</li>
        </ul>
      </section>

      {/* Auth card */}
      <section className="landing-auth">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              <LogIn size={14} /> Sign in
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              <UserPlus size={14} /> Create account
            </button>
          </div>

          <button
            type="button"
            className="oauth-google-btn"
            onClick={onLogin.loginWithGoogle}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.69A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.69V4.98H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.02l3.01-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.98l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider"><span>or use email</span></div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label className="auth-field">
                <span>Full name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={update('name')}
                  placeholder="Ada Lovelace"
                  required
                  autoComplete="name"
                />
              </label>
            )}

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@team.dev"
                required
                autoComplete="email"
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            {error && <div className="auth-error" role="alert">{error}</div>}

            <button type="submit" className="auth-submit" disabled={busy}>
              {busy
                ? <><Loader2 size={15} className="spin" /> Working…</>
                : mode === 'login'
                  ? <><LogIn size={15} /> Sign in to workspace</>
                  : <><UserPlus size={15} /> Create account</>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
