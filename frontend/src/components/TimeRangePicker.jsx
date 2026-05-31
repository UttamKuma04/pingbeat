import React from 'react'

function TimeRangePicker({ value = '24h', onChange }) {
  const ranges = [
    ['15m', '15m'],
    ['1h', '1h'],
    ['6h', '6h'],
    ['24h', '24h'],
    ['7d', '7d'],
    ['30d', '30d'],
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-semibold uppercase text-slate-500 sm:inline">Range</span>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
      >
        {ranges.map(([key, label]) => (
          <option key={key} value={key}>Last {label}</option>
        ))}
      </select>
      <span className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 md:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-green" />
        Live
      </span>
    </div>
  )
}

export default TimeRangePicker
