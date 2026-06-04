import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import SeoHead from '../components/SeoHead'

const ingestUrl = 'https://api.pingbeat.in/api/apm/ingest/'

const navSections = [
  ['introduction', 'Introduction'],
  ['quick-start', 'Quick Start'],
  ['configuration', 'Configuration'],
  ['payload', 'Payload Format'],
  ['frameworks', 'Framework Setup'],
  ['verify', 'Verify Integration'],
  ['troubleshooting', 'Troubleshooting'],
]

const examples = {
  curl: {
    label: 'cURL',
    install: 'No SDK required',
    setup: [
      'curl -X POST "https://api.pingbeat.in/api/apm/ingest/" \\',
      '  -H "Content-Type: application/json" \\',
      "  -d '{",
      '    "api_key": "pb_your_api_key_here",',
      '    "metrics": [',
      '      {',
      '        "endpoint": "/manual-test",',
      '        "method": "GET",',
      '        "status_code": 200,',
      '        "response_time_ms": 12.34,',
      '        "timestamp": "2026-06-01T12:00:00+00:00"',
      '      }',
      '    ]',
      "  }'",
    ].join('\n'),
  },
  django: {
    label: 'Django',
    install: 'pip install requests',
    setup: [
      '# 1. Initialize the SDK (e.g., in settings.py or wsgi.py)',
      'import pingbeat_sdk as pingbeat',
      '',
      'pingbeat.init(',
      '    api_key="pb_your_api_key_here",',
      '    ingest_url="https://api.pingbeat.in/api/apm/ingest/",',
      ')',
      '',
      '# 2. Add to MIDDLEWARE list in settings.py',
      'MIDDLEWARE = [',
      '    "pingbeat_sdk.PingBeatDjangoMiddleware",',
      '    # ... other middleware ...',
      ']',
    ].join('\n'),
  },
  fastapi: {
    label: 'FastAPI',
    install: 'pip install requests',
    setup: [
      'from fastapi import FastAPI',
      'import pingbeat_sdk as pingbeat',
      '',
      'pingbeat.init(',
      '    api_key="pb_your_api_key_here",',
      '    ingest_url="https://api.pingbeat.in/api/apm/ingest/",',
      ')',
      '',
      'app = FastAPI()',
      'app.add_middleware(pingbeat.PingBeatFastAPIMiddleware)',
      '',
      '@app.get("/")',
      'async def root():',
      '    return {"status": "ok"}',
    ].join('\n'),
  },
  flask: {
    label: 'Flask',
    install: 'pip install requests',
    setup: [
      'from flask import Flask',
      'import pingbeat_sdk as pingbeat',
      '',
      'pingbeat.init(',
      '    api_key="pb_your_api_key_here",',
      '    ingest_url="https://api.pingbeat.in/api/apm/ingest/",',
      ')',
      '',
      'app = Flask(__name__)',
      'pingbeat.pingbeat_flask_init(app)',
    ].join('\n'),
  },
  express: {
    label: 'Express',
    install: 'No npm dependencies required',
    setup: [
      'const express = require("express");',
      'const pingbeat = require("./pingbeat_sdk");',
      '',
      'pingbeat.init({',
      '  apiKey: "pb_your_api_key_here",',
      '  ingestUrl: "https://api.pingbeat.in/api/apm/ingest/",',
      '});',
      '',
      'const app = express();',
      'app.use(pingbeat.expressMiddleware());',
    ].join('\n'),
  },
}

const envBlock = [
  '# The SDKs can be configured dynamically by parameters to init() or via env vars',
  'PINGBEAT_APM_API_KEY=pb_your_api_key_here',
  `PINGBEAT_APM_INGEST_URL=${ingestUrl}`,
  'PINGBEAT_APM_TIMEOUT_SECONDS=5',
].join('\n')

const payloadBlock = [
  '{',
  '  "api_key": "pb_your_api_key_here",',
  '  "metrics": [',
  '    {',
  '      "endpoint": "/api/orders",',
  '      "method": "GET",',
  '      "status_code": 200,',
  '      "response_time_ms": 42.5,',
  '      "timestamp": "2026-06-01T12:00:00.000Z"',
  '    }',
  '  ]',
  '}',
].join('\n')

const skipBlock = [
  '# Pass the excluded_paths parameter to init() to ignore noisy requests',
  'pingbeat.init(',
  '    api_key="pb_xxx",',
  '    ingest_url="...",',
  '    excluded_paths=("/health", "/readyz", "/static", "/favicon.ico")',
  ')',
].join('\n')


