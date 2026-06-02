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
          const res = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          })
          const newAccess = res.data.access
          localStorage.setItem('access_token', newAccess)
          originalRequest.headers.Authorization = `Bearer ${newAccess}`
          return api(originalRequest)
        } catch (refreshError) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
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
  return api.get('/me/')
}

// Monitors
export function getMonitors() {
  return api.get('/monitors/')
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
  return api.get('/incidents/')
}

// Status Pages
export function getStatusPages() {
  return api.get('/status-pages/')
}

export function createStatusPage(data) {
  return api.post('/status-pages/', data)
}

export function getStatusPage(id) {
  return api.get(`/status-pages/${id}/`)
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

export function getApmApplication(id) {
  return api.get(`/apm/applications/${id}/`)
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
