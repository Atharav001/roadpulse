import React from 'react';

export default function StatCard({ title, value, trend, color = 'primary', icon }) {
  const colorStyles = {
    primary: { bg: '#dbeafe', text: '#0c4a6e' },
    success: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef3c7', text: '#78350f' },
    danger: { bg: '#fee2e2', text: '#991b1b' },
  };

  const style = colorStyles[color] || colorStyles.primary;

  return (
    <div
      className="card"
      style={{
        background: style.bg,
        borderLeft: `4px solid ${style.text}`,
      }}
    >
      <div className="flex justify-between">
        <div>
          <p className="text-small text-muted" style={{ color: style.text, marginBottom: '0.5rem' }}>
            {title}
          </p>
          <h3 style={{ color: style.text, margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
            {value}
          </h3>
        </div>
        {icon && (
          <div style={{ fontSize: '2rem', lineHeight: '1' }}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <p className="text-small mt-2" style={{ color: style.text }}>
          {trend}
        </p>
      )}
    </div>
  );
}
