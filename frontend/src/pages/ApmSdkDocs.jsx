import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const ingestUrl = 'https://YOUR-PINGBEAT-DOMAIN/api/apm/ingest/'

const frameworks = [
  {
    id: 'django',
    label: 'Django',
    install: 'pip install requests',
    file: 'your_project/pingbeat_apm.py',
    code: [
      'import os',
      'import time',
      'from datetime import datetime, timezone',
      'from threading import Thread',
      '',
      'import requests',
      '',
      '',
      'def send_pingbeat_metric(metric):',
      '    api_key = os.environ.get("PINGBEAT_APM_API_KEY")',
      '    ingest_url = os.environ.get("PINGBEAT_APM_INGEST_URL")',
      '    timeout = float(os.environ.get("PINGBEAT_APM_TIMEOUT_SECONDS", "3"))',
      '',
      '    if not api_key or not ingest_url:',
      '        return',
      '',
      '    try:',
      '        requests.post(',
      '            ingest_url,',
      '            json={"api_key": api_key, "metrics": [metric]},',
      '            timeout=timeout,',
      '        )',
      '    except requests.RequestException:',
      '        pass',
      '',
      '',
      'class PingBeatAPMMiddleware:',
      '    def __init__(self, get_response):',
      '        self.get_response = get_response',
      '',
      '    def __call__(self, request):',
      '        started = time.perf_counter()',
      '        response = self.get_response(request)',
      '        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)',
      '',
      '        metric = {',
      '            "endpoint": request.path,',
      '            "method": request.method,',
      '            "status_code": response.status_code,',
      '            "response_time_ms": elapsed_ms,',
      '            "timestamp": datetime.now(timezone.utc).isoformat(),',
      '        }',
      '',
      '        Thread(target=send_pingbeat_metric, args=(metric,), daemon=True).start()',
      '        return response',
    ].join('\n'),
    attach: [
      'MIDDLEWARE = [',
      '    "django.middleware.security.SecurityMiddleware",',
      '    "django.contrib.sessions.middleware.SessionMiddleware",',
      '    "your_project.pingbeat_apm.PingBeatAPMMiddleware",',
      '    "django.middleware.common.CommonMiddleware",',
      '    "django.middleware.csrf.CsrfViewMiddleware",',
      '    "django.contrib.auth.middleware.AuthenticationMiddleware",',
      ']',
    ].join('\n'),
  },
  {
    id: 'fastapi',
    label: 'FastAPI',
    install: 'pip install httpx',
    file: 'main.py',
    code: [
      'import os',
      'import time',
      'from datetime import datetime, timezone',
      '',
      'import httpx',
      'from fastapi import FastAPI, Request',
      '',
      'app = FastAPI()',
      '',
      '',
      'async def send_pingbeat_metric(metric):',
      '    api_key = os.environ.get("PINGBEAT_APM_API_KEY")',
      '    ingest_url = os.environ.get("PINGBEAT_APM_INGEST_URL")',
      '    timeout = float(os.environ.get("PINGBEAT_APM_TIMEOUT_SECONDS", "3"))',
      '',
      '    if not api_key or not ingest_url:',
      '        return',
      '',
      '    try:',
      '        async with httpx.AsyncClient(timeout=timeout) as client:',
      '            await client.post(ingest_url, json={"api_key": api_key, "metrics": [metric]})',
      '    except httpx.HTTPError:',
      '        pass',
      '',
      '',
      '@app.middleware("http")',
      'async def pingbeat_apm_middleware(request: Request, call_next):',
      '    started = time.perf_counter()',
      '    response = await call_next(request)',
      '    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)',
      '',
      '    metric = {',
      '        "endpoint": request.url.path,',
      '        "method": request.method,',
      '        "status_code": response.status_code,',
      '        "response_time_ms": elapsed_ms,',
      '        "timestamp": datetime.now(timezone.utc).isoformat(),',
      '    }',
      '',
      '    await send_pingbeat_metric(metric)',
      '    return response',
    ].join('\n'),
  },
  {
    id: 'flask',
    label: 'Flask',
    install: 'pip install requests',
    file: 'app.py',
    code: [
      'import os',
      'import time',
      'from datetime import datetime, timezone',
      'from threading import Thread',
      '',
      'import requests',
      'from flask import Flask, g, request',
      '',
      'app = Flask(__name__)',
      '',
      '',
      'def send_pingbeat_metric(metric):',
      '    api_key = os.environ.get("PINGBEAT_APM_API_KEY")',
      '    ingest_url = os.environ.get("PINGBEAT_APM_INGEST_URL")',
      '    timeout = float(os.environ.get("PINGBEAT_APM_TIMEOUT_SECONDS", "3"))',
      '',
      '    if not api_key or not ingest_url:',
      '        return',
      '',
      '    try:',
      '        requests.post(ingest_url, json={"api_key": api_key, "metrics": [metric]}, timeout=timeout)',
      '    except requests.RequestException:',
      '        pass',
      '',
      '',
      '@app.before_request',
      'def pingbeat_start():',
      '    g.pingbeat_started = time.perf_counter()',
      '',
      '',
      '@app.after_request',
      'def pingbeat_finish(response):',
      '    started = getattr(g, "pingbeat_started", None)',
      '    if started is None:',
      '        return response',
      '',
      '    metric = {',
      '        "endpoint": request.path,',
      '        "method": request.method,',
      '        "status_code": response.status_code,',
      '        "response_time_ms": round((time.perf_counter() - started) * 1000, 2),',
      '        "timestamp": datetime.now(timezone.utc).isoformat(),',
      '    }',
      '',
      '    Thread(target=send_pingbeat_metric, args=(metric,), daemon=True).start()',
      '    return response',
    ].join('\n'),
  },
  {
    id: 'express',
    label: 'Express',
    install: 'npm install',
    file: 'server.js',
    code: [
      'const express = require("express")',
      '',
      'const app = express()',
      '',
      'function sendPingbeatMetric(metric) {',
      '  const apiKey = process.env.PINGBEAT_APM_API_KEY',
      '  const ingestUrl = process.env.PINGBEAT_APM_INGEST_URL',
      '  const timeoutMs = Number(process.env.PINGBEAT_APM_TIMEOUT_SECONDS || 3) * 1000',
      '',
      '  if (!apiKey || !ingestUrl) return',
      '',
      '  const controller = new AbortController()',
      '  const timeout = setTimeout(() => controller.abort(), timeoutMs)',
      '',
      '  fetch(ingestUrl, {',
      '    method: "POST",',
      '    headers: { "Content-Type": "application/json" },',
      '    body: JSON.stringify({ api_key: apiKey, metrics: [metric] }),',
      '    signal: controller.signal,',
      '  })',
      '    .catch(() => undefined)',
      '    .finally(() => clearTimeout(timeout))',
      '}',
      '',
      'function pingbeatApm(req, res, next) {',
      '  const started = process.hrtime.bigint()',
      '',
      '  res.on("finish", () => {',
      '    const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000',
      '    sendPingbeatMetric({',
      '      endpoint: req.route?.path || req.path,',
      '      method: req.method,',
      '      status_code: res.statusCode,',
      '      response_time_ms: Math.round(elapsedMs * 100) / 100,',
      '      timestamp: new Date().toISOString(),',
      '    })',
      '  })',
      '',
      '  next()',
      '}',
      '',
      'app.use(pingbeatApm)',
    ].join('\n'),
  },
  {
    id: 'generic',
    label: 'Any Framework',
    install: 'Use your framework HTTP client',
    file: 'POST /api/apm/ingest/',
    code: [
      '{',
      '  "api_key": "pb_your_api_key_here",',
      '  "metrics": [',
      '    {',
      '      "endpoint": "/api/orders",',
      '      "method": "GET",',
      '      "status_code": 200,',
      '      "response_time_ms": 42.5,',
      '      "timestamp": "2026-06-01T12:00:00+00:00"',
      '    }',
      '  ]',
      '}',
    ].join('\n'),
    attach: [
      'curl -X POST "https://YOUR-PINGBEAT-DOMAIN/api/apm/ingest/" \\',
      '  -H "Content-Type: application/json" \\',
      "  -d '{\"api_key\":\"pb_your_api_key_here\",\"metrics\":[{\"endpoint\":\"/manual-test\",\"method\":\"GET\",\"status_code\":200,\"response_time_ms\":12.34,\"timestamp\":\"2026-06-01T12:00:00+00:00\"}]}'",
    ].join('\n'),
  },
]

