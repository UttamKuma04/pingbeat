import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getIncidents, getMe } from '../services/api'
import BrandLogo from './BrandLogo'
import Breadcrumb from './Breadcrumb'
import GlobalSearch from './GlobalSearch'
import TimeRangePicker from './TimeRangePicker'

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    dashboard: 'M4 13h6V4H4v9zm10 7h6V4h-6v16zM4 20h6v-5H4v5z',
    monitors: 'M4 5h16M4 12h16M4 19h10',
    analytics: 'M4 19V5m0 14h16M8 16l3-4 3 2 4-7',
    apm: 'M5 12h4l2-7 4 14 2-7h2',
    docs: 'M6 4h9l3 3v13H6V4zm8 0v4h4M9 12h6M9 16h6',
    incidents: 'M12 9v4m0 4h.01M10.3 4.3 2-2a2.4 2.4 0 0 1 3.4 0l6 6a2.4 2.4 0 0 1 0 3.4l-6 6a2.4 2.4 0 0 1-3.4 0l-6-6a2.4 2.4 0 0 1 0-3.4z',
    logs: 'M7 4h10M7 8h10M7 12h10M7 16h7M5 3h14v18H5z',
    status: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-14v5l3 2',
    settings: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5zm0 0v3M12 5V2m7 10h3M2 12h3m12.95 4.95 2.12 2.12M3.93 3.93l2.12 2.12m11.9-2.12-2.12 2.12M3.93 20.07l2.12-2.12',
    plus: 'M12 5v14m7-7H5',
    bell: 'M15 17H9m10-2c-1.3-1.2-2-2.7-2-4.5V9a5 5 0 0 0-10 0v1.5c0 1.8-.7 3.3-2 4.5h14zM10 19a2 2 0 0 0 4 0',
    collapse: 'M15 6l-6 6 6 6',
    menu: 'M4 7h16M4 12h16M4 17h16',
  }

  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] || paths.dashboard} />
    </svg>
  )
}

function Navbar() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('pinbeat_sidebar_collapsed') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [timeRange, setTimeRange] = useState(() => localStorage.getItem('pinbeat_time_range') || '24h')
  const [incidents, setIncidents] = useState([])
  const userMenuRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    getMe()
      .then((res) => {
        setUsername(res.data.username || '')
        setEmail(res.data.email || '')
      })
      .catch(() => {
        setUsername('')
        setEmail('')
      })

    getIncidents()
      .then((res) => setIncidents(res.data.results || res.data || []))
      .catch(() => setIncidents([]))
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    localStorage.setItem('pinbeat_sidebar_collapsed', String(isCollapsed))
  }, [isCollapsed])

  useEffect(() => {
    localStorage.setItem('pinbeat_time_range', timeRange)
  }, [timeRange])

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeIncidents = incidents.filter((incident) => !incident.resolved_at)
  const avatarInitial = (username || email || 'U').trim().charAt(0).toUpperCase()
  const sidebarWidth = isCollapsed ? 'lg:w-20' : 'lg:w-64'
  const shellClass = isCollapsed ? 'pinbeat-shell pinbeat-shell-collapsed' : 'pinbeat-shell'

  const sections = useMemo(() => [
    {
      label: 'Monitoring',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { to: '/monitors/new', label: 'Create Monitor', icon: 'plus' },
        { to: '/incidents', label: 'Incidents', icon: 'incidents', badge: activeIncidents.length || null },
        { to: '/logs', label: 'Logs', icon: 'logs' },
      ],
    },
    {
      label: 'Performance',
      items: [
        { to: '/analytics', label: 'Analytics', icon: 'analytics' },
        { to: '/apm', label: 'APM', icon: 'apm', end: true },
        { to: '/apm/docs', label: 'SDK Docs', icon: 'docs' },
      ],
    },
    {
      label: 'Management',
      items: [
        { to: '/status-pages', label: 'Status Pages', icon: 'status' },
        { to: '/settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ], [activeIncidents.length])

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  function renderSidebar(forceExpanded = false) {
    const collapsed = forceExpanded ? false : isCollapsed
    const widthClass = forceExpanded ? 'w-full' : `w-full ${sidebarWidth}`

    return (
    <aside className={`${widthClass} flex h-full flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-200`}>
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
        <BrandLogo to="/dashboard" showText={!collapsed} className="min-w-0" />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{section.label}</p>}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          className={`mb-3 hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 lg:flex ${collapsed ? 'justify-center' : ''}`}
        >
          <Icon name="collapse" className={`h-5 w-5 transition ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>

        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((open) => !open)}
            className={`flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:bg-white ${collapsed ? 'justify-center' : ''}`}
            aria-label="User menu"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-sm font-bold text-white">
              {avatarInitial}
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-800">{username || 'User'}</span>
                <span className="block truncate text-xs text-slate-500">{email || 'Workspace admin'}</span>
              </span>
            )}
          </button>
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
              <Link to="/settings" className="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Settings</Link>
              <button onClick={handleLogout} className="block w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
    )
  }

  return (
    <>
      <div className={shellClass} />
      <div className={`fixed inset-y-0 left-0 z-50 hidden ${sidebarWidth} lg:block`}>
        {renderSidebar()}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full w-72" onClick={(event) => event.stopPropagation()}>
            {renderSidebar(true)}
          </div>
        </div>
      )}

      <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl lg:left-64 lg:pinbeat-topbar">
        <div className="flex h-16 min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 lg:hidden"
            aria-label="Open navigation"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <div className="hidden min-w-0 flex-1 md:block">
            <Breadcrumb />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            <div className="hidden w-full max-w-sm sm:block">
              <GlobalSearch />
            </div>
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
            <Link
              to="/incidents"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-slate-950"
              title="Notifications"
            >
              <Icon name="bell" className="h-5 w-5" />
              {activeIncidents.length > 0 && <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white">{activeIncidents.length}</span>}
            </Link>
          </div>
        </div>
      </header>
      <div className="pinbeat-shell-spacer h-16" />
    </>
  )
}

export default Navbar
