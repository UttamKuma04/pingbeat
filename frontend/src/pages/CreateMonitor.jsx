import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { createMonitor, getMonitor, getMonitors, updateMonitor } from '../services/api'

const MAX_MONITORS = 10

function CreateMonitor({ editMode = false }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [expectedStatus, setExpectedStatus] = useState(200)
  const [intervalSeconds, setIntervalSeconds] = useState(300)
  const [timeoutSeconds, setTimeoutSeconds] = useState(30)
  const [isActive, setIsActive] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(false)

  // Advanced fields
  const [httpMethod, setHttpMethod] = useState('GET')
  const [headers, setHeaders] = useState('{}')
  const [body, setBody] = useState('')
  const [keyword, setKeyword] = useState('')
  const [assertKeyword, setAssertKeyword] = useState('')
  const [assertMaxResponseTimeMs, setAssertMaxResponseTimeMs] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [notificationChannel, setNotificationChannel] = useState('email')
  const [tags, setTags] = useState('')

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [monitorCount, setMonitorCount] = useState(null)

  const isEditing = editMode || !!id
  const isMonitorLimitReached = !isEditing && monitorCount !== null && monitorCount >= MAX_MONITORS

  useEffect(() => {
    if (isEditing && id) {
      fetchMonitorData()
    } else {
      fetchMonitorCount()
    }
  }, [id, isEditing])

  async function fetchMonitorCount() {
    try {
      const res = await getMonitors()
      const rows = res.data.results || res.data || []
      const count = typeof res.data.count === 'number' ? res.data.count : Array.isArray(rows) ? rows.length : 0
      setMonitorCount(count)
      if (count >= MAX_MONITORS) {
        setError(`You can create at most ${MAX_MONITORS} monitors.`)
      }
    } catch (err) {
      setMonitorCount(null)
    }
  }

  async function fetchMonitorData() {
    setFetching(true)
    setError('')
    try {
      const res = await getMonitor(id)
      const monitor = res.data
      setName(monitor.name)
      setUrl(monitor.url)
      setExpectedStatus(monitor.expected_status)
      setIntervalSeconds(monitor.interval_seconds)
      setTimeoutSeconds(monitor.timeout_seconds)
      setIsActive(monitor.is_active)
      setEmailAlerts(monitor.email_alerts || false)
      setHttpMethod(monitor.http_method || 'GET')
      setHeaders(monitor.headers ? JSON.stringify(monitor.headers, null, 2) : '{}')
      setBody(monitor.body || '')
      setKeyword(monitor.keyword || '')
      setAssertKeyword(monitor.assert_keyword || '')
      setAssertMaxResponseTimeMs(monitor.assert_max_response_time_ms || '')
      setWebhookUrl(monitor.webhook_url || '')
      setNotificationChannel(monitor.notification_channel || 'email')
      setTags(monitor.tags || '')
    } catch (err) {
      setError('Failed to fetch monitor details.')
    } finally {
      setFetching(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (isMonitorLimitReached) {
      setError(`You can create at most ${MAX_MONITORS} monitors.`)
      return
    }
    setLoading(true)

    let parsedHeaders = {}
    if (headers.trim()) {
      try {
        parsedHeaders = JSON.parse(headers)
      } catch (err) {
        setError('Request headers must be valid JSON.')
        setLoading(false)
        return
      }
    }

    const payload = {
      name,
      url,
      expected_status: parseInt(expectedStatus, 10),
      interval_seconds: parseInt(intervalSeconds, 10),
      timeout_seconds: parseInt(timeoutSeconds, 10),
      is_active: isActive,
      email_alerts: emailAlerts,
      http_method: httpMethod,
      headers: parsedHeaders,
      body,
      keyword: keyword.trim() || null,
      assert_keyword: assertKeyword.trim() || null,
      assert_max_response_time_ms: assertMaxResponseTimeMs ? parseInt(assertMaxResponseTimeMs, 10) : null,
      webhook_url: webhookUrl.trim() || null,
      notification_channel: notificationChannel,
      tags: tags.trim(),
    }

    try {
      if (isEditing) {
        await updateMonitor(id, payload)
      } else {
        await createMonitor(payload)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Network error. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Link to="/" className="text-slate-600 hover:text-emerald-600 text-sm flex items-center space-x-2 transition-colors duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="glass-card p-5 bg-white border border-slate-200 rounded-xl shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">
            {isEditing ? 'Edit Monitor' : 'Create New Monitor'}
          </h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Friendly Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Friendly Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                placeholder="e.g. My Website, API Gateway"
              />
            </div>

            {/* Target URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Target URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                placeholder="https://example.com/health"
              />
            </div>

            {/* Standard configurations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expected Status
                </label>
                <input
                  type="number"
                  value={expectedStatus}
                  onChange={(e) => setExpectedStatus(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                  placeholder="200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Check Interval
                </label>
                <select
                  value={intervalSeconds}
                  onChange={(e) => setIntervalSeconds(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                >
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                  <option value={1800}>30 minutes</option>
                  <option value={3600}>1 hour</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Timeout (sec)
                </label>
                <input
                  type="number"
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                  placeholder="30"
                />
              </div>
            </div>

            {/* Advanced HTTP configurations */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Advanced HTTP Settings</span>
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      HTTP Method
                    </label>
                    <select
                      value={httpMethod}
                      onChange={(e) => setHttpMethod(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="HEAD">HEAD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Response Keyword Assertion
                    </label>
                    <input
                      type="text"
                      value={assertKeyword}
                      onChange={(e) => setAssertKeyword(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                      placeholder="Fail if text NOT found in body"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Max Response Time Assertion (ms)
                    </label>
                    <input
                      type="number"
                      value={assertMaxResponseTimeMs}
                      onChange={(e) => setAssertMaxResponseTimeMs(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                      placeholder="Fail if response takes longer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Request Headers (JSON format)
                  </label>
                  <textarea
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 font-mono text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-inner"
                    placeholder='{ "Content-Type": "application/json" }'
                  />
                </div>

                {httpMethod !== 'GET' && httpMethod !== 'HEAD' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Request Body String
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 font-mono text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-inner"
                      placeholder='{ "query": "test" } or raw request text'
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Custom Alert Settings */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Alert Notifications Settings</span>
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-slate-50 p-4 border border-slate-200 rounded-lg sm:items-center">
                  <input
                    type="checkbox"
                    id="emailAlerts"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500/20 focus:ring-offset-0 focus:ring-2 cursor-pointer shadow-sm"
                  />
                  <label htmlFor="emailAlerts" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    Send email alerts when status changes (UP ↔ DOWN)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Webhook Channel
                    </label>
                    <select
                      value={notificationChannel}
                      onChange={(e) => setNotificationChannel(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                    >
                      <option value="email">Disabled</option>
                      <option value="slack">Slack Webhook</option>
                      <option value="discord">Discord Webhook</option>
                      <option value="webhook">Custom Webhook POST</option>
                    </select>
                  </div>

                  {notificationChannel !== 'email' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Webhook URL Target
                      </label>
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        required={notificationChannel !== 'email'}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                        placeholder="https://hooks.slack.com/services/..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Organizing Tags */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Grouping Tags</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Tags (comma-separated list)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                  placeholder="e.g. prod, API, internal"
                />
              </div>
            </div>

            {isEditing && (
            <div className="flex items-start gap-3 bg-slate-50 p-4 border border-slate-200 rounded-lg sm:items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500/20 focus:ring-offset-0 focus:ring-2 cursor-pointer shadow-sm"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                  Enable active monitoring (checks will run)
                </label>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={loading || isMonitorLimitReached}
                className="w-full flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.01] hover:shadow-lg hover:shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
              >
                {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Monitor'}
              </button>
              <Link
                to="/"
                className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-center text-slate-700 font-semibold rounded-lg transition-all duration-200 text-sm sm:w-auto"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
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
  return messages.join(' ') || 'Something went wrong. Please check your inputs.'
}

export default CreateMonitor
