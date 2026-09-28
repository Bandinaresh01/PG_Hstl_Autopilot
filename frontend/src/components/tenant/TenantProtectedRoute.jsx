import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  TenantAuthContext,
  fetchCurrentTenant,
  logoutTenant,
  getCachedTenantUser,
} from '../../utils/tenantAuth'

export default function TenantProtectedRoute() {
  const cached = getCachedTenantUser()
  const [authState, setAuthState] = useState({
    loading: !cached,
    authenticated: Boolean(cached && cached.role === 'TENANT'),
    user: cached && cached.role === 'TENANT' ? cached : null,
  })
  const navigate = useNavigate()
  const location = useLocation()

  const refreshTenantAuth = async () => {
    const res = await fetchCurrentTenant()
    setAuthState({
      loading: false,
      authenticated: res.authenticated,
      user: res.user,
    })
    return res
  }

  useEffect(() => {
    let active = true
    fetchCurrentTenant().then((res) => {
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

  const handleTenantLogout = async () => {
    await logoutTenant()
    setAuthState({ loading: false, authenticated: false, user: null })
    navigate('/tenant/login', { replace: true })
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
          Verifying Tenant Portal session...
        </span>
      </div>
    )
  }

  // 1. Unauthenticated users are redirected to /tenant/login
  if (!authState.authenticated || !authState.user) {
    return <Navigate to="/tenant/login" replace state={{ from: location }} />
  }

  // 2. Strict Role Protection: If an OWNER tries to view /tenant/*
  if (authState.user.role === 'OWNER') {
    return <Navigate to="/owner/dashboard" replace />
  }

  if (authState.user.role !== 'TENANT') {
    return <Navigate to="/tenant/login" replace />
  }

  // 3. First-Time Onboarding Gate
  // If onboarding is NOT completed, force redirect to /tenant/onboarding
  const isOnboardingRoute = location.pathname.includes('/tenant/onboarding')
  if (!authState.user.onboarding_completed && !isOnboardingRoute) {
    return <Navigate to="/tenant/onboarding" replace />
  }

  // If onboarding IS completed, prevent re-entering /tenant/onboarding
  if (authState.user.onboarding_completed && isOnboardingRoute) {
    return <Navigate to="/tenant/dashboard" replace />
  }

  return (
    <TenantAuthContext.Provider
      value={{
        tenantUser: authState.user,
        refreshTenantAuth,
        handleTenantLogout,
      }}
    >
      <Outlet />
    </TenantAuthContext.Provider>
  )
}
