import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, setAuthToken, setCurrentUser, isAuthenticated } from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) navigate('/');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await authAPI.login(email, password);
      setAuthToken(r.token);
      setCurrentUser({ user_id: r.user_id, email: r.email, role: r.role, department: r.department || null });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleDeviceLogin = async () => {
    setError(''); setLoading(true);
    try {
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = 'device-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
        localStorage.setItem('device_id', deviceId);
      }
      const r = await authAPI.deviceLogin(deviceId);
      setAuthToken(r.token);
      setCurrentUser({ user_id: r.user_id, email: r.email, role: r.role, department: null });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Device login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '420px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h1 className="text-center" style={{ marginBottom: '1.5rem' }}>Welcome</h1>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center gap-2" style={{ margin: '1.25rem 0', color: 'var(--text-muted)' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
          <span style={{ fontSize: '0.8rem' }}>or</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
        </div>

        <button className="btn btn-secondary btn-block" onClick={handleDeviceLogin} disabled={loading}>
          Quick Citizen Login
        </button>

        <div className="card card-static" style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--accent-light)', border: '1px solid var(--accent-light)' }}>
          <p className="font-semibold text-small" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Demo Accounts</p>
          <p className="text-small" style={{ color: 'var(--accent)', margin: '0.15rem 0' }}>authority@roadpulse.local / password123</p>
          <p className="text-small" style={{ color: 'var(--accent)', margin: '0.15rem 0' }}>citizen@roadpulse.local / password123</p>
        </div>
      </div>
    </div>
  );
}