function ApmSdkDocs() {
  const [activeExample, setActiveExample] = useState('curl')
  const [copiedKey, setCopiedKey] = useState('')
  const isAuthenticated = !!localStorage.getItem('access_token')
  const example = useMemo(() => examples[activeExample], [activeExample])

  async function copyText(key, value) {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 1400)
  }

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to integrate PingBEAT APM SDK",
    "description": "Step-by-step guide to instrumenting your backend applications and sending request metrics to the PingBEAT APM dashboard.",
    "step": [
      {
        "@type": "HowToStep",
        "text": "Open PingBEAT and go to APM.",
        "position": 1
      },
      {
        "@type": "HowToStep",
        "text": "Create an application for the service and environment you want to monitor.",
        "position": 2
      },
      {
        "@type": "HowToStep",
        "text": "Copy the generated API key (starts with pb_).",
        "position": 3
      },
      {
        "@type": "HowToStep",
        "text": "Set the environment variables in your application.",
        "position": 4
      },
      {
        "@type": "HowToStep",
        "text": "Add the middleware or request hook for your framework.",
        "position": 5
      },
      {
        "@type": "HowToStep",
        "text": "Make a request to your service and check APM after one aggregation cycle.",
        "position": 6
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SeoHead
        title="APM SDK Integration Guide — PingBEAT"
        description="Learn how to instrument your Django, FastAPI, Flask, or Express backend applications with the PingBEAT APM SDK to collect latency, traffic volume, and error rates."
        canonical="https://pingbeat.in/apm/doc"
        jsonLd={howToSchema}
      />
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
          <BrandLogo to={isAuthenticated ? '/dashboard' : '/'} id="apm-docs-logo" />
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <Link to={isAuthenticated ? '/apm' : '/login'} id="apm-docs-link-signin" className="font-semibold text-slate-600 hover:text-slate-950">
              {isAuthenticated ? 'Open APM' : 'Sign in'}
            </Link>
            {!isAuthenticated && (
              <Link to="/register" id="apm-docs-btn-register" className="rounded bg-slate-950 px-3 py-1.5 font-semibold text-white">
                Register
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_minmax(320px,36vw)]">
        <aside className="hidden border-r border-slate-200 bg-slate-50 lg:block">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-5 py-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">APM SDK</p>
            <nav className="space-y-1">
              {navSections.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="block border-l-2 border-transparent px-3 py-2 text-sm font-medium text-slate-600 hover:border-emerald-500 hover:bg-white hover:text-slate-950">
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-8 border-t border-slate-200 pt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Examples</p>
              <div className="mt-3 flex flex-col gap-1">
                {Object.entries(examples).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveExample(key)}
                    className={`text-left text-sm font-semibold ${activeExample === key ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-950'}`}
                  >
                    {value.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">
          <section id="introduction" className="scroll-mt-20 border-b border-slate-200 pb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-600">Application Performance Monitoring</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">PingBEAT APM SDK Integration</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              PingBEAT APM accepts lightweight HTTP request metrics from any backend framework. Instrument your application, send metrics to the ingest API, and view traffic, latency, endpoint rankings, and error rates in the APM dashboard.
            </p>
            <blockquote className="mt-6 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
              The SDK format is intentionally simple: measure request duration, capture the response status, and post a JSON payload to PingBEAT.
            </blockquote>
          </section>

          <DocSection id="quick-start" title="Quick Start">
            <OrderedList
              items={[
                'Open PingBEAT and go to APM.',
                'Create an application for the service and environment you want to monitor.',
                'Copy the generated API key. It starts with pb_.',
                'Set the environment variables in your application.',
                'Add the middleware or request hook for your framework.',
                'Make a request to your service and check APM after one aggregation cycle.',
              ]}
            />
          </DocSection>

          <DocSection id="configuration" title="Configuration">
            <p className="text-sm leading-6 text-slate-600">
              Configure monitored services with environment variables. Keep API keys server-side and do not commit them to source control.
            </p>
            <DefinitionTable
              rows={[
                ['PINGBEAT_APM_API_KEY', 'Application API key generated by PingBEAT.'],
                ['PINGBEAT_APM_INGEST_URL', 'Backend ingest endpoint ending in /api/apm/ingest/.'],
                ['PINGBEAT_APM_TIMEOUT_SECONDS', 'Outbound request timeout. Keep this between 2 and 5 seconds.'],
              ]}
            />
          </DocSection>

          <DocSection id="payload" title="Payload Format">
            <p className="text-sm leading-6 text-slate-600">
              All frameworks send the same payload. PingBEAT accepts batches up to 1000 metrics per request.
            </p>
            <DefinitionTable
              rows={[
                ['api_key', 'The pb_ application key.'],
                ['endpoint', 'Path only, such as /api/orders. Avoid query strings with sensitive data.'],
                ['method', 'HTTP method, such as GET, POST, PUT, PATCH, or DELETE.'],
                ['status_code', 'Integer HTTP response status code.'],
                ['response_time_ms', 'Request duration in milliseconds.'],
                ['timestamp', 'ISO 8601 timestamp. UTC is recommended.'],
              ]}
            />
          </DocSection>

          <DocSection id="frameworks" title="Framework Setup">
            <p className="text-sm leading-6 text-slate-600">
              Drop the single-file SDK (<code>pingbeat_sdk.py</code> or <code>pingbeat_sdk.js</code>) into your project, initialize it with your API key, and configure the framework integration as shown in the code panel.
            </p>
            <h3 className="mt-6 text-base font-bold text-slate-950">Supported frameworks</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
              <li>Django (using <code>PingBeatDjangoMiddleware</code>)</li>
              <li>FastAPI (using <code>PingBeatFastAPIMiddleware</code>)</li>
              <li>Flask (using <code>pingbeat_flask_init</code> helper)</li>
              <li>Express (using <code>expressMiddleware()</code>)</li>
              <li>Generic HTTP ingestion / cURL</li>
            </ul>
          </DocSection>


          <DocSection id="verify" title="Verify Integration">
            <OrderedList
              items={[
                'Send a manual cURL request to the ingest URL.',
                'Confirm the API returns status accepted and queued_metrics greater than zero.',
                'Trigger real traffic in your application.',
                'Open the PingBEAT APM dashboard and select the application.',
              ]}
            />
          </DocSection>

          <DocSection id="troubleshooting" title="Troubleshooting">
            <DefinitionTable
              rows={[
                ['No data appears', 'Confirm the ingest URL is reachable and the Celery aggregation task has run.'],
                ['Invalid API key', 'Check that the key starts with pb_ and belongs to the selected application.'],
                ['Slow user responses', 'Send metrics in a background task or batcher so app responses do not wait on PingBEAT.'],
                ['Too much noise', 'Skip health, static, admin, and polling endpoints.'],
                ['Large traffic volume', 'Batch metrics and keep each request at or below 1000 metrics.'],
              ]}
            />
          </DocSection>
        </main>

        <aside className="border-t border-slate-800 bg-slate-950 text-slate-100 lg:col-start-2 xl:col-start-auto xl:border-l xl:border-t-0">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <div className="border-b border-slate-800 px-5 py-4">
              <div className="mb-4 flex flex-wrap gap-2">
                {Object.entries(examples).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveExample(key)}
                    className={`rounded px-2.5 py-1.5 text-xs font-bold ${activeExample === key ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                  >
                    {value.label}
                  </button>
                ))}
              </div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Install</p>
              <CopyableCode code={example.install} codeKey={`${activeExample}-install`} copiedKey={copiedKey} onCopy={copyText} compact />
            </div>

            <ExampleSection title="Environment" code={envBlock} codeKey="env" copiedKey={copiedKey} onCopy={copyText} />
            <ExampleSection title="Payload" code={payloadBlock} codeKey="payload" copiedKey={copiedKey} onCopy={copyText} />
            <ExampleSection title={`${example.label} Example`} code={example.setup} codeKey={`${activeExample}-setup`} copiedKey={copiedKey} onCopy={copyText} />
            {example.attach && (
              <ExampleSection title="Attach" code={example.attach} codeKey={`${activeExample}-attach`} copiedKey={copiedKey} onCopy={copyText} />
            )}
            <ExampleSection title="Skip Paths" code={skipBlock} codeKey="skip" copiedKey={copiedKey} onCopy={copyText} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function DocSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-slate-200 py-10">
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
      {children}
    </section>
  )
}

function OrderedList({ items }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  )
}

function DefinitionTable({ rows }) {
  return (
    <div className="mt-5 overflow-x-auto border-y border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <tbody className="divide-y divide-slate-100">
          {rows.map(([key, value]) => (
            <tr key={key}>
              <td className="w-56 whitespace-nowrap py-3 pr-6 font-mono text-xs font-semibold text-slate-800">{key}</td>
              <td className="py-3 text-slate-600">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExampleSection({ title, code, codeKey, copiedKey, onCopy }) {
  return (
    <section className="border-b border-slate-800 px-5 py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-200">{title}</h3>
        <button
          type="button"
          onClick={() => onCopy(codeKey, code)}
          className="rounded border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 hover:border-slate-500"
        >
          {copiedKey === codeKey ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto text-xs leading-5 text-slate-100">
        <code>{code}</code>
      </pre>
    </section>
  )
}

function CopyableCode({ code, codeKey, copiedKey, onCopy, compact = false }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <code className={`min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-slate-100 ${compact ? 'py-1' : 'py-2'}`}>
        {code}
      </code>
      <button
        type="button"
        onClick={() => onCopy(codeKey, code)}
        className="rounded border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 hover:border-slate-500"
      >
        {copiedKey === codeKey ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export default ApmSdkDocs
