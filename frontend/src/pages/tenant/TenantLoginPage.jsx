import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { loginTenant } from '../../utils/tenantAuth'
import './TenantLoginPage.css'

export default function TenantLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [forgotModalOpen, setForgotModalOpen] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/tenant/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!email.trim()) {
      setErrorMessage('Please enter your email or tenant login ID.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    setIsSubmitting(true)

    try {
      const data = await loginTenant(email, password)

      // Direct according to onboarding completion
      if (data.user && !data.user.onboarding_completed) {
        navigate('/tenant/onboarding', { replace: true })
      } else {
        navigate(from.includes('onboarding') ? '/tenant/dashboard' : from, { replace: true })
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to sign in. Please verify your email and password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="tenant-login-wrapper">
      <div className="tenant-login-card">
        {/* Brand & Heading */}
        <div className="tenant-login-header">
          <div className="tenant-brand-badge">
            <span>🏡</span>
            <span>UrbanNest Hostel • Tenant Portal</span>
          </div>
          <h1 className="tenant-login-title">Welcome Back</h1>
          <p className="tenant-login-subtitle">
            Sign in to manage your stay, payments and hostel services.
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="tenant-error-banner" role="alert">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="tenant-login-form" onSubmit={handleSubmit} noValidate>
          <div className="tenant-form-group">
            <label className="tenant-form-label" htmlFor="tenant-email">
              Email / Tenant Login
            </label>
            <div className="tenant-form-input-wrap">
              <input
                id="tenant-email"
                type="email"
                className="tenant-form-input"
                placeholder="e.g. rahul@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="tenant-form-group">
            <div className="tenant-form-label">
              <label htmlFor="tenant-password">Password</label>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
                onClick={() => setForgotModalOpen(true)}
              >
                Forgot Password?
              </button>
            </div>
            <div className="tenant-form-input-wrap">
              <input
                id="tenant-password"
                type={showPassword ? 'text' : 'password'}
                className="tenant-form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="tenant-password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="tenant-btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                    display: 'inline-block',
                  }}
                />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Demo Helper Callout */}
        <div className="tenant-demo-callout">
          <span className="tenant-demo-title">
            <span>💡</span>
            <span>Tenant Account Access</span>
          </span>
          <span>
            Hostel residents receive account credentials from the hostel owner upon room &amp; bed assignment.
          </span>
        </div>

        {/* Footer Navigation */}
        <div className="tenant-login-footer">
          <Link to="/" className="tenant-btn-back">
            <span>&larr;</span>
            <span>Back to Public Website</span>
          </Link>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            <span>Are you the hostel owner? </span>
            <Link to="/owner/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              Owner CRM Login &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setForgotModalOpen(false)}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Password Reset Assistance</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setForgotModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
              <p style={{ marginTop: 0 }}>
                If you have forgotten your password or haven't received your initial login credentials, please contact the hostel warden or administration office.
              </p>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  UrbanNest Administration Desk:
                </strong>
                <div>Phone: +91 98765 43210</div>
                <div>Email: support@urbannest.in</div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="quick-action-btn primary"
                onClick={() => setForgotModalOpen(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
