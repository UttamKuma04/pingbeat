import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
      { threshold: 0.16, rootMargin: '0px 0px -50px 0px' }
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

function SectionHeader({ eyebrow, title, children }) {
  return (
    <Reveal className="mb-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-3">{eyebrow}</p>
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 mb-4">{title}</h2>
      {children && <p className="max-w-3xl text-slate-600 leading-relaxed">{children}</p>}
    </Reveal>
  )
}

function UptimeBars() {
  const bars = [42, 58, 50, 72, 64, 83, 55, 70, 48, 68, 60, 78, 52, 88, 66, 74]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Uptime Trend</p>
          <p className="text-2xl font-bold text-slate-950">99.98%</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live
        </span>
      </div>
      <div className="flex h-36 items-end gap-2">
        {bars.map((height, index) => (
          <div key={index} className="flex-1 rounded-t bg-emerald-500/80 transition-all duration-500 hover:bg-emerald-600" style={{ height: `${height}%` }} />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-slate-500">Checks</p>
          <p className="font-bold text-slate-950">24/7</p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-slate-500">Avg Latency</p>
          <p className="font-bold text-slate-950">186 ms</p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-slate-500">SSL</p>
          <p className="font-bold text-slate-950">42 days</p>
        </div>
      </div>
    </div>
  )
}

function ResponseChart() {
  const points = [
    [0, 82],
    [11, 64],
    [22, 70],
    [33, 46],
    [44, 62],
    [55, 38],
    [66, 44],
    [77, 30],
    [88, 36],
    [100, 24],
  ]
  const path = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const area = `${path} L 100 100 L 0 100 Z`

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-950">Response Time Analytics</p>
          <p className="text-sm text-slate-600">Track latency trends and spot degradations before downtime.</p>
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">24h</span>
      </div>
      <svg viewBox="0 0 100 100" className="h-52 w-full overflow-visible">
        {[20, 40, 60, 80].map((line) => (
          <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#e2e8f0" strokeWidth="0.4" strokeDasharray="2 2" />
        ))}
        <path d={area} fill="#10b981" opacity="0.12" />
        <path d={path} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#059669" stroke="#ffffff" strokeWidth="1" />
        ))}
      </svg>
    </div>
  )
}

