import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo size={28} />
          <p className="text-small text-muted" style={{ margin: '12px 0 0', maxWidth: 300 }}>
            Transparent road accountability — report, route, and resolve with public visibility.
          </p>
        </div>
        <div>
          <div className="footer-heading">Platform</div>
          <Link to="/report">Report an issue</Link>
          <Link to="/my-reports">Track reports</Link>
          <Link to="/dashboard">Public dashboard</Link>
        </div>
        <div>
          <div className="footer-heading">Access</div>
          <Link to="/login">Sign in</Link>
          <Link to="/signup">Create account</Link>
          <Link to="/authority">Authority portal</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} RoadPulse Civic Platform</span>
        <span>Open transparency · Ward performance visible to all</span>
      </div>
    </footer>
  );
}
