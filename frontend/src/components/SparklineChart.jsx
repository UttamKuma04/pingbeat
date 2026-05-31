import React from 'react'

function SparklineChart({ values = [], tone = 'emerald', className = '', height = 36 }) {
  const cleanValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

  const colors = {
    emerald: '#059669',
    red: '#dc2626',
    amber: '#d97706',
    blue: '#2563eb',
    slate: '#475569',
    cyan: '#0891b2',
  }
  const color = colors[tone] || colors.emerald

  if (cleanValues.length < 2) {
    return (
      <div className={`flex h-9 items-center gap-1 ${className}`} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((item) => (
          <span key={item} className="h-1 flex-1 rounded-full bg-slate-200" />
        ))}
      </div>
    )
  }

  const width = 120
  const padding = 4
  const min = Math.min(...cleanValues)
  const max = Math.max(...cleanValues)
  const range = max - min || 1
  const step = (width - padding * 2) / (cleanValues.length - 1)

  const points = cleanValues.map((value, index) => {
    const x = padding + index * step
    const y = padding + (1 - (value - min) / range) * (height - padding * 2)
    return [x, y]
  })

  const path = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const area = `${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`h-9 w-28 ${className}`} role="img" aria-label="Trend sparkline">
      <path d={area} fill={color} opacity="0.11" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.5" fill={color} />
    </svg>
  )
}

export default SparklineChart
