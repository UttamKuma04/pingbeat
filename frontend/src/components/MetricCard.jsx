import React from 'react'
import SparklineChart from './SparklineChart'

function MetricCard({
  icon,
  label,
  value,
  unit = '',
  delta,
  tone = 'slate',
  sparkline,
  progress,
  loading = false,
}) {
  const toneClasses = {
    slate: {
      icon: 'bg-slate-100 text-slate-700 border-slate-200',
      value: 'text-slate-950',
      ring: '#475569',
    },
    emerald: {
      icon: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      value: 'text-emerald-700',
      ring: '#059669',
    },
    red: {
      icon: 'bg-red-50 text-red-700 border-red-200',
      value: 'text-red-700',
      ring: '#dc2626',
    },
    amber: {
      icon: 'bg-amber-50 text-amber-700 border-amber-200',
      value: 'text-amber-700',
      ring: '#d97706',
    },
    blue: {
      icon: 'bg-blue-50 text-blue-700 border-blue-200',
      value: 'text-blue-700',
      ring: '#2563eb',
    },
    cyan: {
      icon: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      value: 'text-cyan-700',
      ring: '#0891b2',
    },
  }
  const toneConfig = toneClasses[tone] || toneClasses.slate
  const numericProgress = Math.max(0, Math.min(100, Number(progress) || 0))
  const circumference = 2 * Math.PI * 17

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="mb-4 h-9 w-9 rounded-lg skeleton" />
        <div className="mb-2 h-3 w-24 rounded skeleton" />
        <div className="h-8 w-28 rounded skeleton" />
      </div>
    )
  }

  return (
    <div className="glass-card p-5 transition-colors hover:border-slate-300">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${toneConfig.icon}`}>
          {icon || <span className="h-2.5 w-2.5 rounded-full bg-current" />}
        </div>
        {progress !== undefined && (
          <svg viewBox="0 0 40 40" className="h-10 w-10" aria-label={`${numericProgress}%`}>
            <circle cx="20" cy="20" r="17" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle
              cx="20"
              cy="20"
              r="17"
              fill="none"
              stroke={toneConfig.ring}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (numericProgress / 100) * circumference}
              transform="rotate(-90 20 20)"
            />
          </svg>
        )}
      </div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className={`text-2xl font-extrabold tabular-nums ${toneConfig.value}`}>
          {value}
          {unit && <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span>}
        </p>
        {sparkline && <SparklineChart values={sparkline} tone={tone} />}
      </div>
      {delta && (
        <p className={`mt-3 text-xs font-semibold ${String(delta).startsWith('-') ? 'text-red-600' : 'text-emerald-600'}`}>
          {delta} vs previous period
        </p>
      )}
    </div>
  )
}

export default MetricCard
