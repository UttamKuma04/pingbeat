import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateMonitor from './pages/CreateMonitor'
import MonitorDetail from './pages/MonitorDetail'
import Analytics from './pages/Analytics'
import ApmDashboard from './pages/ApmDashboard'
import ApmSdkDocs from './pages/ApmSdkDocs'
import StatusPageManager from './pages/StatusPageManager'
import StatusPage from './pages/StatusPage'
import IncidentsPage from './pages/IncidentsPage'
import LogsExplorer from './pages/LogsExplorer'
import SettingsPage from './pages/SettingsPage'
import LandingPage from './pages/LandingPage'
import AboutPage from './pages/AboutPage'
import ComparePage from './pages/ComparePage'
import CompareHubPage from './pages/CompareHubPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const isAuthenticated = !!localStorage.getItem('access_token')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/status/:slug" element={<StatusPage />} />
        <Route path="/about" element={<AboutPage />} />
        {/* SEO: Comparison pages — highest-intent traffic */}
        <Route path="/compare" element={<CompareHubPage />} />
        <Route path="/compare/pingbeat-vs-:slug" element={<ComparePage />} />
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apm/doc"
          element={<ApmSdkDocs />}
        />
        <Route path="/apm/docs" element={<Navigate to="/apm/doc" replace />} />
        <Route
          path="/apm"
          element={
            <ProtectedRoute>
              <ApmDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/incidents"
          element={
            <ProtectedRoute>
              <IncidentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <LogsExplorer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/status-pages"
          element={
            <ProtectedRoute>
              <StatusPageManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitors/new"
          element={
            <ProtectedRoute>
              <CreateMonitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitors/:id"
          element={
            <ProtectedRoute>
              <MonitorDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitors/:id/edit"
          element={
            <ProtectedRoute>
              <CreateMonitor editMode />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
