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

/**
 * Owner-only action: create a Supabase Auth login account for an approved tenant
 * via POST /api/owner/tenants/:tenantId/create-account
 */
export async function createTenantAccount(tenantId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/owner/tenants/${tenantId}/create-account`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create tenant account.')
  }

  return data
}

/**
 * Fetch all payments for owner's hostel via GET /api/owner/payments
 */
export async function fetchOwnerPayments(statusFilter = 'ALL', searchQuery = '', tenantId = '') {
  const params = new URLSearchParams()
  if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter)
  if (searchQuery) params.append('search', searchQuery)
  if (tenantId) params.append('tenant_id', tenantId)

  const url = `${API_BASE_URL}/api/owner/payments${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve owner payments.')
  }
  return data
}

/**
 * Record or update a payment/charge via POST /api/owner/payments
 */
export async function recordOwnerPayment(payload) {
  const response = await fetch(`${API_BASE_URL}/api/owner/payments`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to record payment.')
  }
  return data
}

/**
 * Get single payment details via GET /api/owner/payments/:paymentId
 */
export async function fetchOwnerSinglePayment(paymentId) {
  const response = await fetch(`${API_BASE_URL}/api/owner/payments/${paymentId}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve payment details.')
  }
  return data
}

/**
 * Fetch complaints for owner's hostel via GET /api/owner/complaints
 */
export async function fetchOwnerComplaints(statusFilter = 'ALL', priorityFilter = 'ALL', searchQuery = '') {
  const params = new URLSearchParams()
  if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter)
  if (priorityFilter && priorityFilter !== 'ALL') params.append('priority', priorityFilter)
  if (searchQuery) params.append('search', searchQuery)

  const url = `${API_BASE_URL}/api/owner/complaints${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve complaints.')
  }
  return data
}

/**
 * Fetch a single complaint detail for owner via GET /api/owner/complaints/:complaintId
 */
export async function fetchOwnerSingleComplaint(complaintId) {
  const response = await fetch(`${API_BASE_URL}/api/owner/complaints/${complaintId}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve complaint detail.')
  }
  return data
}

/**
 * Update complaint by owner via PATCH /api/owner/complaints/:complaintId
 */
export async function updateOwnerComplaint(complaintId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/owner/complaints/${complaintId}`, {
    method: 'PATCH',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update complaint.')
  }
  return data
}

/**
 * Fetch all maintenance tasks for owner via GET /api/owner/maintenance
 */
export async function fetchOwnerMaintenance(statusFilter = 'ALL', priorityFilter = 'ALL', searchQuery = '') {
  const params = new URLSearchParams()
  if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter)
  if (priorityFilter && priorityFilter !== 'ALL') params.append('priority', priorityFilter)
  if (searchQuery) params.append('search', searchQuery)

  const url = `${API_BASE_URL}/api/owner/maintenance${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve maintenance tasks.')
  }
  return data
}

/**
 * Create a new maintenance task via POST /api/owner/maintenance
 */
export async function createOwnerMaintenanceTask(payload) {
  const response = await fetch(`${API_BASE_URL}/api/owner/maintenance`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create maintenance task.')
  }
  return data
}

/**
 * Update a maintenance task via PATCH /api/owner/maintenance/:taskId
 */
export async function updateOwnerMaintenanceTask(taskId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/owner/maintenance/${taskId}`, {
    method: 'PATCH',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update maintenance task.')
  }
  return data
}

/**
 * Fetch a single maintenance task by ID via GET /api/owner/maintenance/:taskId
 */
export async function fetchOwnerSingleMaintenance(taskId) {
  const response = await fetch(`${API_BASE_URL}/api/owner/maintenance/${taskId}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve maintenance task.')
  }
  return data
}

/**
 * ============================================================================
 * OWNER VISITOR LOGS & GATE SECURITY HELPERS
 * ============================================================================
 */

/**
 * Fetch all visitor records with filters (status, date, search)
 */
export async function fetchOwnerVisitors(statusFilter = 'ALL', dateFilter = 'ALL', searchQuery = '') {
  const params = new URLSearchParams()
  if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter)
  if (dateFilter && dateFilter !== 'ALL') params.append('date', dateFilter)
  if (searchQuery) params.append('search', searchQuery)

  const url = `${API_BASE_URL}/api/owner/visitors${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve visitor logs.')
  }
  return data
}

/**
 * Fetch a single visitor log by ID
 */
export async function fetchOwnerSingleVisitor(visitorId) {
  const response = await fetch(`${API_BASE_URL}/api/owner/visitors/${visitorId}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to retrieve visitor details.')
  }
  return data
}

/**
 * Approve a visitor pass request and issue pass code
 */
export async function approveOwnerVisitor(visitorId, payload = {}) {
  const response = await fetch(`${API_BASE_URL}/api/owner/visitors/${visitorId}/approve`, {
    method: 'PATCH',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to approve visitor.')
  }
  return data
}

/**
 * Reject a visitor pass request with reason
 */
export async function rejectOwnerVisitor(visitorId, payload = {}) {
  const response = await fetch(`${API_BASE_URL}/api/owner/visitors/${visitorId}/reject`, {
    method: 'PATCH',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to reject visitor.')
  }
  return data
}

/**
 * Record visitor entry / check-in at gate/reception
 */
export async function checkInOwnerVisitor(visitorId, payload = {}) {
  const response = await fetch(`${API_BASE_URL}/api/owner/visitors/${visitorId}/check-in`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to check in visitor.')
  }
  return data
}

/**
 * Record visitor exit / check-out at gate/reception
 */
export async function checkOutOwnerVisitor(visitorId, payload = {}) {
  const response = await fetch(`${API_BASE_URL}/api/owner/visitors/${visitorId}/check-out`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to check out visitor.')
  }
  return data
}

/**
 * Register an instant walk-in visitor at reception
 */
export async function createOwnerWalkInVisitor(payload) {
  const response = await fetch(`${API_BASE_URL}/api/owner/visitors/walk-in`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to register walk-in visitor.')
  }
  return data
}

