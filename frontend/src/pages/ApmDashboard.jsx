import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  createApmApplication,
  getApmAnalytics,
  getApmApplications,
  getApmEndpoints,
  getApmErrors,
  getApmTraffic,
} from '../services/api'
import SparklineChart from '../components/SparklineChart'

const MAX_API_KEYS = 5

function ApmDashboard() {
  const [applications, setApplications] = useState([])
  const [selectedApplicationId, setSelectedApplicationId] = useState('')
  const [hours, setHours] = useState('24')
  const [analytics, setAnalytics] = useState(null)
  const [endpoints, setEndpoints] = useState([])
  const [traffic, setTraffic] = useState([])
  const [errors, setErrors] = useState(null)
  const [applicationCount, setApplicationCount] = useState(0)
  const [form, setForm] = useState({ name: '', environment: 'production' })
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const isApplicationLimitReached = applicationCount >= MAX_API_KEYS

  const queryParams = useMemo(() => {
    const params = { hours }
    if (selectedApplicationId) {
      params.application_id = selectedApplicationId
    }
    return params
  }, [hours, selectedApplicationId])

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    fetchApmData()
  }, [queryParams])

  async function fetchApplications() {
    try {
      const res = await getApmApplications()
      const rows = res.data.results || res.data || []
      setApplications(rows)
      setApplicationCount(typeof res.data.count === 'number' ? res.data.count : rows.length)
      if (!selectedApplicationId && rows.length > 0) {
        setSelectedApplicationId(String(rows[0].id))
      }
    } catch (err) {
      setError('Failed to load applications.')
    }
  }

  async function fetchApmData() {
    setLoading(true)
    try {
      const [analyticsRes, endpointsRes, trafficRes, errorsRes] = await Promise.all([
        getApmAnalytics(queryParams),
        getApmEndpoints(queryParams),
        getApmTraffic(queryParams),
        getApmErrors(queryParams),
      ])
      setAnalytics(analyticsRes.data)
      setEndpoints(endpointsRes.data.results || endpointsRes.data || [])
      setTraffic(trafficRes.data.results || trafficRes.data || [])
      setErrors(errorsRes.data)
      setError('')
    } catch (err) {
      setError('Failed to load APM analytics.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateApplication(event) {
    event.preventDefault()
    if (!form.name.trim()) return
    if (isApplicationLimitReached) {
      setError(`You can create at most ${MAX_API_KEYS} API keys.`)
      setShowRegisterModal(false)
      return
    }

    setSaving(true)
    try {
      const res = await createApmApplication(form)
      const created = res.data
      setApplications((items) => [created, ...items])
      setApplicationCount((count) => count + 1)
      setSelectedApplicationId(String(created.id))
      setForm({ name: '', environment: 'production' })
      setShowRegisterModal(false)
      setError('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create application.'))
    } finally {
      setSaving(false)
    }
  }

  async function copyApiKey(apiKey) {
    await navigator.clipboard.writeText(apiKey)
    setCopiedKey(apiKey)
    setTimeout(() => setCopiedKey(''), 1500)
  }

  const maxRequests = Math.max(...traffic.map((row) => row.requests_count || 0), 1)
  const slowestEndpoints = [...endpoints]
    .sort((a, b) => (b.avg_response_time || 0) - (a.avg_response_time || 0))
    .slice(0, 5)
  const apdex = analytics?.total_requests
    ? Math.round(Math.max(0, 1 - ((analytics?.error_rate || 0) / 100) - ((analytics?.average_response_time || 0) > 2000 ? 0.25 : 0)) * 100) / 100
    : 0
  const errorMax = Math.max(...traffic.map((row) => row.errors_count || row.error_count || 0), 1)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Application Performance</h1>
            <p className="mt-1 text-sm text-slate-600">API traffic, latency, and error analytics from PingBEAT SDKs.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/apm/docs"
              className="flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              SDK Docs
            </Link>
            <button
              type="button"
              onClick={() => {
                if (isApplicationLimitReached) {
                  setError(`You can create at most ${MAX_API_KEYS} API keys.`)
                  return
                }
                setShowRegisterModal(true)
              }}
              disabled={isApplicationLimitReached}
              className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Register Application
            </button>
            <select
              value={selectedApplicationId}
              onChange={(event) => setSelectedApplicationId(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm"
            >
              <option value="">All applications</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} / {app.environment}
                </option>
              ))}
            </select>

            <select
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm"
            >
              <option value="1">Last hour</option>
              <option value="6">Last 6 hours</option>
              <option value="24">Last 24 hours</option>
              <option value="168">Last 7 days</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-8">
          <div className="glass-card p-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold text-slate-900">Applications</h2>
              <span className="text-xs font-semibold text-slate-500">{applicationCount}/{MAX_API_KEYS} API keys</span>
            </div>
            <div className="space-y-3">
              {applications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No applications registered yet.
                </div>
              ) : (
                applications.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApplicationId(String(app.id))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedApplicationId(String(app.id))
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`grid cursor-pointer grid-cols-1 gap-4 rounded-lg border p-4 text-left transition sm:grid-cols-[minmax(0,1.25fr)_auto_minmax(180px,0.85fr)_auto] sm:items-center ${
                      String(app.id) === selectedApplicationId
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{app.name}</p>
                      <p className="text-xs text-slate-500">{app.environment}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                        app.environment === 'production' ? 'bg-blue-50 text-blue-700' : app.environment === 'staging' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {app.environment}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {app.metrics_count || 0} metrics
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Last activity {app.last_seen ? new Date(app.last_seen).toLocaleDateString() : 'unknown'}</p>
                      <code className="mt-1 block truncate rounded-md bg-slate-950 px-2 py-1 text-xs text-slate-100">
                        {maskApiKey(app.api_key)}
                      </code>
                    </div>
                    <div className="flex justify-start sm:justify-end">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          copyApiKey(app.api_key)
                        }}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {copiedKey === app.api_key ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total Requests" value={analytics?.total_requests || 0} />
          <MetricCard label="Avg Response" value={`${analytics?.average_response_time || 0} ms`} tone="blue" />
          <MetricCard label="Error Rate" value={`${analytics?.error_rate || 0}%`} tone="red" />
          <MetricCard label="Apdex Score" value={apdex.toFixed(2)} tone={apdex >= 0.85 ? 'emerald' : apdex >= 0.65 ? 'blue' : 'red'} />
          <MetricCard label="Active Apps" value={analytics?.active_applications || 0} tone="emerald" />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="glass-card p-5 lg:col-span-2">
            <h2 className="mb-1 text-base font-bold text-slate-900">Traffic & Errors Over Time</h2>
            <p className="mb-5 text-xs text-slate-500">Requests per minute, with red overlays showing error volume.</p>
            {loading ? (
              <div className="h-56 skeleton rounded-lg"></div>
            ) : traffic.length === 0 ? (
              <EmptyState label="No traffic data yet." />
            ) : (
              <div className="flex h-56 items-end gap-1 border-b border-slate-200 px-1 pt-4">
                {traffic.slice(-80).map((row) => {
                  const height = Math.max(((row.requests_count || 0) / maxRequests) * 100, 4)
                  const errorHeight = Math.max((((row.errors_count || row.error_count || 0) / errorMax) * 100), 0)
                  return (
                    <div key={row.timestamp} className="group relative flex flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-cyan-500 transition hover:bg-cyan-600"
                        style={{ height: `${height}%` }}
                      >
                        <div className="mt-auto w-full rounded-t bg-red-500" style={{ height: `${errorHeight}%` }} />
                      </div>
                      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow group-hover:block">
                        {row.requests_count} req / {row.avg_response_time} ms
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="glass-card p-5">
            <h2 className="mb-4 text-base font-bold text-slate-900">Latency Distribution</h2>
            <div className="space-y-4">
              <MetricRow label="P95 latency" value={`${analytics?.p95_latency || 0} ms`} />
              <MetricRow label="P99 latency" value={`${analytics?.p99_latency || 0} ms`} />
              <MetricRow label="Error events" value={errors?.total_errors || 0} />
              <MetricRow label="Apdex" value={apdex.toFixed(2)} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="glass-card overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Top Endpoints</h2>
            </div>
            <EndpointTable rows={endpoints} />
          </section>

          <section className="glass-card overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Slowest Endpoints</h2>
            </div>
            <EndpointTable rows={slowestEndpoints} />
          </section>
        </div>

        <section className="glass-card mt-8 p-5">
          <h2 className="mb-4 text-base font-bold text-slate-900">Error Breakdown</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Breakdown title="By Status Code" rows={errors?.by_status_code || []} labelKey="status_code" />
            <Breakdown title="By Endpoint" rows={errors?.top_error_endpoints || []} labelKey="endpoint" />
          </div>
        </section>
      </main>

      {showRegisterModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateApplication} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">Register Application</h2>
              <button type="button" onClick={() => setShowRegisterModal(false)} className="rounded border border-slate-200 px-2 py-1 text-sm text-slate-600">Close</button>
            </div>
            <div className="space-y-3">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Billing API" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" />
              <select value={form.environment} onChange={(event) => setForm({ ...form, environment: event.target.value })} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
                <option value="production">production</option>
                <option value="staging">staging</option>
                <option value="development">development</option>
              </select>
              <button type="submit" disabled={saving || isApplicationLimitReached} className="h-10 w-full rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? 'Creating...' : 'Create Application'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function maskApiKey(apiKey = '') {
  if (!apiKey) return 'Hidden'
  const prefix = apiKey.startsWith('pb_') ? 'pb_' : ''
  const suffix = apiKey.slice(-4)
  return `${prefix}${'*'.repeat(12)}${suffix}`
}

function getApiErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail

  const messages = Object.entries(data).flatMap(([key, value]) => {
    if (Array.isArray(value)) return value.map((item) => `${key}: ${item}`)
    if (typeof value === 'string') return [`${key}: ${value}`]
    return []
  })
  return messages.join(' ') || fallback
}

function MetricCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-950',
    blue: 'text-blue-600',
    red: 'text-red-600',
    emerald: 'text-emerald-600',
  }

  return (
    <div className="glass-card p-5">
      <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={`text-2xl font-extrabold ${tones[tone]}`}>{value}</p>
    </div>
  )
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="font-mono text-sm font-semibold text-slate-900">{value}</span>
    </div>
  )
}

function EndpointTable({ rows }) {
  if (!rows.length) {
    return <EmptyState label="No endpoint data yet." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3 text-left font-semibold">Endpoint</th>
            <th className="px-5 py-3 text-right font-semibold">Requests</th>
            <th className="px-5 py-3 text-right font-semibold">Avg</th>
            <th className="px-5 py-3 text-right font-semibold">P95</th>
            <th className="px-5 py-3 text-right font-semibold">Impact</th>
            <th className="px-5 py-3 text-left font-semibold">Trend</th>
            <th className="px-5 py-3 text-right font-semibold">Errors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => {
            const impact = Math.round(((row.avg_response_time || 0) * (row.requests_count || 0) * Math.max(row.error_rate || 1, 1)) / 100)
            return (
            <tr key={row.endpoint} className="group">
              <td className="max-w-[260px] px-5 py-3">
                <details>
                  <summary className="cursor-pointer truncate font-mono text-xs text-slate-700">{row.endpoint}</summary>
                  <div className="mt-3 rounded bg-slate-50 p-3">
                    <SparklineChart values={[row.avg_response_time || 80, (row.avg_response_time || 80) * 0.8, (row.avg_response_time || 80) * 1.2]} tone={row.error_rate > 0 ? 'red' : 'cyan'} />
                  </div>
                </details>
              </td>
              <td className="px-5 py-3 text-right font-semibold text-slate-900">{row.requests_count}</td>
              <td className="px-5 py-3 text-right font-mono text-xs text-slate-600">{row.avg_response_time} ms</td>
              <td className="px-5 py-3 text-right font-mono text-xs text-slate-600">{row.p95_latency || Math.round((row.avg_response_time || 0) * 1.4)} ms</td>
              <td className="px-5 py-3 text-right font-mono text-xs text-slate-600">{impact}</td>
              <td className="px-5 py-3"><SparklineChart values={[row.requests_count || 0, (row.requests_count || 0) * 0.8, (row.requests_count || 0) * 1.1]} tone="blue" /></td>
              <td className="px-5 py-3 text-right font-mono text-xs text-red-600">{row.error_rate}%</td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  )
}

function Breakdown({ title, rows, labelKey }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {rows.length === 0 ? (
        <EmptyState label="No errors found." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row[labelKey]} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <span className="truncate pr-4 font-mono text-xs text-slate-700">{row[labelKey]}</span>
              <span className="text-sm font-bold text-red-600">{row.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ label }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {label}
    </div>
  )
}

export default ApmDashboard
