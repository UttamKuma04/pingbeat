import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

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
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }
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

function AboutPage() {
  const isAuthenticated = !!localStorage.getItem('access_token')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-emerald-500 selection:text-white">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-500 rounded-full pulse-green"></div>
              <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full opacity-30 blur-sm"></div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              PingBEAT
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link to="/" className="text-slate-600 hover:text-slate-900 transition-colors duration-200 text-sm font-medium">
              Home
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/10 rounded-lg"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600 mb-4">
              About PingBEAT
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950 leading-tight mb-6">
              Uptime monitoring for teams who want clarity without giving up control.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-3xl">
              PingBEAT is a self-hosted monitoring platform built to help developers and operators understand whether their services are available, responsive, and safe to depend on.
            </p>
          </Reveal>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12">
          <Reveal>
            <h2 className="text-2xl font-bold text-slate-950 mb-3">Why it exists</h2>
            <p className="text-slate-600 leading-relaxed">
              Incidents are stressful enough. PingBEAT keeps the monitoring workflow focused: define checks, watch trends, surface outages, and keep historical evidence close to the people who operate the system.
            </p>
          </Reveal>

          <div className="space-y-4">
            {[
              ['Self-hosted by default', 'Run it in your own environment, keep monitor targets and alert configuration under your control, and choose the infrastructure that fits your team.'],
              ['Built for practical signals', 'Status code checks, latency, keyword assertions, SSL expiry, maintenance windows, and incident history are presented where they help you act fastest.'],
              ['Clear operator workflow', 'Dashboards prioritize scanning, filtering, batch actions, monitor detail, and status pages over noisy decoration.'],
              ['Extensible alerting', 'Email, Slack, Discord, and webhook channels make it possible to route downtime signals into the places your team already watches.'],
            ].map(([title, body], index) => (
              <Reveal key={title} delay={index * 90} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 md:gap-8 md:items-start">
                  <h3 className="font-bold text-slate-950">{title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <Reveal>
              <h2 className="text-2xl font-bold text-slate-950 mb-8">How PingBEAT works</h2>
            </Reveal>
            <div className="space-y-4">
              {[
                ['1', 'Define monitors', 'Add URLs or API endpoints, expected responses, timeouts, tags, request method, headers, and assertions.'],
                ['2', 'Run workers', 'Celery workers execute checks on schedule and can identify their probe region for geographic context.'],
                ['3', 'Record evidence', 'Each check creates logs for uptime, response time, status code, SSL state, region, and failure details.'],
                ['4', 'Act on changes', 'Status changes open or resolve incidents, update dashboard state, and trigger configured alert channels.'],
              ].map(([step, title, body], index) => (
                <Reveal key={step} delay={index * 90} className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-[120px_240px_1fr] gap-3 md:gap-8 md:items-center">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step {step}</span>
                    <h3 className="text-lg font-bold text-slate-950">{title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Reveal className="lg:col-span-1">
            <h2 className="text-2xl font-bold text-slate-950 mb-3">Operating principles</h2>
            <p className="text-slate-600 leading-relaxed">
              PingBEAT is designed around simple habits that make incident response less mysterious.
            </p>
          </Reveal>
          <div className="lg:col-span-2 space-y-4">
            {[
              ['Fast', 'text-emerald-600', 'See current status and recent evidence without digging through unrelated screens.'],
              ['Traceable', 'text-cyan-600', 'Every outage view is backed by check logs, timestamps, and response context.'],
              ['Calm', 'text-amber-600', 'Maintenance windows, clear badges, and focused filters reduce false urgency.'],
            ].map(([title, color, body], index) => (
              <Reveal key={title} delay={index * 90} className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 md:gap-8 md:items-center">
                  <p className={`text-3xl font-bold ${color}`}>{title}</p>
                  <p className="text-sm text-slate-600">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">PingBEAT keeps service health visible and accountable.</p>
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
