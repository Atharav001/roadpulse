import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { getCurrentUser, setAuthToken, setCurrentUser } from '../api/client';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getCurrentUser();

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    navigate('/login');
  };

  const go = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const linkClass = (path) => (location.pathname === path ? 'active' : '');

  return (
    <nav className="nav-shell">
      <div className="container nav-inner">
        <div className="brand" onClick={() => go('/')}>
          RoadPulse
        </div>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>

        <ul className={menuOpen ? 'show' : ''}>
          <li>
            <a href="/dashboard" className={linkClass('/dashboard')} onClick={(e) => { e.preventDefault(); go('/dashboard'); }}>
              Dashboard
            </a>
          </li>
          {user && (
            <>
              <li>
                <a href="/report" className={linkClass('/report')} onClick={(e) => { e.preventDefault(); go('/report'); }}>
                  Report
                </a>
              </li>
              <li>
                <a href="/my-reports" className={linkClass('/my-reports')} onClick={(e) => { e.preventDefault(); go('/my-reports'); }}>
                  My Reports
                </a>
              </li>
              {user.role === 'authority' && (
                <li>
                  <a href="/authority" className={linkClass('/authority')} onClick={(e) => { e.preventDefault(); go('/authority'); }}>
                    Queue
                  </a>
                </li>
              )}
            </>
          )}
          <li>
            <button type="button" className="theme-toggle" onClick={toggleTheme} title="Toggle light/dark theme">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </li>
          <li>
            {user ? (
              <a href="#logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                Sign out
              </a>
            ) : (
              <a href="/login" className={linkClass('/login')} onClick={(e) => { e.preventDefault(); go('/login'); }}>
                Sign in
              </a>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}
