import React from 'react';

const variants = {
  primary: 'stat-card-primary',
  success: 'stat-card-success',
  warning: 'stat-card-warning',
  accent: 'stat-card-accent',
};

const icons = {
  W: '📊',
  R: '✅',
  '%': '📈',
  T: '⏱️',
};

export default function StatCard({ title, value, color = 'primary', icon }) {
  const variant = variants[color] || variants.primary;

  return (
    <div className={`card stat-card ${variant}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-small text-muted font-semibold" style={{ marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </p>
          <h3 style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: 800,
            background: 'var(--gradient-1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {value}
          </h3>
        </div>
        <div style={{ fontSize: '2rem', lineHeight: 1, opacity: 0.6 }}>
          {icons[icon] || icon}
        </div>
      </div>
    </div>
  );
}