function LandingPage() {
  const navigate = useNavigate()
  const isAuthenticated = !!localStorage.getItem('access_token')

  const features = [
    ['Multi-region probes', 'Tag workers by region so logs show where each check originated.'],
    ['SSL expiry tracking', 'Capture certificate expiry date, issuer, remaining days, and warning state.'],
    ['Response assertions', 'Validate expected status codes, required keywords, and max response time.'],
    ['Maintenance windows', 'Skip noisy alerting during planned deployment or infrastructure work.'],
    ['Incident history', 'Open incidents when monitors fail and resolve them when service recovers.'],
    ['Public status pages', 'Publish selected monitors with 90-day uptime history and active incidents.'],
  ]

  const workflow = [
    ['1', 'Create a monitor', 'Define name, URL, method, expected status, timeout, interval, tags, and optional HTTP headers or request body.'],
    ['2', 'Schedule checks', 'Celery Beat triggers monitor checks every 30 seconds while workers execute probe requests asynchronously.'],
    ['3', 'Store evidence', 'Every result becomes a MonitorLog with status code, response time, region, SSL state, and failure reason.'],
    ['4', 'Detect incidents', 'Status transitions open or resolve incidents, update current status, and keep downtime duration traceable.'],
    ['5', 'Notify teams', 'Alerts can go to email, Slack, Discord, or a custom webhook depending on monitor configuration.'],
  ]

  const modelRows = [
    ['Monitor', 'Target URL, HTTP settings, assertions, alert channel, tags, SSL metadata'],
    ['MonitorLog', 'Per-check status, response time, status code, SSL warning, region, error details'],
    ['Incident', 'Downtime start, resolution, duration, and error message'],
    ['StatusPage', 'Public or private page with selected monitors'],
    ['MaintenanceWindow', 'Scheduled pause window linked to a monitor'],
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-500 rounded-full pulse-green"></div>
              <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full opacity-30 blur-sm"></div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              PingBEAT
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link to="/about" className="text-slate-600 hover:text-slate-900 transition-colors duration-200 text-sm font-medium">
              About
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 rounded-lg"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-slate-900 transition-colors duration-200 text-sm font-medium">
                  Sign In
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-12 items-center">
          <Reveal>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-6 uppercase tracking-wider">
              Self-hosted uptime monitoring
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-950 tracking-tight leading-tight mb-6">
              Monitor every service signal from one controlled workspace.
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mb-8 leading-relaxed">
              PingBEAT monitors websites and APIs, tracks SSL certificates, records incidents, schedules maintenance, exports evidence, and routes alerts through the channels your team already uses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <button onClick={() => navigate('/dashboard')} className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 transform hover:scale-[1.02]">
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <button onClick={() => navigate('/register')} className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 transform hover:scale-[1.02]">
                    Start Monitoring
                  </button>
                  <button onClick={() => navigate('/login')} className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold rounded-lg transition-all duration-200">
                    Sign In
                  </button>
                </>
              )}
            </div>
          </Reveal>

          <Reveal delay={140}>
            <UptimeBars />
          </Reveal>
        </div>
      </header>

      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['30s', 'scheduled probe loop'],
            ['50', 'recent logs per detail view'],
            ['90d', 'status page history'],
            ['4+', 'alert destinations'],
          ].map(([value, label], index) => (
            <Reveal key={label} delay={index * 70} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-3xl font-extrabold text-slate-950">{value}</p>
              <p className="mt-1 text-sm text-slate-600">{label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Platform" title="Everything PingBEAT watches">
          The landing page now mirrors the actual product: checks, logs, incidents, analytics, status pages, alerting, maintenance, and the background worker system.
        </SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(([title, body], index) => (
            <Reveal key={title} delay={index * 60} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-emerald-300">
              <div className="mb-4 h-10 w-10 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <h3 className="font-bold text-slate-950 mb-2">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Workflow" title="From monitor setup to incident response">
          The core loop is intentionally small: define checks, run probes, record evidence, detect state changes, and notify the team.
        </SectionHeader>
        <div className="space-y-4">
          {workflow.map(([step, title, body], index) => (
            <Reveal key={step} delay={index * 70} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-[80px_260px_1fr] gap-4 md:items-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700">{step}</span>
                <h3 className="font-bold text-slate-950">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-20 border-y border-slate-200 bg-slate-100/60">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-10 items-start">
          <div>
            <SectionHeader eyebrow="Analytics" title="Graphs built from real monitor evidence">
              Monitor detail pages and analytics screens turn raw check logs into response-time trends, SLA percentages, incident history, and portfolio-level health views.
            </SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                ['SLA', '24h, 7d, 30d uptime percentages'],
                ['Latency', 'Average, minimum, and maximum response time'],
                ['Heatmap', 'Downtime grouped by hour across monitors'],
              ].map(([title, body], index) => (
                <Reveal key={title} delay={index * 80} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={120}>
            <ResponseChart />
          </Reveal>
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Data model" title="The entities behind the dashboard">
          PingBEAT keeps the model direct so downtime evidence stays easy to reason about.
        </SectionHeader>
        <div className="space-y-3">
          {modelRows.map(([name, body], index) => (
            <Reveal key={name} delay={index * 60} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
                <p className="font-mono text-sm font-bold text-emerald-700">{name}</p>
                <p className="text-sm text-slate-600">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Background jobs" title="Celery keeps monitoring moving">
          Scheduled work is isolated from the web request cycle so checks, notifications, and cleanup can run continuously.
        </SectionHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[
            ['check_monitors', 'Runs every 30 seconds, performs HTTP checks, validates assertions, updates SSL metadata, logs results, and manages incidents.'],
            ['send_monitor_alert', 'Dispatches alerts on status changes through email, Slack, Discord, or custom webhook destinations.'],
            ['cleanup_old_logs', 'Runs daily and deletes old monitor logs to keep the database from growing forever.'],
          ].map(([title, body], index) => (
            <Reveal key={title} delay={index * 80} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <p className="font-mono text-sm font-bold text-slate-950">{title}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Status and alerts" title="Communicate outages clearly">
          Public status pages expose selected monitors, while alerts route private operational events to your team.
        </SectionHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Reveal className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-950 mb-3">Status pages</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Create public or private pages, select monitors, show active incidents, and display 90-day history blocks for service transparency.
            </p>
          </Reveal>
          <Reveal delay={90} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-950 mb-3">Notification channels</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Send status-change notifications to email, Slack, Discord, or a custom webhook so every team can plug PingBEAT into its own response flow.
            </p>
          </Reveal>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-200 bg-white py-12">
        <Reveal className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <span className="text-sm font-semibold text-slate-700">PingBEAT Monitoring Platform</span>
            <p className="text-slate-400 text-xs mt-1">&copy; {new Date().getFullYear()} PingBEAT. Designed for reliability.</p>
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <Link to="/about" className="text-slate-500 hover:text-slate-900 transition-colors duration-200">About</Link>
            <Link to="/login" className="text-slate-500 hover:text-slate-900 transition-colors duration-200">Sign In</Link>
            <Link to="/register" className="text-slate-500 hover:text-slate-900 transition-colors duration-200">Register</Link>
          </div>
        </Reveal>
      </footer>
    </div>
  )
}

export default LandingPage
