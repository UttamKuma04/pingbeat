import React from 'react'
import useNowTick from '../hooks/useNowTick'
import { formatDurationFull } from '../utils/duration'

function computeDurationStr(now, { isActive, statusChangedAt, isUp, status }) {
  if (isActive === false || status === 'maintenance' || status === 'MAINTENANCE') return ''
  if (!statusChangedAt || isUp === null || isUp === undefined) return ''

  const diffSecs = Math.floor((now - new Date(statusChangedAt).getTime()) / 1000)
  return formatDurationFull(diffSecs)
}

function LiveStatusBadge({ isUp, isActive, statusChangedAt, status, separateDuration = false }) {
  // useNowTick shares one interval across every rendered badge instead of
  // each badge running its own setInterval.
  const now = useNowTick()
  const durationStr = computeDurationStr(now, { isActive, statusChangedAt, isUp, status })

  if (status === 'maintenance' || status === 'MAINTENANCE') {
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-250">
        <span className="w-2 h-2 bg-amber-500 rounded-full pulse-amber"></span>
        <span>MAINTENANCE</span>
      </span>
    )
  }

  if (isActive === false) {
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
        <span>PAUSED</span>
      </span>
    )
  }

  function renderDurationText(colorClass) {
    if (!separateDuration || !durationStr) return null

    return (
      <span className={`text-left text-xs font-mono font-semibold tabular-nums ${colorClass}`}>
        {durationStr}
      </span>
    )
  }

  if (isUp === true) {
    const statusPill = (
      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap ${separateDuration ? 'min-w-32 justify-center' : ''}`}>
        <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-green"></span>
        <span>{separateDuration ? 'UP Running' : `UP ${durationStr ? `for ${durationStr}` : ''}`}</span>
      </span>
    )

    if (separateDuration) {
      return (
        <span className="inline-flex max-w-full flex-wrap items-center gap-2 sm:flex-nowrap">
          {statusPill}
          {renderDurationText('text-emerald-600')}
        </span>
      )
    }

    return statusPill
  }

  if (isUp === false) {
    const statusPill = (
      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-250 whitespace-nowrap ${separateDuration ? 'min-w-32 justify-center' : ''}`}>
        <span className="w-2 h-2 bg-red-500 rounded-full pulse-red"></span>
        <span>{separateDuration ? 'DOWN Running' : `DOWN ${durationStr ? `for ${durationStr}` : ''}`}</span>
      </span>
    )

    if (separateDuration) {
      return (
        <span className="inline-flex max-w-full flex-wrap items-center gap-2 sm:flex-nowrap">
          {statusPill}
          {renderDurationText('text-red-600')}
        </span>
      )
    }

    return statusPill
  }

  return (
    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
      <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
      <span>UNKNOWN</span>
    </span>
  )
}

export default LiveStatusBadge
