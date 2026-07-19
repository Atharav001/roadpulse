import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, setAuthToken, setCurrentUser, isAuthenticated } from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      setAuthToken(response.token);
      setCurrentUser({
        user_id: response.user_id,
        email: response.email,
        role: response.role,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '400px', margin: '0 auto' }}>
      <div className="card">
        <h1 className="text-center" style={{ marginBottom: '2rem' }}>
          🚗 RoadPulse
        </h1>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
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
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Demo Account:</strong>
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
            📧 authority@roadpulse.local
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
            🔑 authority123
          </p>
        </div>
      </div>
    </div>
  );
}
