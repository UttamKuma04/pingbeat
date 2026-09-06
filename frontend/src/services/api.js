import axios from 'axios'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  '/api'
).replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
})

export const GOOGLE_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '1091250855625-00rf2erbba7u9acaeapknl82p890jst4.apps.googleusercontent.com'
)

// Request interceptor - attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Short-lived response cache for endpoints that are re-fetched by both the
// Navbar (mounted fresh on every route change) and the page it wraps. Without
// this, every sidebar click re-requests the same data over the network on
// top of the page's own fetch, which is what made navigation feel slow.
// Cleared on login/logout so one browser tab can never serve a previous
// account's cached response to the next signed-in user.
const _getCache = new Map()

export function clearApiCache() {
  _getCache.clear()
}

function cachedGet(key, fetcher, ttlMs) {
  const now = Date.now()
  const entry = _getCache.get(key)
  if (entry && entry.expires > now) {
    return entry.promise
  }
  const promise = fetcher().catch((err) => {
    _getCache.delete(key)
    throw err
  })
  _getCache.set(key, { expires: now + ttlMs, promise })
  return promise
}

function clearAuthAndRedirect() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  clearApiCache()
  window.location.href = '/login'
}

// Shared in-flight refresh promise so concurrent 401s (common when several
// requests fire on page load) reuse one refresh call instead of each racing
// to rotate the same refresh token - only the first would succeed since
// ROTATE_REFRESH_TOKENS blacklists it immediately after use.
let refreshPromise = null

function refreshAccessToken(refreshToken) {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/token/refresh/`, { refresh: refreshToken })
      .then((res) => {
        localStorage.setItem('access_token', res.data.access)
        if (res.data.refresh) {
          localStorage.setItem('refresh_token', res.data.refresh)
        }
        return res.data.access
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// Response interceptor - handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const newAccess = await refreshAccessToken(refreshToken)
          originalRequest.headers.Authorization = `Bearer ${newAccess}`
          return api(originalRequest)
        } catch (refreshError) {
          clearAuthAndRedirect()
          return Promise.reject(refreshError)
        }
      } else {
        clearAuthAndRedirect()
      }
    }

    return Promise.reject(error)
  }
)

// Auth
export function login(email, password) {
  return api.post('/login/', { email, password })
}

export function register(email, password, password2) {
  return api.post('/register/', { email, password, password2 })
}

export function loginWithGoogle(credential) {
  return api.post('/google-login/', { credential })
}

export function getMe() {
  return cachedGet('me', () => api.get('/me/'), 30000)
}

// Monitors
export function getMonitors() {
  return api.get('/monitors/')
}

// Cached variant for read-heavy, non-realtime-critical consumers (e.g. the
// command palette) so it doesn't force a fresh fetch on every open.
export function getMonitorsCached() {
  return cachedGet('monitors', () => api.get('/monitors/'), 15000)
}

export function createMonitor(data) {
  return api.post('/monitors/', data)
}

export function getMonitor(id) {
  return api.get(`/monitors/${id}/`)
}

export function updateMonitor(id, data) {
  return api.put(`/monitors/${id}/`, data)
}

export function deleteMonitor(id) {
  return api.delete(`/monitors/${id}/`)
}

export function pauseMonitor(id) {
  return api.post(`/monitors/${id}/pause/`)
}

export function resumeMonitor(id) {
  return api.post(`/monitors/${id}/resume/`)
}

export function getMonitorStats(id) {
  return api.get(`/monitors/${id}/stats/`)
}

export function bulkActionMonitors(ids, action) {
  return api.post('/monitors/bulk_action/', { ids, action })
}

export function exportLogsCsv(id) {
  return api.get(`/monitors/${id}/export_csv/`, { responseType: 'blob' })
}

// Incidents
export function getIncidents() {
  return cachedGet('incidents', () => api.get('/incidents/'), 10000)
}

// Status Pages
export function getStatusPages() {
  return api.get('/status-pages/')
}

export function getStatusPagesCached() {
  return cachedGet('statusPages', () => api.get('/status-pages/'), 30000)
}

export function createStatusPage(data) {
  return api.post('/status-pages/', data)
}

export function updateStatusPage(id, data) {
  return api.put(`/status-pages/${id}/`, data)
}

export function deleteStatusPage(id) {
  return api.delete(`/status-pages/${id}/`)
}

export function getPublicStatus(slug) {
  return axios.get(`${API_BASE_URL}/public-status/${slug}/`)
}

// Analytics
export function getAnalytics() {
  return api.get('/analytics/')
}

// APM
export function getApmApplications() {
  return api.get('/apm/applications/')
}

export function createApmApplication(data) {
  return api.post('/apm/applications/', data)
}

export function deleteApmApplication(id) {
  return api.delete(`/apm/applications/${id}/`)
}

export function rotateApmApplicationKey(id) {
  return api.post(`/apm/applications/${id}/rotate-key/`)
}

export function getApmAnalytics(params = {}) {
  return api.get('/apm/analytics/', { params })
}

export function getApmEndpoints(params = {}) {
  return api.get('/apm/endpoints/', { params })
}

export function getApmTraffic(params = {}) {
  return api.get('/apm/traffic/', { params })
}

export function getApmErrors(params = {}) {
  return api.get('/apm/errors/', { params })
}

// Logs
export function getLogs(monitorId) {
  if (monitorId) {
    return api.get(`/logs/?monitor_id=${monitorId}`)
  }
  return api.get('/logs/')
}

// Maintenance Windows
export function getMaintenanceWindows(monitorId) {
  if (monitorId) {
    return api.get(`/maintenance-windows/?monitor_id=${monitorId}`)
  }
  return api.get('/maintenance-windows/')
}

export function createMaintenanceWindow(data) {
  return api.post('/maintenance-windows/', data)
}

export function deleteMaintenanceWindow(id) {
  return api.delete(`/maintenance-windows/${id}/`)
}

export default api
