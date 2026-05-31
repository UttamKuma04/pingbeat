import React from 'react'

function DonutChart({ segments = [], label, sublabel, size = 132 }) {
  const total = segments.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
  const radius = 46
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        {total > 0 && segments.map((segment) => {
          const value = Number(segment.value) || 0
          const dash = (value / total) * circumference
          const circle = (
            <circle
              key={segment.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          )
          offset += dash
          return circle
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold text-slate-950">{label}</span>
        {sublabel && <span className="mt-0.5 text-[11px] font-semibold uppercase text-slate-500">{sublabel}</span>}
      </div>
    </div>
  )
}

export default DonutChart
