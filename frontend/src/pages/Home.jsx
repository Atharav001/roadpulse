import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/client';

export default function Home() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚗</div>
        <h1>RoadPulse</h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-gray)', marginBottom: '2rem' }}>
          Report road and traffic issues in your area
        </p>

        {user ? (
          <div className="grid grid-2">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/report')}
              style={{ height: '100%', fontSize: '1rem' }}
            >
              📝 Report an Issue
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
              style={{ height: '100%', fontSize: '1rem' }}
            >
              📊 View Dashboard
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/my-reports')}
              style={{ height: '100%', fontSize: '1rem' }}
            >
              📋 My Reports
            </button>
            {user.role === 'authority' && (
              <button
                className="btn btn-danger"
                onClick={() => navigate('/authority')}
                style={{ height: '100%', fontSize: '1rem' }}
              >
                👮 Authority Queue
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-2">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
              style={{ height: '100%', fontSize: '1rem' }}
            >
              🔐 Sign In
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
              style={{ height: '100%', fontSize: '1rem' }}
            >
              📊 View Dashboard
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>📸 Easy Reporting</h3>
          <p>Capture photos of road issues with GPS coordinates and automatic detection.</p>
        </div>
        <div className="card">
          <h3>📍 Auto-Detected Location</h3>
          <p>Automatically detects landmark and location from photos and GPS data.</p>
        </div>
        <div className="card">
          <h3>📧 Smart Email Draft</h3>
          <p>Generates formal complaint emails to appropriate authorities.</p>
        </div>
        <div className="card">
          <h3>📊 Public Dashboard</h3>
          <p>Track reported issues and resolution progress by ward.</p>
        </div>
      </div>
    </div>
  );
}
