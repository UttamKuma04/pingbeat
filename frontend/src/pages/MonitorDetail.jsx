import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import LiveStatusBadge from '../components/LiveStatusBadge'
import { getMonitor, getLogs, getMonitorStats, pauseMonitor, resumeMonitor, deleteMonitor, exportLogsCsv, getIncidents, getMaintenanceWindows, createMaintenanceWindow, deleteMaintenanceWindow } from '../services/api'

function ResponseTimeChart({ chartData }) {
  const [tooltip, setTooltip] = useState(null)

  if (!chartData || chartData.length < 2) {
    return (
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Response Time (Last 24h)</h2>
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
          Not enough data points to render chart. Checks will populate this over time.
        </div>
      </div>
    )
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 55 }
  const width = 800
  const height = 240
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const times = chartData.map((d) => new Date(d.time).getTime())
  const values = chartData.map((d) => d.response_time || 0)
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const maxVal = Math.max(...values, 1) * 1.15

  function x(i) {
    const range = maxTime - minTime || 1
    return padding.left + ((times[i] - minTime) / range) * chartW
  }
  function y(val) {
    return padding.top + chartH - (val / maxVal) * chartH
  }

  // Build path
  let pathD = ''
  let areaD = ''
  const points = []
  chartData.forEach((d, i) => {
    const px = x(i)
    const py = y(d.response_time || 0)
    points.push({ x: px, y: py, data: d, index: i })
    if (i === 0) {
      pathD += `M ${px} ${py}`
      areaD += `M ${px} ${padding.top + chartH}`
      areaD += ` L ${px} ${py}`
    } else {
      pathD += ` L ${px} ${py}`
      areaD += ` L ${px} ${py}`
    }
  })
  areaD += ` L ${x(chartData.length - 1)} ${padding.top + chartH} Z`

  // Y-axis labels
  const yLabels = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), Math.round(maxVal)]

  // X-axis labels (show ~5 time labels)
  const xLabelCount = Math.min(5, chartData.length)
  const xLabels = []
  for (let i = 0; i < xLabelCount; i++) {
    const idx = Math.round((i / (xLabelCount - 1)) * (chartData.length - 1))
    const d = new Date(chartData[idx].time)
    xLabels.push({ x: x(idx), label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
  }

  function handleMouseMove(e) {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * width

    let closest = null
    let closestDist = Infinity
    points.forEach((p) => {
      const dist = Math.abs(p.x - mouseX)
      if (dist < closestDist) {
        closestDist = dist
        closest = p
      }
    })
    if (closest && closestDist < 30) {
      setTooltip(closest)
    } else {
      setTooltip(null)
    }
  }

  return (
    <div className="glass-card p-6 mb-8">
      <h2 className="text-lg font-bold text-slate-900 mb-4">Response Time (Last 24h)</h2>
      <div className="relative overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yLabels.map((val, i) => (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left} y1={y(val)} x2={width - padding.right} y2={y(val)}
                stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4 4"
              />
              <text x={padding.left - 8} y={y(val) + 4} textAnchor="end" fill="#64748b" fontSize="11" fontFamily="monospace">
                {val}ms
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map((lbl, i) => (
            <text key={`xlbl-${i}`} x={lbl.x} y={height - 8} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="monospace">
              {lbl.label}
            </text>
          ))}

          {/* Area fill */}
          <path d={areaD} fill="url(#chartGrad)" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Down markers */}
          {points.filter((p) => !p.data.is_up).map((p, i) => (
            <circle key={`down-${i}`} cx={p.x} cy={p.y} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          ))}

          {/* Tooltip crosshair + dot */}
          {tooltip && (
            <g>
              <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={padding.top + chartH} stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <circle cx={tooltip.x} cy={tooltip.y} r="5" fill="#10b981" stroke="#10b981" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Tooltip card */}
        {tooltip && (
          <div
            className="absolute bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-lg z-10 text-slate-800"
            style={{
              left: `${Math.min(Math.max((tooltip.x / width) * 100, 10), 85)}%`,
              top: '8px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-slate-500">{new Date(tooltip.data.time).toLocaleString()}</div>
            <div className="font-semibold mt-0.5">
              {tooltip.data.is_up ? (
                <span className="text-emerald-600 font-bold">{tooltip.data.response_time?.toFixed(1)} ms</span>
              ) : (
                <span className="text-red-650 font-bold">DOWN</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MonitorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [monitor, setMonitor] = useState(null)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [logsPage, setLogsPage] = useState(1)
  const [maintenanceWindows, setMaintenanceWindows] = useState([])
  const [mwLabel, setMwLabel] = useState('')
  const [mwStartTime, setMwStartTime] = useState('')
  const [mwEndTime, setMwEndTime] = useState('')
  const [mwLoading, setMwLoading] = useState(false)
  const [mwError, setMwError] = useState('')

  useEffect(() => {
    fetchMonitorDetails()
    fetchMonitorLogs()
    fetchMonitorStats()
    fetchMonitorIncidents()
    fetchMaintenanceWindows()
    setLogsPage(1)
  }, [id])

  async function fetchMonitorDetails() {
    try {
      const res = await getMonitor(id)
      setMonitor(res.data)
    } catch (err) {
      setError('Failed to load monitor details.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchMonitorLogs() {
    try {
      const res = await getLogs(id)
      setLogs(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to load logs:', err)
    } finally {
      setLogsLoading(false)
    }
  }

  async function fetchMonitorStats() {
    try {
      const res = await getMonitorStats(id)
      setStats(res.data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  async function fetchMonitorIncidents() {
    try {
      const res = await getIncidents()
      const data = res.data.results || res.data || []
      setIncidents(data.filter((inc) => inc.monitor === parseInt(id, 10)))
    } catch (err) {
      console.error('Failed to load incidents:', err)
    }
  }

  async function fetchMaintenanceWindows() {
    try {
      const res = await getMaintenanceWindows(id)
      setMaintenanceWindows(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to load maintenance windows:', err)
    }
  }

  async function handleAddMaintenanceWindow(e) {
    e.preventDefault()
    if (!mwLabel || !mwStartTime || !mwEndTime) {
      setMwError('All fields are required.')
      return
    }
    setMwLoading(true)
    setMwError('')
    try {
      await createMaintenanceWindow({
        monitor: parseInt(id, 10),
        label: mwLabel,
        start_time: new Date(mwStartTime).toISOString(),
        end_time: new Date(mwEndTime).toISOString(),
      })
      setMwLabel('')
      setMwStartTime('')
      setMwEndTime('')
      fetchMaintenanceWindows()
      fetchMonitorDetails()
    } catch (err) {
      setMwError('Failed to create maintenance window.')
    } finally {
      setMwLoading(false)
    }
  }

  async function handleDeleteMaintenanceWindow(mwId) {
    if (!window.confirm('Are you sure you want to delete this maintenance window?')) return
    try {
      await deleteMaintenanceWindow(mwId)
      fetchMaintenanceWindows()
      fetchMonitorDetails()
    } catch (err) {
      alert('Failed to delete maintenance window.')
    }
  }

  async function handleToggleActive() {
    if (!monitor) return
    setActionLoading(true)
    try {
      if (monitor.is_active) {
        const res = await pauseMonitor(id)
        setMonitor(res.data)
      } else {
        const res = await resumeMonitor(id)
        setMonitor(res.data)
      }
    } catch (err) {
      alert('Failed to change monitor status.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    setActionLoading(true)
    try {
      await deleteMonitor(id)
      navigate('/dashboard')
    } catch (err) {
      alert('Failed to delete monitor.')
      setActionLoading(false)
    }
  }

  async function handleExportCsv() {
    try {
      const res = await exportLogsCsv(id)
      const blob = new Blob([res.data], { type: 'text/csv' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = `pingbeat_logs_${monitor.name.replace(/\s+/g, '_')}.csv`
      link.click()
    } catch (err) {
      alert('Failed to export CSV.')
    }
  }

  function formatTime(dateStr) {
    if (!dateStr) return 'Never'
    const d = new Date(dateStr)
    return d.toLocaleString()
  }

  function getSlaColor(val) {
    if (val === null || val === undefined) return 'text-slate-500'
    if (val >= 99) return 'text-emerald-600 font-bold'
    if (val >= 95) return 'text-amber-600 font-bold'
    return 'text-red-600 font-bold'
  }

  function getSlaGlow(val) {
    if (val === null || val === undefined) return 'border-slate-200 shadow-sm'
    if (val >= 99) return 'border-emerald-200 hover:border-emerald-350 shadow-sm'
    if (val >= 95) return 'border-amber-250 hover:border-amber-350 shadow-sm'
    return 'border-red-200 hover:border-red-300 shadow-sm'
  }

  const logsLimit = 50
  const logsPerPage = 25
  const visibleLogs = logs.slice(0, logsLimit)
  const logsPageCount = Math.max(1, Math.ceil(visibleLogs.length / logsPerPage))
  const currentLogsPage = Math.min(logsPage, logsPageCount)
  const paginatedLogs = visibleLogs.slice((currentLogsPage - 1) * logsPerPage, currentLogsPage * logsPerPage)
  const logsStart = visibleLogs.length === 0 ? 0 : (currentLogsPage - 1) * logsPerPage + 1
  const logsEnd = Math.min(currentLogsPage * logsPerPage, visibleLogs.length)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <svg className="animate-spin h-8 w-8 text-emerald-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    )
  }

  if (error || !monitor) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 inline-block max-w-lg shadow-sm">
            <p className="text-red-600 font-medium mb-4">{error || 'Monitor not found'}</p>
            <Link to="/dashboard" className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold transition-colors duration-200 shadow-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-850">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/dashboard" className="text-slate-600 hover:text-emerald-650 text-sm flex items-center space-x-2 transition-colors duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* SSL Expiry Warning Banner */}
        {logs[0]?.ssl_warning && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-250 rounded-xl flex items-center space-x-3 text-amber-700 text-sm animate-pulse-slow">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-semibold text-amber-800">SSL Certificate Warning:</span> The SSL certificate for this service is expiring soon (in <strong className="text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded">{logs[0]?.ssl_days_remaining} days</strong> on {new Date(logs[0]?.ssl_expiry_date).toLocaleDateString()}).
            </div>
          </div>
        )}

        {/* Monitor Info Glass Card */}
        <div className="glass-card p-6 md:p-8 mb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center space-x-3 mb-2 flex-wrap gap-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  {monitor.name}
                </h1>
                <LiveStatusBadge
                  isUp={monitor.is_up}
                  isActive={monitor.is_active}
                  statusChangedAt={monitor.status_changed_at}
                  status={monitor.current_status}
                />
              </div>
              <p className="text-slate-650 font-mono text-sm break-all mb-4">
                <span className="text-slate-400 font-bold mr-1.5">{monitor.http_method}</span> {monitor.url}
              </p>

              {monitor.tags && (
                <div className="flex gap-1.5 mb-6">
                  {monitor.tags.split(',').map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs text-slate-650 font-mono">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold">Expected Status</p>
                  <p className="text-slate-900 font-mono text-lg">{monitor.expected_status}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold">Interval</p>
                  <p className="text-slate-900 text-lg">
                    {monitor.interval_seconds < 60
                      ? `${monitor.interval_seconds}s`
                      : `${monitor.interval_seconds / 60}m`}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold">Timeout</p>
                  <p className="text-slate-900 text-lg">{monitor.timeout_seconds}s</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold">Last Checked</p>
                  <p className="text-slate-700 text-sm mt-1">{formatTime(monitor.last_checked)}</p>
                </div>
              </div>

              {/* SSL Details */}
              {monitor.ssl_expiry && (
                <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="break-anywhere">SSL Certificate validated ({monitor.ssl_issuer})</span>
                  </span>
                  <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shadow-sm">
                    Expires in {Math.max(0, Math.ceil((new Date(monitor.ssl_expiry) - new Date()) / (1000 * 60 * 60 * 24)))} days
                  </span>
                </div>
              )}
            </div>

            {/* Actions Panel */}
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:w-auto md:flex-col">
              <button
                onClick={handleToggleActive}
                disabled={actionLoading}
                className={`w-full md:w-44 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm ${
                  monitor.is_active
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {actionLoading ? 'Loading...' : monitor.is_active ? 'Pause Monitor' : 'Resume Monitor'}
              </button>
              <Link
                to={`/monitors/${monitor.id}/edit`}
                className="w-full md:w-44 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 rounded-lg font-semibold text-sm text-center transition-colors duration-200 shadow-sm"
              >
                Edit Details
              </Link>
              <button
                onClick={handleExportCsv}
                className="w-full md:w-44 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 rounded-lg font-semibold text-sm text-center transition-colors duration-200 shadow-sm"
              >
                Export CSV Logs
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={actionLoading}
                className="w-full md:w-44 py-2.5 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm"
              >
                Delete Monitor
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {/* SLA Cards */}
            <div className={`glass-card p-4 transition-all duration-200 ${getSlaGlow(stats.sla?.['24h'])}`}>
              <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Uptime 24h</p>
              <p className={`text-2xl font-bold font-mono ${getSlaColor(stats.sla?.['24h'])}`}>
                {stats.sla?.['24h'] !== null ? `${stats.sla['24h']}%` : '—'}
              </p>
            </div>
            <div className={`glass-card p-4 transition-all duration-200 ${getSlaGlow(stats.sla?.['7d'])}`}>
              <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Uptime 7d</p>
              <p className={`text-2xl font-bold font-mono ${getSlaColor(stats.sla?.['7d'])}`}>
                {stats.sla?.['7d'] !== null ? `${stats.sla['7d']}%` : '—'}
              </p>
            </div>
            <div className={`glass-card p-4 transition-all duration-200 ${getSlaGlow(stats.sla?.['30d'])}`}>
              <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Uptime 30d</p>
              <p className={`text-2xl font-bold font-mono ${getSlaColor(stats.sla?.['30d'])}`}>
                {stats.sla?.['30d'] !== null ? `${stats.sla['30d']}%` : '—'}
              </p>
            </div>

            {/* Latency Cards */}
            <div className="glass-card p-4 transition-all duration-200 hover:border-amber-300">
              <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Avg Latency</p>
              <p className="text-2xl font-bold font-mono text-amber-600">
                {stats.latency?.avg !== null ? `${stats.latency.avg}` : '—'}
                {stats.latency?.avg !== null && <span className="text-sm text-slate-500 ml-0.5">ms</span>}
              </p>
            </div>
            <div className="glass-card p-4 transition-all duration-200 hover:border-emerald-300">
              <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Min Latency</p>
              <p className="text-2xl font-bold font-mono text-emerald-600">
                {stats.latency?.min !== null ? `${stats.latency.min}` : '—'}
                {stats.latency?.min !== null && <span className="text-sm text-slate-500 ml-0.5">ms</span>}
              </p>
            </div>
            <div className="glass-card p-4 transition-all duration-200 hover:border-amber-300">
              <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Max Latency</p>
              <p className="text-2xl font-bold font-mono text-amber-600">
                {stats.latency?.max !== null ? `${stats.latency.max}` : '—'}
                {stats.latency?.max !== null && <span className="text-sm text-slate-500 ml-0.5">ms</span>}
              </p>
            </div>
          </div>
        )}

        {/* Response Time Chart */}
        {stats && <ResponseTimeChart chartData={stats.chart} />}

        {/* Downtime Incidents section */}
        {incidents.length > 0 && (
          <div className="glass-card p-6 mb-8 border border-red-200 bg-red-50/40 shadow-sm">
            <h2 className="text-red-650 font-bold mb-4 uppercase tracking-wider text-xs">Monitor Incidents History</h2>
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div key={incident.id} className="border-l-2 border-red-300 pl-4 py-1 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold mr-2 border ${
                      incident.resolved_at 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                        : 'bg-red-55/60 bg-red-50 border-red-200 text-red-600'
                    }`}>
                      {incident.resolved_at ? 'RESOLVED' : 'ACTIVE OUTAGE'}
                    </span>
                    <span className="text-slate-600 text-xs font-mono">
                      Started: {new Date(incident.started_at).toLocaleString()}
                    </span>
                    {incident.error_message && (
                      <p className="text-red-600 font-mono text-xs mt-1 bg-white p-1.5 border border-red-200 rounded">{incident.error_message}</p>
                    )}
                  </div>
                  {incident.duration_seconds !== null && (
                    <span className="text-slate-500 text-xs font-mono">
                      Downtime: {(() => {
                        const s = incident.duration_seconds;
                        if (s < 60) return `${s}s`;
                        if (s < 3600) {
                          const m = Math.floor(s / 60);
                          const secs = s % 60;
                          return secs > 0 ? `${m}m ${secs}s` : `${m}m`;
                        }
                        if (s < 86400) {
                          const h = Math.floor(s / 3600);
                          const m = Math.floor((s % 3600) / 60);
                          const secs = s % 60;
                          let res = `${h}h ${m}m`;
                          if (secs > 0) res += ` ${secs}s`;
                          return res;
                        }
                        const d = Math.floor(s / 86400);
                        const h = Math.floor((s % 86400) / 3600);
                        const m = Math.floor((s % 3600) / 60);
                        return `${d}d ${h}h ${m}m`;
                      })()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="glass-card max-w-md w-full p-6 border-slate-200 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Monitor</h3>
              <p className="text-slate-650 text-sm mb-6">
                Are you sure you want to delete <strong>{monitor.name}</strong>? This action cannot be undone and all historical logs will be permanently deleted.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-sm transition-colors duration-200"
                >
                  {actionLoading ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Windows management */}
        <div className="glass-card p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* List of active/scheduled Windows */}
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-amber-600 animate-pulse-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Maintenance Windows</span>
              </h2>
              {mwError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                  {mwError}
                </div>
              )}
              {maintenanceWindows.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No scheduled maintenance windows for this monitor.</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {maintenanceWindows.map((mw) => {
                    const now = new Date();
                    const isCurrent = now >= new Date(mw.start_time) && now <= new Date(mw.end_time);
                    return (
                      <div key={mw.id} className={`p-3 bg-white border rounded-lg flex items-center justify-between transition-colors ${isCurrent ? 'border-amber-300 bg-amber-50/50' : 'border-slate-150'}`}>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-800 text-sm truncate">{mw.label}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold uppercase animate-pulse">
                                Active Now
                              </span>
                            )}
                          </div>
                          <p className="text-slate-550 text-xs mt-1 font-mono">
                            {new Date(mw.start_time).toLocaleString()} - {new Date(mw.end_time).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteMaintenanceWindow(mw.id)}
                          className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-all ml-4"
                          title="Delete window"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Schedule Form */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-8">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Schedule Maintenance</h3>
              <form onSubmit={handleAddMaintenanceWindow} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-550 mb-1.5">Label / Reason</label>
                  <input
                    type="text"
                    value={mwLabel}
                    onChange={(e) => setMwLabel(e.target.value)}
                    required
                    placeholder="e.g. Database Migration"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-slate-800 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-550 mb-1.5">Start Time</label>
                    <input
                      type="datetime-local"
                      value={mwStartTime}
                      onChange={(e) => setMwStartTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-slate-800 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-550 mb-1.5">End Time</label>
                    <input
                      type="datetime-local"
                      value={mwEndTime}
                      onChange={(e) => setMwEndTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-slate-800 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={mwLoading}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded text-sm transition-all shadow-sm"
                >
                  {mwLoading ? 'Scheduling...' : 'Schedule Window'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Logs Title */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Recent Checks</h2>
          <p className="text-slate-500 text-sm">Last 50 ping checks for this service, shown 25 at a time</p>
        </div>

        {/* Logs Table/List */}
        <div className="glass-card overflow-hidden shadow-sm">
          {logsLoading ? (
            <div className="p-8 text-center">
              <svg className="animate-spin h-6 w-6 text-emerald-650 mx-auto" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : visibleLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm font-medium">
              No check logs recorded yet. Logs will appear here once checks run.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Region</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Status Code</th>
                    <th className="px-6 py-4">Response Time</th>
                    <th className="px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/60 transition-colors duration-150 ${
                        log.status === 'maintenance' ? 'bg-amber-50/30' : (!log.is_up ? 'bg-red-50/30' : '')
                      }`}
                    >
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {formatTime(log.checked_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-500">
                          {log.region || 'us-east'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {log.status === 'maintenance' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                            MAINTENANCE
                          </span>
                        ) : log.is_up ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-250">
                            UP
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-250">
                            DOWN
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">
                        {log.status_code || '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">
                        {log.response_time_ms !== null ? `${log.response_time_ms} ms` : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={log.failure_reason || log.error_message}>
                        {log.failure_reason ? (
                          <span className="text-red-650 font-medium">
                            {log.failure_reason}
                          </span>
                        ) : (
                          log.error_message || <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing {logsStart}-{logsEnd} of {visibleLogs.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLogsPage(1)}
                    disabled={currentLogsPage === 1}
                    className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    1-25
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogsPage(2)}
                    disabled={logsPageCount < 2 || currentLogsPage === 2}
                    className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    26-50
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default MonitorDetail
