import React from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

function Breadcrumb() {
  const location = useLocation()
  const params = useParams()
  const pathParts = location.pathname.split('/').filter(Boolean)

  if (pathParts.length === 0) return null

  const labels = {
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    apm: 'APM',
    incidents: 'Incidents',
    logs: 'Logs',
    settings: 'Settings',
    monitors: 'Monitors',
    status: 'Public Status',
    'status-pages': 'Status Pages',
    new: 'New',
    edit: 'Edit',
    about: 'About',
  }

  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm" aria-label="Breadcrumb">
      <Link to="/dashboard" className="font-semibold text-slate-600 hover:text-slate-950">Home</Link>
      {pathParts.map((part, index) => {
        const href = `/${pathParts.slice(0, index + 1).join('/')}`
        const isLast = index === pathParts.length - 1
        const label = params.id === part ? `Monitor ${part}` : labels[part] || decodeURIComponent(part)
        return (
          <React.Fragment key={href}>
            <span className="text-slate-300">/</span>
            {isLast ? (
              <span className="max-w-[160px] truncate font-semibold text-slate-950" title={label}>{label}</span>
            ) : (
              <Link to={href} className="max-w-[120px] truncate text-slate-500 hover:text-slate-900" title={label}>{label}</Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export default Breadcrumb
