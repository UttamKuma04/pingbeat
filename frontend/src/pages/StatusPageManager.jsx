import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { getStatusPages, createStatusPage, updateStatusPage, deleteStatusPage, getMonitors } from '../services/api'
import { Link } from 'react-router-dom'

function StatusPageManager() {
  const [statusPages, setStatusPages] = useState([])
  const [monitors, setMonitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal / Form state
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [selectedMonitors, setSelectedMonitors] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [pagesRes, monitorsRes] = await Promise.all([
        getStatusPages(),
        getMonitors(),
      ])
      setStatusPages(pagesRes.data.results || pagesRes.data || [])
      setMonitors(monitorsRes.data.results || monitorsRes.data || [])
    } catch (err) {
      setError('Failed to fetch status page data.')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenCreate() {
    setEditId(null)
    setTitle('')
    setSlug('')
    setIsPublic(true)
    setSelectedMonitors([])
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function handleOpenEdit(page) {
    setEditId(page.id)
    setTitle(page.title)
    setSlug(page.slug)
    setIsPublic(page.is_public)
    setSelectedMonitors(page.monitors || [])
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function handleTitleChange(val) {
    setTitle(val)
    if (!editId) {
      // Auto-generate slug for new pages
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
          .replace(/\s+/g, '-') // collapse whitespace and replace by -
          .replace(/-+/g, '-') // collapse dashes
      )
    }
  }

  function handleCheckboxChange(monitorId) {
    if (selectedMonitors.includes(monitorId)) {
      setSelectedMonitors(selectedMonitors.filter((id) => id !== monitorId))
    } else {
      setSelectedMonitors([...selectedMonitors, monitorId])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      title,
      slug,
      is_public: isPublic,
      monitors: selectedMonitors,
    }

    try {
      if (editId) {
        await updateStatusPage(editId, payload)
        setSuccess('Status page updated successfully!')
      } else {
        await createStatusPage(payload)
        setSuccess('Status page created successfully!')
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      if (err.response && err.response.data) {
        const errors = err.response.data
        const messages = []
        for (const key in errors) {
          messages.push(`${key}: ${errors[key]}`)
        }
        setError(messages.join(' ') || 'Failed to save status page.')
      } else {
        setError('Network error. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this status page? This cannot be undone.')) return
    try {
      await deleteStatusPage(id)
      setSuccess('Status page deleted successfully!')
      fetchData()
    } catch (err) {
      setError('Failed to delete status page.')
    }
  }

  function copyToClipboard(slug) {
    const url = `${window.location.origin}/status/${slug}`
    navigator.clipboard.writeText(url)
    alert(`Public URL copied to clipboard: ${url}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <svg className="animate-spin h-8 w-8 text-emerald-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Status Pages</h1>
            <p className="text-slate-500 text-sm">Create and share public status dashboards with your users</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="mt-4 sm:mt-0 inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/25 text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Status Page
          </button>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
            {success}
          </div>
        )}

        {statusPages.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 13V9m0 0V5m0 4h4m-4 0H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No status pages yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
              Share status transparency with clients. Set up your first public dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statusPages.map((page) => (
              <div key={page.id} className="glass-card p-6 flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-900 truncate max-w-[200px]">{page.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      page.is_public ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {page.is_public ? 'PUBLIC' : 'PRIVATE'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs font-mono truncate mb-4">/status/{page.slug}</p>
                  <p className="text-slate-600 text-xs mb-6">Monitors: {page.monitors?.length || 0}</p>
                </div>

                <div className="flex items-center space-x-2 border-t border-slate-250/10 pt-4">
                  <button
                    onClick={() => copyToClipboard(page.slug)}
                    className="flex-1 py-2 px-3 text-xs bg-slate-100 hover:bg-slate-250/20 text-slate-700 font-semibold rounded border border-slate-200 transition-colors"
                  >
                    Copy Link
                  </button>
                  <Link
                    to={`/status/${page.slug}`}
                    target="_blank"
                    className="flex-1 py-2 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-center transition-colors"
                  >
                    View Page
                  </Link>
                  <button
                    onClick={() => handleOpenEdit(page)}
                    className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded transition-colors"
                    title="Edit Status Page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-2.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="p-2 text-red-650 hover:text-red-800 bg-red-50 border border-red-200 rounded transition-colors"
                    title="Delete Status Page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="glass-card max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto bg-white/95 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">{editId ? 'Edit Status Page' : 'Create Status Page'}</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-650 text-sm font-mono">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 transition-all focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="e.g. Acme Status Page"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 transition-all focus:ring-2 focus:ring-emerald-500/50 font-mono"
                    placeholder="e.g. acme-status"
                  />
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-4 border border-slate-200 rounded-lg sm:items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500/50"
                  />
                  <label htmlFor="isPublic" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Enable public access (viewable without logging in)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">
                    Select Monitors to Include
                  </label>
                  {monitors.length === 0 ? (
                    <p className="text-slate-400 text-xs italic">No monitors found. Create monitors first.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg bg-white max-h-40 overflow-y-auto divide-y divide-slate-100 p-2">
                      {monitors.map((m) => (
                        <div key={m.id} className="flex items-center space-x-3 py-2 px-1">
                          <input
                            type="checkbox"
                            id={`mon-${m.id}`}
                            checked={selectedMonitors.includes(m.id)}
                            onChange={() => handleCheckboxChange(m.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500/50"
                          />
                          <label htmlFor={`mon-${m.id}`} className="text-xs text-slate-700 cursor-pointer select-none truncate">
                            {m.name} <span className="text-slate-400 font-mono">({m.url})</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Page'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default StatusPageManager
