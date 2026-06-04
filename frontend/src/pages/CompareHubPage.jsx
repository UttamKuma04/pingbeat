import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SeoHead from '../components/SeoHead'
import BrandLogo from '../components/BrandLogo'

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(e.target) } },
      { threshold: 0.08 }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

const COMPARISONS = [
  {
    slug: 'uptimerobot',
    name: 'UptimeRobot',
    category: 'Uptime Monitoring SaaS',
    summary: 'PingBEAT offers 30-second checks, data ownership, and APM vs UptimeRobot\'s 5-min free tier.',
    highlight: 'Self-hosted · No monitor limits · APM included',
    color: 'emerald',
  },
  {
    slug: 'pingdom',
    name: 'Pingdom',
    category: 'Enterprise Uptime SaaS',
    summary: 'PingBEAT is free to self-host vs Pingdom\'s per-monitor subscription pricing starting at $10/mo.',
    highlight: 'Free vs $10+/mo · Open source · Data control',
    color: 'cyan',
  },
  {
    slug: 'better-stack',
    name: 'Better Stack',
    category: 'Uptime & Incident Management SaaS',
    summary: 'PingBEAT is free with self-hosting vs Better Stack\'s $20+/mo. Includes built-in APM.',
    highlight: 'Free vs $20+/mo · APM included · Open source',
    color: 'emerald',
  },
  {
    slug: 'statuscake',
    name: 'StatusCake',
    category: 'Website Monitoring SaaS',
    summary: 'PingBEAT gives unlimited monitors with self-hosting vs StatusCake\'s 10-monitor free tier.',
    highlight: 'Unlimited monitors · 30-second checks',
    color: 'cyan',
  },
  {
    slug: 'site24x7',
    name: 'Site24x7',
    category: 'Enterprise Monitoring SaaS',
    summary: 'PingBEAT is free to self-host vs Site24x7\'s $9+/mo enterprise subscription pricing.',
    highlight: 'Free forever · No seat pricing · Open source',
    color: 'emerald',
  },
  {
    slug: 'checkly',
    name: 'Checkly',
    category: 'Synthetic Monitoring SaaS',
    summary: 'PingBEAT handles HTTP uptime for free vs Checkly\'s usage-based billing for API checks.',
    highlight: 'Free self-hosted · No check-run limits',
    color: 'amber',
  },
  {
    slug: 'freshping',
    name: 'Freshping',
    category: 'Uptime Monitoring SaaS',
    summary: 'PingBEAT brings data ownership, 30-second intervals, and APM vs Freshping\'s SaaS model.',
    highlight: '30-second checks · Data control · APM',
    color: 'cyan',
  },
  {
    slug: 'hyperping',
    name: 'Hyperping',
    category: 'Uptime Monitoring SaaS',
    summary: 'PingBEAT is free vs Hyperping\'s $12+/mo and adds APM, full log explorer, and CSV export.',
    highlight: 'Free vs $12+/mo · APM · Log explorer',
    color: 'emerald',
  },
  {
    slug: 'signoz',
    name: 'SigNoz',
    category: 'Open-Source APM & Observability',
    summary: 'PingBEAT adds HTTP uptime monitoring and status pages that SigNoz doesn\'t provide.',
    highlight: 'Uptime + APM · Status pages · Simple setup',
    color: 'purple',
  },
  {
    slug: 'sentry',
    name: 'Sentry',
    category: 'Error Tracking & APM',
    summary: 'PingBEAT covers active HTTP uptime polling and SSL tracking that Sentry doesn\'t focus on.',
    highlight: 'Uptime monitoring · SSL tracking · Status pages',
    color: 'red',
  },
  {
    slug: 'netdata',
    name: 'Netdata',
    category: 'Open-Source Infrastructure Monitoring',
    summary: 'PingBEAT covers HTTP uptime and status pages; Netdata covers server resource metrics.',
    highlight: 'HTTP uptime · Public status pages · Incidents',
    color: 'blue',
  },
  {
    slug: 'datadog',
    name: 'Datadog',
    category: 'Enterprise Observability Platform',
    summary: 'PingBEAT is the free, self-hosted, open-source alternative for HTTP monitoring and APM.',
    highlight: 'Free vs $1000s/mo · Open source · Self-hosted',
    color: 'amber',
  },
]

const colorMap = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    badge: 'bg-cyan-100 text-cyan-700',       dot: 'bg-cyan-500' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  badge: 'bg-purple-100 text-purple-700',   dot: 'bg-purple-500' },
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     badge: 'bg-red-100 text-red-700',         dot: 'bg-red-400' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
}

const hubSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'PingBEAT vs Competitors — Uptime Monitoring Comparisons',
  description: 'Compare PingBEAT with UptimeRobot, Pingdom, Better Stack, Datadog, SigNoz, Sentry, Netdata, and more. Find the best uptime monitoring and APM tool for your needs.',
  url: 'https://pingbeat.in/compare',
}

