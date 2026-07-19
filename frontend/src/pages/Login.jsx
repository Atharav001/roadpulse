import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authAPI, isAuthenticated, setAuthToken, setCurrentUser } from '../api/client';
import Logo from '../components/Logo';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.5 6.6l6.2 5.2C38.9 37.2 44 31.5 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export default function Login({ mode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = mode === 'signup' || location.pathname === '/signup';
  const redirectTo = location.state?.from || '/';

  const [tab, setTab] = useState(isSignup ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [showGoogle, setShowGoogle] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(isSignup ? 'signup' : 'login');
  }, [isSignup]);

  useEffect(() => {
    if (isAuthenticated()) navigate(redirectTo);
  }, [navigate, redirectTo]);

  const persist = (r) => {
    setAuthToken(r.token);
    setCurrentUser({
      user_id: r.user_id,
      email: r.email,
      role: r.role,
      department: r.department || null,
      name: r.name || null,
    });
    navigate(r.role === 'authority' ? '/authority' : redirectTo);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'signup') {
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        if (password !== confirm) throw new Error('Passwords do not match');
        persist(await authAPI.register(email, password));
      } else {
        persist(await authAPI.login(email, password));
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const value = googleEmail.trim().toLowerCase();
      if (!value.includes('@')) throw new Error('Enter a valid Google email');
      persist(
        await authAPI.googleLogin({
          email: value,
          name: value.split('@')[0],
          google_id: `demo-${value}`,
        })
      );
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (which) => {
    if (which === 'authority') {
      setEmail('authority@roadpulse.local');
      setPassword('password123');
      setTab('login');
    } else {
      setEmail('citizen@roadpulse.local');
      setPassword('password123');
      setTab('login');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell animate-in">
        <aside className="auth-aside">
          <Logo size={32} />
          <h1 style={{ marginTop: 20 }}>Report once. Track clearly.</h1>
          <p>
            Citizens file geotagged complaints. AI classifies and merges duplicates.
            Wards stay accountable on a public dashboard.
          </p>
          <ul className="auth-bullets">
            <li>Live camera + GPS capture</li>
            <li>Landmark-precise location</li>
            <li>Department routing + email draft</li>
          </ul>
        </aside>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={tab === 'login' ? 'active' : ''}
              onClick={() => { setTab('login'); setError(''); navigate('/login', { replace: true, state: location.state }); }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={tab === 'signup' ? 'active' : ''}
              onClick={() => { setTab('signup'); setError(''); navigate('/signup', { replace: true, state: location.state }); }}
            >
              Create account
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {!showGoogle ? (
            <>
              <button
                type="button"
                className="btn btn-google btn-block"
                disabled={loading}
                onClick={() => setShowGoogle(true)}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="auth-divider"><span>or use email</span></div>

              <form onSubmit={handleEmailAuth}>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                {tab === 'signup' && (
                  <div className="form-group">
                    <label htmlFor="confirm">Confirm password</label>
                    <input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                )}
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? 'Please wait…' : tab === 'signup' ? 'Create citizen account' : 'Sign in'}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleGoogle}>
              <p className="text-small text-muted" style={{ marginBottom: 16 }}>
                Demo Google sign-in: enter the Google email you want to use as a citizen account.
              </p>
              <div className="form-group">
                <label htmlFor="g-email">Google email</label>
                <input
                  id="g-email"
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-google btn-block" disabled={loading}>
                <GoogleIcon />
                {loading ? 'Signing in…' : 'Continue with Google'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                style={{ marginTop: 8 }}
                onClick={() => setShowGoogle(false)}
              >
                Back
              </button>
            </form>
          )}

          <div className="demo-row">
            <span>Quick demo</span>
            <button type="button" onClick={() => fillDemo('citizen')}>Citizen</button>
            <button type="button" onClick={() => fillDemo('authority')}>Authority</button>
          </div>

          <p className="auth-foot text-small text-muted">
            By continuing you can file reports and view the public dashboard.
            {' '}
            <Link to="/dashboard">Browse without signing in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
