import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import SeoHead from '../components/SeoHead'
import BrandLogo from '../components/BrandLogo'

/* ─── Competitor data config ─────────────────────────────────────────────── */
const COMPETITORS = {
  uptimerobot: {
    name: 'UptimeRobot',
    category: 'Uptime Monitoring SaaS',
    tagline: 'Popular free-tier uptime monitoring SaaS',
    pricing: 'Free (50 monitors, 5-min intervals) · Paid from $7/mo',
    selfHosted: false,
    openSource: false,
    checkInterval: '5 minutes (free), 1 minute (paid)',
    description:
      'UptimeRobot is a cloud-hosted uptime monitoring service with a generous free tier. It offers HTTP, keyword, ping, and port monitoring with email and push alerts.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'uptimerobot alternative, uptimerobot vs pingbeat, self-hosted uptimerobot alternative, open source uptimerobot, uptimerobot free alternative',
    winReasons: [
      'No monitor count limits — add as many monitors as your server handles',
      '30-second check intervals vs UptimeRobot\'s 5 minutes on free plan',
      'Full data ownership — logs never leave your server',
      'Built-in APM for endpoint-level latency, P95/P99, error rates',
      'Response keyword + status code + max latency assertions per monitor',
      'Maintenance windows to suppress noisy alerts during deployments',
      'Full log explorer with filtering, sorting, and CSV export',
    ],
    compWins: [
      'Hosted SaaS — no server to manage or maintain',
      'Multi-region probes from cloud infrastructure out of the box',
      'Phone call alerts on paid plans',
      'Larger established user community and integrations ecosystem',
    ],
    features: [
      ['HTTP/HTTPS Monitoring', true, true],
      ['30-second check intervals', true, false],
      ['SSL Certificate Tracking', true, false],
      ['Response Assertions (keyword, latency)', true, false],
      ['Maintenance Windows', true, false],
      ['Incident History & Logs', true, true],
      ['Public Status Pages', true, true],
      ['APM / Performance Monitoring', true, false],
      ['Self-Hosted (full data control)', true, false],
      ['Open Source (MIT)', true, false],
      ['Email + Slack + Discord + Webhook', true, 'Email + Slack (paid)'],
      ['No per-monitor pricing', true, false],
      ['Log Explorer & CSV Export', true, false],
    ],
    verdict:
      'If you want zero infrastructure responsibility, UptimeRobot\'s free tier is a reasonable starting point. If you need 30-second checks, full data ownership, APM metrics, or more than 50 monitors without paying per-monitor fees — PingBEAT is the stronger choice.',
  },

  pingdom: {
    name: 'Pingdom',
    category: 'Enterprise Uptime Monitoring SaaS',
    tagline: 'Mature enterprise uptime and real-user monitoring SaaS',
    pricing: 'From $10/mo (1 uptime monitor) · Scales steeply with monitors',
    selfHosted: false,
    openSource: false,
    checkInterval: '1 minute',
    description:
      'Pingdom (by SolarWinds) is a well-established enterprise-grade monitoring platform offering synthetic uptime checks, real-user monitoring (RUM), and page speed testing.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'pingdom alternative, pingdom vs pingbeat, free pingdom alternative, self-hosted pingdom, open source pingdom alternative, cheap pingdom alternative',
    winReasons: [
      'Zero subscription cost — self-host on any VPS or home server',
      'No per-monitor pricing that scales with your monitor count',
      'Full data ownership — Pingdom stores your data in their cloud',
      'Built-in APM alongside uptime monitoring in one platform',
      'Maintenance windows and response assertion support',
      'Open-source MIT — inspect, modify, and extend the code freely',
    ],
    compWins: [
      'Real-user monitoring (RUM) from actual browser sessions',
      'Page speed and transaction monitoring',
      'Global probe network from 100+ locations',
      'Enterprise SLA and compliance features',
      'Long-established brand with enterprise support contracts',
    ],
    features: [
      ['HTTP/HTTPS Monitoring', true, true],
      ['SSL Certificate Tracking', true, true],
      ['Response Assertions', true, 'Limited'],
      ['Maintenance Windows', true, false],
      ['Incident History & Logs', true, true],
      ['Public Status Pages', true, true],
      ['APM / Performance Monitoring', true, 'Separate RUM product'],
      ['Self-Hosted', true, false],
      ['Open Source', true, false],
      ['No per-monitor pricing', true, false],
      ['Email + Slack + Discord + Webhook', true, 'Email + Slack (paid)'],
      ['Log Explorer & CSV Export', true, false],
    ],
    verdict:
      'Pingdom is a mature enterprise product. If you need real-user monitoring, browser-based synthetic transactions, or a global probe network — Pingdom leads. If you need cost-effective HTTP monitoring, data control, APM, and no vendor lock-in — PingBEAT wins.',
  },

  'better-stack': {
    name: 'Better Stack',
    category: 'Uptime & Incident Management SaaS',
    tagline: 'Modern uptime monitoring and incident management SaaS',
    pricing: 'Free (10 monitors) · From $20/mo',
    selfHosted: false,
    openSource: false,
    checkInterval: '3 minutes (free), 30 seconds (paid)',
    description:
      'Better Stack (formerly Better Uptime) is a modern SaaS combining uptime monitoring, on-call scheduling, and incident log management with a polished UI.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'better stack alternative, better uptime alternative, better stack vs pingbeat, self-hosted better stack, free better stack alternative',
    winReasons: [
      'Completely free with self-hosting — Better Stack charges from $20/mo',
      'Full data sovereignty — no data ever reaches a third-party cloud',
      'Built-in APM endpoint metrics alongside uptime monitoring',
      'Open-source MIT — no vendor can change pricing or sunset your plan',
      '30-second check intervals without paying a premium tier',
      'No on-call seat pricing — unlimited team members on your own infra',
    ],
    compWins: [
      'Hosted SaaS with on-call scheduling and escalation policies',
      'Beautiful incident timeline and postmortem tooling',
      'SMS and phone call alerts on paid plans',
      'AI-driven incident grouping features',
      'Third-party integrations with PagerDuty, Jira, Linear',
    ],
    features: [
      ['HTTP/HTTPS Monitoring', true, true],
      ['30-second check intervals', true, 'Paid only'],
      ['SSL Certificate Tracking', true, true],
      ['Maintenance Windows', true, true],
      ['Incident History & Logs', true, true],
      ['Public Status Pages', true, true],
      ['APM / Performance Monitoring', true, false],
      ['Self-Hosted', true, false],
      ['Open Source', true, false],
      ['No per-monitor pricing', true, false],
      ['Email + Slack + Discord + Webhook', true, true],
      ['Log Explorer & CSV Export', true, false],
      ['On-call scheduling', false, true],
    ],
    verdict:
      'Better Stack wins on polished incident management and on-call routing. PingBEAT wins on cost (free vs $20+/mo), data ownership, open-source flexibility, and integrated APM.',
  },

  statuscake: {
    name: 'StatusCake',
    category: 'Website Monitoring SaaS',
    tagline: 'Multi-check-type website monitoring SaaS',
    pricing: 'Free (10 uptime, 1 page speed) · From £20/mo',
    selfHosted: false,
    openSource: false,
    checkInterval: '5 minutes (free), 1 minute (paid)',
    description:
      'StatusCake offers uptime, page speed, SSL, domain expiry, and virus monitoring in a SaaS package with a free tier and competitive paid plans.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'statuscake alternative, statuscake vs pingbeat, free statuscake alternative, self-hosted statuscake, open source statuscake',
    winReasons: [
      'Unlimited monitors with self-hosting — StatusCake limits free to 10',
      'Full data ownership — your check logs stay in your own database',
      'Built-in APM for application-level performance metrics',
      '30-second check intervals vs StatusCake\'s 5-minute free tier',
      'Open-source and self-hosted — no vendor dependency',
      'Response assertions (keyword, status code, max latency) per monitor',
    ],
    compWins: [
      'Page speed, domain expiry, and virus monitoring check types',
      'Hosted SaaS — no infrastructure to manage',
      'Global probe network with many monitoring locations',
      'Longer track record and established community',
    ],
    features: [
      ['HTTP/HTTPS Monitoring', true, true],
      ['30-second check intervals', true, false],
      ['SSL Certificate Tracking', true, true],
      ['Response Assertions', true, false],
      ['Maintenance Windows', true, true],
      ['Public Status Pages', true, true],
      ['APM / Performance Monitoring', true, false],
      ['Self-Hosted', true, false],
      ['Open Source', true, false],
      ['No per-monitor pricing', true, false],
      ['Email + Slack + Discord + Webhook', true, 'Email + Slack (paid)'],
    ],
    verdict:
      'StatusCake adds useful check types like page speed and virus scanning. PingBEAT wins on cost, check frequency, data control, and APM features.',
  },

  site24x7: {
    name: 'Site24x7',
    category: 'Enterprise Monitoring SaaS',
    tagline: 'All-in-one enterprise cloud monitoring SaaS by Zoho',
    pricing: 'From $9/mo · Scales by monitor count and user seats',
    selfHosted: false,
    openSource: false,
    checkInterval: '1 minute',
    description:
      'Site24x7 is an enterprise monitoring platform by Zoho covering website, server, cloud, application, and network monitoring in one SaaS suite.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'site24x7 alternative, site24x7 vs pingbeat, free site24x7 alternative, self-hosted site24x7, cheap site24x7 alternative, open source site24x7',
    winReasons: [
      'Zero cost with self-hosting vs Site24x7\'s $9+/mo subscriptions',
      'No seat-based pricing — deploy for your whole team',
      'Full data sovereignty — no Zoho cloud dependency',
      'Open-source MIT under your own control',
      'Lightweight focused tooling — no vendor bloat or upsells',
    ],
    compWins: [
      'Server agent, cloud, and network monitoring in one suite',
      'AI-powered anomaly detection and forecasting',
      'Zoho ecosystem integration (CRM, help desk, etc.)',
      'Mobile app and on-call scheduling',
      'Compliance reporting for enterprise teams',
    ],
    features: [
      ['HTTP/HTTPS Monitoring', true, true],
      ['SSL Certificate Tracking', true, true],
      ['Maintenance Windows', true, true],
      ['Public Status Pages', true, true],
      ['APM / Performance Monitoring', true, true],
      ['Self-Hosted', true, false],
      ['Open Source', true, false],
      ['No per-monitor pricing', true, false],
      ['Email + Slack + Discord + Webhook', true, true],
      ['Log Explorer & CSV Export', true, 'Limited'],
    ],
    verdict:
      'Site24x7 is a broad enterprise suite with many check types and integrations. PingBEAT wins for teams who want focused HTTP uptime + APM monitoring with zero subscription cost and full data control.',
  },

  checkly: {
    name: 'Checkly',
    category: 'Synthetic Monitoring SaaS',
    tagline: 'API and browser-based synthetic monitoring for developers',
    pricing: 'Free (10k check runs/mo) · From $20/mo',
    selfHosted: false,
    openSource: false,
    checkInterval: 'Configurable (cron-based)',
    description:
      'Checkly is a developer-focused monitoring platform that runs Playwright browser checks and API checks, integrating with CI/CD pipelines for testing-in-production workflows.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'checkly alternative, checkly vs pingbeat, free checkly alternative, self-hosted checkly, open source checkly alternative',
    winReasons: [
      'Free self-hosting with no check-run limits',
      'Simpler setup for HTTP uptime monitoring without scripting',
      'Full data ownership — no third-party cloud',
      'Built-in APM alongside uptime in one platform',
      'SSL monitoring, incident history, maintenance windows included',
    ],
    compWins: [
      'Playwright browser-based synthetic transaction monitoring',
      'CI/CD pipeline integration for deploy-time monitoring',
      'JavaScript-based check scripting for complex workflows',
      'Multi-step API workflow testing',
    ],
    features: [
      ['HTTP/HTTPS Monitoring', true, true],
      ['SSL Certificate Tracking', true, false],
      ['Response Assertions', true, true],
      ['Maintenance Windows', true, 'Via scheduling'],
      ['Public Status Pages', true, true],
      ['APM / Performance Monitoring', true, false],
      ['Self-Hosted', true, false],
      ['Open Source', true, false],
      ['Browser-based synthetic testing', false, true],
      ['CI/CD integration', false, true],
      ['No check-run limits', true, false],
    ],
    verdict:
      'Checkly excels at browser-based synthetic testing and CI/CD integration. PingBEAT wins for simple HTTP uptime monitoring, APM, data ownership, and zero subscription cost.',
  },

  freshping: {
    name: 'Freshping',
    category: 'Uptime Monitoring SaaS',
    tagline: 'Free tier uptime monitoring SaaS by Freshworks',
    pricing: 'Free (50 checks, 1-min intervals) · Paid plans available',
    selfHosted: false,
    openSource: false,
    checkInterval: '1 minute',
    description:
      'Freshping is a free uptime monitoring tool by Freshworks offering HTTP, TCP, and DNS checks with email alerts, status pages, and Freshdesk integration.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'freshping alternative, freshping vs pingbeat, self-hosted freshping alternative, open source freshping, freshping competitors',
    winReasons: [
      'Full data ownership — no Freshworks cloud dependency',
      '30-second check intervals vs Freshping\'s 1-minute minimum',
      'Built-in APM for endpoint-level performance data',
      'Response assertions beyond basic status code checks',
      'Maintenance windows for planned downtime suppression',
      'Open-source MIT — community-driven development',
    ],
    compWins: [
      'Hosted SaaS — zero infrastructure to manage',
      'Native Freshdesk / Freshservice integration',
      'Multi-location probes from Freshworks network',
      'DNS and TCP check types beyond HTTP',
    ],
    features: [
      ['HTTP/HTTPS Monitoring', true, true],
      ['30-second check intervals', true, false],
      ['SSL Certificate Tracking', true, false],
      ['Response Assertions', true, false],
      ['Maintenance Windows', true, false],
      ['Public Status Pages', true, true],
      ['APM / Performance Monitoring', true, false],
      ['Self-Hosted', true, false],
      ['Open Source', true, false],
      ['Email + Slack + Discord + Webhook', true, 'Email + Slack'],
    ],
    verdict:
      'Freshping is a solid free tier option for basic uptime checks. PingBEAT wins when you need data sovereignty, 30-second intervals, APM, and full monitoring control.',
  },

  hyperping: {
    name: 'Hyperping',
    category: 'Uptime Monitoring SaaS',
    tagline: 'Modern developer-focused uptime monitoring SaaS',
    pricing: 'From $12/mo',
    selfHosted: false,
    openSource: false,
    checkInterval: '30 seconds',
    description:
      'Hyperping is a modern uptime monitoring SaaS with a clean developer-focused interface, 30-second checks, status pages, and incident management.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'hyperping alternative, hyperping vs pingbeat, free hyperping alternative, self-hosted hyperping, open source hyperping alternative',
    winReasons: [
      'Completely free with self-hosting vs Hyperping\'s $12+/mo',
      'Full data ownership — your logs stay in your own database',
      'Open-source MIT — no vendor lock-in or pricing changes',
      'Built-in APM for application performance metrics',
      'Log explorer with filtering and CSV export',
    ],
    compWins: [
      'Hosted SaaS — no infrastructure to manage',
      'Clean polished modern UI',
      'Multi-region probe network out of the box',
      'Team collaboration features',
    ],
    features: [
      ['HTTP/HTTPS Monitoring', true, true],
      ['30-second check intervals', true, true],
      ['SSL Certificate Tracking', true, true],
      ['Response Assertions', true, 'Limited'],
      ['Maintenance Windows', true, true],
      ['Public Status Pages', true, true],
      ['APM / Performance Monitoring', true, false],
      ['Self-Hosted', true, false],
      ['Open Source', true, false],
      ['No subscription cost', true, false],
    ],
    verdict:
      'Hyperping offers a similar feature set to PingBEAT as a SaaS. PingBEAT wins on cost (free vs $12+/mo), data ownership, APM features, and open-source flexibility.',
  },

  signoz: {
    name: 'SigNoz',
    category: 'Open-Source APM & Observability',
    tagline: 'Open-source full-stack APM and distributed tracing platform',
    pricing: 'Free (self-hosted) · Cloud from $199/mo',
    selfHosted: true,
    openSource: true,
    checkInterval: 'N/A (agent-based)',
    description:
      'SigNoz is an open-source observability platform providing traces, metrics, and logs in one dashboard using OpenTelemetry. It is a popular Datadog/New Relic alternative.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'signoz alternative, signoz vs pingbeat, pingbeat vs signoz, open source monitoring alternative to signoz, signoz uptime monitoring',
    winReasons: [
      'Built-in HTTP uptime monitoring with 30-second checks',
      'SSL certificate monitoring with expiry tracking',
      'Public status pages for communicating outages to customers',
      'Incident history auto-managed from UP/DOWN state transitions',
      'Lighter infrastructure requirements — runs on a $5/mo VPS',
      'Maintenance windows to suppress alerts during deployments',
      'Simpler setup — docker compose up vs SigNoz\'s complex stack',
    ],
    compWins: [
      'Distributed tracing with full OpenTelemetry support',
      'Logs, metrics, and traces in one unified platform',
      'Flame graphs and detailed trace waterfall views',
      'Much deeper APM with span-level visibility',
      'Active open-source community and CNCF ecosystem integration',
    ],
    features: [
      ['HTTP/HTTPS Uptime Monitoring', true, false],
      ['SSL Certificate Tracking', true, false],
      ['Maintenance Windows', true, false],
      ['Public Status Pages', true, false],
      ['APM / Endpoint Metrics', true, true],
      ['Distributed Tracing', false, true],
      ['Log Aggregation Pipeline', false, true],
      ['Self-Hosted', true, true],
      ['Open Source', true, true],
      ['Simple Docker Setup', true, false],
      ['Email + Slack + Discord + Webhook Alerts', true, 'Email + Slack'],
    ],
    verdict:
      'SigNoz wins for deep APM with traces, logs, and metrics. PingBEAT wins for HTTP uptime monitoring, SSL tracking, status pages, and simple self-hosted deployment. They solve different problems and can complement each other.',
  },

  sentry: {
    name: 'Sentry',
    category: 'Error Tracking & Performance Monitoring SaaS',
    tagline: 'Error tracking and application performance monitoring SaaS',
    pricing: 'Free (5k errors/mo) · From $26/mo',
    selfHosted: false,
    openSource: true,
    checkInterval: 'N/A (error-driven)',
    description:
      'Sentry is an application error tracking and performance monitoring platform that captures runtime exceptions, stack traces, and performance spans from frontend and backend applications.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'sentry alternative, sentry vs pingbeat, pingbeat vs sentry, open source sentry alternative, uptime monitoring vs sentry, sentry uptime monitoring',
    winReasons: [
      'Active HTTP uptime monitoring — Sentry is error-driven, not polling-based',
      'SSL certificate expiry monitoring and alerts',
      'Public status pages for customer-facing outage communication',
      'Maintenance windows to suppress alerts during planned downtime',
      '30-second check intervals for fast outage detection',
      'No error-volume-based pricing — flat self-hosted model',
    ],
    compWins: [
      'Runtime exception capture with stack traces from application code',
      'Source map support for minified JavaScript debugging',
      'Release tracking and regression detection',
      'Frontend performance monitoring and Web Vitals',
      'Large ecosystem of SDK integrations for 100+ frameworks',
    ],
    features: [
      ['HTTP/HTTPS Uptime Monitoring', true, 'Limited (Cron monitors only)'],
      ['SSL Certificate Tracking', true, false],
      ['Maintenance Windows', true, true],
      ['Public Status Pages', true, false],
      ['APM / Performance Monitoring', true, true],
      ['Error Tracking with Stack Traces', false, true],
      ['Self-Hosted', true, 'Complex (1000+ line docker-compose)'],
      ['Open Source', true, true],
      ['Simple Setup', true, false],
      ['Email + Slack + Discord + Webhook', true, true],
    ],
    verdict:
      'Sentry and PingBEAT solve different problems. Sentry excels at error tracking and code-level debugging. PingBEAT excels at HTTP uptime, SSL, and status pages. Many teams use both in parallel.',
  },

  netdata: {
    name: 'Netdata',
    category: 'Open-Source Infrastructure Monitoring',
    tagline: 'Real-time open-source infrastructure and server monitoring',
    pricing: 'Free (self-hosted) · Cloud from $0 to $45+/mo',
    selfHosted: true,
    openSource: true,
    checkInterval: '1 second (metrics)',
    description:
      'Netdata is an open-source real-time monitoring platform for servers, containers, and infrastructure with thousands of built-in metrics and a lightweight agent.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'netdata alternative, netdata vs pingbeat, pingbeat vs netdata, http uptime monitoring alternative to netdata, netdata uptime checks',
    winReasons: [
      'HTTP/HTTPS endpoint uptime monitoring — Netdata focuses on server metrics',
      'SSL certificate tracking and expiry alerts per endpoint',
      'Public customer-facing status pages',
      'Incident history auto-managed from monitor state transitions',
      'Response assertions (keyword, status code, max latency)',
      'Simpler setup for HTTP monitoring use cases',
    ],
    compWins: [
      'Real-time server CPU, memory, disk, and network metrics',
      'Container and Kubernetes infrastructure monitoring',
      '1-second metric resolution from system agents',
      'Built-in anomaly detection and ML alerts',
      'Thousands of pre-built metric collectors',
    ],
    features: [
      ['HTTP/HTTPS Uptime Monitoring', true, 'Limited (Synthetic checks add-on)'],
      ['SSL Certificate Tracking', true, false],
      ['Public Status Pages', true, false],
      ['Incident History', true, false],
      ['Server / Infrastructure Metrics', false, true],
      ['Container / Kubernetes Monitoring', false, true],
      ['Self-Hosted', true, true],
      ['Open Source', true, true],
      ['Email + Slack + Discord + Webhook', true, true],
      ['APM / Endpoint Metrics', true, false],
    ],
    verdict:
      'Netdata is purpose-built for server and infrastructure metrics. PingBEAT is purpose-built for HTTP uptime, SSL, and APM. They are complementary tools for different monitoring layers.',
  },

  datadog: {
    name: 'Datadog',
    category: 'Enterprise Observability Platform',
    tagline: 'Comprehensive enterprise observability and monitoring SaaS',
    pricing: 'From $15/host/mo · Complex usage-based pricing',
    selfHosted: false,
    openSource: false,
    checkInterval: '1 minute (synthetic)',
    description:
      'Datadog is the market-leading enterprise observability platform with infrastructure monitoring, APM, log management, synthetic monitoring, RUM, security, and hundreds of integrations.',
    pbPricing: 'Free forever · Self-host on any $5/mo VPS',
    keywords:
      'free datadog alternative, open source datadog alternative, datadog vs pingbeat, self-hosted datadog alternative, cheap datadog alternative, datadog open source replacement',
    winReasons: [
      'Zero cost — Datadog bills can reach $1000s/mo for larger teams',
      'Full data sovereignty — no data leaves your infrastructure',
      'No per-host, per-user, or per-GB pricing surprises',
      'Open-source MIT — no vendor lock-in or contract dependencies',
      'Lightweight self-hosted stack vs Datadog\'s heavyweight agent infrastructure',
      'HTTP uptime + SSL + APM in one simple platform',
    ],
    compWins: [
      'Full-stack observability: infra, APM, logs, traces, RUM, security',
      'Agent-based infrastructure and container monitoring at scale',
      '500+ integrations with cloud services, databases, and tools',
      'Enterprise SLAs, compliance (SOC2, HIPAA), and dedicated support',
      'AI-powered anomaly detection and forecasting',
      'Global synthetic monitoring from 30+ locations',
    ],
    features: [
      ['HTTP/HTTPS Uptime Monitoring', true, true],
      ['SSL Certificate Tracking', true, true],
      ['Public Status Pages', true, 'Via StatusPage.io (separate product)'],
      ['APM / Endpoint Metrics', true, true],
      ['Infrastructure Agent Monitoring', false, true],
      ['Distributed Tracing', false, true],
      ['Log Management Pipeline', false, true],
      ['Self-Hosted', true, false],
      ['Open Source', true, false],
      ['Zero cost for basic monitoring', true, false],
      ['Email + Slack + Discord + Webhook', true, true],
    ],
    verdict:
      'Datadog is the full-stack enterprise platform when you need everything in one vendor contract. PingBEAT is the open-source, self-hosted alternative for teams who need HTTP uptime monitoring and APM without five-figure monthly bills or data leaving their infrastructure.',
  },
}

/* ─── Scroll reveal helper ────────────────────────────────────────────────── */
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

  // Redirect to home if slug is unknown
  if (!comp) return <Navigate to="/" replace />

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
