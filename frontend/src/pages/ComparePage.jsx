import React from 'react'
import { Link, useParams } from 'react-router-dom'
import SeoHead from '../components/SeoHead'
import BrandLogo from '../components/BrandLogo'
import { COMPETITORS } from '../data/competitors'
import Reveal from '../components/Reveal'

/* ─── Feature row ─────────────────────────────────────────────────────────── */
function FeatureRow({ feature, pbValue, compValue, index }) {
  const renderVal = (val) => {
    if (val === true) return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
    if (val === false) return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
        </svg>
      </span>
    )
    return <span className="text-xs text-amber-600 font-semibold">{val}</span>
  }

  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
      <td className="px-5 py-3.5 text-sm text-slate-700 font-medium">{feature}</td>
      <td className="px-5 py-3.5 text-center bg-emerald-50/60">{renderVal(pbValue)}</td>
      <td className="px-5 py-3.5 text-center">{renderVal(compValue)}</td>
    </tr>
  )
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function ComparePage() {
  const { slug } = useParams()
  const isAuthenticated = !!localStorage.getItem('access_token')
  const comp = COMPETITORS[slug]

  if (!comp) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <BrandLogo to="/" className="justify-center mb-6" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Comparison not found</h1>
          <p className="text-slate-600 text-sm mb-6">
            We don't have a PingBEAT comparison for "{slug}" yet.
          </p>
          <Link to="/compare" className="inline-flex px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">
            Browse all comparisons
          </Link>
        </div>
      </div>
    )
  }

  const pageTitle = `PingBEAT vs ${comp.name} (${new Date().getFullYear()}) — Which Is Better?`
  const pageDesc = `Compare PingBEAT and ${comp.name} side-by-side. Features, pricing, self-hosting, and use cases explained so you can choose the right uptime monitoring tool.`
  const canonical = `https://pingbeat.in/compare/pingbeat-vs-${slug}`

  const comparisonSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    description: pageDesc,
    url: canonical,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://pingbeat.in' },
        { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://pingbeat.in/compare' },
        { '@type': 'ListItem', position: 3, name: `PingBEAT vs ${comp.name}`, item: canonical },
      ],
    },
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <SeoHead
        title={pageTitle}
        description={pageDesc}
        canonical={canonical}
        keywords={comp.keywords}
        jsonLd={comparisonSchema}
      />

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm" role="navigation" aria-label="Main Navigation">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <BrandLogo to="/" id="compare-nav-logo" />
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Home</Link>
            <Link to="/about" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">About</Link>
            <Link to="/compare" className="text-emerald-700 font-semibold">Compare</Link>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard" id="compare-nav-dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sign In</Link>
                <Link to="/register" id="compare-nav-register" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ── Breadcrumb ── */}
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-0">
          <nav className="text-xs text-slate-500 flex items-center gap-1.5" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/compare" className="hover:text-emerald-600 transition-colors">Compare</Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">PingBEAT vs {comp.name}</span>
          </nav>
        </div>

        {/* ── Hero ── */}
        <header className="bg-white border-b border-slate-200 mt-4">
          <div className="max-w-6xl mx-auto px-6 py-14 sm:py-20">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-6 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Comparison Guide {new Date().getFullYear()}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight mb-5">
                PingBEAT vs {comp.name}
              </h1>
              <p className="text-lg text-slate-600 max-w-3xl mb-6 leading-relaxed">
                {comp.description} Here's how it compares to PingBEAT for uptime monitoring, APM, and infrastructure observability.
              </p>
              {/* Quick badges */}
              <div className="flex flex-wrap gap-3 text-sm mb-8">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                  PingBEAT: Free · Self-Hosted · MIT
                </span>
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-semibold ${comp.selfHosted ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                  {comp.name}: {comp.selfHosted ? 'Self-Hostable' : 'SaaS Only'} · {comp.openSource ? 'Open Source' : 'Proprietary'}
                </span>
              </div>
            </Reveal>

            {/* TL;DR Box */}
            <Reveal delay={100}>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2">TL;DR</p>
                <p className="text-sm leading-relaxed text-amber-900">{comp.verdict}</p>
              </div>
            </Reveal>
          </div>
        </header>

        {/* ── Pricing comparison ── */}
        <section className="py-16 max-w-6xl mx-auto px-6" aria-labelledby="pricing-section">
          <Reveal>
            <h2 id="pricing-section" className="text-2xl font-extrabold text-slate-950 mb-8">Pricing</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Reveal className="rounded-xl border-2 border-emerald-400 bg-white p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white">Recommended</div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="font-extrabold text-slate-950 text-lg">PingBEAT</p>
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 mb-1">$0 / month</p>
              <p className="text-sm text-slate-500 mb-4">{comp.pbPricing}</p>
              <ul className="space-y-2 text-sm text-slate-700">
                {['No monitor count limits', 'No user seat fees', 'No data egress charges', 'MIT licensed — fork and modify freely'].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={80} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                <p className="font-extrabold text-slate-950 text-lg">{comp.name}</p>
              </div>
              <p className="text-3xl font-extrabold text-slate-700 mb-1">{comp.pricing.split('·')[0].trim()}</p>
              <p className="text-sm text-slate-500 mb-4">{comp.pricing}</p>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  comp.selfHosted ? 'Self-hostable version available' : 'Cloud-hosted SaaS only',
                  comp.openSource ? 'Open-source codebase' : 'Proprietary / closed-source',
                  'Pricing may scale with usage',
                  `Category: ${comp.category}`,
                ].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── Feature comparison table ── */}
        <section className="py-16 bg-white border-y border-slate-200" aria-labelledby="features-section">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <h2 id="features-section" className="text-2xl font-extrabold text-slate-950 mb-8">Feature Comparison</h2>
            </Reveal>
            <Reveal>
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-5 py-4 text-slate-500 font-semibold text-xs uppercase tracking-wider">Feature</th>
                      <th className="px-5 py-4 text-center text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50">PingBEAT</th>
                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">{comp.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comp.features.map(([feature, pbVal, compVal], i) => (
                      <FeatureRow key={feature} feature={feature} pbValue={pbVal} compValue={compVal} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-3">Based on publicly documented features. Feature availability may vary by plan.</p>
            </Reveal>
          </div>
        </section>

        {/* ── Why each wins ── */}
        <section className="py-16 max-w-6xl mx-auto px-6">
          <Reveal>
            <h2 className="text-2xl font-extrabold text-slate-950 mb-8">When to choose each</h2>
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Reveal className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <h3 className="font-extrabold text-emerald-800 text-lg mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Choose PingBEAT when you need…
              </h3>
              <ul className="space-y-3">
                {comp.winReasons.map(reason => (
                  <li key={reason} className="flex items-start gap-2.5 text-sm text-emerald-900">
                    <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    {reason}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={80} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-extrabold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Choose {comp.name} when you need…
              </h3>
              <ul className="space-y-3">
                {comp.compWins.map(reason => (
                  <li key={reason} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    {reason}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── Self-hosting section ── */}
        <section className="py-16 bg-slate-50 border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <h2 className="text-2xl font-extrabold text-slate-950 mb-3">Self-Hosting & Data Control</h2>
              <p className="text-slate-600 text-lg mb-8 max-w-2xl">
                One of the biggest differences between PingBEAT and most competitors is data ownership.
              </p>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  title: 'Your data, your server',
                  body: 'Every check log, incident record, and APM metric stays inside your own PostgreSQL database. No third-party cloud receives your monitoring data.',
                  icon: '🔒',
                },
                {
                  title: 'One-command deployment',
                  body: 'Run docker compose up --build and PingBEAT starts the entire stack — Django, React, Celery, Redis, and PostgreSQL — in one step.',
                  icon: '🐳',
                },
                {
                  title: 'No vendor lock-in',
                  body: 'MIT licensed open-source. Export your data anytime, fork the code, or contribute features back to the community.',
                  icon: '🔓',
                },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 70} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-3xl mb-3">{item.icon}</p>
                  <h3 className="font-bold text-slate-950 mb-2">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Verdict + CTA ── */}
        <section className="py-20 max-w-6xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-2xl font-extrabold text-slate-950 mb-4">Verdict</h2>
            <p className="text-slate-600 text-lg max-w-3xl mx-auto mb-10 leading-relaxed">{comp.verdict}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                id="compare-cta-register"
                className="inline-block px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 transform hover:scale-[1.02]"
              >
                Try PingBEAT Free — Self-Host in 5 Minutes
              </Link>
              <a
                href="https://github.com/UttamKuma04/pingbeat"
                target="_blank"
                rel="noopener noreferrer"
                id="compare-cta-github"
                className="inline-block px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold rounded-lg transition-all duration-200"
              >
                ⭐ Star on GitHub
              </a>
            </div>
          </Reveal>
        </section>

        {/* ── Other comparisons ── */}
        <section className="py-16 bg-white border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <h2 className="text-lg font-bold text-slate-950 mb-6">More comparisons</h2>
            </Reveal>
            <div className="flex flex-wrap gap-3">
              {Object.entries(COMPETITORS)
                .filter(([s]) => s !== slug)
                .slice(0, 8)
                .map(([s, c]) => (
                  <Link
                    key={s}
                    to={`/compare/pingbeat-vs-${s}`}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                  >
                    PingBEAT vs {c.name}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} PingBEAT — Open-source uptime monitoring & APM. <Link to="/" className="text-emerald-600 hover:underline">Home</Link> · <Link to="/about" className="text-emerald-600 hover:underline">About</Link> · <Link to="/compare" className="text-emerald-600 hover:underline">Compare</Link></p>
      </footer>
    </div>
  )
}
