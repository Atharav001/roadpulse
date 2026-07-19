import React from 'react';

/**
 * Horizontal pooled issue representation — severity / status distribution.
 * Looks like a professional analytics segment bar (not a toy pie chart).
 */
export function SegmentPool({ title, segments, emptyLabel = 'No data' }) {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
  if (!total) {
    return (
      <div className="pool-chart">
        {title && <div className="pool-title">{title}</div>}
        <p className="text-muted text-small">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="pool-chart">
      {title && <div className="pool-title">{title}</div>}
      <div className="pool-track" role="img" aria-label={title || 'Distribution'}>
        {segments.map((s) => {
          const pct = ((s.value / total) * 100).toFixed(1);
          if (s.value <= 0) return null;
          return (
            <div
              key={s.id}
              className="pool-seg"
              style={{ width: `${pct}%`, background: s.color }}
              title={`${s.label}: ${s.value} (${pct}%)`}
            />
          );
        })}
      </div>
      <div className="pool-legend">
        {segments.map((s) => (
          <div key={s.id} className="pool-legend-item">
            <i style={{ background: s.color }} />
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Donut-style resolution ring for ward KPI */
export function ResolutionRing({ percent = 0, label = 'Resolved', size = 132 }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;

  return (
    <div className="ring-chart" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-progress"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ring-center">
        <strong>{p}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
