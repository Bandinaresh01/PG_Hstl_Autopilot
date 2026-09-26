import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchOwnerDashboard, useOwnerAuth } from '../../utils/ownerAuth'
import { initialRooms, getRoomStats } from '../../data/roomsData'
import { initialTenants, calculateStayDuration, getTenantStats } from '../../data/tenantsData'
import './OwnerDashboardPage.css'

export default function OwnerDashboardPage() {
  const { ownerUser } = useOwnerAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [quickActionNotice, setQuickActionNotice] = useState(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await fetchOwnerDashboard()
      setDashboardData(data)
    } catch (err) {
      setLoadError(err.message || 'Unable to load owner dashboard data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchOwnerDashboard()
      .then((data) => {
        if (active) {
          setDashboardData(data)
          setLoadError(null)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err.message || 'Unable to load owner dashboard data.')
          setIsLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const handleQuickAction = (actionTitle) => {
    setQuickActionNotice(actionTitle)
    setTimeout(() => setQuickActionNotice(null), 3500)
  }

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = ownerUser?.full_name?.split(' ')[0] || 'Rajesh'
  const hostelName = ownerUser?.hostel_name || 'UrbanNest'

  if (isLoading && !dashboardData) {
    return (
      <div className="owner-dashboard-view" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>
            Loading dashboard data from Supabase...
          </p>
        </div>
      </div>
    )
  }

  if (loadError && !dashboardData) {
    return (
      <div className="owner-dashboard-view" style={{ padding: '24px' }}>
        <div className="login-error-banner" style={{ margin: '40px auto', maxWidth: '520px' }}>
          <span>{loadError}</span>
          <button
            type="button"
            onClick={loadData}
            style={{
              marginLeft: '12px',
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const roomStats = getRoomStats(initialRooms)
  const tenantStats = getTenantStats(initialTenants)

  const summary = {
    total_beds: dashboardData?.summary?.total_beds || roomStats.totalBeds,
    occupied_beds: dashboardData?.summary?.occupied_beds || roomStats.occupiedBeds,
    available_beds: dashboardData?.summary?.available_beds || roomStats.availableBeds,
    current_tenants: dashboardData?.summary?.current_tenants || tenantStats.totalTenants,
  }

  const enquiriesKpi = dashboardData?.enquiries || {
    new: 0,
    interested: 0,
    visit_scheduled: 0,
    booked: 0,
    total: 0,
  }

  const recentEnquiries = dashboardData?.recent_enquiries || []
  const alerts = dashboardData?.alerts || []
  const recentActivity = dashboardData?.recent_activity || []

  return (
    <div className="owner-dashboard-view">
      {/* Toast Notice for Unbuilt Quick Actions */}
      {quickActionNotice && (
        <div className="quick-action-toast" role="status">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            <strong>{quickActionNotice}</strong>: Module coming soon in the next release.
          </span>
        </div>
      )}

      {/* ==================================================
          1. INTRODUCTION & GREETING ROW
      ================================================== */}
      <section className="dashboard-intro-row">
        <div className="dashboard-greeting-block">
          <h2 className="dashboard-greeting-title">
            {getGreeting()}, {firstName} 👋
          </h2>
          <p className="dashboard-greeting-desc">
            Here’s what’s happening at {hostelName} today.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="quick-actions-bar">
          <button
            type="button"
            className="quick-action-btn primary"
            onClick={() => handleQuickAction('Add Tenant')}
          >
            <span className="btn-icon">+</span>
            <span>Add Tenant</span>
          </button>
          <Link
            to="/owner/bookings"
            className="quick-action-btn"
            style={{ textDecoration: 'none' }}
          >
            <span className="btn-icon">+</span>
            <span>Bookings</span>
          </Link>
          <Link
            to="/owner/payments"
            className="quick-action-btn"
            style={{ textDecoration: 'none' }}
          >
            <span className="btn-icon">₹</span>
            <span>Record Payment</span>
          </Link>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => handleQuickAction('Add Visitor')}
          >
            <span className="btn-icon">👤</span>
            <span>Add Visitor</span>
          </button>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => handleQuickAction('Create Announcement')}
          >
            <span className="btn-icon">📢</span>
            <span>Create Announcement</span>
          </button>
        </div>
      </section>

      {/* ==================================================
          2. IMPORTANT REAL DATA ALERTS
      ================================================== */}
      {alerts.length > 0 && (
        <section className="important-alerts-grid">
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert-card alert-${alert.severity}`}>
              <div className="alert-content-left">
                <strong className="alert-card-title">{alert.title}</strong>
                <p className="alert-card-desc">{alert.description}</p>
              </div>
              <Link to={alert.action_link} className="alert-action-link">
                <span>{alert.action_text}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* ==================================================
          3. TOP KPI CARDS: SUMMARY CAPACITY & OCCUPANCY
      ================================================== */}
      <section className="kpi-primary-grid">
        <Link to="/owner/rooms" className="kpi-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Beds</span>
            <div className="kpi-card-icon icon-beds">🛏️</div>
          </div>
          <div className="kpi-card-number">{summary.total_beds}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">{roomStats.totalRooms} Rooms</span>
            <span className="kpi-sub-text">View inventory &rarr;</span>
          </div>
        </Link>

        <Link to="/owner/rooms" className="kpi-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label">Occupied Beds</span>
            <div className="kpi-card-icon icon-occupied">👥</div>
          </div>
          <div className="kpi-card-number">{summary.occupied_beds}</div>
          <div className="kpi-card-footer">
            <span
              className="kpi-badge-neutral"
              style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
            >
              {Math.round((summary.occupied_beds / (summary.total_beds || 1)) * 100)}% Occupancy
            </span>
            <span className="kpi-sub-text">Active residents</span>
          </div>
        </Link>

        <Link to="/owner/rooms" className="kpi-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label">Available Beds</span>
            <div className="kpi-card-icon icon-available">✨</div>
          </div>
          <div className="kpi-card-number" style={{ color: '#16a34a' }}>
            {summary.available_beds}
          </div>
          <div className="kpi-card-footer">
            <span
              className="kpi-badge-neutral"
              style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}
            >
              Ready to Book
            </span>
            <span className="kpi-sub-text">Assign bed &rarr;</span>
          </div>
        </Link>

        <Link to="/owner/tenants" className="kpi-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label">Current Tenants</span>
            <div className="kpi-card-icon icon-tenants">📋</div>
          </div>
          <div className="kpi-card-number">{summary.current_tenants}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">Directory &amp; KYC</span>
            <span className="kpi-sub-text">View profiles &rarr;</span>
          </div>
        </Link>
      </section>

      {/* ==================================================
          4. ENQUIRY KPIS — REAL SUPABASE DATA
      ================================================== */}
      <section className="kpi-primary-grid" style={{ marginTop: '16px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">New Enquiries</span>
            <div className="kpi-card-icon icon-enquiries" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>📩</div>
          </div>
          <div className="kpi-card-number">{enquiriesKpi.new}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>Real Supabase data</span>
            <span className="kpi-sub-text">Awaiting owner contact</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Interested</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>💬</div>
          </div>
          <div className="kpi-card-number">{enquiriesKpi.interested}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">Follow-up stage</span>
            <span className="kpi-sub-text">Active leads</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Visit Scheduled</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}>🗓️</div>
          </div>
          <div className="kpi-card-number">{enquiriesKpi.visit_scheduled}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">Hostel tours</span>
            <span className="kpi-sub-text">Planned walkthroughs</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Booked</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>✅</div>
          </div>
          <div className="kpi-card-number">{enquiriesKpi.booked}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">Converted</span>
            <span className="kpi-sub-text">Token received</span>
          </div>
        </div>
      </section>

      {/* ==================================================
          5. RECENT ENQUIRIES — REAL SUPABASE DATA TABLE
      ================================================== */}
      <section className="dashboard-section" style={{ marginTop: '24px' }}>
        <div className="section-card-header">
          <div>
            <h3 className="section-title">Recent Enquiries</h3>
            <p className="section-subtitle">
              Live prospective tenant leads received from the public website (Supabase <code>enquiries</code> table).
            </p>
          </div>
          <Link to="/owner/leads" className="view-all-link">
            <span>View All Enquiries</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        {recentEnquiries.length === 0 ? (
          <div className="card-empty-state">
            <span className="empty-icon">📬</span>
            <p className="empty-title">No enquiries received yet.</p>
            <p className="empty-desc">
              When prospective tenants submit the public enquiry form, their details will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="enquiries-table-wrapper">
            <table className="enquiries-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Preferred Room</th>
                  <th>Expected Move-In</th>
                  <th>Occupation</th>
                  <th>Status</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {recentEnquiries.map((enq) => {
                  const createdDate = enq.created_at
                    ? new Date(enq.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recent'

                  return (
                    <tr key={enq.id}>
                      <td>
                        <strong className="tenant-cell-name">{enq.name}</strong>
                        {enq.email && (
                          <span className="tenant-cell-sub">{enq.email}</span>
                        )}
                      </td>
                      <td>
                        <span className="enquiry-phone">{enq.phone}</span>
                      </td>
                      <td>
                        <span className="enquiry-room-tag">{enq.preferred_room}</span>
                      </td>
                      <td>{enq.move_in_date}</td>
                      <td>{enq.occupation}</td>
                      <td>
                        <span className={`status-pill pill-${(enq.status || 'new').toLowerCase().replace(' ', '_')}`}>
                          {enq.status}
                        </span>
                      </td>
                      <td>
                        <span className="enquiry-date">{createdDate}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ==================================================
          6. FINANCIAL DASHBOARD PREVIEW & RENT OVERVIEW
      ================================================== */}
      <section className="dashboard-grid-two-col" style={{ marginTop: '24px' }}>
        {/* Financial KPI Cards */}
        <div className="financial-preview-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Rent &amp; Collections</h3>
              <p className="section-subtitle">Monthly rent ledger tracking (Payments module)</p>
            </div>
            <Link to="/owner/payments" className="view-all-link">
              <span>Payments Ledger</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="financial-kpi-subgrid">
            <div className="fin-card">
              <span className="fin-label">Expected Rent</span>
              <span className="fin-value">₹4,55,000</span>
              <span className="fin-sub">September cycle</span>
            </div>
            <div className="fin-card">
              <span className="fin-label">Collected Rent</span>
              <span className="fin-value" style={{ color: '#16a34a' }}>₹3,82,500</span>
              <span className="fin-sub">84.1% realized</span>
            </div>
            <div className="fin-card">
              <span className="fin-label">Pending Rent</span>
              <span className="fin-value" style={{ color: '#b45309' }}>₹72,500</span>
              <span className="fin-sub">Due this cycle</span>
            </div>
            <div className="fin-card">
              <span className="fin-label">Overdue Rent</span>
              <span className="fin-value" style={{ color: '#dc2626' }}>₹24,000</span>
              <span className="fin-sub">Action required</span>
            </div>
          </div>
        </div>

        {/* Monthly Rent Chart Placeholder */}
        <div className="financial-preview-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Monthly Rent Overview</h3>
              <p className="section-subtitle">Visual cash flow breakdown</p>
            </div>
            <Link to="/owner/payments" className="view-all-link">
              <span>View Trends</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="card-empty-state" style={{ minHeight: '160px' }}>
            <span className="empty-icon">📊</span>
            <p className="empty-title">No payment data available yet.</p>
            <p className="empty-desc">
              Charts will display Expected, Collected, Pending, and Overdue breakdowns once payment records are created.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================
          7. OCCUPANCY OVERVIEW & UPCOMING MOVE-INS
      ================================================== */}
      <section className="dashboard-grid-two-col" style={{ marginTop: '24px' }}>
        {/* Occupancy Overview Card */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Occupancy Overview</h3>
              <p className="section-subtitle">Live room &amp; bed allocation</p>
            </div>
            <Link to="/owner/rooms" className="view-all-link">
              <span>Manage Rooms</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0 4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: 600 }}>OCCUPIED</span>
                <strong style={{ fontSize: '1.2rem', color: '#1d4ed8' }}>{roomStats.occupiedBeds}</strong>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Beds ({Math.round((roomStats.occupiedBeds / (roomStats.totalBeds || 1)) * 100)}%)</span>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block', fontWeight: 600 }}>AVAILABLE</span>
                <strong style={{ fontSize: '1.2rem', color: '#15803d' }}>{roomStats.availableBeds}</strong>
                <span style={{ fontSize: '0.7rem', color: '#166534', display: 'block' }}>Ready to assign</span>
              </div>
              <div style={{ backgroundColor: '#f5f3ff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd6fe', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#6d28d9', display: 'block', fontWeight: 600 }}>RESERVED</span>
                <strong style={{ fontSize: '1.2rem', color: '#7c3aed' }}>{roomStats.reservedBeds}</strong>
                <span style={{ fontSize: '0.7rem', color: '#6d28d9', display: 'block' }}>Move-ins queued</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: '#475569', paddingTop: '4px' }}>
              <span>Total Inventory: <strong>12 Rooms • 23 Beds</strong></span>
              <Link to="/owner/rooms" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                View Floor Plans &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Upcoming Move-Ins Card */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Upcoming Move-Ins</h3>
              <p className="section-subtitle">Confirmed upcoming tenant check-ins</p>
            </div>
            <Link to="/owner/bookings" className="view-all-link">
              <span>View Bookings</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="card-empty-state" style={{ minHeight: '140px' }}>
            <span className="empty-icon">🧳</span>
            <p className="empty-title">Check-ins queued for this week.</p>
            <p className="empty-desc">
              Priya Reddy (Sep 28), Kavita Nair (Sep 29), and Rahul Kumar (Oct 01) are scheduled for admission.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================
          8. RENT DUE / OVERDUE & UPCOMING STAY END DATES
      ================================================== */}
      <section className="dashboard-grid-two-col" style={{ marginTop: '24px' }}>
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Rent Due / Overdue</h3>
              <p className="section-subtitle">Tenants with outstanding payments</p>
            </div>
            <Link to="/owner/dues" className="view-all-link">
              <span>Due Timeline</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="card-empty-state" style={{ minHeight: '130px' }}>
            <span className="empty-icon">💳</span>
            <p className="empty-title">3 overdue accounts require attention.</p>
            <p className="empty-desc">
              Rahul Kumar (₹8,500), Manish Sharma (₹5,500), and Anil Teja (₹8,500) have overdue rent balances.
            </p>
          </div>
        </div>

        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Upcoming Stay End Dates</h3>
              <p className="section-subtitle">Expiring agreements and notice periods</p>
            </div>
            <Link to="/owner/tenants" className="view-all-link">
              <span>View Tenants</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0 4px' }}>
            {initialTenants
              .filter((t) => t.status !== 'MOVED_OUT')
              .map((t) => ({ ...t, stay: calculateStayDuration(t.expectedEndDate) }))
              .filter((t) => t.stay.isEndingSoon)
              .sort((a, b) => (a.stay.daysDiff ?? 999) - (b.stay.daysDiff ?? 999))
              .slice(0, 3)
              .map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{t.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {t.roomNumber} • {t.bedCode} ({t.roomType})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                      }}
                    >
                      {t.stay.label}
                    </span>
                    <Link
                      to="/owner/tenants"
                      style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Profile &rarr;
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          9. COMPLAINTS, MAINTENANCE, VISITORS, EXPENSES
      ================================================== */}
      <section className="dashboard-grid-four-col" style={{ marginTop: '24px' }}>
        {/* Open Complaints */}
        <Link
          to="/owner/complaints?status=open"
          className="dashboard-mini-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="mini-card-head">
            <span className="mini-card-title">Open Complaints</span>
            <span
              className="mini-card-badge"
              style={{
                backgroundColor: (dashboardData?.operations?.open_complaints ?? 0) > 0 ? '#eff6ff' : '#f1f5f9',
                color: (dashboardData?.operations?.open_complaints ?? 0) > 0 ? '#1d4ed8' : '#64748b',
                fontWeight: 700,
              }}
            >
              {dashboardData?.operations?.open_complaints ?? 0}
            </span>
          </div>
          <div className="card-empty-state-mini">
            <span className="empty-icon-mini">🛠️</span>
            <p className="empty-text-mini">
              {(dashboardData?.operations?.open_complaints ?? 0) > 0
                ? `${dashboardData.operations.open_complaints} active complaints need attention.`
                : 'No open complaints.'}
            </p>
          </div>
          <div style={{ padding: '0 14px 10px', fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
            Manage Complaints &rarr;
          </div>
        </Link>

        {/* Maintenance Attention */}
        <Link
          to="/owner/maintenance"
          className="dashboard-mini-card"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="mini-card-head">
            <span className="mini-card-title">Maintenance Attention</span>
            <span
              className="mini-card-badge"
              style={{
                backgroundColor: (dashboardData?.operations?.maintenance_attention ?? 0) > 0 ? '#fff7ed' : '#f1f5f9',
                color: (dashboardData?.operations?.maintenance_attention ?? 0) > 0 ? '#c2410c' : '#64748b',
                fontWeight: 700,
              }}
            >
              {dashboardData?.operations?.maintenance_attention ?? 0}
            </span>
          </div>
          <div className="card-empty-state-mini">
            <span className="empty-icon-mini">🔧</span>
            <p className="empty-text-mini">
              {(dashboardData?.operations?.maintenance_attention ?? 0) > 0
                ? `${dashboardData.operations.maintenance_attention} tasks scheduled or in progress.`
                : 'No urgent maintenance items.'}
            </p>
          </div>
          <div style={{ padding: '0 14px 10px', fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
            Track Work Orders &rarr;
          </div>
        </Link>

        {/* Today's Visitors */}
        <div className="dashboard-mini-card">
          <div className="mini-card-head">
            <span className="mini-card-title">Today&apos;s Visitors</span>
            <span className="mini-card-badge">0</span>
          </div>
          <div className="card-empty-state-mini">
            <span className="empty-icon-mini">🚪</span>
            <p className="empty-text-mini">No visitor activity today.</p>
          </div>
        </div>

        {/* This Month's Expenses */}
        <div className="dashboard-mini-card">
          <div className="mini-card-head">
            <span className="mini-card-title">This Month&apos;s Expenses</span>
            <span className="mini-card-badge">₹0</span>
          </div>
          <div className="card-empty-state-mini">
            <span className="empty-icon-mini">🧾</span>
            <p className="empty-text-mini">No expense records yet.</p>
          </div>
        </div>
      </section>

      {/* ==================================================
          10. RECENT ACTIVITY — DRIVEN BY REAL SUPABASE ENQUIRIES
      ================================================== */}
      <section className="dashboard-section" style={{ marginTop: '24px', marginBottom: '32px' }}>
        <div className="section-card-header">
          <div>
            <h3 className="section-title">Recent Activity</h3>
            <p className="section-subtitle">Real-time operational activity log</p>
          </div>
        </div>
        {recentActivity.length === 0 ? (
          <div className="card-empty-state">
            <span className="empty-icon">⏳</span>
            <p className="empty-title">No recent activity recorded yet.</p>
            <p className="empty-desc">Operational events will appear here in chronological order.</p>
          </div>
        ) : (
          <div className="activity-timeline">
            {recentActivity.map((act) => {
              const timeFormatted = act.created_at
                ? new Date(act.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                : 'Just now'

              return (
                <div key={act.id} className="activity-item">
                  <div className="activity-dot-icon">📩</div>
                  <div className="activity-details">
                    <strong className="activity-title">{act.text}</strong>
                    <span className="activity-sub">{act.subtext}</span>
                  </div>
                  <span className="activity-time">{timeFormatted}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
