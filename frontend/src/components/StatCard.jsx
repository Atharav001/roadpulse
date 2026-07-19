import React from 'react';

export default function StatCard({ title, value, hint, tone = 'primary' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
