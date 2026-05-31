import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import DataTable from '../components/DataTable'
import FilterChips from '../components/FilterChips'
import EmptyState from '../components/EmptyState'
import { getLogs, getMonitors } from '../services/api'

function getLogStatus(log) {
  if (log.status === 'maintenance') return 'MAINTENANCE'
  if (log.is_up === true) return 'UP'
  if (log.is_up === false) return 'DOWN'
  return 'UNKNOWN'
}

function LogsExplorer() {
  const [logs, setLogs] = useState([])
  const [monitors, setMonitors] = useState([])
  const [selectedLog, setSelectedLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [monitorId, setMonitorId] = useState('')
  const [status, setStatus] = useState('ALL')
  const [codeClass, setCodeClass] = useState('ALL')
  const [maxResponse, setMaxResponse] = useState(5000)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getLogs(), getMonitors()])
      .then(([logsRes, monitorsRes]) => {
        setLogs(logsRes.data.results || logsRes.data || [])
        setMonitors(monitorsRes.data.results || monitorsRes.data || [])
      })
      .catch(() => setError('Failed to load logs.'))
      .finally(() => setLoading(false))
  }, [])

  const monitorMap = useMemo(() => Object.fromEntries(monitors.map((monitor) => [monitor.id, monitor])), [monitors])
  const rows = useMemo(() => logs.map((log) => ({
    ...log,
    monitor_name: log.monitor_name || monitorMap[log.monitor]?.name || monitorMap[log.monitor_id]?.name || `Monitor ${log.monitor || log.monitor_id || ''}`,
  })), [logs, monitorMap])

  const filtered = rows.filter((log) => {
    const text = `${log.monitor_name} ${log.error_message || ''} ${log.failure_reason || ''} ${log.region || ''}`.toLowerCase()
    if (search && !text.includes(search.toLowerCase())) return false
    if (monitorId && String(log.monitor || log.monitor_id) !== String(monitorId)) return false
    if (status !== 'ALL' && getLogStatus(log) !== status) return false
    if ((log.response_time_ms || 0) > Number(maxResponse)) return false
    if (codeClass !== 'ALL') {
      const code = Number(log.status_code || 0)
      if (codeClass === '2xx' && (code < 200 || code >= 300)) return false
      if (codeClass === '3xx' && (code < 300 || code >= 400)) return false
      if (codeClass === '4xx' && (code < 400 || code >= 500)) return false
      if (codeClass === '5xx' && code < 500) return false
    }
    return true
  })

  function countBy(items, getter) {
    return items.reduce((acc, item) => {
      const key = getter(item) || 'Unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }

  const statusFacet = countBy(rows, getLogStatus)
  const codeFacet = countBy(rows, (log) => log.status_code || 'None')
  const monitorFacet = countBy(rows, (log) => log.monitor_name)
  const regionFacet = countBy(rows, (log) => log.region || 'default')

  const Facet = ({ title, values, onSelect }) => (
    <div className="border-b border-slate-200 py-4 last:border-0">
      <h3 className="mb-3 text-xs font-bold uppercase text-slate-500">{title}</h3>
      <div className="space-y-2">
        {Object.entries(values).slice(0, 8).map(([key, value]) => (
          <button key={key} type="button" onClick={() => onSelect(key)} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50">
            <span className="truncate">{key}</span>
            <span className="font-mono font-bold text-slate-900">{value}</span>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-950">Logs Explorer</h1>
          <p className="mt-1 text-sm text-slate-600">Search uptime check results, inspect failures, and filter by monitor, status, response time, or code class.</p>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-slate-200 bg-white px-4 shadow-sm">
            <Facet title="Status" values={statusFacet} onSelect={(key) => setStatus(key)} />
            <Facet title="Status Code" values={codeFacet} onSelect={(key) => setCodeClass(`${String(key).charAt(0)}xx`)} />
            <Facet title="Monitor" values={monitorFacet} onSelect={(key) => {
              const monitor = monitors.find((item) => item.name === key)
              if (monitor) setMonitorId(String(monitor.id))
            }} />
            <Facet title="Region" values={regionFacet} onSelect={(key) => setSearch(key)} />
          </aside>

          <section className="space-y-4">
            <div className="glass-card p-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_150px_150px]">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages, monitor, region..." className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" />
                <select value={monitorId} onChange={(event) => setMonitorId(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="">All monitors</option>
                  {monitors.map((monitor) => <option key={monitor.id} value={monitor.id}>{monitor.name}</option>)}
                </select>
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="ALL">All statuses</option>
                  <option value="UP">UP</option>
                  <option value="DOWN">DOWN</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
                <select value={codeClass} onChange={(event) => setCodeClass(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="ALL">All codes</option>
                  <option value="2xx">2xx</option>
                  <option value="3xx">3xx</option>
                  <option value="4xx">4xx</option>
                  <option value="5xx">5xx</option>
                </select>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="text-xs font-bold uppercase text-slate-500">Max response {maxResponse}ms</label>
                <input type="range" min="50" max="10000" step="50" value={maxResponse} onChange={(event) => setMaxResponse(event.target.value)} className="w-full accent-emerald-600" />
              </div>
            </div>

            <FilterChips
              chips={[
                { key: 'search', label: 'Search', value: search },
                { key: 'status', label: 'Status', value: status },
                { key: 'code', label: 'Code', value: codeClass },
                { key: 'monitor', label: 'Monitor', value: monitorId && monitors.find((monitor) => String(monitor.id) === String(monitorId))?.name },
              ]}
              onRemove={(key) => {
                if (key === 'search') setSearch('')
                if (key === 'status') setStatus('ALL')
                if (key === 'code') setCodeClass('ALL')
                if (key === 'monitor') setMonitorId('')
              }}
              onClear={() => {
                setSearch('')
                setStatus('ALL')
                setCodeClass('ALL')
                setMonitorId('')
              }}
            />

            {loading ? (
              <EmptyState title="Loading logs..." />
            ) : (
              <DataTable
                rows={filtered}
                rowKey={(row) => row.id || `${row.monitor_name}-${row.checked_at}`}
                emptyTitle="No logs match these filters"
                onRowClick={setSelectedLog}
                columns={[
                  { key: 'checked_at', header: 'Timestamp', render: (row) => <span className="text-xs text-slate-600">{new Date(row.checked_at).toLocaleString()}</span> },
                  { key: 'monitor_name', header: 'Monitor', render: (row) => <span className="font-semibold text-slate-900">{row.monitor_name}</span> },
                  { key: 'status', header: 'Status', render: (row) => <span className={`rounded-full px-2 py-1 text-xs font-bold ${getLogStatus(row) === 'UP' ? 'bg-emerald-50 text-emerald-700' : getLogStatus(row) === 'DOWN' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{getLogStatus(row)}</span> },
                  { key: 'status_code', header: 'Code', align: 'right', render: (row) => <span className="font-mono text-xs">{row.status_code || '-'}</span> },
                  { key: 'response_time_ms', header: 'Latency', align: 'right', render: (row) => <span className="font-mono text-xs">{row.response_time_ms !== null && row.response_time_ms !== undefined ? `${row.response_time_ms} ms` : '-'}</span> },
                  { key: 'region', header: 'Region', render: (row) => <span className="font-mono text-xs text-slate-500">{row.region || 'default'}</span> },
                ]}
                renderExpanded={(row) => (
                  <pre className="overflow-x-auto rounded bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(row, null, 2)}</pre>
                )}
              />
            )}
          </section>
        </div>

        {selectedLog && (
          <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md border-l border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Log Detail</h2>
                <p className="text-sm text-slate-500">{selectedLog.monitor_name}</p>
              </div>
              <button type="button" onClick={() => setSelectedLog(null)} className="rounded border border-slate-200 px-2 py-1 text-sm text-slate-600">Close</button>
            </div>
            <div className="space-y-3 text-sm">
              <Detail label="Timestamp" value={new Date(selectedLog.checked_at).toLocaleString()} />
              <Detail label="Status" value={getLogStatus(selectedLog)} />
              <Detail label="Status code" value={selectedLog.status_code || '-'} />
              <Detail label="Response time" value={selectedLog.response_time_ms !== null ? `${selectedLog.response_time_ms} ms` : '-'} />
              <Detail label="Region" value={selectedLog.region || 'default'} />
              <Detail label="Error" value={selectedLog.failure_reason || selectedLog.error_message || 'None'} />
              {selectedLog.monitor || selectedLog.monitor_id ? (
                <Link to={`/monitors/${selectedLog.monitor || selectedLog.monitor_id}`} className="inline-flex rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">View Monitor</Link>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-mono text-xs text-slate-800">{value}</p>
    </div>
  )
}

export default LogsExplorer
