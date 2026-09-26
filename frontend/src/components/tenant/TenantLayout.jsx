import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTenantAuth } from '../../utils/tenantAuth'
import './TenantLayout.css'

export default function TenantLayout() {
  const { tenantUser, handleTenantLogout } = useTenantAuth()

  const fullName = tenantUser?.full_name || 'Hostel Resident'
  const userCode = tenantUser?.user_code || 'TEN-1001'
  const roomNumber = tenantUser?.room_number || 'Room 204'
  const bedCode = tenantUser?.bed_code || 'Bed A'
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'TR'

  return (
    <div className="tenant-portal-shell">
      {/* 1. Header */}
      <header className="tenant-header">
        <div className="tenant-header-inner">
          <div className="tenant-brand-group">
            <div className="tenant-brand-icon">🏡</div>
            <div className="tenant-brand-text">
              <span className="tenant-brand-name">UrbanNest Hostel</span>
              <span className="tenant-portal-tag">Resident Portal</span>
            </div>
          </div>

          <div className="tenant-user-controls">
            <div className="tenant-room-badge">
              <span>🛏️</span>
              <span>{roomNumber} • {bedCode}</span>
            </div>

            <div className="tenant-profile-pill">
              <div className="tenant-avatar">{initials}</div>
              <div className="tenant-name-meta">
                <span className="tenant-name-title">{fullName}</span>
                <span className="tenant-code-sub">{userCode}</span>
              </div>
            </div>

            <button
              type="button"
              className="tenant-btn-logout"
              onClick={handleTenantLogout}
              title="Sign out of Resident Portal"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* 2. Navigation Tabs */}
      <nav className="tenant-nav-bar" aria-label="Tenant Portal Sections">
        <div className="tenant-nav-inner">
          <NavLink
            to="/tenant/dashboard"
            className={({ isActive }) => `tenant-nav-tab ${isActive ? 'active' : ''}`}
            end
          >
            <span>📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/tenant/stay"
            className={({ isActive }) => `tenant-nav-tab ${isActive ? 'active' : ''}`}
          >
            <span>🛏️</span>
            <span>My Stay &amp; Room</span>
          </NavLink>
          <NavLink
            to="/tenant/payments"
            className={({ isActive }) => `tenant-nav-tab ${isActive ? 'active' : ''}`}
          >
            <span>💳</span>
            <span>Rent &amp; Receipts</span>
          </NavLink>
          <NavLink
            to="/tenant/services"
            className={({ isActive }) => `tenant-nav-tab ${isActive ? 'active' : ''}`}
          >
            <span>🛠️</span>
            <span>Services &amp; Help</span>
          </NavLink>
        </div>
      </nav>

      {/* 3. Outlet */}
      <main className="tenant-main-content">
        <Outlet />
      </main>
    </div>
  )
}
