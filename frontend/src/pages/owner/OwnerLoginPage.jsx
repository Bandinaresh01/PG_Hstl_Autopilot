import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginOwner, fetchCurrentOwner } from '../../utils/ownerAuth'
import './OwnerLoginPage.css'

export default function OwnerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingInitial, setIsCheckingInitial] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [forgotToast, setForgotToast] = useState(false)

  const navigate = useNavigate()

  // If already authenticated as OWNER, redirect directly to dashboard
  useEffect(() => {
    let mounted = true
    fetchCurrentOwner().then((res) => {
      if (mounted) {
        if (res.authenticated && res.user && res.user.role === 'OWNER') {
          navigate('/owner/dashboard', { replace: true })
        } else {
          setIsCheckingInitial(false)
        }
      }
    })
    return () => {
      mounted = false
    }
  }, [navigate])

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.')
      return
    }

    setIsLoading(true)

    try {
      const result = await loginOwner(email, password)
      if (result && result.authenticated) {
        navigate('/owner/dashboard')
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = (e) => {
    e.preventDefault()
    setForgotToast(true)
    setTimeout(() => setForgotToast(false), 4500)
  }

  const fillDemoCredentials = () => {
    setEmail('owner@urbannest.in')
    setPassword('UrbanNest@2026')
    setErrorMessage('')
  }

  if (isCheckingInitial) {
    return (
      <div className="owner-login-root">
        <div className="owner-login-bg-overlay"></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#64748b' }}>
          <span>Loading Owner Portal...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="owner-login-root">
      {/* Background Ambience Pattern */}
      <div className="owner-login-bg-overlay"></div>

      <div className="owner-login-container">
        {/* Card Box */}
        <div className="owner-login-card">
          {/* Header Brand */}
          <div className="login-card-header">
            <div className="login-brand-badge">
              <span className="login-badge-dot"></span>
              <span>Hostel Management System</span>
            </div>
            <div className="login-brand-title-row">
              <div className="login-brand-logo">UN</div>
              <div>
                <h1 className="login-portal-title">Owner Portal</h1>
                <span className="login-portal-sub">UrbanNest Hostel • Operations</span>
              </div>
            </div>
            <p className="login-desc-text">
              Manage your hostel operations, tenants, bookings and payments.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="login-error-banner" role="alert">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Forgot Password Notification Toast */}
          {forgotToast && (
            <div className="login-info-banner" role="status">
              <span>Password reset instructions will be sent to registered owner email.</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="login-form">
            {/* Field: Owner Email */}
            <div className="login-input-group">
              <label htmlFor="owner-email" className="login-label">
                Email
              </label>
              <div className="input-with-icon">
                <svg className="input-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="owner-email"
                  type="email"
                  className="login-input"
                  placeholder="e.g. owner@urbannest.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Field: Password */}
            <div className="login-input-group">
              <div className="password-label-row">
                <label htmlFor="owner-password" className="login-label">
                  Password
                </label>
                <button
                  type="button"
                  className="btn-forgot-password"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-with-icon">
                <svg className="input-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="owner-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="login-remember-row">
              <label className="remember-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="remember-checkbox"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              className="btn-login-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="login-spinner" aria-hidden="true"></span>
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" x2="19" y1="12" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Demo Access Helper Note */}
          <div className="demo-credentials-note">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="demo-badge">Demo Credentials</span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Auto-fill Demo Owner
              </button>
            </div>
            <p className="demo-text">
              Login: <code>owner@urbannest.in</code> &bull; Password: <code>UrbanNest@2026</code>
            </p>
          </div>

          {/* Secondary Link: Back to Public Website */}
          <div className="login-footer-links">
            <Link to="/" className="link-back-public">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" x2="5" y1="12" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to Public Website</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
