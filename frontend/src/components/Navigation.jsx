import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { getCurrentUser, setAuthToken, setCurrentUser } from '../api/client';
import Logo from './Logo';
import { IconMoon, IconSun } from './Icons';

export default function Navigation() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getCurrentUser();

  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setMenuOpen(false);
    navigate('/');
  };

  const close = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="container nav-bar">
        <button type="button" className="brand-btn" onClick={() => { navigate('/'); close(); }}>
          <Logo size={30} />
        </button>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <div className="nav-center">
            <NavLink to="/dashboard" onClick={close}>Dashboard</NavLink>
            <NavLink to="/community" onClick={close}>Community</NavLink>
            <NavLink to="/report" onClick={close}>Report</NavLink>
            {user && <NavLink to="/my-reports" onClick={close}>My reports</NavLink>}
            {user?.role === 'authority' && (
              <NavLink to="/authority" onClick={close}>Queue</NavLink>
            )}
          </div>

          <div className="nav-actions">
            <button type="button" className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            {user ? (
              <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
                Sign out
              </button>
            ) : (
              <>
                <NavLink to="/login" className="nav-text" onClick={close}>Sign in</NavLink>
                <button type="button" className="btn btn-primary btn-small" onClick={() => { navigate('/signup'); close(); }}>
                  Get started
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
