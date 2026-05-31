import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import MetricCard from '../components/MetricCard'
import { getApmApplications, getMe } from '../services/api'

function SettingsPage() {
  const [me, setMe] = useState(null)
  const [apps, setApps] = useState([])
  const [preferences, setPreferences] = useState(() => ({
    timeRange: localStorage.getItem('pinbeat_pref_time_range') || '24h',
    dashboardView: localStorage.getItem('pinbeat_pref_dashboard_view') || 'list',
    notifications: localStorage.getItem('pinbeat_pref_notifications') !== 'false',
    refreshInterval: localStorage.getItem('pinbeat_pref_refresh_interval') || '30',
  }))
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.allSettled([getMe(), getApmApplications()]).then(([meRes, appsRes]) => {
      if (meRes.status === 'fulfilled') setMe(meRes.value.data)
      if (appsRes.status === 'fulfilled') setApps(appsRes.value.data.results || appsRes.value.data || [])
    })
  }, [])

  function updatePreference(key, value) {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    localStorage.setItem(`pinbeat_pref_${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`, String(value))
  }

  function handlePasswordSubmit(event) {
    event.preventDefault()
    if (!passwordForm.current || !passwordForm.next || passwordForm.next !== passwordForm.confirm) {
      setMessage('Check the password fields before submitting.')
      return
    }
    setMessage('Password form captured. Connect this to a backend password endpoint when available.')
    setPasswordForm({ current: '', next: '', confirm: '' })
  }

  const initials = (me?.username || 'U').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-950">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Manage profile details, workspace preferences, API visibility, and integrations.</p>
        </div>

        {message && <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard label="APM Applications" value={apps.length} tone="blue" />
          <MetricCard label="Default Range" value={preferences.timeRange} tone="emerald" />
          <MetricCard label="Refresh" value={`${preferences.refreshInterval}s`} tone="amber" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="glass-card p-6">
            <h2 className="mb-5 text-lg font-bold text-slate-950">Profile</h2>
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-xl font-bold text-white">{initials}</div>
              <div>
                <p className="text-lg font-bold text-slate-950">{me?.username || 'User'}</p>
                <p className="text-sm text-slate-500">{me?.email || 'No email returned by API'}</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <input type="password" value={passwordForm.current} onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })} placeholder="Current password" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" />
              <input type="password" value={passwordForm.next} onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })} placeholder="New password" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" />
              <input type="password" value={passwordForm.confirm} onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })} placeholder="Confirm new password" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" />
              <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Update Password</button>
            </form>
          </section>

          <section className="glass-card p-6">
            <h2 className="mb-5 text-lg font-bold text-slate-950">Preferences</h2>
            <div className="space-y-4">
              <Preference label="Default time range">
                <select value={preferences.timeRange} onChange={(event) => updatePreference('timeRange', event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="1h">Last 1h</option>
                  <option value="6h">Last 6h</option>
                  <option value="24h">Last 24h</option>
                  <option value="7d">Last 7d</option>
                  <option value="30d">Last 30d</option>
                </select>
              </Preference>
              <Preference label="Default dashboard view">
                <select value={preferences.dashboardView} onChange={(event) => updatePreference('dashboardView', event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="list">List</option>
                  <option value="grid">Grid</option>
                  <option value="compact">Compact</option>
                </select>
              </Preference>
              <Preference label="Browser notifications">
                <input type="checkbox" checked={preferences.notifications} onChange={(event) => updatePreference('notifications', event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-emerald-600" />
              </Preference>
              <Preference label="Auto-refresh interval">
                <input type="number" min="10" max="300" value={preferences.refreshInterval} onChange={(event) => updatePreference('refreshInterval', event.target.value)} className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-sm" />
              </Preference>
            </div>
          </section>

          <section className="glass-card p-6">
            <h2 className="mb-5 text-lg font-bold text-slate-950">API & Integrations</h2>
            <div className="space-y-3">
              {apps.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">No APM applications registered yet.</p>
              ) : (
                apps.slice(0, 6).map((app) => (
                  <div key={app.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{app.name}</p>
                        <p className="text-xs text-slate-500">{app.environment}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{app.metrics_count || 0} metrics</span>
                    </div>
                  </div>
                ))
              )}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Webhook test endpoint</p>
                <div className="mt-3 flex gap-2">
                  <input placeholder="https://hooks.example.com/pingbeat" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm" />
                  <button type="button" onClick={() => setMessage('Webhook test is frontend-only until a backend endpoint is added.')} className="rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold">Test</button>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card p-6">
            <h2 className="mb-5 text-lg font-bold text-slate-950">About & System</h2>
            <div className="space-y-3 text-sm">
              <Info label="PinBEAT version" value="1.0.0" />
              <Info label="Frontend" value="React + Vite" />
              <Info label="API mode" value="Existing endpoints only" />
              <Info label="System status" value="Operational" tone="text-emerald-700" />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function Preference({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </div>
  )
}

function Info({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  )
}

export default SettingsPage
