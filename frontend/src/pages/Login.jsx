import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authAPI, isAuthenticated, setAuthToken, setCurrentUser } from '../api/client';
import { useI18n } from '../i18n';
import Logo from '../components/Logo';

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';

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
  const { t } = useI18n();
  const isSignup = mode === 'signup' || location.pathname === '/signup';
  const redirectTo = location.state?.from || '/';
  const googleBtnRef = useRef(null);

  const [tab, setTab] = useState(isSignup ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(
    () => import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  );
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(true);

  useEffect(() => {
    setTab(isSignup ? 'signup' : 'login');
  }, [isSignup]);

  useEffect(() => {
    if (isAuthenticated()) navigate(redirectTo);
  }, [navigate, redirectTo]);

  // Pull Client ID from Railway /auth/config so Vercel env is optional
  useEffect(() => {
    let cancelled = false;
    authAPI
      .config()
      .then((cfg) => {
        if (cancelled) return;
        if (cfg?.google_client_id) setGoogleClientId(cfg.google_client_id);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGoogleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!googleClientId) {
      setGoogleReady(false);
      return undefined;
    }

    loadGoogleIdentity()
      .then(() => {
        if (cancelled || !googleBtnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
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
  }, [tab, googleClientId]);

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
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell animate-in">
        <aside className="auth-aside">
          <Logo size={32} />
          <h1 style={{ marginTop: 20 }}>{t('auth_aside_title')}</h1>
          <p>{t('auth_aside_sub')}</p>
          <ul className="auth-bullets">
            <li>{t('auth_b1')}</li>
            <li>{t('auth_b2')}</li>
            <li>{t('auth_b3')}</li>
          </ul>
        </aside>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={tab === 'login' ? 'active' : ''}
              onClick={() => { setTab('login'); setError(''); navigate('/login', { replace: true, state: location.state }); }}
            >
              {t('auth_tab_in')}
            </button>
            <button
              type="button"
              className={tab === 'signup' ? 'active' : ''}
              onClick={() => { setTab('signup'); setError(''); navigate('/signup', { replace: true, state: location.state }); }}
            >
              {t('auth_tab_up')}
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Always show Google option */}
          <div className="google-signin-wrap" style={{ marginBottom: 16 }}>
            {googleClientId ? (
              <>
                <div ref={googleBtnRef} className="google-btn-host" />
                {!googleReady && (
                  <p className="text-small text-muted" style={{ marginTop: 8 }}>
                    {t('auth_google_loading')}
                  </p>
                )}
              </>
            ) : (
              <button
                type="button"
                className="btn btn-google btn-block"
                disabled={loading || googleLoading}
                onClick={() => setError(t('auth_google_need_config'))}
              >
                <GoogleIcon />
                {t('auth_google')}
              </button>
            )}
          </div>

          <div className="auth-divider">
            <span>{googleClientId ? t('auth_or_email') : t('auth_email_only')}</span>
          </div>

          <form onSubmit={handleEmailAuth}>
            <div className="form-group">
              <label htmlFor="email">{t('auth_email')}</label>
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
              <label htmlFor="password">{t('auth_password')}</label>
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
                <label htmlFor="confirm">{t('auth_confirm')}</label>
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
              {loading ? t('auth_wait') : tab === 'signup' ? t('auth_submit_up') : t('auth_submit_in')}
            </button>
          </form>

          <div className="demo-row">
            <span>{t('auth_demo')}</span>
            <button type="button" disabled={loading} onClick={() => quickDemo('citizen')}>
              {t('auth_citizen')}
            </button>
            <button type="button" disabled={loading} onClick={() => quickDemo('authority')}>
              {t('auth_authority')}
            </button>
          </div>

          <p className="auth-foot text-small text-muted">
            {t('auth_foot')}{' '}
            <Link to="/dashboard">{t('auth_browse')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
