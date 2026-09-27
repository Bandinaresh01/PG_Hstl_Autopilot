import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchOwnerDashboard, useOwnerAuth } from '../../utils/ownerAuth'
import './OwnerDashboardPage.css'

export default function OwnerDashboardPage() {
  const { ownerUser } = useOwnerAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

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

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const firstName = ownerUser?.full_name?.split(' ')[0] || 'Rajesh'
  const hostelName = ownerUser?.hostel_name || 'UrbanNest Hostel'

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

  const summary = {
    total_rooms: dashboardData?.summary?.total_rooms || 0,
    total_beds: dashboardData?.summary?.total_beds || 0,
    occupied_beds: dashboardData?.summary?.occupied_beds || 0,
    available_beds: dashboardData?.summary?.available_beds || 0,
    reserved_beds: dashboardData?.summary?.reserved_beds || 0,
    maintenance_beds: dashboardData?.summary?.maintenance_beds || 0,
    current_tenants: dashboardData?.summary?.current_tenants || 0,
    occupancy_rate: dashboardData?.summary?.occupancy_rate || 0,
  }

  const financials = dashboardData?.financials || {
    expected_rent: 0,
    collected_rent: 0,
    pending_rent: 0,
    overdue_rent: 0,
    monthly_expenses: 0,
  }

  const enquiriesKpi = dashboardData?.enquiries || {
    new: 0,
    interested: 0,
    visit_scheduled: 0,
    booked: 0,
    total: 0,
  }

  const operations = dashboardData?.operations || {
    open_complaints: 0,
    maintenance_attention: 0,
    visitors_inside: 0,
    pending_visitors: 0,
  }

  const upcomingBookings = dashboardData?.upcoming_bookings_list || []
  const upcomingStayEnds = dashboardData?.upcoming_stay_end_dates || []
  const recentActivity = (dashboardData?.recent_activity || []).slice(0, 5)

  const propertyOverview = dashboardData?.property_overview || {
    floors_count: 0,
    rooms_count: summary.total_rooms,
    beds_count: summary.total_beds,
    occupied_beds: summary.occupied_beds,
    available_beds: summary.available_beds,
    occupancy_rate: summary.occupancy_rate,
    floor_summaries: [],
  }

  // Real Attention Items
  const attentionItems = []
  if (enquiriesKpi.new > 0) {
    attentionItems.push({
      id: 'att-enq',
      type: 'warning',
      icon: '📩',
      title: `${enquiriesKpi.new} New ${enquiriesKpi.new === 1 ? 'Lead' : 'Leads'}`,
      description: 'Prospective tenant enquiries awaiting owner response.',
      actionText: 'Review Leads',
      actionLink: '/owner/leads',
    })
  }
  if (financials.overdue_rent > 0 || financials.pending_rent > 0) {
    const overdueAmt = financials.overdue_rent > 0 ? `₹${financials.overdue_rent.toLocaleString('en-IN')} overdue` : `₹${financials.pending_rent.toLocaleString('en-IN')} pending`
    attentionItems.push({
      id: 'att-dues',
      type: 'danger',
      icon: '💳',
      title: `${overdueAmt} Rent Balance`,
      description: 'Rent cycles require collection follow-up.',
      actionText: 'View Dues',
      actionLink: '/owner/dues',
    })
  }
  if (operations.open_complaints > 0) {
    attentionItems.push({
      id: 'att-complaints',
      type: 'warning',
      icon: '⚠️',
      title: `${operations.open_complaints} Open Complaints`,
      description: 'Tenant maintenance or facility requests awaiting resolution.',
      actionText: 'Manage Tickets',
      actionLink: '/owner/complaints',
    })
  }
  if (summary.available_beds > 0) {
    attentionItems.push({
      id: 'att-vacant',
      type: 'info',
      icon: '🛏️',
      title: `${summary.available_beds} Vacant Beds Ready`,
      description: 'Available capacity ready for tenant assignment or new bookings.',
      actionText: 'Assign Room',
      actionLink: '/owner/rooms',
    })
  }

  return (
    <div className="owner-dashboard-view">
      {/* ==================================================
          SECTION 1: HEADER / CONTEXT & QUICK ACTIONS
      ================================================== */}
      <section className="dashboard-intro-row">
        <div className="dashboard-greeting-block">
          <h2 className="dashboard-greeting-title">
            {getGreeting()}, {firstName} 👋
          </h2>
          <p className="dashboard-greeting-desc">
            {hostelName} • {currentDateFormatted}
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="quick-actions-bar">
          <Link
            to="/owner/tenants"
            className="quick-action-btn primary"
            style={{ textDecoration: 'none' }}
          >
            <span className="btn-icon">+</span>
            <span>Add Tenant</span>
          </Link>
          <Link
            to="/owner/rooms"
            className="quick-action-btn"
            style={{ textDecoration: 'none' }}
          >
            <span className="btn-icon">+</span>
            <span>Add Room</span>
          </Link>
          <Link
            to="/owner/property"
            className="quick-action-btn"
            style={{ textDecoration: 'none' }}
          >
            <span className="btn-icon">🏢</span>
            <span>Property Setup</span>
          </Link>
          <Link
            to="/owner/payments"
            className="quick-action-btn"
            style={{ textDecoration: 'none' }}
          >
            <span className="btn-icon">₹</span>
            <span>Record Payment</span>
          </Link>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="quick-action-btn"
            style={{ textDecoration: 'none', color: '#2563eb' }}
          >
            <span className="btn-icon">🌐</span>
            <span>View Public Site &rarr;</span>
          </a>
        </div>
      </section>

      {/* ==================================================
          SECTION 2: PRIMARY KPIS (4 CLEAR CARDS ONLY)
      ================================================== */}
      <section className="kpi-primary-grid">
        <Link to="/owner/rooms" className="kpi-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label">Occupancy Rate</span>
            <div className="kpi-card-icon icon-occupied">📊</div>
          </div>
          <div className="kpi-card-number">{summary.occupancy_rate}%</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              {summary.occupied_beds} / {summary.total_beds} Beds Occupied
            </span>
            <span className="kpi-sub-text">View inventory &rarr;</span>
          </div>
        </Link>

        <Link to="/owner/tenants" className="kpi-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label">Current Tenants</span>
            <div className="kpi-card-icon icon-tenants">👥</div>
          </div>
          <div className="kpi-card-number">{summary.current_tenants}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">{summary.total_rooms} Rooms</span>
            <span className="kpi-sub-text">Resident directory &rarr;</span>
          </div>
        </Link>

        <Link to="/owner/leads" className="kpi-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label">New Leads</span>
            <div className="kpi-card-icon icon-enquiries" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>📩</div>
          </div>
          <div className="kpi-card-number">{enquiriesKpi.new}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>
              {enquiriesKpi.total} Total Enquiries
            </span>
            <span className="kpi-sub-text">Manage leads &rarr;</span>
          </div>
        </Link>

        <Link to="/owner/payments" className="kpi-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-label">Rent Collected</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>₹</div>
          </div>
          <div className="kpi-card-number" style={{ color: '#16a34a' }}>
            ₹{financials.collected_rent.toLocaleString('en-IN')}
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">
              Target: ₹{financials.expected_rent.toLocaleString('en-IN')}
            </span>
            <span className="kpi-sub-text">Payments ledger &rarr;</span>
          </div>
        </Link>
      </section>

      {/* ==================================================
          SECTION 3: NEEDS ATTENTION (ACTIONABLE ALERTS)
      ================================================== */}
      <section className="important-alerts-grid">
        {attentionItems.length === 0 ? (
          <div className="alert-card alert-success" style={{ gridColumn: '1 / -1' }}>
            <div className="alert-content-left">
              <strong className="alert-card-title">Everything is operating smoothly ✅</strong>
              <p className="alert-card-desc">No urgent overdue balances, open complaints, or unaddressed leads.</p>
            </div>
            <Link to="/owner/rooms" className="alert-action-link">
              <span>View Property Status</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        ) : (
          attentionItems.map((item) => (
            <div key={item.id} className={`alert-card alert-${item.type}`}>
              <div className="alert-content-left">
                <strong className="alert-card-title">
                  {item.icon} {item.title}
                </strong>
                <p className="alert-card-desc">{item.description}</p>
              </div>
              <Link to={item.actionLink} className="alert-action-link">
                <span>{item.actionText}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ))
        )}
      </section>

      {/* ==================================================
          SECTION 4: BUSINESS OVERVIEW (SIDE-BY-SIDE)
      ================================================== */}
      <section className="dashboard-grid-two-col">
        {/* Column 1: Rent Collection Summary */}
        <div className="financial-preview-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Rent Collection Summary</h3>
              <p className="section-subtitle">Real-time ledger overview for the current billing cycle</p>
            </div>
            <Link to="/owner/payments" className="view-all-link">
              <span>Payments Ledger</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <div className="financial-kpi-subgrid">
            <div className="fin-card">
              <span className="fin-label">Expected Target</span>
              <span className="fin-value">₹{financials.expected_rent.toLocaleString('en-IN')}</span>
              <span className="fin-sub">Monthly target</span>
            </div>
            <div className="fin-card">
              <span className="fin-label">Collected</span>
              <span className="fin-value" style={{ color: '#16a34a' }}>₹{financials.collected_rent.toLocaleString('en-IN')}</span>
              <span className="fin-sub">
                {financials.expected_rent > 0
                  ? `${Math.round((financials.collected_rent / financials.expected_rent) * 100)}% realized`
                  : 'Collections'}
              </span>
            </div>
            <div className="fin-card">
              <span className="fin-label">Pending</span>
              <span className="fin-value" style={{ color: '#b45309' }}>₹{financials.pending_rent.toLocaleString('en-IN')}</span>
              <span className="fin-sub">Due this cycle</span>
            </div>
            <div className="fin-card">
              <span className="fin-label">Overdue</span>
              <span className="fin-value" style={{ color: '#dc2626' }}>₹{financials.overdue_rent.toLocaleString('en-IN')}</span>
              <span className="fin-sub">Needs follow-up</span>
            </div>
          </div>
        </div>

        {/* Column 2: Occupancy Breakdown */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Occupancy Breakdown</h3>
              <p className="section-subtitle">Bed capacity distribution across {summary.total_rooms} rooms</p>
            </div>
            <Link to="/owner/rooms" className="view-all-link">
              <span>Manage Rooms</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0 4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ backgroundColor: '#eff6ff', padding: '10px 8px', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#1e40af', display: 'block', fontWeight: 600 }}>OCCUPIED</span>
                <strong style={{ fontSize: '1.25rem', color: '#1d4ed8' }}>{summary.occupied_beds}</strong>
                <span style={{ fontSize: '0.65rem', color: '#1e40af', display: 'block' }}>Active</span>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '10px 8px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#166534', display: 'block', fontWeight: 600 }}>AVAILABLE</span>
                <strong style={{ fontSize: '1.25rem', color: '#15803d' }}>{summary.available_beds}</strong>
                <span style={{ fontSize: '0.65rem', color: '#166534', display: 'block' }}>Ready</span>
              </div>
              <div style={{ backgroundColor: '#faf5ff', padding: '10px 8px', borderRadius: '8px', border: '1px solid #e9d5ff', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#7e22ce', display: 'block', fontWeight: 600 }}>RESERVED</span>
                <strong style={{ fontSize: '1.25rem', color: '#9333ea' }}>{summary.reserved_beds}</strong>
                <span style={{ fontSize: '0.65rem', color: '#7e22ce', display: 'block' }}>Booked</span>
              </div>
              <div style={{ backgroundColor: '#fef2f2', padding: '10px 8px', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#991b1b', display: 'block', fontWeight: 600 }}>MAINTENANCE</span>
                <strong style={{ fontSize: '1.25rem', color: '#dc2626' }}>{summary.maintenance_beds}</strong>
                <span style={{ fontSize: '0.65rem', color: '#991b1b', display: 'block' }}>Repair</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: '#475569', paddingTop: '4px' }}>
              <span>Total Inventory: <strong>{summary.total_beds} Beds in {summary.total_rooms} Rooms</strong></span>
              <Link to="/owner/rooms" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                View Floor Plans &rarr;
              </Link>
            </div>

            {propertyOverview.floor_summaries && propertyOverview.floor_summaries.length > 0 && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Floor Summaries ({propertyOverview.floors_count} Floors)
                </span>
                {propertyOverview.floor_summaries.map((fl) => (
                  <div key={fl.floor_number} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {fl.floor_name || `Floor ${fl.floor_number}`} ({fl.rooms_count} Rooms, {fl.beds_count} Beds)
                    </span>
                    <span style={{ color: fl.available_beds > 0 ? '#16a34a' : '#64748b', fontWeight: 500 }}>
                      {fl.occupied_beds}/{fl.beds_count} Occupied ({fl.occupancy_rate}%)
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link to="/owner/property" style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none' }}>
                🏢 Configure Floors &amp; Property Structure &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 5: TODAY / UPCOMING (SIDE-BY-SIDE)
      ================================================== */}
      <section className="dashboard-grid-two-col">
        {/* Column 1: Upcoming Move-ins / Bookings */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Upcoming Move-Ins</h3>
              <p className="section-subtitle">Confirmed bookings queued for check-in</p>
            </div>
            <Link to="/owner/bookings" className="view-all-link">
              <span>View Bookings</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="card-empty-state" style={{ minHeight: '130px' }}>
              <span className="empty-icon">🧳</span>
              <p className="empty-title">No upcoming move-ins queued</p>
              <p className="empty-desc">
                When new bookings are confirmed, scheduled resident admissions will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {upcomingBookings.map((b) => (
                <div
                  key={b.id || b.booking_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{b.tenant_name || b.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                      {b.room_number ? `Room ${b.room_number}` : 'Room assignment pending'}
                    </span>
                  </div>
                  <span className="stay-days-pill">
                    {b.check_in_date || b.move_in_date || 'Upcoming'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Upcoming Stay End Dates / Dues */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Upcoming Stay End Dates</h3>
              <p className="section-subtitle">Tenants with leases ending within 30 days</p>
            </div>
            <Link to="/owner/tenants" className="view-all-link">
              <span>View Tenants</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {upcomingStayEnds.length === 0 ? (
            <div className="card-empty-state" style={{ minHeight: '130px' }}>
              <span className="empty-icon">📋</span>
              <p className="empty-title">No immediate stay expirations</p>
              <p className="empty-desc">
                Tenants whose stay or notice period concludes within 30 days will be flagged here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {upcomingStayEnds.map((t) => (
                <div
                  key={t.id || t.tenant_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: '#fff1f2',
                    borderRadius: '8px',
                    border: '1px solid #fecdd3',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: '#9f1239' }}>{t.full_name || t.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#be123c', display: 'block' }}>
                      Room {t.room_number || '-'} • Bed {t.bed_code || '-'}
                    </span>
                  </div>
                  <span className="stay-days-pill urgent">
                    Ends: {t.stay_end_date || 'Soon'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          SECTION 6: RECENT ACTIVITY (TOP 5 ITEMS)
      ================================================== */}
      <section className="dashboard-section">
        <div className="section-card-header">
          <div>
            <h3 className="section-title">Recent Activity</h3>
            <p className="section-subtitle">Latest operations and enquiry events at {hostelName}</p>
          </div>
          <Link to="/owner/leads" className="view-all-link">
            <span>View All Leads &rarr;</span>
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <div className="card-empty-state" style={{ padding: '32px 16px' }}>
            <span className="empty-icon">⚡</span>
            <p className="empty-title">No recent activity logged</p>
            <p className="empty-desc">
              When enquiries are submitted, payments recorded, or bookings created, live events will show here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {recentActivity.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  📩
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.875rem', color: '#0f172a', display: 'block' }}>
                    {act.text}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {act.subtext}
                  </span>
                </div>
                {act.created_at && (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new Date(act.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
