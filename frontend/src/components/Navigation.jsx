import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { getCurrentUser, setAuthToken, setCurrentUser } from '../api/client';
import { langLabel, useI18n } from '../i18n';
import Logo from './Logo';
import { IconMoon, IconSun } from './Icons';

export default function Navigation() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t, languages } = useI18n();
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
            <NavLink to="/dashboard" onClick={close}>{t('nav_dashboard')}</NavLink>
            <NavLink to="/community" onClick={close}>{t('nav_community')}</NavLink>
            <NavLink to="/report" onClick={close}>{t('nav_report')}</NavLink>
            {user && <NavLink to="/my-reports" onClick={close}>{t('nav_my_reports')}</NavLink>}
            {user?.role === 'authority' && (
              <NavLink to="/authority" onClick={close}>{t('nav_queue')}</NavLink>
            )}
          </div>

          <div className="nav-actions">
            <label className="lang-select-wrap" title="Language">
              <span className="sr-only">Language</span>
              <select
                className="lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label="Language"
              >
                {languages.map((code) => (
                  <option key={code} value={code}>{langLabel(code)}</option>
                ))}
              </select>
            </label>
            <button type="button" className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            {user ? (
              <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
                {t('nav_sign_out')}
              </button>
            ) : (
              <>
                <NavLink to="/login" className="nav-text" onClick={close}>{t('nav_sign_in')}</NavLink>
                <button type="button" className="btn btn-primary btn-small" onClick={() => { navigate('/signup'); close(); }}>
                  {t('nav_get_started')}
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
