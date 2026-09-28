import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useTenantAuth, completeTenantOnboarding } from '../../utils/tenantAuth'
import './TenantOnboardingPage.css'
import './TenantLoginPage.css'

export default function TenantOnboardingPage() {
  const { tenantUser, refreshTenantAuth, handleTenantLogout } = useTenantAuth()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emergencyContact, setEmergencyContact] = useState(
    tenantUser?.emergency_contact || '+91 98765 00001 (Father)'
  )
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (tenantUser?.onboarding_completed) {
    return <Navigate to="/tenant/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!newPassword || newPassword.length < 8) {
      setErrorMsg('Please choose a password with at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.')
      return
    }

    if (!rulesAccepted) {
      setErrorMsg('Please agree to the hostel guidelines and code of conduct.')
      return
    }

    setIsSubmitting(true)

    try {
      await completeTenantOnboarding({
        new_password: newPassword,
        confirm_password: confirmPassword,
        emergency_contact: emergencyContact.trim(),
        rules_accepted: true,
      })

      // Refresh auth state so tenantUser.onboarding_completed becomes true
      await refreshTenantAuth()
      navigate('/tenant/dashboard', { replace: true })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete onboarding. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="tenant-onboarding-view">
      <div className="onboarding-container">
        {/* Header Hero Card */}
        <div className="onboarding-header-card">
          <div className="onboarding-tag">
            <span>✨</span>
            <span>Welcome Resident</span>
          </div>
          <h1 className="onboarding-title">
            Welcome to UrbanNest, {tenantUser?.full_name?.split(' ')[0] || 'Resident'}!
          </h1>
          <p className="onboarding-subtitle">
            Your login account has been initialized by the hostel management.
            Please set your personal password and verify your accommodation details to activate your portal.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="onboarding-steps-bar">
          <div className="step-indicator active" />
          <div className="step-indicator active" />
          <div className="step-indicator active" />
        </div>

        {/* Main Onboarding Form */}
        <div className="onboarding-card">
          {errorMsg && (
            <div className="tenant-error-banner" role="alert">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. Room & Bed Assignment Verification */}
            <div>
              <div className="onboarding-section-head">
                <h3 className="onboarding-section-title">
                  <span>🛏️</span>
                  <span>1. Verify Your Room &amp; Bed Allocation</span>
                </h3>
                <p className="onboarding-section-desc">
                  This allocation has been registered by the hostel owner.
                </p>
              </div>

              <div className="resident-verify-grid" style={{ marginTop: '12px' }}>
                <div className="verify-item">
                  <span className="verify-label">Resident Name</span>
                  <span className="verify-val">{tenantUser?.full_name || 'Resident'}</span>
                </div>
                <div className="verify-item">
                  <span className="verify-label">Tenant ID</span>
                  <span className="verify-val" style={{ color: '#2563eb' }}>
                    {tenantUser?.user_code || 'TEN-1001'}
                  </span>
                </div>
                <div className="verify-item">
                  <span className="verify-label">Room &amp; Bed</span>
                  <span className="verify-val" style={{ color: '#16a34a' }}>
                    {tenantUser?.room_number || 'Room 204'} • {tenantUser?.bed_code || 'Bed A'}
                  </span>
                </div>
                <div className="verify-item">
                  <span className="verify-label">Move-In Date</span>
                  <span className="verify-val">{tenantUser?.move_in_date || '2026-09-01'}</span>
                </div>
              </div>
            </div>

            {/* 2. Set Permanent Password */}
            <div>
              <div className="onboarding-section-head">
                <h3 className="onboarding-section-title">
                  <span>🔒</span>
                  <span>2. Set Your Secure Permanent Password</span>
                </h3>
                <p className="onboarding-section-desc">
                  Replace the temporary password provided by the owner with your private password.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
                <div className="tenant-form-group">
                  <label className="tenant-form-label" htmlFor="new-password">
                    New Password (minimum 8 characters) *
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    className="tenant-form-input"
                    placeholder="Enter your new permanent password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="tenant-form-group">
                  <label className="tenant-form-label" htmlFor="confirm-password">
                    Confirm New Password *
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    className="tenant-form-input"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* 3. Emergency Guardian Contact */}
            <div>
              <div className="onboarding-section-head">
                <h3 className="onboarding-section-title">
                  <span>📞</span>
                  <span>3. Emergency Guardian Contact</span>
                </h3>
                <p className="onboarding-section-desc">
                  Required for hostel security and medical emergency records.
                </p>
              </div>

              <div style={{ marginTop: '14px' }}>
                <input
                  type="text"
                  className="tenant-form-input"
                  placeholder="e.g. +91 98765 43210 (Father)"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* 4. Hostel Code of Conduct Agreement */}
            <div>
              <div className="onboarding-section-head">
                <h3 className="onboarding-section-title">
                  <span>📜</span>
                  <span>4. Hostel Code of Conduct &amp; Rules</span>
                </h3>
                <p className="onboarding-section-desc">
                  Please review and acknowledge the key community guidelines.
                </p>
              </div>

              <div className="rules-checklist" style={{ marginTop: '14px' }}>
                <div className="rule-check-item">
                  <span>✓</span>
                  <span><strong>Quiet Hours:</strong> Maintain reasonable silence in corridors and shared rooms between 10:30 PM and 6:30 AM.</span>
                </div>
                <div className="rule-check-item">
                  <span>✓</span>
                  <span><strong>Gate Curfew:</strong> Main hostel entrance closes at 10:30 PM daily. Late passes must be requested in advance.</span>
                </div>
                <div className="rule-check-item">
                  <span>✓</span>
                  <span><strong>Cleanliness:</strong> Keep shared washrooms and room spaces tidy. Daily housekeeping is provided for common areas.</span>
                </div>
                <label className="rule-check-item" style={{ marginTop: '8px', cursor: 'pointer', padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={rulesAccepted}
                    onChange={(e) => setRulesAccepted(e.target.checked)}
                    required
                  />
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    I acknowledge and agree to abide by all UrbanNest Hostel community rules and payment terms.
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={handleTenantLogout}
              >
                Sign Out
              </button>

              <button
                type="submit"
                className="tenant-btn-submit"
                style={{ width: 'auto', padding: '12px 24px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Activating Portal...' : 'Complete Setup & Access Portal →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
