/**
 * Real Tenant Authentication & API Helper
 * Communicates with Flask backend (/api/tenant/* and /api/auth/*)
 * using HttpOnly cookies (credentials: 'include') + Bearer token header support.
 * Strict data isolation: tenants only access their own profile and stay.
 */

import { createContext, useContext } from 'react'
import { API_BASE_URL } from '../config/api'

export const TenantAuthContext = createContext({
  tenantUser: null,
  refreshTenantAuth: async () => {},
  handleTenantLogout: async () => {},
})

export function useTenantAuth() {
  return useContext(TenantAuthContext)
}

const TENANT_TOKEN_KEY = 'urbannest_tenant_access_token'
const TENANT_USER_CACHE_KEY = 'urbannest_tenant_user_cache'

export function getStoredTenantToken() {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(TENANT_TOKEN_KEY) || localStorage.getItem(TENANT_TOKEN_KEY) || ''
}

export function setStoredTenantToken(token) {
  if (typeof window === 'undefined') return
  if (token) {
    sessionStorage.setItem(TENANT_TOKEN_KEY, token)
    localStorage.setItem(TENANT_TOKEN_KEY, token)
  } else {
    sessionStorage.removeItem(TENANT_TOKEN_KEY)
    localStorage.removeItem(TENANT_TOKEN_KEY)
  }
}

export function getCachedTenantUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(TENANT_USER_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCachedTenantUser(user) {
  if (typeof window === 'undefined') return
  if (user) {
    localStorage.setItem(TENANT_USER_CACHE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(TENANT_USER_CACHE_KEY)
  }
}

export function buildTenantAuthHeaders(extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }
  const token = getStoredTenantToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Authenticate tenant resident via POST /api/tenant/login
 */
export async function loginTenant(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/tenant/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: email.trim(), password }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Authentication failed. Please check your credentials.')
  }

  if (data.access_token) {
    setStoredTenantToken(data.access_token)
  }
  if (data.user) {
    setCachedTenantUser(data.user)
  }

  return data
}

/**
 * Verify current authenticated tenant session via GET /api/auth/me
 */
export async function fetchCurrentTenant() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: buildTenantAuthHeaders(),
      credentials: 'include',
    })

    if (!response.ok) {
      setStoredTenantToken('')
      setCachedTenantUser(null)
      return { authenticated: false, user: null }
    }

    const data = await response.json()
    if (data && data.authenticated && data.user && data.user.role === 'TENANT') {
      setCachedTenantUser(data.user)
      return { authenticated: true, user: data.user }
    }

    setStoredTenantToken('')
    setCachedTenantUser(null)
    return { authenticated: false, user: null }
  } catch {
    return { authenticated: false, user: null }
  }
}

/**
 * Complete first-time tenant onboarding via POST /api/tenant/onboarding/complete
 */
export async function completeTenantOnboarding(payload) {
  const response = await fetch(`${API_BASE_URL}/api/tenant/onboarding/complete`, {
    method: 'POST',
    headers: buildTenantAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Failed to complete onboarding.')
  }

  // Update cached user onboarding status
  const cached = getCachedTenantUser()
  if (cached) {
    cached.onboarding_completed = true
    setCachedTenantUser(cached)
  }

  return data
}

/**
 * Fetch tenant's isolated dashboard and stay data via GET /api/tenant/portal/data
 */
export async function fetchTenantPortalData() {
  const response = await fetch(`${API_BASE_URL}/api/tenant/portal/data`, {
    method: 'GET',
    headers: buildTenantAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Failed to load tenant portal data.')
  }

  return data
}

/**
 * Log out tenant via POST /api/auth/logout
 */
export async function logoutTenant() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Ignore network error on logout
  } finally {
    setStoredTenantToken('')
    setCachedTenantUser(null)
  }
}

/**
 * Fetch payments strictly belonging to the authenticated tenant
 * via GET /api/tenant/me/payments
 */
export async function fetchTenantPayments(statusFilter = 'ALL', searchQuery = '') {
  const params = new URLSearchParams()
  if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter)
  if (searchQuery) params.append('search', searchQuery)

  const url = `${API_BASE_URL}/api/tenant/me/payments${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildTenantAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve payment records.')
  }
  return data
}

/**
 * Fetch high-level payment summary and current due for authenticated tenant
 * via GET /api/tenant/me/payment-summary
 */
export async function fetchTenantPaymentSummary() {
  const response = await fetch(`${API_BASE_URL}/api/tenant/me/payment-summary`, {
    method: 'GET',
    headers: buildTenantAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve payment summary.')
  }
  return data
}

/**
 * Fetch a single payment detail for authenticated tenant
 * via GET /api/tenant/me/payments/:paymentId
 */
export async function fetchTenantSinglePayment(paymentId) {
  const response = await fetch(`${API_BASE_URL}/api/tenant/me/payments/${paymentId}`, {
    method: 'GET',
    headers: buildTenantAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve payment detail.')
  }
  return data
}

