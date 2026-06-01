import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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

function AboutPage() {
  const isAuthenticated = !!localStorage.getItem('access_token')

  const timeline = [
    {
      phase: 'Problem',
      title: 'Too many tools, not enough clarity',
      body: 'Most monitoring stacks involve separate tools for uptime checks, incident tracking, SSL alerts, performance metrics, and status pages. Stitching them together creates alert fatigue, missing context, and gaps during incidents.',
    },
    {
      phase: 'Decision',
      title: 'Self-hosted, unified, and purposeful',
      body: 'PingBEAT consolidates uptime monitoring, SSL tracking, incident management, log exploration, APM metrics, and public status pages into a single platform you deploy and control — no vendor lock-in, no per-monitor pricing surprises.',
    },
    {
      phase: 'Design',
      title: 'Evidence-first architecture',
      body: 'Every check creates a durable log record. Incidents are derived from state transitions, not manual reports. The dashboard shows what you need to act, not noise. Reliability history is always one click away.',
    },
    {
      phase: 'Result',
      title: 'A platform built for operators',
      body: 'PingBEAT is designed around the habits of people who actually respond to incidents: fast scanning, clear evidence, targeted alerts, and historical context that makes postmortems easier.',
    },
  ]

  const designPrinciples = [
    {
      word: 'Fast',
      color: 'text-emerald-600',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      desc: 'The dashboard is built for scanning, not reading. Status badges, latency numbers, and incident counts are visible at a glance. Filtering and search narrow to the signal you need without leaving the page.',
    },
    {
      word: 'Traceable',
      color: 'text-cyan-600',
      border: 'border-cyan-200',
      bg: 'bg-cyan-50',
      desc: 'Every outage is backed by check logs with timestamps, status codes, response times, and error messages. Incident records carry the full context from open to resolve. Nothing relies on memory or manual entry.',
    },
    {
      word: 'Calm',
      color: 'text-amber-600',
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      desc: 'Maintenance windows silence alerts during planned work. Status badges are clear and unambiguous. Filters reduce list noise. The goal is signal clarity — not alert maximalism.',
    },
    {
      word: 'Controlled',
      color: 'text-slate-700',
      border: 'border-slate-200',
      bg: 'bg-slate-50',
      desc: 'Self-hosted by default. Your monitor targets, alert configuration, check logs, and API keys stay in your infrastructure. You choose the database, the worker count, and the retention policy.',
    },
  ]

  const architecture = [
    {
      layer: 'API Layer',
      tech: 'Django REST Framework',
      desc: 'Handles authentication, monitor CRUD, log queries, incident management, status page configuration, APM data ingestion, and maintenance window scheduling.',
    },
    {
      layer: 'Task Queue',
      tech: 'Celery + Redis',
      desc: 'check_monitors runs every 30 seconds via Celery Beat. Workers execute HTTP probes asynchronously, update SSL metadata, write MonitorLog records, and manage incident state without touching the request cycle.',
    },
    {
      layer: 'Data Store',
      tech: 'PostgreSQL',
      desc: 'Stores monitors, logs, incidents, status pages, maintenance windows, and APM metrics. Log retention is managed by the cleanup_old_logs periodic task to control database growth.',
    },
    {
      layer: 'Frontend',
      tech: 'React + Vite + Tailwind',
      desc: 'Single-page application with JWT-based auth, 30-second auto-refresh polling, browser notification support, and a collapsible sidebar navigation for all platform sections.',
    },
    {
      layer: 'Alert Dispatch',
      tech: 'Celery Tasks',
      desc: 'send_monitor_alert fires when status changes. Routes to Email (SMTP), Slack (incoming webhook), Discord (webhook), or a custom POST endpoint configured per monitor.',
    },
    {
      layer: 'Public Layer',
      tech: 'Unauthenticated endpoints',
      desc: 'Status pages are served via public API endpoints with no auth requirement. Badge endpoints provide embeddable SVG status indicators for README files and external dashboards.',
    },
  ]

  const monitoringCapabilities = [
    {
      category: 'Check Configuration',
      items: [
        'HTTP/HTTPS endpoint monitoring',
        'GET, POST, PUT, DELETE, HEAD methods',
        'Custom request headers per monitor',
        'Request body for POST/PUT checks',
        'Expected HTTP status code validation',
        'Response keyword assertion',
        'Maximum response time assertion',
        'Check intervals: 30s to 1 hour',
        'Configurable timeout per monitor',
        'Tags for grouping and filtering',
      ],
    },
    {
      category: 'SSL & Security',
      items: [
        'Certificate expiry date capture',
        'Issuer information tracking',
        'Days-remaining calculation',
        'Expiry warning banners on detail pages',
        'SSL status on public status pages',
        'Warning threshold alerts',
      ],
    },
    {
      category: 'Incident Management',
      items: [
        'Auto-open incidents on DOWN transition',
        'Auto-resolve on recovery',
        'Duration calculation on resolution',
        'Error message preservation',
        'Per-monitor incident history',
        'Live duration timers on active incidents',
        'MTTR calculation across incidents',
        'Acknowledgement workflow',
      ],
    },
    {
      category: 'Analytics & Reporting',
      items: [
        '24h, 7d, 30d SLA percentages',
        'Average, min, max latency',
        'Response time chart (last 24h)',
        'Fleet-wide health overview',
        'Latency distribution histograms',
        'Downtime heatmap by hour',
        'Slowest services ranking',
        'CSV log export per monitor',
        'Cross-monitor SLA aggregation',
      ],
    },
    {
      category: 'Status Pages',
      items: [
        'Unlimited status pages',
        'Custom URL slugs',
        'Monitor selection per page',
        '90-day status history grid',
        'Active incident display',
        'SSL certificate info on tiles',
        'Public or private access control',
        'Embeddable status badges',
      ],
    },
    {
      category: 'APM Integration',
      items: [
        'Application registration with API keys',
        'Endpoint-level request tracking',
        'P95 and P99 latency metrics',
        'Error rate per endpoint',
        'Apdex score calculation',
        'Traffic volume over time',
        'Multi-environment support',
        'Top and slowest endpoint rankings',
      ],
    },
  ]

  const faq = [
    {
      q: 'How does PingBEAT compare to UptimeRobot?',
      a: 'UptimeRobot is a hosted SaaS service with limits on monitor counts by plan. PingBEAT is self-hosted with no per-monitor fees, adds response assertions, maintenance windows, a full log explorer, APM integration, and gives you complete data ownership.',
    },
    {
      q: 'How does it compare to Better Stack Uptime?',
      a: 'Better Stack has a polished hosted product with a strong incident management focus. PingBEAT provides similar uptime monitoring and incident tracking with the addition of APM metrics, self-hosting, and no vendor dependency — at the cost of managing your own infrastructure.',
    },
    {
      q: 'What about Pingdom?',
      a: 'Pingdom is a mature enterprise product with real-user monitoring and synthetic transactions. PingBEAT focuses on API and HTTP endpoint monitoring with a broader feature set per dollar — especially for teams that want to self-host and avoid per-check pricing.',
    },
    {
      q: 'How is PingBEAT different from Datadog or New Relic?',
      a: 'Datadog and New Relic are comprehensive observability platforms with agent-based APM, infrastructure monitoring, log management, and complex pricing. PingBEAT is intentionally narrower — focused on uptime, HTTP monitoring, and application performance metrics with a much smaller operational footprint.',
    },
    {
      q: 'Can I run PingBEAT on my own server?',
      a: 'Yes. PingBEAT is designed to be self-hosted. The backend runs on Django + Celery + Redis + PostgreSQL. The frontend is a Vite React app. Docker configuration is included to simplify deployment.',
    },
    {
      q: 'How does the check scheduler work?',
      a: 'Celery Beat triggers check_monitors every 30 seconds. The task evaluates which monitors are due for a check based on their interval_seconds setting, skips those in active maintenance windows, and dispatches individual probe tasks to Celery workers.',
    },
    {
      q: 'What happens during a maintenance window?',
      a: 'Monitors inside an active maintenance window are skipped by the check scheduler and their logs are marked with status="maintenance". Alerts are suppressed. The monitor shows an ACTIVE NOW badge on its maintenance window list during the window.',
    },
    {
      q: 'How are multi-region probes supported?',
      a: 'Celery workers can be tagged with a REGION environment variable. The check_monitors task reads this tag and stores it on each MonitorLog. The Log Explorer lets you filter by region to see which geography a check originated from.',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-emerald-500 selection:text-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <BrandLogo to={isAuthenticated ? '/dashboard' : '/'} />
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <Link to="/" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Home</Link>
            <a href="#capabilities" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Capabilities</a>
            <a href="#architecture" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Architecture</a>
            <a href="#faq" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">FAQ</a>
          </div>
          {isAuthenticated ? (
            <Link to="/dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-md">Dashboard</Link>
          ) : (
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all">Sign In</Link>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-4">About PingBEAT</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950 leading-tight mb-6 max-w-4xl">
              Uptime monitoring built for operators who need evidence, not estimates.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mb-8">
              PingBEAT is a self-hosted monitoring platform that gives developers and infrastructure teams the tools to understand whether services are available, responsive, secure, and worth trusting — all from infrastructure they control.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>Self-hosted
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200 bg-cyan-50 text-sm font-semibold text-cyan-700">
                <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>Evidence-first
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>No vendor lock-in
              </div>
            </div>
          </Reveal>
        </div>
      </header>

      <main>

        {/* ── Why it exists ── */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Origin"
            title="Why PingBEAT exists"
            subtitle="The monitoring space is crowded with expensive SaaS tools that charge per monitor, lock your data in vendor systems, and bundle features you don't need. PingBEAT started from a different premise."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {timeline.map((item, i) => (
              <Reveal key={item.phase} delay={i * 80} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-8 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-700 uppercase tracking-wider">{item.phase}</span>
                </div>
                <h3 className="font-bold text-slate-950 text-lg mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Design principles ── */}
        <section className="py-24 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              eyebrow="Design Principles"
              title="Four words that guide every product decision"
              subtitle="Good monitoring tools should feel fast to use in the middle of an incident and trustworthy enough to build SLA reports from. These four principles shape how PingBEAT is built."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {designPrinciples.map((p, i) => (
                <Reveal key={p.word} delay={i * 70} className={`rounded-xl border ${p.border} ${p.bg} p-6 shadow-sm`}>
                  <p className={`text-4xl font-extrabold ${p.color} mb-3`}>{p.word}</p>
                  <p className="text-sm leading-relaxed text-slate-700">{p.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Capabilities ── */}
        <section id="capabilities" className="py-24 max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Full Capabilities"
            title="Everything PingBEAT does"
            subtitle="A complete inventory of monitoring, alerting, analysis, and reporting capabilities available in the platform."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monitoringCapabilities.map((cat, i) => (
              <Reveal key={cat.category} delay={i * 60} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                  <h3 className="font-bold text-slate-950">{cat.category}</h3>
                </div>
                <ul className="space-y-2">
                  {cat.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Architecture ── */}
        <section id="architecture" className="py-24 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              eyebrow="Technical Architecture"
              title="How the platform is built"
              subtitle="PingBEAT uses a straightforward production stack that is easy to deploy, scale, and maintain without specialized infrastructure knowledge."
            />
            <div className="space-y-4">
              {architecture.map((layer, i) => (
                <Reveal key={layer.layer} delay={i * 60} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-[200px_180px_1fr] gap-4 md:items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Layer</p>
                      <p className="font-bold text-slate-950">{layer.layer}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Technology</p>
                      <span className="inline-block font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">{layer.tech}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{layer.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200} className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Deployment Stack
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Django 4+','Backend API & admin'],
                  ['Celery 5+','Async task execution'],
                  ['Redis','Task broker & result store'],
                  ['PostgreSQL','Primary data store'],
                  ['React 18','Frontend SPA'],
                  ['Vite','Frontend build tooling'],
                  ['Tailwind CSS','UI styling system'],
                  ['Docker','Container deployment'],
                ].map(([tech, role]) => (
                  <div key={tech} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
                    <p className="font-mono font-bold text-slate-900 text-xs">{tech}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{role}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── How monitoring works ── */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Core Loop"
            title="The check lifecycle explained"
            subtitle="Understanding how a single check request flows through the system helps you reason about latency, evidence, and failure modes."
          />
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-emerald-200 hidden md:block"></div>
            <div className="space-y-5">
              {[
                {
                  n: '1',
                  title: 'Celery Beat fires check_monitors',
                  body: 'Every 30 seconds, the Celery Beat scheduler triggers the check_monitors task. This task queries all active monitors, filters out those in maintenance windows, and dispatches individual probe tasks to the worker pool.',
                },
                {
                  n: '2',
                  title: 'Worker opens HTTP connection',
                  body: 'A Celery worker picks up the probe task and opens an HTTP(S) connection to the target URL using the configured method, headers, body, and timeout. SSL certificate metadata is captured at this stage.',
                },
                {
                  n: '3',
                  title: 'Response is evaluated against assertions',
                  body: 'The worker compares the response status code against expected_status. If assert_keyword is set, it checks for that string in the response body. If assert_max_response_time_ms is set, it validates the latency. Any failed assertion marks the check as DOWN.',
                },
                {
                  n: '4',
                  title: 'MonitorLog record is written',
                  body: 'A MonitorLog is created with is_up, status_code, response_time_ms, ssl_expiry, ssl_issuer, ssl_warning, region (from worker env), failure_reason, and checked_at. This is the permanent evidence record.',
                },
                {
                  n: '5',
                  title: 'State transition is evaluated',
                  body: 'The worker compares the current result with the monitor\'s previous is_up state. If the state has changed, it updates monitor.is_up, monitor.status_changed_at, and either opens or resolves an Incident.',
                },
                {
                  n: '6',
                  title: 'Alert is dispatched if needed',
                  body: 'If a state change occurred and the monitor has email_alerts enabled or a webhook channel configured, the send_monitor_alert task fires asynchronously to dispatch the notification without blocking the check cycle.',
                },
              ].map((step, i) => (
                <Reveal key={step.n} delay={i * 60} className="relative md:pl-16">
                  <div className="absolute left-3.5 top-4 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex items-center justify-center hidden md:flex">
                    <span className="text-[9px] font-bold text-white">{step.n}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="md:hidden flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">{step.n}</span>
                      <h3 className="font-bold text-slate-950">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Platform decisions ── */}
        <section className="py-24 bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              eyebrow="Product Decisions"
              title="What PingBEAT deliberately does and does not do"
              subtitle="Scope decisions matter as much as feature decisions. PingBEAT is intentional about where it draws its boundaries."
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Reveal className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  What PingBEAT does
                </h3>
                <ul className="space-y-3">
                  {[
                    'Monitors HTTP/HTTPS endpoints with configurable assertions',
                    'Tracks SSL certificate expiry and issuer metadata',
                    'Records every check as a queryable log with full context',
                    'Auto-manages incident lifecycle from DOWN to recovery',
                    'Publishes branded status pages with uptime history',
                    'Schedules maintenance windows to suppress noisy alerts',
                    'Routes alerts to Email, Slack, Discord, and webhooks',
                    'Collects APM metrics from registered applications',
                    'Provides fleet analytics with SLA, latency, and heatmaps',
                    'Exposes embeddable status badge endpoints',
                    'Supports multi-region probes via tagged workers',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-emerald-800">
                      <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={80} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  Out of scope (by design)
                </h3>
                <ul className="space-y-3">
                  {[
                    ['Real-user monitoring (RUM)','Browser-based user session tracking is a separate domain requiring JS SDK instrumentation.'],
                    ['Infrastructure agent monitoring','CPU, memory, and disk metrics from server agents (Datadog/New Relic territory).'],
                    ['Log aggregation pipeline','PingBEAT logs check results, not application log streams. Use Elastic or Loki for that.'],
                    ['Synthetic browser testing','Playwright/Selenium-driven tests are different from HTTP checks.'],
                    ['On-call scheduling','PagerDuty and Opsgenie handle escalation rotations. PingBEAT focuses on the signal.'],
                    ['Distributed tracing','Trace context propagation across microservices is outside the current scope.'],
                  ].map(([title, body]) => (
                    <li key={title} className="text-sm">
                      <p className="font-semibold text-slate-700">{title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{body}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Data model detail ── */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Data Model"
            title="Every entity and what it stores"
            subtitle="PingBEAT's schema is designed to make downtime evidence easy to query and reason about without complex joins or aggregation pipelines."
          />
          <div className="space-y-4">
            {[
              {
                model: 'Monitor',
                description: 'The central configuration entity. One row per monitored endpoint.',
                fields: 'name, url, http_method, expected_status, interval_seconds, timeout_seconds, is_active, email_alerts, headers (JSON), body, keyword, assert_keyword, assert_max_response_time_ms, notification_channel, webhook_url, tags, ssl_expiry, ssl_issuer, is_up, current_status, status_changed_at, last_checked',
              },
              {
                model: 'MonitorLog',
                description: 'Immutable check result record. Created on every probe execution.',
                fields: 'monitor (FK), is_up, status_code, response_time_ms, failure_reason, error_message, region, ssl_expiry, ssl_issuer, ssl_warning, ssl_days_remaining, checked_at',
              },
              {
                model: 'Incident',
                description: 'Downtime event record. Auto-opened and auto-resolved by the check task.',
                fields: 'monitor (FK), started_at, resolved_at, duration_seconds, error_message, is_active',
              },
              {
                model: 'StatusPage',
                description: 'Public or private status dashboard configuration.',
                fields: 'title, slug, is_public, monitors (M2M), owner (FK)',
              },
              {
                model: 'MaintenanceWindow',
                description: 'Scheduled suppression window for a specific monitor.',
                fields: 'monitor (FK), label, start_time, end_time',
              },
              {
                model: 'ApmApplication',
                description: 'Registered application for SDK-based performance instrumentation.',
                fields: 'name, environment, api_key, owner (FK), last_seen, metrics_count',
              },
            ].map((m, i) => (
              <Reveal key={m.model} delay={i * 50} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
                  <div>
                    <p className="font-mono text-sm font-bold text-emerald-700">{m.model}</p>
                    <p className="text-xs text-slate-500 mt-1">{m.description}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    <p className="font-mono text-xs text-slate-600 leading-relaxed">{m.fields}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-24 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              eyebrow="FAQ"
              title="Common questions about PingBEAT"
              subtitle="Answers to the questions teams ask when evaluating PingBEAT against other monitoring tools."
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {faq.map((item, i) => (
                <Reveal key={item.q} delay={i * 50} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-slate-950 mb-3">{item.q}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{item.a}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Operating values ── */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Operating Values"
            title="What we believe about good monitoring"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: 'Monitors should be cheap to create',
                body: 'A tool that makes it hard or expensive to add a new monitor creates blind spots. PingBEAT has no per-monitor limits. Add as many checks as your infrastructure warrants.',
              },
              {
                title: 'Evidence matters more than dashboards',
                body: 'Pretty dashboards without queryable underlying data are unreliable. Every check in PingBEAT creates a durable log record you can search, filter, and export.',
              },
              {
                title: 'Alerts should be precise',
                body: 'Noisy alerting trains teams to ignore alerts. Maintenance windows, sensible thresholds, and targeted channel routing keep PingBEAT\'s signal-to-noise ratio high.',
              },
              {
                title: 'Incidents deserve context',
                body: 'An alert that says "something is down" is less useful than one that includes the error message, status code, and how long it has been down. PingBEAT carries that context everywhere.',
              },
              {
                title: 'Your data should be yours',
                body: 'Self-hosting means your monitor targets, check history, and incident records live in your database under your control. No vendor can lock you out or sunset your plan.',
              },
              {
                title: 'Reliability is continuous work',
                body: 'SLA tracking, latency trends, and incident MTTR give teams the data to improve reliability over time — not just react to outages. PingBEAT treats measurement as an ongoing practice.',
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 60} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-950 mb-3">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full pulse-green"></div>
            <p className="text-sm text-slate-500">PingBEAT keeps service health visible and accountable.</p>
          </div>
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Start Monitoring'}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default AboutPage
