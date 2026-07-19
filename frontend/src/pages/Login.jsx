import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, isAuthenticated, setAuthToken, setCurrentUser } from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) navigate('/');
  }, [navigate]);

  const persist = (r) => {
    setAuthToken(r.token);
    setCurrentUser({
      user_id: r.user_id,
      email: r.email,
      role: r.role,
      department: r.department || null,
    });
    navigate(r.role === 'authority' ? '/authority' : '/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      persist(await authAPI.login(email, password));
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceLogin = async () => {
    setError('');
    setLoading(true);
    try {
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `device-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
        localStorage.setItem('device_id', deviceId);
      }
      persist(await authAPI.deviceLogin(deviceId));
    } catch (err) {
      setError(err.message || 'Device login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page" style={{ maxWidth: 440 }}>
      <div className="page-kicker">Access</div>
      <h1>Sign in</h1>
      <p className="text-muted text-small">
        Citizens can use quick device login. Authority uses the seeded demo account.
      </p>

      <div className="panel">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="authority@roadpulse.local"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center gap-1" style={{ margin: '20px 0', color: 'var(--text-muted)' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
          <span className="text-small">or</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
        </div>

        <button type="button" className="btn btn-secondary btn-block" onClick={handleDeviceLogin} disabled={loading}>
          Continue as citizen (device ID)
        </button>

        <div className="panel-quiet" style={{ marginTop: 20, background: 'var(--primary-soft)' }}>
          <p className="font-semibold text-small" style={{ color: 'var(--primary)', marginBottom: 8 }}>
            Demo accounts
          </p>
          <p className="text-small" style={{ margin: '2px 0', color: 'var(--text-secondary)' }}>
            authority@roadpulse.local / password123
          </p>
          <p className="text-small" style={{ margin: '2px 0', color: 'var(--text-secondary)' }}>
            citizen@roadpulse.local / password123
          </p>
        </div>
      </div>
    </div>
  );
}
