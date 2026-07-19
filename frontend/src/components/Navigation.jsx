import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, setAuthToken, setCurrentUser } from '../api/client';

export default function Navigation() {
  const navigate = useNavigate();
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
      <div className="container flex justify-between">
        <div style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}>
          🚗 RoadPulse
        </div>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        <ul className={menuOpen ? 'show' : ''} style={{ flex: 1 }}>
          {user ? (
            <>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('/report');
                  }}
                >
                  Report Issue
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('/my-reports');
                  }}
                >
                  My Reports
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('/dashboard');
                  }}
                >
                  Dashboard
                </a>
              </li>
              {user.role === 'authority' && (
                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick('/authority');
                    }}
                  >
                    Authority Queue
                  </a>
                </li>
              )}
              <li style={{ marginLeft: 'auto' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                  Logout ({user.email})
                </a>
              </li>
            </>
          ) : (
            <>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('/dashboard');
                  }}
                >
                  Dashboard
                </a>
              </li>
              <li style={{ marginLeft: 'auto' }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('/login');
                  }}
                >
                  Sign In
                </a>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