const envBlock = [
  'PINGBEAT_APM_API_KEY=pb_your_api_key_here',
  `PINGBEAT_APM_INGEST_URL=${ingestUrl}`,
  'PINGBEAT_APM_TIMEOUT_SECONDS=3',
].join('\n')

const skipPaths = [
  'SKIP_PREFIXES = ("/health", "/static", "/favicon.ico", "/admin")',
  '',
  'if request.path.startswith(SKIP_PREFIXES):',
  '    return response',
].join('\n')

function ApmSdkDocs() {
  const [activeFramework, setActiveFramework] = useState('django')
  const [copiedKey, setCopiedKey] = useState('')
  const framework = useMemo(
    () => frameworks.find((item) => item.id === activeFramework) || frameworks[0],
    [activeFramework]
  )

  async function copyText(key, value) {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 1400)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-600">APM Documentation</p>
            <h1 className="text-2xl font-bold text-slate-950">SDK Integration</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Add PingBEAT APM to any HTTP service by sending endpoint, method, status, latency, and timestamp metrics to the ingest API.
            </p>
          </div>
          <Link
            to="/apm"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to APM
          </Link>
        </div>

        <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
          {[
            ['1', 'Create application', 'Open APM and register an application for each service and environment.'],
            ['2', 'Copy API key', 'Use the generated pb_ key only in server-side environment variables.'],
            ['3', 'Install snippet', 'Choose a framework tab or use the generic HTTP contract.'],
            ['4', 'Verify data', 'Make requests, then check APM traffic after one aggregation cycle.'],
          ].map(([step, title, body]) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700">
                {step}
              </div>
              <h2 className="text-sm font-bold text-slate-900">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
          <div className="space-y-6">
            <div className="glass-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">Environment</h2>
                <button
                  type="button"
                  onClick={() => copyText('env', envBlock)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                >
                  {copiedKey === 'env' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <CodeBlock value={envBlock} />
            </div>

            <div className="glass-card p-5">
              <h2 className="mb-4 text-base font-bold text-slate-900">What PingBEAT Collects</h2>
              <div className="space-y-3 text-sm">
                {['Endpoint path', 'HTTP method', 'Status code', 'Response time', 'Timestamp'].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <span className="text-slate-600">{item}</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Request bodies, headers, cookies, tokens, and user data should stay out of APM payloads.
              </p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {frameworks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveFramework(item.id)}
                    className={`h-9 rounded-lg px-3 text-sm font-semibold transition ${
                      item.id === activeFramework
                        ? 'bg-slate-950 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <InfoTile label="Install" value={framework.install} />
                <InfoTile label="Add to" value={framework.file} />
              </div>

              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-slate-900">{framework.label} setup</h2>
                  <button
                    type="button"
                    onClick={() => copyText(`${framework.id}-code`, framework.code)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                  >
                    {copiedKey === `${framework.id}-code` ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <CodeBlock value={framework.code} large />
              </div>

              {framework.attach && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-slate-900">
                      {framework.id === 'generic' ? 'Manual test' : 'Attach instrumentation'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => copyText(`${framework.id}-attach`, framework.attach)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      {copiedKey === `${framework.id}-attach` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <CodeBlock value={framework.attach} />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass-card p-5">
            <h2 className="mb-4 text-base font-bold text-slate-900">Configuration</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['PINGBEAT_APM_API_KEY', 'Application key generated in the APM page.'],
                    ['PINGBEAT_APM_INGEST_URL', 'Your backend URL ending in /api/apm/ingest/.'],
                    ['PINGBEAT_APM_TIMEOUT_SECONDS', 'Short outbound timeout, usually 2 to 5 seconds.'],
                  ].map(([key, value]) => (
                    <tr key={key}>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-slate-800">{key}</td>
                      <td className="px-3 py-3 text-slate-600">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900">Skip Noisy Paths</h2>
              <button
                type="button"
                onClick={() => copyText('skip', skipPaths)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
              >
                {copiedKey === 'skip' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-600">Exclude health checks, static assets, admin routes, and any internal polling paths.</p>
            <CodeBlock value={skipPaths} />
          </div>
        </section>

        <section className="mt-8 glass-card p-5">
          <h2 className="mb-4 text-base font-bold text-slate-900">Troubleshooting</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              'Confirm the API key starts with pb_.',
              'Confirm the ingest URL uses HTTPS in production.',
              'Check that the monitored app can reach PingBEAT.',
              'Avoid sending more than 1000 metrics per batch.',
              'Wait for the aggregation task before reading charts.',
              'Run Celery worker and beat when async ingest is enabled.',
            ].map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="mb-1 text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="break-words font-mono text-xs font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function CodeBlock({ value, large = false }) {
  return (
    <pre className={`overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100 ${large ? 'max-h-[520px]' : 'max-h-72'}`}>
      <code>{value}</code>
    </pre>
  )
}

export default ApmSdkDocs
