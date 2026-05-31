import React from 'react'

function StatusTimeline({ items = [], className = '' }) {
  const safeItems = items.length > 0 ? items : [{ status: 'unknown', label: 'No data', width: 100 }]
  const colors = {
    up: 'bg-emerald-500',
    down: 'bg-red-500',
    maintenance: 'bg-amber-500',
    paused: 'bg-slate-400',
    unknown: 'bg-slate-300',
  }

  return (
    <div className={className}>
      <div className="flex h-4 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        {safeItems.map((item, index) => {
          const status = String(item.status || 'unknown').toLowerCase()
          return (
            <div
              key={`${status}-${index}`}
              className={`${colors[status] || colors.unknown} min-w-[3px]`}
              style={{ width: `${item.width || item.percent || 100 / safeItems.length}%` }}
              title={item.label || status.toUpperCase()}
            />
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        {['up', 'down', 'maintenance'].map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${colors[status]}`} />
            {status.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  )
}

export default StatusTimeline
