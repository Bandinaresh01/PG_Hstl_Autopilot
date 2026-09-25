import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { OwnerAuthContext, fetchCurrentOwner, logoutOwner } from '../../utils/ownerAuth'

export default function OwnerProtectedRoute() {
  const [authState, setAuthState] = useState({
    loading: true,
    authenticated: false,
    user: null,
  })
  const navigate = useNavigate()

  const checkSession = async () => {
    const res = await fetchCurrentOwner()
    setAuthState({
      loading: false,
      authenticated: res.authenticated,
      user: res.user,
    })
  }

  useEffect(() => {
    let active = true
    fetchCurrentOwner().then((res) => {
      if (active) {
        setAuthState({
          loading: false,
          authenticated: res.authenticated,
          user: res.user,
        })
      }
    })
    return () => {
      active = false
    }
  }, [])

  const handleOwnerLogout = async () => {
    await logoutOwner()
    setAuthState({ loading: false, authenticated: false, user: null })
    navigate('/owner/login', { replace: true })
  }

  if (authState.loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#475569' }}>
          Verifying Owner Portal session...
        </span>
      </div>
    )
  }

  // Unauthenticated visitors are redirected to /owner/login
  if (!authState.authenticated || !authState.user) {
    return <Navigate to="/owner/login" replace />
  }

  // Authenticated non-OWNER accounts (e.g. TENANT) are strictly denied access
  if (authState.user.role !== 'OWNER') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '1.25rem',
              fontWeight: 700,
            }}
          >
            !
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f172a' }}>
            Access Denied
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '0.925rem', color: '#64748b', lineHeight: 1.5 }}>
            Your account (<strong>{authState.user.role}</strong>) does not have permission to access the UrbanNest Owner CRM Portal.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleOwnerLogout}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <OwnerAuthContext.Provider
      value={{
        ownerUser: authState.user,
        refreshAuth: checkSession,
        handleOwnerLogout,
      }}
    >
      <Outlet />
    </OwnerAuthContext.Provider>
  )
}
