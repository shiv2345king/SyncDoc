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
  ShieldCheck,
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

  const fillDemo = () => {
    setMode('login');
    setForm({ name: '', email: 'demo@syncdoc.app', password: 'demo1234' });
    setError(null);
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

            {mode === 'login' && (
              <button type="button" className="auth-demo-link" onClick={fillDemo}>
                <ShieldCheck size={13} />
                Use demo account (demo@syncdoc.app / demo1234)
              </button>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
