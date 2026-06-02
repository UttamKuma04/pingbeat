import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ eyebrow, title, subtitle, centered = false }) {
  return (
    <Reveal className={`mb-12 ${centered ? 'text-center' : ''}`}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-3">{eyebrow}</p>
      <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950 mb-4 ${centered ? 'mx-auto max-w-3xl' : 'max-w-3xl'}`}>{title}</h2>
      {subtitle && <p className={`text-slate-600 leading-relaxed text-lg ${centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{subtitle}</p>}
    </Reveal>
  )
}

/* ── Live uptime bars widget ── */
function UptimeBars() {
  const bars = [1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Uptime Last 45 Days</p>
          <p className="text-3xl font-extrabold text-slate-950 mt-1">99.98%</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>Live
        </span>
      </div>
      <div className="flex items-end h-10 gap-0.5">
        {bars.map((up, i) => (
          <div key={i} className={`flex-1 rounded-sm transition-all duration-300 hover:opacity-80 ${up ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ height: up ? '100%' : '30%' }} title={up ? 'Operational' : 'Incident'} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
        <span>45 days ago</span>
        <span>Today</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        {[['Avg Response','142 ms'],['Incidents','1'],['SSL Valid','89 days']].map(([label, val]) => (
          <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="font-bold text-slate-950 mt-0.5">{val}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Response chart widget ── */
function ResponseChart() {
  const points = [[0,78],[12,55],[24,68],[36,42],[48,58],[60,35],[72,40],[84,28],[100,22]]
  const path = points.map(([x,y],i) => `${i===0?'M':'L'} ${x} ${y}`).join(' ')
  const area = `${path} L 100 100 L 0 100 Z`
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-sm font-bold text-slate-950">Response Time Trend</p>
          <p className="text-sm text-slate-500 mt-0.5">Latency improving over time as infra scales.</p>
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">24h</span>
      </div>
      <svg viewBox="0 0 100 100" className="h-48 w-full overflow-visible">
        {[20,40,60,80].map(l => (
          <line key={l} x1="0" x2="100" y1={l} y2={l} stroke="#e2e8f0" strokeWidth="0.4" strokeDasharray="2 2"/>
        ))}
        <path d={area} fill="#10b981" opacity="0.1"/>
        <path d={path} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {points.map(([x,y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#059669" stroke="#fff" strokeWidth="1"/>
        ))}
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[['Min','98 ms','text-emerald-600'],['Avg','142 ms','text-amber-600'],['P95','387 ms','text-orange-600']].map(([l,v,c]) => (
          <div key={l} className="text-center">
            <p className={`text-lg font-extrabold font-mono ${c}`}>{v}</p>
            <p className="text-xs text-slate-500">{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Incident card widget ── */
function IncidentCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-slate-950">Incident Timeline</p>
        <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5">All Clear</span>
      </div>
      <div className="space-y-3">
        {[
          { name:'API Gateway', status:'operational', time:'Now' },
          { name:'Auth Service', status:'operational', time:'Now' },
          { name:'Database Cluster', status:'resolved', time:'2h ago', duration:'4m 12s' },
          { name:'CDN Edge', status:'operational', time:'Now' },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span className="text-sm font-medium text-slate-800">{item.name}</span>
            </div>
            <div className="text-right">
              {item.duration && <p className="text-xs text-amber-600 font-mono font-semibold">Downtime: {item.duration}</p>}
              <p className={`text-xs font-semibold ${item.status === 'operational' ? 'text-emerald-600' : 'text-amber-600'}`}>{item.status === 'operational' ? 'Operational' : 'Resolved'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Alert card widget ── */
function AlertChannels() {
  const channels = [
    {
      icon: (
        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
      ),
      name:'Email', desc:'Instant alerts on status changes'
    },
    {
      icon: (
        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
      ),
      name:'Slack', desc:'Rich incident cards to your channel'
    },
    {
      icon: (
        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/></svg>
      ),
      name:'Discord', desc:'Webhook notifications to any server'
    },
    {
      icon: (
        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
      ),
      name:'Webhooks', desc:'Custom POST to any endpoint'
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {channels.map(ch => (
        <div key={ch.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="mb-2">{ch.icon}</div>
          <p className="font-bold text-slate-900 text-sm">{ch.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{ch.desc}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Feature comparison table ── */
function ComparisonTable() {
  const features = [
    ['HTTP/HTTPS Monitoring', true, true, true, true],
    ['SSL Certificate Tracking', true, true, false, true],
    ['Multi-region Probes', true, true, true, false],
    ['Public Status Pages', true, true, true, true],
    ['Maintenance Windows', true, true, false, false],
    ['Incident History & Logs', true, true, false, true],
    ['APM Integration', true, false, false, false],
    ['Self-hosted Control', true, false, false, false],
    ['Webhook Alerts', true, true, false, true],
    ['Response Assertions', true, true, false, false],
    ['Log Explorer', true, false, false, false],
    ['No per-monitor pricing', true, false, false, false],
  ]
  const tools = ['PingBEAT','Better Stack','UptimeRobot','Pingdom']

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left px-6 py-4 text-slate-500 font-semibold text-xs uppercase tracking-wider">Feature</th>
            {tools.map((t,i) => (
              <th key={t} className={`px-6 py-4 text-center text-xs font-bold uppercase tracking-wider ${i===0 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600'}`}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {features.map(([name, ...vals]) => (
            <tr key={name} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3.5 text-slate-700 font-medium">{name}</td>
              {vals.map((v, i) => (
                <td key={i} className={`px-6 py-3.5 text-center ${i===0 ? 'bg-emerald-50/50' : ''}`}>
                  {v
                    ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></span>
                    : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4"/></svg></span>
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Status page preview ── */
function StatusPagePreview() {
  const services = [
    { name:'API', up:true, sla:'99.99%' },
    { name:'Dashboard', up:true, sla:'99.97%' },
    { name:'Auth', up:true, sla:'100%' },
    { name:'Webhooks', up:true, sla:'99.94%' },
  ]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full pulse-green"></span>
        <p className="font-bold text-slate-900 text-sm">Acme Corp Status</p>
        <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">All Operational</span>
      </div>
      <div className="space-y-3">
        {services.map(s => (
          <div key={s.name} className="flex items-center gap-3">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.up ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className="text-xs font-semibold text-slate-700 flex-1">{s.name}</span>
            <div className="flex gap-0.5">
              {Array.from({length:30}).map((_,i) => (
                <span key={i} className={`w-1.5 h-4 rounded-sm ${Math.random()>0.03 ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
              ))}
            </div>
            <span className="text-[10px] font-mono text-slate-500 w-14 text-right">{s.sla}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-4 text-right font-mono">Powered by PingBEAT</p>
    </div>
  )
}

/* ── SSL tracker mini ── */
function SSLTracker() {
  const certs = [
    { domain:'api.acme.com', days:89, issuer:'Let\'s Encrypt', ok:true },
    { domain:'app.acme.com', days:23, issuer:'DigiCert', ok:false },
    { domain:'cdn.acme.com', days:156, issuer:'Cloudflare', ok:true },
  ]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
        SSL Certificate Monitor
      </p>
      <div className="space-y-3">
        {certs.map(c => (
          <div key={c.domain} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div>
              <p className="font-mono text-xs font-semibold text-slate-800">{c.domain}</p>
              <p className="text-[10px] text-slate-500">{c.issuer}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold font-mono ${c.days < 30 ? 'text-amber-600' : 'text-emerald-600'}`}>{c.days}d</p>
              {c.days < 30 && <p className="text-[10px] text-amber-600 font-semibold">Renew soon</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Observability stat cards ── */
function ObservabilityStats() {
  const metrics = [
    {
      label: 'Avg Response',
      value: '142ms',
      delta: '↓ 18ms',
      deltaPositive: true,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
      color: 'emerald',
    },
    {
      label: 'P95 Latency',
      value: '387ms',
      delta: '↓ 42ms',
      deltaPositive: true,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
      color: 'amber',
    },
    {
      label: '30d Uptime',
      value: '99.97%',
      delta: 'SLA met',
      deltaPositive: true,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
      color: 'cyan',
    },
    {
      label: 'Incidents (30d)',
      value: '1',
      delta: '4m 12s total',
      deltaPositive: true,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
      color: 'slate',
    },
  ]

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', delta: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-600',   delta: 'text-amber-600' },
    cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    icon: 'text-cyan-600',    delta: 'text-cyan-600' },
    slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   icon: 'text-slate-500',   delta: 'text-slate-500' },
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
      {metrics.map((m) => {
        const c = colorMap[m.color]
        return (
          <Reveal key={m.label} className={`rounded-xl border ${c.border} ${c.bg} p-4 shadow-sm`}>
            <div className={`flex items-center gap-2 mb-2 ${c.icon}`}>
              {m.icon}
              <span className="text-xs font-semibold uppercase tracking-wide">{m.label}</span>
            </div>
            <p className="text-2xl font-extrabold text-slate-950">{m.value}</p>
            <p className={`text-xs mt-0.5 font-medium ${c.delta}`}>{m.delta}</p>
          </Reveal>
        )
      })}
    </div>
  )
}

/* ── main component ── */
function LandingPage() {
  const navigate = useNavigate()
  const isAuthenticated = !!localStorage.getItem('access_token')

  const coreFeatures = [
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
      title: 'HTTP/HTTPS Monitoring',
      desc: 'Monitor any endpoint with configurable HTTP methods, request headers, body payloads, and expected status codes. Supports GET, POST, PUT, DELETE, HEAD checks at intervals as low as 30 seconds.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
      title: 'SSL Certificate Tracking',
      desc: 'Automatically capture certificate expiry dates, issuers, and validity state on every check. Get warned before certificates expire so your users never see a security warning.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
      title: 'Multi-Region Probes',
      desc: 'Tag Celery workers by geographic region so every check log carries location context. Understand whether outages are global or region-specific at a glance.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
      title: 'Public Status Pages',
      desc: 'Publish branded status pages with selected monitors, 90-day uptime history bars, and live incident reports. Give customers a trusted source of truth during incidents.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
      title: 'Maintenance Windows',
      desc: 'Schedule planned downtime windows per monitor so alerting stays quiet during deployments, migrations, and infrastructure work. Windows are visible on status pages.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
      title: 'Incident History & Evidence',
      desc: 'Every status transition opens or resolves an incident record with start time, duration, and error context. Full audit trail of your service reliability over time.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
      title: 'Response Assertions',
      desc: 'Validate more than status codes — assert that a keyword is present in the response body, or that the response arrives within a maximum latency threshold you define.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
      title: 'Multi-Channel Alerts',
      desc: 'Route downtime signals to Email, Slack, Discord, or a custom webhook endpoint. Configure per-monitor alert channels to ensure the right team gets notified.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>,
      title: 'APM Integration',
      desc: 'Register applications and instrument them with the PingBEAT SDK to collect endpoint-level latency, error rates, P95/P99, traffic volume, and Apdex scores.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>,
      title: 'Log Explorer',
      desc: 'Search and filter every check result across all monitors. Filter by status, response time, status code class, region, and monitor name. Inspect individual logs in a detail panel.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
      title: 'Fleet Analytics',
      desc: 'Cross-monitor SLA percentages, latency distribution histograms, downtime heatmaps by hour, slowest services ranking, and portfolio-level health dashboards.',
    },
    {
      icon: <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>,
      title: 'Bulk Monitor Actions',
      desc: 'Select multiple monitors from the dashboard and pause, resume, or delete them in a single operation. Manage large fleets without navigating monitor by monitor.',
    },
  ]

  const howItWorks = [
    {
      step: '01',
      title: 'Define Your Monitors',
      body: 'Add URLs or API endpoints with your expected HTTP method, status code, timeout, check interval, tags, request headers, body, and optional assertions. Everything is configurable per monitor.',
    },
    {
      step: '02',
      title: 'Workers Execute Probes',
      body: 'Celery Beat triggers checks on schedule. Workers execute the HTTP probe, validate assertions, capture SSL state, and record response time — all asynchronously without blocking other checks.',
    },
    {
      step: '03',
      title: 'Evidence Gets Recorded',
      body: 'Each check creates a MonitorLog with status code, response time, SSL metadata, region tag, failure reason, and keyword match result. Nothing is lost — the full log history is searchable.',
    },
    {
      step: '04',
      title: 'State Transitions Trigger Actions',
      body: 'When a monitor flips from UP to DOWN, an Incident opens and an alert fires. When it recovers, the Incident resolves with duration. The dashboard reflects the change in real time.',
    },
    {
      step: '05',
      title: 'Teams Stay Informed',
      body: 'Alerts reach teams via Email, Slack, Discord, or webhook. Status pages surface outages to customers. The Log Explorer gives engineers the evidence they need to debug quickly.',
    },
    {
      step: '06',
      title: 'Analytics Close the Loop',
      body: 'SLA trends, latency distributions, downtime heatmaps, and incident MTTR give you the data to prioritize reliability investments and demonstrate service quality to stakeholders.',
    },
  ]

  const useCases = [
    {
      title: 'SaaS Product Teams',
      desc: 'Monitor your API, dashboard, auth, and payment endpoints. Catch regressions before users report them. Share a public status page to build customer trust during incidents.',
      tags: ['API monitoring', 'Status pages', 'Slack alerts'],
    },
    {
      title: 'DevOps & SRE Teams',
      desc: 'Get deep evidence from every check log. Schedule maintenance windows around deployments. Track SLA compliance over 30, 7, and 1-day windows for reliability reviews.',
      tags: ['Log Explorer', 'Maintenance windows', 'SLA tracking'],
    },
    {
      title: 'Agencies & Freelancers',
      desc: 'Monitor client sites from a single dashboard. Export CSV logs for client reports. Create branded public status pages for each client with their selected services.',
      tags: ['Multi-monitor', 'CSV export', 'Public pages'],
    },
    {
      title: 'Infrastructure Teams',
      desc: 'Tag monitors by environment and region. Use bulk actions to pause entire groups during migrations. Track SSL certificate health across all domains from one view.',
      tags: ['Tag filtering', 'Bulk actions', 'SSL tracking'],
    },
  ]

  const stats = [
    ['30s', 'Minimum check interval'],
    ['90d', 'Status page history'],
    ['4+', 'Alert destinations'],
    ['∞', 'Monitors supported'],
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <BrandLogo to="/" />
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">How it works</a>
            <a href="#observability" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Observability</a>
            <a href="#compare" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Compare</a>
            <Link to="/about" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">About</Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md rounded-lg">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="hidden text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium sm:inline">Sign In</Link>
                <Link to="/register" className="px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-md sm:px-4">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="border-b border-slate-200 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 gap-10 items-center sm:px-6 sm:py-20 lg:grid-cols-[1fr_minmax(320px,480px)] lg:gap-16">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-6 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Self-hosted uptime monitoring
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.1] mb-6">
              Know when your services go down.{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Before your users do.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mb-8 leading-relaxed">
              PingBEAT monitors websites and APIs around the clock, tracks SSL certificates, records every incident, schedules maintenance windows, and routes alerts to the channels your team already watches — all from infrastructure you control.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {isAuthenticated ? (
                <button onClick={() => navigate('/dashboard')} className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 transform hover:scale-[1.02]">Go to Dashboard</button>
              ) : (
                <>
                  <button onClick={() => navigate('/register')} className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 transform hover:scale-[1.02]">Start Monitoring Free</button>
                  <button onClick={() => navigate('/login')} className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold rounded-lg transition-all duration-200">Sign In</button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-500">
              {['No credit card required','Self-hosted & open','30s check intervals'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={140}>
            <UptimeBars />
          </Reveal>
        </div>
      </header>

      {/* ── Stats bar ── */}
      <section className="py-12 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(([value, label], i) => (
            <Reveal key={label} delay={i * 60} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
              <p className="text-3xl font-extrabold text-slate-950">{value}</p>
              <p className="mt-1 text-sm text-slate-600">{label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Feature overview ── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6">
        <SectionHeader
          eyebrow="Platform Capabilities"
          title="Everything you need to run reliable services"
          subtitle="PingBEAT combines uptime monitoring, incident management, SSL tracking, APM, log exploration, and public status pages into a single self-hosted platform."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coreFeatures.map((f, i) => (
            <Reveal key={f.title} delay={i * 40} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-300 transition-all duration-200 group">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">{f.icon}</div>
              <h3 className="font-bold text-slate-950 mb-2 group-hover:text-emerald-700 transition-colors">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Architecture"
            title="From monitor setup to incident resolution"
            subtitle="PingBEAT's architecture keeps the path from definition to action short. Celery workers do the checking; Django stores the evidence; you get the signal."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {howItWorks.map((step, i) => (
              <Reveal key={step.step} delay={i * 70} className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-extrabold text-emerald-700 flex-shrink-0">{step.step}</span>
                  <h3 className="font-bold text-slate-950">{step.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Observability ── */}
      <section id="observability" className="py-24 max-w-7xl mx-auto px-6">
        <SectionHeader
          eyebrow="Observability"
          title="Latency trends and SLA evidence at your fingertips"
          subtitle="Monitor detail pages serve up real-time response-time charts, SLA percentages across 24h, 7d, and 30d windows, plus a 90-day status history grid."
        />
        <ObservabilityStats />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 items-start">
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                ['SLA Windows','24h, 7d, 30d uptime percentages with color-coded health'],
                ['Latency Stats','Average, min, max response time over the last 24 hours'],
                ['History Grid','90-day daily status tiles with hover tooltips'],
              ].map(([title, body], i) => (
                <Reveal key={title} delay={i * 80} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="font-bold text-slate-950 text-sm mb-1">{title}</h3>
                  <p className="text-xs leading-relaxed text-slate-600">{body}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={120} className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">SLA Health — Last 30 Days</p>
              <div className="space-y-3">
                {[
                  { name: 'API Gateway',      sla: 99.97, color: 'bg-emerald-500' },
                  { name: 'Auth Service',     sla: 100,   color: 'bg-emerald-500' },
                  { name: 'Database Cluster', sla: 99.71, color: 'bg-amber-400' },
                  { name: 'CDN Edge',         sla: 99.99, color: 'bg-emerald-500' },
                ].map(({ name, sla, color }) => (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{name}</span>
                      <span className={`font-mono font-bold ${sla >= 99.9 ? 'text-emerald-600' : 'text-amber-600'}`}>{sla}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${sla}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <ResponseChart />
          </Reveal>
        </div>
      </section>

      {/* ── Incident management ── */}
      <section className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 gap-10 items-start lg:grid-cols-[minmax(320px,480px)_1fr] lg:gap-14">
            <Reveal>
              <IncidentCard />
            </Reveal>
            <div>
              <SectionHeader
                eyebrow="Incident Management"
                title="Every outage documented from start to resolution"
                subtitle="PingBEAT automatically opens and closes incidents as monitors flip status. Duration, error context, and resolution timestamps are all recorded without manual effort."
              />
              <div className="space-y-4 mt-2">
                {[
                  ['Auto-open on failure','An Incident record is created the moment a monitor transitions to DOWN, capturing the error message and timestamp.'],
                  ['Live duration tracking','Active incidents show a live timer on the Incidents page so your team knows how long an outage has been running.'],
                  ['Auto-resolve on recovery','When the monitor returns to UP, the incident closes with a resolved_at timestamp and calculated duration.'],
                  ['Full incident history','Browse the complete timeline of past incidents per monitor, with downtime durations and error messages preserved.'],
                  ['One-click acknowledgement','Engineers can acknowledge active incidents from the dashboard without needing a separate incident tool.'],
                ].map(([title, body], i) => (
                  <Reveal key={title} delay={i * 60} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex gap-4">
                    <div className="w-1.5 bg-emerald-500 rounded-full flex-shrink-0 self-stretch"></div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{title}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Status pages ── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 gap-10 items-start lg:grid-cols-[1fr_minmax(320px,460px)] lg:gap-14">
          <div>
            <SectionHeader
              eyebrow="Status Pages"
              title="Give customers a transparent view of your reliability"
              subtitle="Create public or private status pages in seconds. Select which monitors to display, and PingBEAT automatically shows live status, active incidents, and 90-day uptime history."
            />
            <div className="space-y-3 mt-4">
              {[
                ['Custom URL slugs','Each status page gets its own /status/your-slug URL you can link from your product.'],
                ['Active incident display','Open incidents surface automatically on the status page so customers have context during outages.'],
                ['90-day history bars','Daily status tiles for the last 90 days give customers confidence in your long-term reliability.'],
                ['Public or private','Make pages publicly accessible without login, or keep them private for internal use.'],
                ['SSL indicator','Show certificate validity on each monitor tile so customers see your security posture too.'],
              ].map(([title, body], i) => (
                <Reveal key={title} delay={i * 50} className="flex gap-3 items-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={100}>
            <StatusPagePreview />
          </Reveal>
        </div>
      </section>

      {/* ── SSL ── */}
      <section className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 gap-10 items-start lg:grid-cols-[minmax(320px,460px)_1fr] lg:gap-14">
            <Reveal>
              <SSLTracker />
            </Reveal>
            <div>
              <SectionHeader
                eyebrow="SSL Monitoring"
                title="Never get caught by an expired certificate"
                subtitle="PingBEAT captures SSL certificate metadata on every single check — expiry date, issuer, and remaining days — and surfaces warnings before they become incidents."
              />
              <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2">
                {[
                  ['Automatic capture','SSL state recorded on every check with no extra configuration required.'],
                  ['Expiry warnings','Visual warning banners appear on monitor detail pages when certs are close to expiring.'],
                  ['Issuer tracking','See which certificate authority issued each cert for every domain you monitor.'],
                  ['Status page display','SSL validity shows on public status pages to reassure customers about your security.'],
                ].map(([title, body], i) => (
                  <Reveal key={title} delay={i * 60} className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <p className="font-bold text-slate-900 text-sm mb-1">{title}</p>
                    <p className="text-xs text-slate-600">{body}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Alert channels ── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 gap-10 items-start lg:grid-cols-[1fr_minmax(300px,400px)] lg:gap-14">
          <div>
            <SectionHeader
              eyebrow="Alerting"
              title="Route incidents to wherever your team works"
              subtitle="Configure alert channels per monitor so the right team hears about the right service. No shared noise — surgical, targeted notifications."
            />
            <div className="space-y-3 mt-4">
              {[
                ['Email','Instant alert emails on every status change with monitor name, URL, status code, and error message.'],
                ['Slack Webhooks','Rich formatted messages to any Slack channel with one-click setup using Slack incoming webhook URLs.'],
                ['Discord Webhooks','Embed formatted incident cards into any Discord server using standard webhook integration.'],
                ['Custom Webhooks','POST full incident JSON to any endpoint — integrate PingBEAT into your own on-call or ticketing system.'],
              ].map(([title, body], i) => (
                <Reveal key={title} delay={i * 60} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{title}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={100}>
            <AlertChannels />
          </Reveal>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Use Cases"
            title="Built for teams that take reliability seriously"
            subtitle="Whether you're a solo developer or an SRE team managing hundreds of endpoints, PingBEAT adapts to your workflow."
            centered
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {useCases.map((uc, i) => (
              <Reveal key={uc.title} delay={i * 70} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-950 text-lg mb-3">{uc.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 mb-4">{uc.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {uc.tags.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">{t}</span>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── APM section ── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <SectionHeader
          eyebrow="Application Performance Monitoring"
          title="Go beyond uptime with endpoint-level performance data"
          subtitle="Register applications and use the PingBEAT SDK to collect granular metrics: requests per minute, error rates, P95 latency, Apdex scores, and per-endpoint breakdowns."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { title:'Apdex Score', desc:'Quantify user satisfaction across your API with the industry-standard Apdex metric.' },
            { title:'P95 / P99 Latency', desc:'Understand tail latency to catch slowness that averages hide from your SLA reports.' },
            { title:'Error Rate Tracking', desc:'See error percentages per endpoint so you can prioritize the highest-impact fixes.' },
            { title:'Traffic Volume', desc:'Requests-per-minute timelines expose traffic spikes that correlate with performance issues.' },
            { title:'Slowest Endpoints', desc:'Ranked list of endpoints by average latency to focus optimization where it matters.' },
            { title:'Multi-Environment', desc:'Separate production, staging, and development applications with their own API keys.' },
            { title:'Traffic + Error Chart', desc:'Overlaid traffic and error bars show how error rate tracks with request volume.' },
            { title:'API Key Management', desc:'Each registered application gets a unique API key for secure SDK instrumentation.' },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 40} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center mb-3">
                <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
              </div>
              <h3 className="font-bold text-slate-950 text-sm mb-1">{item.title}</h3>
              <p className="text-xs leading-relaxed text-slate-600">{item.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="compare" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="How We Compare"
            title="Feature-complete monitoring you actually own"
            subtitle="PingBEAT gives you the breadth of commercial platforms with the control of self-hosted infrastructure."
            centered
          />
          <Reveal>
            <ComparisonTable />
          </Reveal>
          <Reveal delay={100}>
            <p className="text-xs text-slate-400 text-center mt-4">Comparison based on publicly documented features as of 2025. Feature availability varies by plan on commercial platforms.</p>
          </Reveal>
        </div>
      </section>

      {/* ── Background worker section ── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <SectionHeader
          eyebrow="Background Jobs"
          title="Celery keeps monitoring running 24/7"
          subtitle="All monitoring work is isolated from the web request cycle. Checks, alerts, and cleanup run continuously without affecting dashboard responsiveness."
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[
            {
              task: 'check_monitors',
              schedule: 'Every 30 seconds',
              desc: 'Performs HTTP probes against all active monitors not in a maintenance window. Validates status codes, keywords, and max response time. Updates SSL metadata. Logs results and manages incident lifecycle.',
            },
            {
              task: 'send_monitor_alert',
              schedule: 'On status change',
              desc: 'Dispatches notifications when a monitor transitions between UP and DOWN. Routes to the configured channel — Email, Slack, Discord, or custom webhook — with full incident context.',
            },
            {
              task: 'cleanup_old_logs',
              schedule: 'Daily',
              desc: 'Prunes monitor logs older than the retention threshold to keep the database performant over time. Retention policy is configurable without losing incident or SLA history.',
            },
          ].map((item, i) => (
            <Reveal key={item.task} delay={i * 80} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="font-mono text-sm font-bold text-slate-950">{item.task}</p>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">{item.schedule}</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Data model ── */}
      <section className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Data Model"
            title="A clean schema built for reliability evidence"
            subtitle="PingBEAT keeps the data model direct so every piece of downtime evidence is traceable, queryable, and easy to reason about."
          />
          <div className="space-y-3">
            {[
              ['Monitor', 'Target URL, HTTP method, expected status, assertions, alert channel, tags, SSL metadata, interval, timeout, webhook config'],
              ['MonitorLog', 'Per-check result: is_up, status_code, response_time_ms, ssl_expiry, ssl_issuer, ssl_warning, region, failure_reason, error_message, checked_at'],
              ['Incident', 'Downtime record: started_at, resolved_at, duration_seconds, error_message, monitor FK — auto-managed by check_monitors task'],
              ['StatusPage', 'Public or private page with title, slug, is_public flag, and M2M relationship to selected monitors'],
              ['MaintenanceWindow', 'Scheduled pause window with label, start_time, end_time, linked to a specific monitor — suppresses alerts during window'],
              ['ApmApplication', 'Registered app with name, environment, api_key — parent for endpoint metrics, traffic logs, and error events'],
            ].map(([name, body], i) => (
              <Reveal key={name} delay={i * 50} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
                  <p className="font-mono text-sm font-bold text-emerald-700">{name}</p>
                  <p className="text-sm text-slate-600">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full pulse-green"></div>
            <div>
              <span className="text-sm font-bold text-slate-700">PingBEAT Monitoring Platform</span>
              <p className="text-slate-400 text-xs mt-0.5">&copy; {new Date().getFullYear()} PingBEAT. Designed for reliability.</p>
            </div>
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <Link to="/about" className="text-slate-500 hover:text-slate-900 transition-colors">About</Link>
            <Link to="/login" className="text-slate-500 hover:text-slate-900 transition-colors">Sign In</Link>
            <Link to="/register" className="text-slate-500 hover:text-slate-900 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
