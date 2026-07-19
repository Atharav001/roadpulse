import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { getCurrentUser, setAuthToken, setCurrentUser } from '../api/client';

export default function Navigation() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getCurrentUser();

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    navigate('/login');
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <nav>
      <div className="container flex justify-between items-center" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
        <div
          onClick={() => navigate('/')}
          style={{
            fontWeight: 800,
            fontSize: '1.25rem',
            cursor: 'pointer',
            background: 'var(--gradient-1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          RoadPulse
        </div>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <ul className={menuOpen ? 'show' : ''} style={{ flex: 1, justifyContent: 'flex-end' }}>
          {user ? (
            <>
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('/report'); }}>Report</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('/my-reports'); }}>My Reports</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('/dashboard'); }}>Dashboard</a></li>
              {user.role === 'authority' && (
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('/authority'); }}>Queue</a></li>
              )}
              <li style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                  {user.email}
                </a>
              </li>
            </>
          ) : (
            <>
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('/dashboard'); }}>Dashboard</a></li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('/login'); }}>Sign In</a>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}