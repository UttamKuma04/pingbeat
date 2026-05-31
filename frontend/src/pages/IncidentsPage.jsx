import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MetricCard from '../components/MetricCard'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import StatusTimeline from '../components/StatusTimeline'
import FilterChips from '../components/FilterChips'
import { getIncidents } from '../services/api'

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return 'Ongoing'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h`
}

function IncidentDuration({ incident }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (incident.resolved_at) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [incident.resolved_at])

  if (incident.duration_seconds !== null && incident.duration_seconds !== undefined) {
    return formatDuration(incident.duration_seconds)
  }

  return formatDuration(Math.max(0, Math.floor((now - new Date(incident.started_at).getTime()) / 1000)))
}

function IncidentsPage() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [monitorFilter, setMonitorFilter] = useState('')
  const [acknowledgedIds, setAcknowledgedIds] = useState([])

  useEffect(() => {
    getIncidents()
      .then((res) => setIncidents(res.data.results || res.data || []))
      .catch(() => setError('Failed to load incidents.'))
      .finally(() => setLoading(false))
  }, [])

  const active = incidents.filter((incident) => !incident.resolved_at)
  const resolved = incidents.filter((incident) => incident.resolved_at)
  const monitorNames = Array.from(new Set(incidents.map((incident) => incident.monitor_name).filter(Boolean))).sort()
  const resolvedToday = resolved.filter((incident) => new Date(incident.resolved_at).toDateString() === new Date().toDateString()).length
  const mttrSeconds = resolved.length
    ? Math.round(resolved.reduce((sum, incident) => sum + (incident.duration_seconds || 0), 0) / resolved.length)
    : 0
  const longestOngoing = active.reduce((longest, incident) => {
    const seconds = Math.floor((Date.now() - new Date(incident.started_at).getTime()) / 1000)
    return Math.max(longest, seconds)
  }, 0)

  const filtered = useMemo(() => incidents.filter((incident) => {
    if (statusFilter === 'active' && incident.resolved_at) return false
    if (statusFilter === 'resolved' && !incident.resolved_at) return false
    if (monitorFilter && incident.monitor_name !== monitorFilter) return false
    return true
  }), [incidents, monitorFilter, statusFilter])

  const timelineItems = incidents.slice(0, 24).map((incident) => ({
    status: incident.resolved_at ? 'up' : 'down',
    width: Math.max(4, Math.min(30, ((incident.duration_seconds || 900) / 3600) * 12)),
    label: `${incident.monitor_name || 'Monitor'} - ${incident.resolved_at ? 'resolved' : 'active'}`,
  }))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Incidents</h1>
            <p className="mt-1 text-sm text-slate-600">Triage active outages and review historical downtime across monitors.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
            <select value={monitorFilter} onChange={(event) => setMonitorFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
              <option value="">All monitors</option>
              {monitorNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active Incidents" value={loading ? '-' : active.length} tone={active.length ? 'red' : 'emerald'} progress={active.length ? 100 : 0} />
          <MetricCard label="Resolved Today" value={loading ? '-' : resolvedToday} tone="emerald" />
          <MetricCard label="MTTR" value={loading ? '-' : formatDuration(mttrSeconds)} tone="blue" />
          <MetricCard label="Longest Ongoing" value={loading ? '-' : formatDuration(longestOngoing)} tone={longestOngoing ? 'amber' : 'slate'} />
        </div>

        <FilterChips
          chips={[
            { key: 'status', label: 'Status', value: statusFilter === 'all' ? '' : statusFilter },
            { key: 'monitor', label: 'Monitor', value: monitorFilter },
          ]}
          onRemove={(key) => {
            if (key === 'status') setStatusFilter('all')
            if (key === 'monitor') setMonitorFilter('')
          }}
          onClear={() => {
            setStatusFilter('all')
            setMonitorFilter('')
          }}
        />

        <section className="my-8">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Active Incidents</h2>
          {active.length === 0 ? (
            <EmptyState title="No active incidents" description="All monitored services are currently clear." />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {active.map((incident) => (
                <div key={incident.id} className="rounded-lg border border-red-200 bg-red-50/70 p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-950">{incident.monitor_name || `Monitor ${incident.monitor}`}</p>
                      <p className="mt-1 text-xs font-mono text-red-700">{incident.error_message || 'Monitor is currently down'}</p>
                    </div>
                    <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">ACTIVE</span>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded border border-red-200 bg-white px-3 py-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">Started</p>
                      <p className="mt-1 text-xs text-slate-700">{new Date(incident.started_at).toLocaleString()}</p>
                    </div>
                    <div className="rounded border border-red-200 bg-white px-3 py-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">Duration</p>
                      <p className="mt-1 font-mono font-bold text-red-700"><IncidentDuration incident={incident} /></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/monitors/${incident.monitor}`} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">View Monitor</Link>
                    <button
                      type="button"
                      onClick={() => setAcknowledgedIds((ids) => ids.includes(incident.id) ? ids : [...ids, incident.id])}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      {acknowledgedIds.includes(incident.id) ? 'Acknowledged' : 'Acknowledge'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950">Incident Timeline</h2>
            <p className="text-sm text-slate-500">Recent incident history shown as a compact status bar.</p>
          </div>
          <StatusTimeline items={timelineItems} />
        </section>

        <section className="glass-card p-5">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Incident History</h2>
          <DataTable
            rows={filtered}
            emptyTitle={loading ? 'Loading incidents...' : 'No incidents match these filters'}
            columns={[
              { key: 'monitor_name', header: 'Monitor', render: (row) => <Link to={`/monitors/${row.monitor}`} className="font-semibold text-slate-900 hover:text-emerald-700">{row.monitor_name || row.monitor}</Link> },
              { key: 'started_at', header: 'Started', render: (row) => <span className="text-xs text-slate-600">{new Date(row.started_at).toLocaleString()}</span> },
              { key: 'resolved_at', header: 'Resolved', render: (row) => row.resolved_at ? <span className="text-xs text-slate-600">{new Date(row.resolved_at).toLocaleString()}</span> : <span className="text-red-600">Active</span> },
              { key: 'duration_seconds', header: 'Duration', render: (row) => <span className="font-mono text-xs font-semibold">{row.resolved_at ? formatDuration(row.duration_seconds) : <IncidentDuration incident={row} />}</span> },
              { key: 'error_message', header: 'Error', render: (row) => <span className="line-clamp-1 text-xs text-slate-600">{row.error_message || '-'}</span> },
            ]}
            pageSize={12}
          />
        </section>
      </main>
    </div>
  )
}

export default IncidentsPage
