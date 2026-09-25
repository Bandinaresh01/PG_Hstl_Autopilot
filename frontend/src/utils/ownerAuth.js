/**
 * Real Owner Authentication & API Helper
 * Communicates with Flask backend (/api/auth/* and /api/owner/*)
 * using HttpOnly cookies (credentials: 'include') + Bearer token header support.
 * No passwords or Supabase secret keys are ever stored or exposed in the browser.
 */

import { createContext, useContext } from 'react'
import { API_BASE_URL } from '../config/api'

export const OwnerAuthContext = createContext({
  ownerUser: null,
  refreshAuth: async () => {},
  handleOwnerLogout: async () => {},
})

export function useOwnerAuth() {
  return useContext(OwnerAuthContext)
}

const TOKEN_STORAGE_KEY = 'urbannest_owner_access_token'

export function getStoredAccessToken() {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) || ''
}

export function setStoredAccessToken(token) {
  if (typeof window === 'undefined') return
  if (token) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export function buildAuthHeaders(extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }
  const token = getStoredAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Authenticate owner via POST /api/auth/login
 */
export async function loginOwner(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
    setStoredAccessToken(data.access_token)
  }

  return data
}

/**
 * Verify current authenticated session via GET /api/auth/me
 */
export async function fetchCurrentOwner() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: buildAuthHeaders(),
      credentials: 'include',
    })

    if (!response.ok) {
      setStoredAccessToken('')
      return { authenticated: false, user: null }
    }

    const data = await response.json()
    if (data && data.authenticated && data.user) {
      return { authenticated: true, user: data.user }
    }

    setStoredAccessToken('')
    return { authenticated: false, user: null }
  } catch {
    return { authenticated: false, user: null }
  }
}

/**
 * Sign out owner via POST /api/auth/logout
 */
export async function logoutOwner() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      credentials: 'include',
    })
  } catch {
    // Proceed with local cleanup even if network fails
  } finally {
    setStoredAccessToken('')
  }
}

/**
 * Fetch protected Owner Dashboard metrics & real Supabase enquiries
 * via GET /api/owner/dashboard
 */
export async function fetchOwnerDashboard() {
  const response = await fetch(`${API_BASE_URL}/api/owner/dashboard`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.error || 'Failed to load dashboard data.')
    error.status = response.status
    throw error
  }

  return data
}
