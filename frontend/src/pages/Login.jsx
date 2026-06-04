import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import GoogleLoginButton from '../components/GoogleLoginButton'
import { login } from '../services/api'
import SeoHead from '../components/SeoHead'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function saveTokens(data) {
    const accessToken = data.access || data.tokens?.access
    const refreshToken = data.refresh || data.tokens?.refresh

    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  function handleAuthSuccess(data) {
    saveTokens(data)
    navigate('/dashboard', { replace: true })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      const res = await login(normalizedEmail, password)
      saveTokens(res.data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err.response && err.response.data) {
        const data = err.response.data
        if (data.detail) {
          setError(data.detail)
        } else if (data.email) {
          setError(Array.isArray(data.email) ? data.email.join(' ') : data.email)
        } else {
          setError('Invalid credentials. Please try again.')
        }
      } else {
        setError('Network error. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50">
      <SeoHead
        title="Sign In — PingBEAT"
        description="Sign in to your PingBEAT self-hosted uptime monitoring and APM dashboard to manage monitors and route alerts."
        robots="noindex, nofollow"
      />
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <BrandLogo to="/" className="justify-center mb-4" />
          <p className="text-slate-600 text-sm">
            Monitor your services. Stay ahead of downtime.
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-5 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
            Welcome back
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 shadow-sm"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Signing in...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <GoogleLoginButton onSuccess={handleAuthSuccess} onError={setError} text="signin_with" />

          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors duration-200"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
