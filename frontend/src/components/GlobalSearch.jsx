import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getIncidents, getMonitorsCached, getStatusPagesCached } from '../services/api'

function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [data, setData] = useState({ monitors: [], incidents: [], statusPages: [] })
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    Promise.allSettled([getMonitorsCached(), getIncidents(), getStatusPagesCached()]).then(([monitorsRes, incidentsRes, pagesRes]) => {
      setData({
        monitors: monitorsRes.status === 'fulfilled' ? monitorsRes.value.data.results || monitorsRes.value.data || [] : [],
        incidents: incidentsRes.status === 'fulfilled' ? incidentsRes.value.data.results || incidentsRes.value.data || [] : [],
        statusPages: pagesRes.status === 'fulfilled' ? pagesRes.value.data.results || pagesRes.value.data || [] : [],
      })
    })
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const items = [
      ...data.monitors.map((item) => ({
        type: 'Monitor',
        title: item.name,
        detail: item.url,
        path: `/monitors/${item.id}`,
      })),
      ...data.incidents.map((item) => ({
        type: item.resolved_at ? 'Resolved Incident' : 'Active Incident',
        title: item.monitor_name || `Monitor ${item.monitor}`,
        detail: item.error_message || item.started_at,
        path: `/monitors/${item.monitor}`,
      })),
      ...data.statusPages.map((item) => ({
        type: 'Status Page',
        title: item.title,
        detail: `/status/${item.slug}`,
        path: `/status-pages`,
      })),
      { type: 'Action', title: 'Create monitor', detail: 'Add a new HTTP/API check', path: '/monitors/new' },
      { type: 'Action', title: 'Open analytics', detail: 'View fleet-wide performance', path: '/analytics' },
    ]
    if (!q) return items.slice(0, 8)
    return items
      .filter((item) => `${item.type} ${item.title} ${item.detail}`.toLowerCase().includes(q))
      .slice(0, 10)
  }, [data, query])

  function go(path) {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm transition hover:border-slate-300"
      >
        <span className="truncate">Search monitors, incidents, pages</span>
        <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 sm:inline">Ctrl K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-slate-950/35 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="mx-auto mt-20 max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-200 p-3">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search everything..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">No matching results.</p>
              ) : (
                results.map((item, index) => (
                  <button
                    type="button"
                    key={`${item.type}-${item.title}-${index}`}
                    onClick={() => go(item.path)}
                    className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{item.title}</span>
                      <span className="block truncate text-xs text-slate-500">{item.detail}</span>
                    </span>
                    <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">{item.type}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GlobalSearch
