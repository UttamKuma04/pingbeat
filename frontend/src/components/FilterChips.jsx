import React from 'react'

function FilterChips({ chips = [], onRemove, onClear }) {
  const active = chips.filter((chip) => chip.value !== undefined && chip.value !== null && chip.value !== '' && chip.value !== 'ALL')

  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove?.(chip.key)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
        >
          <span className="text-slate-500">{chip.label}:</span>
          <span>{chip.value}</span>
          <span aria-hidden="true" className="text-slate-400">x</span>
        </button>
      ))}
      {active.length > 1 && (
        <button type="button" onClick={onClear} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
          Clear all
        </button>
      )}
    </div>
  )
}

export default FilterChips
