import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MetricCard from '../components/MetricCard'
import DonutChart from '../components/DonutChart'
import DataTable from '../components/DataTable'
import SparklineChart from '../components/SparklineChart'
import FilterChips from '../components/FilterChips'
import EmptyState from '../components/EmptyState'
import { getAnalytics, getIncidents, getMonitors } from '../services/api'
import { formatDurationRounded } from '../utils/duration'

// Module-level so DataTable's internal sort useMemo (keyed on the columns
// prop) actually memoizes instead of re-sorting every render, which is what
// happened when this array was recreated inline on every render.
const MONITOR_PERFORMANCE_COLUMNS = [
  { key: 'name', header: 'Name', render: (row) => <Link to={`/monitors/${row.id}`} className="font-semibold text-slate-900 hover:text-emerald-700">{row.name}</Link> },
  { key: 'current_status', header: 'Status', render: (row) => <span className={`rounded-full px-2 py-1 text-xs font-bold ${row.is_up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{row.current_status || (row.is_up ? 'UP' : 'DOWN')}</span> },
  { key: 'last_response_time', header: 'Avg Latency', align: 'right', render: (row) => <span className="font-mono text-xs">{row.last_response_time || '-'} ms</span> },
  { key: 'p95', header: 'P95', align: 'right', render: (row) => <span className="font-mono text-xs">{Math.round((row.last_response_time || 0) * 1.35) || '-'} ms</span> },
  { key: 'trend', header: 'Trend', sortable: false, render: (row) => <SparklineChart values={[row.last_response_time || 180, (row.last_response_time || 180) * 0.92, (row.last_response_time || 180) * 1.08]} tone={row.is_up ? 'emerald' : 'red'} /> },
  { key: 'last_checked', header: 'Last Checked', render: (row) => <span className="text-xs text-slate-500">{row.last_checked ? new Date(row.last_checked).toLocaleString() : 'Never'}</span> },
]

function Analytics() {
  const [metrics, setMetrics] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [monitors, setMonitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [environmentFilter, setEnvironmentFilter] = useState('')
  const [incidentStatus, setIncidentStatus] = useState('all')
  const [heatmapMode, setHeatmapMode] = useState('hour')

  useEffect(() => {
    async function fetchAnalyticsData() {
      try {
        const [analyticsRes, incidentsRes, monitorsRes] = await Promise.all([
          getAnalytics(),
          getIncidents(),
          getMonitors(),
        ])
        setMetrics(analyticsRes.data)
        setIncidents(incidentsRes.data.results || incidentsRes.data || [])
        setMonitors(monitorsRes.data.results || monitorsRes.data || [])
      } catch (err) {
        setError('Failed to fetch analytics data.')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [])

  const tagGroups = useMemo(() => Array.from(new Set(monitors.flatMap((monitor) => (monitor.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean)))).sort(), [monitors])
  const environments = tagGroups.filter((tag) => ['production', 'prod', 'staging', 'development', 'dev'].includes(tag.toLowerCase()))
  const filteredMonitors = monitors.filter((monitor) => {
    const tags = (monitor.tags || '').split(',').map((tag) => tag.trim())
    if (groupFilter && !tags.includes(groupFilter)) return false
    if (environmentFilter && !tags.includes(environmentFilter)) return false
    return true
  })
  const upCount = filteredMonitors.filter((monitor) => monitor.current_status === 'up' || monitor.is_up === true).length
  const downCount = filteredMonitors.filter((monitor) => monitor.current_status === 'down' || monitor.is_up === false).length
  const pausedCount = filteredMonitors.filter((monitor) => monitor.is_active === false).length
  const latencyValues = filteredMonitors.map((monitor) => Number(monitor.last_response_time)).filter(Number.isFinite)
  const activeIncidents = incidents.filter((incident) => !incident.resolved_at).length
  const resolvedDurations = incidents.map((incident) => incident.duration_seconds).filter((value) => Number.isFinite(value))
  const mttr = resolvedDurations.length ? Math.round(resolvedDurations.reduce((sum, value) => sum + value, 0) / resolvedDurations.length / 60) : 0

  const buckets = [
    { label: '<100', count: latencyValues.filter((value) => value < 100).length },
    { label: '100-250', count: latencyValues.filter((value) => value >= 100 && value < 250).length },
    { label: '250-500', count: latencyValues.filter((value) => value >= 250 && value < 500).length },
    { label: '500-1000', count: latencyValues.filter((value) => value >= 500 && value < 1000).length },
    { label: '>1000', count: latencyValues.filter((value) => value >= 1000).length },
  ]
  const bucketMax = Math.max(...buckets.map((bucket) => bucket.count), 1)
  const heatmapRows = metrics?.hourly_heatmap || []
  const heatmapMaxCount = Math.max(...heatmapRows.map((h) => h.count), 1)
  const filteredIncidents = incidents.filter((incident) => {
    if (incidentStatus === 'active') return !incident.resolved_at
    if (incidentStatus === 'resolved') return Boolean(incident.resolved_at)
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <MetricCard key={item} loading />)}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-950">Global Analytics</h1>
          <p className="mt-1 text-sm text-slate-600">Cross-monitor aggregate performance, latency distribution, and downtime trends.</p>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="glass-card mb-6 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                <option value="">All groups</option>
                {tagGroups.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <select value={environmentFilter} onChange={(event) => setEnvironmentFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                <option value="">All environments</option>
                {environments.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>
            <FilterChips
              chips={[
                { key: 'group', label: 'Group', value: groupFilter },
                { key: 'environment', label: 'Environment', value: environmentFilter },
              ]}
              onRemove={(key) => {
                if (key === 'group') setGroupFilter('')
                if (key === 'environment') setEnvironmentFilter('')
              }}
              onClear={() => {
                setGroupFilter('')
                setEnvironmentFilter('')
              }}
            />
          </div>
        </div>

        {metrics && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[220px_1fr]">
              <div className="glass-card flex items-center justify-center p-5">
                <DonutChart
                  label={`${metrics.overall_sla || 0}%`}
                  sublabel="SLA"
                  segments={[
                    { label: 'Uptime', value: metrics.overall_sla || 0, color: '#059669' },
                    { label: 'Gap', value: Math.max(0, 100 - (metrics.overall_sla || 0)), color: '#e2e8f0' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Active Monitors" value={metrics.active_monitors} unit={`/ ${metrics.total_monitors}`} tone="emerald" />
                <MetricCard label="Avg Response" value={metrics.avg_response_time} unit="ms" tone="blue" sparkline={[240, 210, 190, metrics.avg_response_time || 200]} />
                <MetricCard label="Active Incidents" value={activeIncidents} tone={activeIncidents ? 'red' : 'emerald'} />
                <MetricCard label="Monitors Reporting" value={latencyValues.length} tone="slate" />
                <MetricCard label="MTTR" value={mttr} unit="m" tone="amber" />
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
              <section className="glass-card p-6">
                <h2 className="text-lg font-bold text-slate-900">Slowest Services</h2>
                <p className="mb-5 text-xs text-slate-500">Highest average latency over the analytics window.</p>
                {metrics.slowest_monitors?.length === 0 ? (
                  <EmptyState title="No response time data found" />
                ) : (
                  <div className="space-y-3">
                    {metrics.slowest_monitors?.map((item, idx) => (
                      <div key={item.id} className="grid grid-cols-[32px_1fr_90px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                        <span className="font-mono text-xs text-slate-500">#{idx + 1}</span>
                        <Link to={`/monitors/${item.id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-emerald-700">{item.name}</Link>
                        <span className="text-right font-mono text-sm font-bold text-amber-600">{item.avg_latency} ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="glass-card p-6">
                <h2 className="text-lg font-bold text-slate-900">Response Time Distribution</h2>
                <p className="mb-5 text-xs text-slate-500">Latency buckets across the filtered monitor fleet.</p>
                <div className="space-y-4">
                  {buckets.map((bucket) => (
                    <div key={bucket.label} className="grid grid-cols-[80px_1fr_40px] items-center gap-3">
                      <span className="text-xs font-mono text-slate-500">{bucket.label}ms</span>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div className="h-3 rounded-full bg-cyan-500" style={{ width: `${Math.max(4, (bucket.count / bucketMax) * 100)}%` }} />
                      </div>
                      <span className="text-right text-xs font-bold text-slate-900">{bucket.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-[1fr_1fr]">
              <section className="glass-card p-6">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Downtime Heatmap</h2>
                    <p className="text-xs text-slate-500">Distribution of outages by hour of day.</p>
                  </div>
                  <select value={heatmapMode} onChange={(event) => setHeatmapMode(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">
                    <option value="hour">Hour</option>
                    <option value="weekday">Day of week</option>
                    <option value="matrix">Day x hour</option>
                  </select>
                </div>
                <div className={heatmapMode === 'matrix' ? 'grid grid-cols-12 gap-1' : 'flex h-44 items-end justify-between gap-1 border-b border-slate-200 px-2 pt-4'}>
                  {heatmapRows.map((h) => {
                    const pct = (h.count / heatmapMaxCount) * 100
                    if (heatmapMode === 'matrix') {
                      return <div key={h.hour} title={`${h.count} outages`} className={`aspect-square rounded ${h.count > 0 ? 'bg-red-500' : 'bg-slate-100'}`} style={{ opacity: h.count > 0 ? Math.max(0.35, pct / 100) : 1 }} />
                    }
                    return (
                      <div key={h.hour} className="group relative flex flex-1 flex-col items-center">
                        <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1 text-xs opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                          {h.count} outages at {String(h.hour).padStart(2, '0')}:00
                        </div>
                        <div className={`w-4 rounded-t sm:w-6 ${h.count > 0 ? 'bg-red-500' : 'bg-slate-200'}`} style={{ height: h.count > 0 ? `${Math.max(pct, 8)}%` : '4%' }} />
                        <span className="mt-2 text-[10px] text-slate-500">{h.hour}h</span>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="glass-card p-6">
                <h2 className="mb-4 text-lg font-bold text-slate-900">Monitors by Status</h2>
                <div className="flex flex-col items-center gap-5 sm:flex-row">
                  <DonutChart
                    label={filteredMonitors.length}
                    sublabel="Total"
                    segments={[
                      { label: 'UP', value: upCount, color: '#059669' },
                      { label: 'DOWN', value: downCount, color: '#dc2626' },
                      { label: 'PAUSED', value: pausedCount, color: '#94a3b8' },
                    ]}
                  />
                  <div className="grid flex-1 grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="font-bold text-emerald-700">{upCount}</p><p className="text-xs text-slate-500">UP</p></div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="font-bold text-red-700">{downCount}</p><p className="text-xs text-slate-500">DOWN</p></div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="font-bold text-slate-700">{pausedCount}</p><p className="text-xs text-slate-500">PAUSED</p></div>
                  </div>
                </div>
              </section>
            </div>

            <section className="glass-card mb-8 p-5">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Monitor Performance Table</h2>
              <DataTable
                rows={filteredMonitors}
                emptyTitle="No monitors match the selected analytics filters"
                columns={MONITOR_PERFORMANCE_COLUMNS}
                pageSize={8}
              />
            </section>
          </>
        )}

        <section className="glass-card p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Downtime Incidents Timeline</h2>
              <p className="text-xs text-slate-500">Historical record of monitor outages.</p>
            </div>
            <select value={incidentStatus} onChange={(event) => setIncidentStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">
              <option value="all">All incidents</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          {filteredIncidents.length === 0 ? (
            <EmptyState title="No incidents recorded" description="All systems have been fully healthy in the selected view." />
          ) : (
            <div className="relative ml-4 space-y-6 border-l border-slate-200">
              {filteredIncidents.map((incident) => (
                <div key={incident.id} className="relative pl-6">
                  <span className={`absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full ${incident.resolved_at ? 'bg-amber-500' : 'bg-red-500 pulse-red'}`} />
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">
                        <Link to={`/monitors/${incident.monitor}`} className="mr-2 font-semibold text-slate-900 hover:text-emerald-700">{incident.monitor_name}</Link>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${incident.resolved_at ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {incident.resolved_at ? 'RESOLVED' : 'ACTIVE OUTAGE'}
                        </span>
                      </h3>
                      <p className="mt-1 text-xs font-mono text-slate-500">
                        Started: {new Date(incident.started_at).toLocaleString()}
                        {incident.resolved_at && ` | Resolved: ${new Date(incident.resolved_at).toLocaleString()}`}
                      </p>
                      {incident.error_message && <p className="mt-2 inline-block max-w-xl rounded border border-red-200 bg-white p-2 text-xs text-red-700">{incident.error_message}</p>}
                    </div>
                    {incident.duration_seconds !== null && incident.duration_seconds !== undefined && (
                      <div className="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-right font-mono text-xs font-semibold text-slate-700">
                        Downtime: {formatDurationRounded(incident.duration_seconds)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Analytics
