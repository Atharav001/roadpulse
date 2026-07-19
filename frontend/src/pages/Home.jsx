import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/client';

export default function Home() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="card" style={{ textAlign: 'center', marginBottom: '2rem', padding: '3rem 2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚗</div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>RoadPulse</h1>
        <p style={{ fontSize: '1.125rem', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
          Report road and traffic issues in your area. AI-powered classification, automatic routing, and public accountability.
        </p>

        {user ? (
          <div className="grid grid-2" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <button className="btn btn-primary" onClick={() => navigate('/report')} style={{ padding: '1rem' }}>
              Report an Issue
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{ padding: '1rem' }}>
              View Dashboard
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/my-reports')} style={{ padding: '1rem' }}>
              My Reports
            </button>
            {user.role === 'authority' && (
              <button className="btn btn-success" onClick={() => navigate('/authority')} style={{ padding: '1rem' }}>
                Authority Queue
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-2" style={{ maxWidth: '400px', margin: '0 auto' }}>
            <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ padding: '1rem' }}>
              Sign In
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{ padding: '1rem' }}>
              View Dashboard
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-2 grid-3">
        {[
          { icon: '📸', title: 'Easy Reporting', desc: 'Capture photos with GPS coordinates. AI classifies the issue automatically.' },
          { icon: '📍', title: 'Precise Location', desc: 'Landmark detection pinpoints the exact spot from your GPS coordinates.' },
          { icon: '🔗', title: 'Smart Merging', desc: 'Duplicate reports within 30m are merged into one incident for accurate counts.' },
          { icon: '📧', title: 'Auto Email Draft', desc: 'Formal complaint email generated and addressed to the right department.' },
          { icon: '📊', title: 'Public Dashboard', desc: 'Track resolution rates and response times by ward.' },
          { icon: '🏛️', title: 'Authority Queue', desc: 'Officials see only their department incidents with one-click resolve.' },
        ].map((f, i) => (
          <div key={i} className="card card-static" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
            <h3 style={{ marginBottom: '0.5rem' }}>{f.title}</h3>
            <p className="text-small text-muted" style={{ margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}