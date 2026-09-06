import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import LiveStatusBadge from '../components/LiveStatusBadge'
import MetricCard from '../components/MetricCard'
import SparklineChart from '../components/SparklineChart'
import FilterChips from '../components/FilterChips'
import DonutChart from '../components/DonutChart'
import { getMonitors, bulkActionMonitors, getAnalytics, getIncidents } from '../services/api'

function Dashboard() {
  const [monitors, setMonitors] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // ALL, UP, DOWN, PAUSED
  const [selectedTag, setSelectedTag] = useState('') // empty string means all
  const [sortBy, setSortBy] = useState('status')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('pinbeat_dashboard_view') || 'list')
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Auto-refresh State
  const [refreshCountdown, setRefreshCountdown] = useState(30)
  const countdownIntervalRef = useRef(null)

  // Browser Notifications State
  const prevStatusesRef = useRef({}) // Map monitor.id -> monitor.is_up

  // Bulk Action State
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Prevents a manual refresh and the 30s poll tick from firing concurrent
  // fetchMonitors() calls, where whichever response lands last would win
  // regardless of which was actually requested last.
  const isFetchingRef = useRef(false)

  useEffect(() => {
    // Request notification permissions
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    fetchMonitors(true)

    // Setup 30s refresh interval
    setupPolling()

    return () => {
      clearInterval(countdownIntervalRef.current)
    }
  }, [])

  function setupPolling() {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    setRefreshCountdown(30)
    countdownIntervalRef.current = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchMonitors(false)
          return 30
        }
        return prev - 1
      })
    }, 1000)
  }

  async function fetchMonitors(showLoader = false) {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (showLoader) setLoading(true)
    try {
      const [res, analyticsRes, incidentsRes] = await Promise.allSettled([
        getMonitors(),
        getAnalytics(),
        getIncidents(),
      ])
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data)
      if (incidentsRes.status === 'fulfilled') setIncidents(incidentsRes.value.data.results || incidentsRes.value.data || [])
      if (res.status !== 'fulfilled') throw new Error('monitors failed')
      const data = res.value.data.results || res.value.data || []
      const mappedMonitors = data.map((monitor) => ({
        ...monitor,
        status: monitor.current_status ? monitor.current_status.toUpperCase() : (monitor.is_active === false ? 'PAUSED' : monitor.is_up === true ? 'UP' : monitor.is_up === false ? 'DOWN' : 'UNKNOWN'),
        response_time: monitor.last_response_time,
      }))

      // Detect status changes and send notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        mappedMonitors.forEach((m) => {
          const prevStatus = prevStatusesRef.current[m.id]
          const currStatus = m.current_status ? m.current_status.toUpperCase() : (m.is_active === false ? 'PAUSED' : m.is_up === true ? 'UP' : m.is_up === false ? 'DOWN' : 'UNKNOWN')
          
          if (prevStatus !== undefined && prevStatus !== currStatus) {
            // Outage / Recovery Notification
            let title = ''
            let body = ''
            if (currStatus === 'DOWN') {
              title = `🔴 Service Down: ${m.name}`
              body = `${m.url} is DOWN! Status Code: ${m.last_status_code || 'N/A'}`
            } else if (currStatus === 'UP' && prevStatus === 'DOWN') {
              title = `🟢 Service Recovered: ${m.name}`
              body = `${m.url} is back UP. Response time: ${m.last_response_time}ms`
            }

            if (title && body) {
              new Notification(title, {
                body,
                icon: '/favicon.svg',
              })
            }
          }
          // Update ref
          prevStatusesRef.current[m.id] = currStatus
        })
      }

      setMonitors(mappedMonitors)
    } catch (err) {
      setError('Failed to load monitors.')
    } finally {
      if (showLoader) setLoading(false)
      isFetchingRef.current = false
    }
  }

  // Handle Manual Refresh
  function handleManualRefresh() {
    fetchMonitors(true)
    setupPolling()
  }

  function updateViewMode(nextMode) {
    setViewMode(nextMode)
    localStorage.setItem('pinbeat_dashboard_view', nextMode)
  }

  // Handle Bulk Operations
  function handleToggleSelectAll() {
    const visibleMonitors = getFilteredMonitors()
    const visibleIds = visibleMonitors.map((m) => m.id)
    const allSelected = visibleIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedIds([...new Set([...selectedIds, ...visibleIds])])
    }
  }

  function handleSelectMonitor(id) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  async function handleBulkAction(actionType) {
    if (selectedIds.length === 0) return
    if (actionType === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedIds.length} monitors?`)) return
    
    setBulkActionLoading(true)
    setError('')
    try {
      await bulkActionMonitors(selectedIds, actionType)
      setSelectedIds([])
      fetchMonitors(false)
    } catch (err) {
      setError('Bulk action failed.')
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Parsing Unique tags from monitors
  const allTags = Array.from(
    new Set(
      monitors
        .flatMap((m) => (m.tags ? m.tags.split(',') : []))
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    )
  )

  // Filter monitors client side
  function getFilteredMonitors() {
    const visible = monitors.filter((m) => {
      // 1. Search term match
      const nameMatch = m.name.toLowerCase().includes(searchTerm.toLowerCase())
      const urlMatch = m.url.toLowerCase().includes(searchTerm.toLowerCase())
      if (!nameMatch && !urlMatch) return false

      // 2. Status match
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'UP' && m.status !== 'UP') return false
        if (statusFilter === 'DOWN' && m.status !== 'DOWN') return false
        if (statusFilter === 'PAUSED' && m.status !== 'PAUSED') return false
      }

      // 3. Tag match
      if (selectedTag) {
        const monitorTags = m.tags ? m.tags.split(',').map((t) => t.trim()) : []
        if (!monitorTags.includes(selectedTag)) return false
      }

      return true
    })
    return visible.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'response') return (b.response_time || 0) - (a.response_time || 0)
      if (sortBy === 'last_checked') return new Date(b.last_checked || 0) - new Date(a.last_checked || 0)
      if (sortBy === 'created') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      const order = { DOWN: 0, MAINTENANCE: 1, UNKNOWN: 2, PAUSED: 3, UP: 4 }
      return (order[a.status] ?? 9) - (order[b.status] ?? 9)
    })
  }

  const filteredMonitors = getFilteredMonitors().slice(0, itemsPerPage)

  // Global counts (overall)
  const totalMonitors = monitors.length
  const upMonitors = monitors.filter((m) => m.status === 'UP').length
  const downMonitors = monitors.filter((m) => m.status === 'DOWN').length
  const pausedMonitors = monitors.filter((m) => m.status === 'PAUSED').length
  const activeIncidents = incidents.filter((incident) => !incident.resolved_at)
  const avgResponse = Math.round(monitors.reduce((sum, monitor) => sum + (Number(monitor.response_time) || 0), 0) / Math.max(1, monitors.filter((monitor) => monitor.response_time).length))
  const uptime = analytics?.overall_sla ?? (totalMonitors ? Math.round((upMonitors / totalMonitors) * 10000) / 100 : 0)
  const sslExpiringSoon = monitors.filter((monitor) => {
    if (!monitor.ssl_expiry) return false
    const days = Math.ceil((new Date(monitor.ssl_expiry) - new Date()) / (1000 * 60 * 60 * 24))
    return days >= 0 && days <= 30
  }).length

  function formatDate(dateStr) {
    if (!dateStr) return 'Never'
    const d = new Date(dateStr)
    return d.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-800">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
            <p className="text-slate-650 text-sm">
              Overview of all your monitored services
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            {/* Auto refresh counter badge */}
            <div className="flex items-center gap-2 bg-white border border-slate-250 rounded-lg px-3 py-2 text-xs text-slate-600 font-mono shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Refreshes in {refreshCountdown}s</span>
              <button onClick={handleManualRefresh} className="ml-1 text-slate-400 hover:text-slate-900 transition-colors" title="Force Refresh">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                </svg>
              </button>
            </div>

            <Link
              to="/monitors/new"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-650/10 text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Monitor
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
          <MetricCard loading={loading} label="Total Monitors" value={totalMonitors} tone="slate" />
          <MetricCard loading={loading} label="Uptime" value={uptime} unit="%" tone={uptime >= 99 ? 'emerald' : uptime >= 95 ? 'amber' : 'red'} progress={uptime} sparkline={[98, 99, 99.2, 98.9, uptime || 99]} />
          <MetricCard loading={loading} label="Active Incidents" value={activeIncidents.length} tone={activeIncidents.length ? 'red' : 'emerald'} progress={activeIncidents.length ? 100 : 0} />
          <MetricCard loading={loading} label="Avg Response" value={avgResponse || 0} unit="ms" tone={avgResponse < 200 ? 'emerald' : avgResponse < 500 ? 'amber' : 'red'} sparkline={[220, 180, 240, 190, avgResponse || 200]} />
          <MetricCard loading={loading} label="SSL Expiring" value={sslExpiringSoon} tone={sslExpiringSoon ? 'amber' : 'emerald'} />
          <MetricCard loading={loading} label="Paused" value={pausedMonitors} tone="slate" />
        </div>

        <section className="glass-card p-5 mb-8">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Fleet Health Overview</h2>
              <p className="text-sm text-slate-500">Each tile represents one monitor. Tile size grows with latency.</p>
            </div>
            <DonutChart
              size={104}
              label={`${upMonitors}/${totalMonitors || 0}`}
              sublabel="Up"
              segments={[
                { label: 'UP', value: upMonitors, color: '#059669' },
                { label: 'DOWN', value: downMonitors, color: '#dc2626' },
                { label: 'PAUSED', value: pausedMonitors, color: '#94a3b8' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-8">
            {monitors.slice(0, 48).map((monitor) => {
              const latency = Number(monitor.response_time) || 0
              const scale = latency > 800 ? 'min-h-24' : latency > 400 ? 'min-h-20' : 'min-h-16'
              const tone = monitor.status === 'DOWN' ? 'border-red-200 bg-red-50 text-red-700' : monitor.status === 'PAUSED' ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              return (
                <button
                  key={monitor.id}
                  type="button"
                  onClick={() => navigate(`/monitors/${monitor.id}`)}
                  title={`${monitor.name} | ${monitor.url} | ${monitor.response_time || '-'}ms`}
                  className={`${scale} ${tone} rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <span className="block truncate text-xs font-bold">{monitor.name}</span>
                  <span className="mt-2 block font-mono text-xs">{monitor.response_time ? `${monitor.response_time}ms` : monitor.status}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Filters Panel */}
        <div className="glass-card p-4 mb-4 flex flex-col gap-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-inner"
              placeholder="Search monitors name or URL..."
            />
          </div>

          {/* Status and Tag Filters */}
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
            {/* Status tabs */}
            <div className="flex max-w-full overflow-x-auto bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs font-semibold">
              {['ALL', 'UP', 'DOWN', 'PAUSED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-md transition-all ${
                    statusFilter === status
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Tags Dropdown */}
            {allTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="min-w-0 flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-750 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm sm:flex-none"
              >
                <option value="">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            )}
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="min-w-0 flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-750 font-semibold sm:flex-none">
              <option value="status">Sort by status</option>
              <option value="name">Sort by name</option>
              <option value="response">Sort by response</option>
              <option value="last_checked">Sort by last checked</option>
              <option value="created">Sort by created</option>
            </select>
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="min-w-0 flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-750 font-semibold sm:flex-none">
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
            </select>
            <div className="flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              {['list', 'grid', 'compact'].map((mode) => (
                <button key={mode} type="button" onClick={() => updateViewMode(mode)} className={`rounded-md px-3 py-2 capitalize ${viewMode === mode ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>
                  {mode}
                </button>
              ))}
            </div>
          </div>
          </div>
          <FilterChips
            chips={[
              { key: 'search', label: 'Search', value: searchTerm },
              { key: 'status', label: 'Status', value: statusFilter },
              { key: 'tag', label: 'Tag', value: selectedTag },
            ]}
            onRemove={(key) => {
              if (key === 'search') setSearchTerm('')
              if (key === 'status') setStatusFilter('ALL')
              if (key === 'tag') setSelectedTag('')
            }}
            onClear={() => {
              setSearchTerm('')
              setStatusFilter('ALL')
              setSelectedTag('')
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full skeleton"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded skeleton"></div>
                    <div className="h-3 w-72 rounded skeleton"></div>
                  </div>
                  <div className="h-6 w-16 rounded-full skeleton"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && monitors.length === 0 && (
          <div className="glass-card p-12 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No monitors yet
            </h3>
            <p className="text-slate-650 text-sm mb-6 max-w-md mx-auto">
              Start monitoring your websites and APIs. Create your first monitor to check performance and outages.
            </p>
            <Link
              to="/monitors/new"
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/10 text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Monitor
            </Link>
          </div>
        )}

        {/* Filtering No Results */}
        {!loading && monitors.length > 0 && filteredMonitors.length === 0 && (
          <div className="glass-card p-12 text-center border border-dashed border-slate-300">
            <p className="text-slate-500 text-sm italic">No monitors match your search query or filters.</p>
          </div>
        )}

        {/* Monitors List */}
        {!loading && filteredMonitors.length > 0 && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-3 lg:grid-cols-2' : 'space-y-3'}>
            {/* Header / Select All */}
            <div className="flex items-center pl-3 mb-2 text-xs text-slate-550 uppercase tracking-wider font-semibold">
              <input
                type="checkbox"
                onChange={handleToggleSelectAll}
                checked={
                  filteredMonitors.length > 0 &&
                  filteredMonitors.every((m) => selectedIds.includes(m.id))
                }
                className="w-4 h-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500/30 cursor-pointer"
              />
              <span className="ml-3 select-none cursor-pointer" onClick={handleToggleSelectAll}>Select All Visible</span>
            </div>

            {filteredMonitors.map((monitor) => (
              <div
                key={monitor.id}
                className={`glass-card cursor-pointer transition-all duration-200 hover:border-slate-300 hover:bg-slate-100/40 group flex items-start shadow-sm sm:items-center ${viewMode === 'compact' ? 'p-3' : 'p-5'}`}
              >
                {/* Bulk Select Checkbox */}
                <div className="mr-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(monitor.id)}
                    onChange={() => handleSelectMonitor(monitor.id)}
                    className="w-4 h-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500/30 cursor-pointer"
                  />
                </div>

                <div className="flex-1 min-w-0" onClick={() => navigate(`/monitors/${monitor.id}`)}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center min-w-0">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="text-slate-900 font-semibold group-hover:text-emerald-650 transition-colors duration-200 truncate">
                            {monitor.name}
                          </h3>
                          {monitor.tags && (
                            <div className="flex gap-1 overflow-x-auto max-w-[200px] no-scrollbar">
                              {monitor.tags.split(',').map((tag) => (
                                <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-mono font-medium">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-slate-500 text-sm truncate">
                          {monitor.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-3 pl-0 sm:w-auto sm:flex-nowrap sm:justify-end md:gap-4">
                      <LiveStatusBadge
                        isUp={monitor.is_up}
                        isActive={monitor.is_active}
                        statusChangedAt={monitor.status_changed_at}
                        status={monitor.status}
                        separateDuration
                      />

                      <span className="text-slate-650 text-sm font-mono hidden md:block text-right tabular-nums">
                        {monitor.response_time !== null && monitor.response_time !== undefined ? `${monitor.response_time}ms` : '-'}
                      </span>

                      <span className="hidden lg:block">
                        <SparklineChart values={[monitor.response_time || 180, (monitor.response_time || 180) * 0.85, (monitor.response_time || 180) * 1.1, monitor.response_time || 160]} tone={monitor.status === 'DOWN' ? 'red' : 'emerald'} />
                      </span>

                      <span className="text-slate-500 text-xs hidden md:block font-mono text-right">
                        {formatDate(monitor.last_checked)}
                      </span>

                      <svg
                        className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors duration-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Bulk Action Drawbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-xl w-[calc(100%-2rem)] bg-white border border-slate-200/80 rounded-xl px-4 py-4 flex flex-col gap-3 shadow-2xl shadow-slate-300/40 backdrop-blur-xl sm:bottom-6 sm:w-[90%] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm font-semibold text-slate-700">
            Selected: <strong className="text-emerald-600">{selectedIds.length}</strong> monitors
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleBulkAction('pause')}
              disabled={bulkActionLoading}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs transition-colors"
            >
              Pause
            </button>
            <button
              onClick={() => handleBulkAction('resume')}
              disabled={bulkActionLoading}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs transition-colors"
            >
              Resume
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={bulkActionLoading}
              className="py-1.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded font-semibold text-xs transition-all"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 text-slate-400 hover:text-slate-700"
              title="Clear Selection"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
