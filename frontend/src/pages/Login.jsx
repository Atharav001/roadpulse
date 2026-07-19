import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authAPI, isAuthenticated, setAuthToken, setCurrentUser } from '../api/client';
import Logo from '../components/Logo';

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In')));
      if (window.google?.accounts?.id) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
}

export default function Login({ mode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = mode === 'signup' || location.pathname === '/signup';
  const redirectTo = location.state?.from || '/';
  const googleBtnRef = useRef(null);

  const [tab, setTab] = useState(isSignup ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

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

  const onGoogleCredential = async (response) => {
    setError('');
    setLoading(true);
    try {
      if (!response?.credential) throw new Error('Google did not return a credential');
      persist(await authAPI.googleCredential(response.credential));
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!GOOGLE_CLIENT_ID) {
      setGoogleReady(false);
      return undefined;
    }

    loadGoogleIdentity()
      .then(() => {
        if (cancelled || !googleBtnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: onGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
        });
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
        });
        setGoogleReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setGoogleReady(false);
          console.warn(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'signup') {
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        if (password !== confirm) throw new Error('Passwords do not match');
        persist(await authAPI.register(email.trim(), password));
      } else {
        persist(await authAPI.login(email.trim(), password));
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  /** One-click demo: fills credentials and logs in immediately */
  const quickDemo = async (which) => {
    setError('');
    setLoading(true);
    setTab('login');
    const demoEmail = which === 'authority' ? 'authority@roadpulse.local' : 'citizen@roadpulse.local';
    const demoPassword = 'password123';
    setEmail(demoEmail);
    setPassword(demoPassword);
    try {
      persist(await authAPI.login(demoEmail, demoPassword));
    } catch (err) {
      setError(
        err.message ||
          'Demo login failed. Ensure the backend is running (port 5001) and the database is seeded.'
      );
    } finally {
      setLoading(false);
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

          {GOOGLE_CLIENT_ID ? (
            <div className="google-signin-wrap" style={{ marginBottom: 16 }}>
              <div ref={googleBtnRef} className="google-btn-host" />
              {!googleReady && (
                <p className="text-small text-muted" style={{ marginTop: 8 }}>
                  Loading Google Sign-In…
                </p>
              )}
            </div>
          ) : (
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              Google Sign-In needs <code>VITE_GOOGLE_CLIENT_ID</code> (and matching{' '}
              <code>GOOGLE_CLIENT_ID</code> on the backend). Until then, use email or Quick demo.
            </div>
          )}

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

          <div className="demo-row">
            <span>Quick demo</span>
            <button type="button" disabled={loading} onClick={() => quickDemo('citizen')}>
              Citizen
            </button>
            <button type="button" disabled={loading} onClick={() => quickDemo('authority')}>
              Authority
            </button>
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