export default function CompareHubPage() {
  const isAuthenticated = !!localStorage.getItem('access_token')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <SeoHead
        title="PingBEAT vs Competitors — Uptime Monitoring Comparisons"
        description="Compare PingBEAT with UptimeRobot, Pingdom, Better Stack, Datadog, SigNoz, Sentry, Checkly, and more. Side-by-side feature, pricing, and self-hosting comparisons."
        canonical="https://pingbeat.in/compare"
        keywords="uptime monitoring comparison, PingBEAT vs UptimeRobot, PingBEAT vs Pingdom, PingBEAT vs Datadog, PingBEAT vs Better Stack, PingBEAT alternatives, uptime monitoring tools comparison, best uptime monitoring tool, open source uptime monitoring alternative"
        jsonLd={hubSchema}
      />

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm" role="navigation" aria-label="Main Navigation">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <BrandLogo to="/" id="compare-hub-nav-logo" />
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Home</Link>
            <Link to="/about" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">About</Link>
            <Link to="/compare" className="text-emerald-700 font-semibold">Compare</Link>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard" id="compare-hub-dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sign In</Link>
                <Link to="/register" id="compare-hub-register" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ── Hero ── */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 py-14 sm:py-20">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-6 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {COMPARISONS.length} comparisons available
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight mb-5">
                PingBEAT vs Every<br className="hidden sm:block" />{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                  Monitoring Tool
                </span>
              </h1>
              <p className="text-lg text-slate-600 max-w-3xl mb-6 leading-relaxed">
                Detailed side-by-side comparisons of PingBEAT against the most popular uptime monitoring,
                APM, and observability tools. Features, pricing, self-hosting, and use cases — honestly compared.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                {['Free self-hosted', 'MIT open-source', '30-second checks', 'No monitor limits', 'APM included'].map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-xs">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    {tag}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </header>

        {/* ── Comparison cards grid ── */}
        <section className="py-16 max-w-6xl mx-auto px-6">
          <Reveal className="mb-8">
            <h2 className="text-xl font-extrabold text-slate-950">All Comparisons</h2>
            <p className="text-slate-500 text-sm mt-1">Click any card to see the full feature-by-feature breakdown.</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COMPARISONS.map((comp, i) => {
              const c = colorMap[comp.color] || colorMap.emerald
              return (
                <Reveal key={comp.slug} delay={i * 40}>
                  <Link
                    to={`/compare/pingbeat-vs-${comp.slug}`}
                    id={`compare-card-${comp.slug}`}
                    className={`block rounded-xl border ${c.border} ${c.bg} p-5 shadow-sm hover:shadow-md transition-all duration-200 group`}
                    aria-label={`Compare PingBEAT vs ${comp.name}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{comp.category}</span>
                      </div>
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h3 className="font-extrabold text-slate-950 text-lg mb-2 group-hover:text-emerald-700 transition-colors">
                      PingBEAT vs {comp.name}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{comp.summary}</p>
                    <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
                      {comp.highlight}
                    </span>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* ── Why PingBEAT wins ── */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="mb-10 text-center">
              <h2 className="text-2xl font-extrabold text-slate-950 mb-3">What makes PingBEAT different</h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">Most monitoring tools force you to choose between features and cost. PingBEAT is built on a different premise.</p>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { emoji: '🔒', title: 'Your data, always', body: 'Every check log, incident, and metric stays in your own PostgreSQL database. No third-party cloud ever receives your monitoring data.' },
                { emoji: '⚡', title: '30-second checks', body: 'Most free SaaS tools poll every 5 minutes. PingBEAT checks every 30 seconds — catching outages 10× faster.' },
                { emoji: '📊', title: 'APM built-in', body: 'Endpoint latency (P95, P99), error rates, and traffic volume — no separate APM subscription needed.' },
                { emoji: '🐳', title: 'One-command setup', body: 'docker compose up --build starts the entire stack. No complex agent configuration or multi-step onboarding.' },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 60} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <p className="text-3xl mb-3">{item.emoji}</p>
                  <h3 className="font-bold text-slate-950 mb-2 text-sm">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-600">{item.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 max-w-6xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-2xl font-extrabold text-slate-950 mb-4">Ready to try PingBEAT?</h2>
            <p className="text-slate-600 text-lg mb-8 max-w-xl mx-auto">Self-host in 5 minutes. Free forever. No credit card required.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                id="compare-hub-cta-register"
                className="inline-block px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 transform hover:scale-[1.02]"
              >
                Get Started — It's Free
              </Link>
              <a
                href="https://github.com/UttamKuma04/pingbeat"
                target="_blank"
                rel="noopener noreferrer"
                id="compare-hub-cta-github"
                className="inline-block px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold rounded-lg transition-all duration-200"
              >
                ⭐ Star on GitHub
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} PingBEAT — Open-source self-hosted uptime monitoring & APM.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <Link to="/about" className="hover:text-emerald-600 transition-colors">About</Link>
          <Link to="/compare" className="hover:text-emerald-600 transition-colors">Compare</Link>
          <Link to="/apm/doc" className="hover:text-emerald-600 transition-colors">APM Docs</Link>
        </div>
      </footer>
    </div>
  )
}
