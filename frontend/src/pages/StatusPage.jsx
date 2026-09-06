import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicStatus } from '../services/api'
import SeoHead from '../components/SeoHead'

function StatusPage() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hoveredTile, setHoveredTile] = useState(null) // { monitorId, date, status }

  useEffect(() => {
    fetchPublicStatus()
  }, [slug])

  async function fetchPublicStatus() {
    try {
      const res = await getPublicStatus(slug)
      setData(res.data)
    } catch (err) {
      setError('Status page not found or private.')
    } finally {
      setLoading(false)
    }
  }

  function getSlaColor(val) {
    if (val === null || val === undefined) return 'text-slate-500'
    if (val >= 99.9) return 'text-emerald-600'
    if (val >= 99) return 'text-cyan-600'
    if (val >= 95) return 'text-amber-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-emerald-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center border-red-200">
          <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-650" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unavailable</h2>
          <p className="text-slate-600 text-sm">{error || 'This status page is not public.'}</p>
        </div>
      </div>
    )
  }

  const hasMonitors = data.monitors.length > 0
  const allUp = data.monitors.every((m) => m.is_active === false || m.is_up === true)
  const anyDown = data.monitors.some((m) => m.is_active === true && m.is_up === false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <SeoHead
        title={`${data.title} — Live Service Status | Powered by PingBEAT`}
        description={`Real-time service availability, active incidents, and 90-day historical uptime for ${data.title}. Powered by PingBEAT self-hosted monitoring.`}
        robots="index, follow"
      />
      <div className="max-w-4xl mx-auto w-full px-4 py-8 sm:py-12">
        {/* Header Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full pulse-green"></div>
          <h1 className="text-2xl font-bold text-slate-900">{data.title}</h1>
        </div>

        {/* Global Banner status */}
        <div className={`p-5 rounded-xl border mb-10 flex items-start gap-4 sm:items-center ${
          !hasMonitors
            ? 'bg-slate-100 border-slate-200 text-slate-600'
            : anyDown
            ? 'bg-red-50 border-red-200 text-red-650'
            : allUp
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <div className="relative">
            <div className={`w-4 h-4 rounded-full ${!hasMonitors ? 'bg-slate-400' : anyDown ? 'bg-red-500 pulse-red' : 'bg-emerald-500 pulse-green'}`}></div>
          </div>
          <span className="font-bold text-lg">
            {!hasMonitors ? 'No services configured yet' : anyDown ? 'Outage Detected in some services' : 'All Systems Operational'}
          </span>
        </div>

        {/* Active Outage Incidents */}
        {data.active_incidents.length > 0 && (
          <div className="glass-card border-red-200 p-6 mb-8">
            <h2 className="text-red-600 font-bold mb-4 uppercase tracking-wider text-sm">Active Incident Reports</h2>
            <div className="space-y-4">
              {data.active_incidents.map((incident) => (
                <div key={incident.id} className="border-l-2 border-red-500 pl-4 py-1">
                  <h3 className="font-semibold text-slate-900 text-sm">{incident.monitor_name} downtime</h3>
                  <p className="text-slate-500 text-xs mt-1 font-mono">Started: {new Date(incident.started_at).toLocaleString()}</p>
                  {incident.error_message && (
                    <p className="text-red-650/80 font-mono text-xs mt-1 italic">{incident.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitors Grid List */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Service Status</h2>
          
          {data.monitors.map((m) => {
            return (
              <div key={m.id} className="glass-card p-4 sm:p-6">
                {/* Header of service */}
                <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-slate-900 font-bold">{m.name}</h3>
                    <p className="break-anywhere text-slate-400 text-xs font-mono">{m.url}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-slate-500 font-mono text-xs">
                      SLA 90d: <strong className={getSlaColor(m.sla_90d)}>{m.sla_90d ? `${m.sla_90d}%` : '—'}</strong>
                    </span>
                    
                    {m.is_active === false ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        PAUSED
                      </span>
                    ) : m.is_up === true ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        Operational
                      </span>
                    ) : m.is_up === false ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-650 border border-red-200">
                        Outage
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        Unknown
                      </span>
                    )}
                  </div>
                </div>

                {/* 90 Days status bar */}
                <div className="relative">
                  {/* Hover tooltip for individual daily tile */}
                  {hoveredTile && hoveredTile.monitorId === m.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white text-slate-900 text-[10px] py-1 px-2 rounded pointer-events-none shadow-xl border border-slate-200 z-10 font-mono whitespace-nowrap">
                      {new Date(hoveredTile.date).toLocaleDateString()}: <strong>{hoveredTile.status === 'UP' ? 'Operational' : hoveredTile.status === 'DOWN' ? 'Outage Detected' : 'No Check data'}</strong>
                    </div>
                  )}

                  {/* Tile matrix grid */}
                  <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                    {m.status_history.map((day, idx) => {
                      let tileColor = 'bg-slate-200 hover:bg-slate-300'
                      if (day.status === 'UP') tileColor = 'bg-emerald-500 hover:bg-emerald-400'
                      if (day.status === 'DOWN') tileColor = 'bg-red-500 hover:bg-red-400'
                      
                      return (
                        <div
                          key={idx}
                          className={`w-[6px] h-6 rounded-sm cursor-pointer transition-colors ${tileColor}`}
                          onMouseEnter={() => setHoveredTile({ monitorId: m.id, date: day.date, status: day.status })}
                          onMouseLeave={() => setHoveredTile(null)}
                        ></div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-450 mt-1 font-mono">
                    <span>90 days ago</span>
                    <span>Today</span>
                  </div>
                </div>

                {/* SSL cert info */}
                {m.ssl_expiry && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>SSL certificate verified</span>
                    </span>
                    <span className="break-anywhere font-mono text-[10px] text-slate-400">
                      Expires in: {Math.max(0, Math.ceil((new Date(m.ssl_expiry) - new Date()) / (1000 * 60 * 60 * 24)))} days ({m.ssl_issuer})
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-500 text-xs border-t border-slate-200 bg-white">
        Powered by <strong className="text-slate-700">PingBEAT</strong> Uptime Monitors
      </footer>
    </div>
  )
}

export default StatusPage
