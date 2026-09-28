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

  // Parse structured metrics strictly from database
  const property = dashboardData?.property || {
    floors: 0,
    rooms: 0,
    beds: 0,
    roomsFullyOccupied: 0,
    roomsPartiallyOccupied: 0,
    roomsVacant: 0,
    roomsMaintenance: 0,
    bedsOccupied: 0,
    bedsAvailable: 0,
    bedsReserved: 0,
    occupancyRate: 0,
  }

  const floorSummary = dashboardData?.floorSummary || []
  const upcomingVacancies = dashboardData?.upcomingVacancies || []
  const fullRoomVacancies = dashboardData?.fullRoomVacancies || []
  const upcomingMoveIns = dashboardData?.upcomingMoveIns || []
  const rent = dashboardData?.rent || {
    expected: 0,
    collected: 0,
    pending: 0,
    overdue: 0,
  }
  const visitors = dashboardData?.visitors || {
    today: 0,
    currentlyInside: 0,
    thisWeek: 0,
    thisMonth: 0,
    active: [],
  }
  const complaints = dashboardData?.complaints || { open: 0, highPriority: 0 }
  const maintenance = dashboardData?.maintenance || { inProgress: 0, overdue: 0 }
  const leads = dashboardData?.leads || { new: 0, total: 0 }
  const recentActivity = dashboardData?.recentActivity || []

  // Derive Actionable Needs Attention items
  const attentionItems = []
  if (leads.new > 0) {
    attentionItems.push({
      id: 'att-leads',
      type: 'warning',
      icon: '📩',
      title: `${leads.new} new ${leads.new === 1 ? 'enquiry requires' : 'enquiries require'} follow-up`,
      actionText: 'Review Leads',
      actionLink: '/owner/leads',
    })
  }
  if (rent.overdue > 0) {
    attentionItems.push({
      id: 'att-rent',
      type: 'danger',
      icon: '💳',
      title: `₹${rent.overdue.toLocaleString('en-IN')} overdue rent payments require collection`,
      actionText: 'View Dues',
      actionLink: '/owner/dues',
    })
  }
  const vacanciesThisWeek = upcomingVacancies.filter((v) => v.days_remaining <= 7)
  if (vacanciesThisWeek.length > 0) {
    attentionItems.push({
      id: 'att-vacancies-week',
      type: 'info',
      icon: '🛏️',
      title: `${vacanciesThisWeek.length} upcoming ${vacanciesThisWeek.length === 1 ? 'vacancy' : 'vacancies'} this week`,
      actionText: 'View Tenants',
      actionLink: '/owner/tenants',
    })
  }
  if (upcomingMoveIns.length > 0) {
    attentionItems.push({
      id: 'att-moveins',
      type: 'info',
      icon: '📅',
      title: `${upcomingMoveIns.length} upcoming ${upcomingMoveIns.length === 1 ? 'move-in' : 'move-ins'} scheduled`,
      actionText: 'View Bookings',
      actionLink: '/owner/bookings',
    })
  }
  if (complaints.highPriority > 0) {
    attentionItems.push({
      id: 'att-complaints',
      type: 'danger',
      icon: '⚠️',
      title: `${complaints.highPriority} high-priority ${complaints.highPriority === 1 ? 'complaint' : 'complaints'} pending`,
      actionText: 'Manage Complaints',
      actionLink: '/owner/complaints',
    })
  }
  if (maintenance.overdue > 0) {
    attentionItems.push({
      id: 'att-maintenance',
      type: 'warning',
      icon: '🔧',
      title: `${maintenance.overdue} maintenance ${maintenance.overdue === 1 ? 'task' : 'tasks'} overdue or urgent`,
      actionText: 'Track Maintenance',
      actionLink: '/owner/maintenance',
    })
  }

  // Rent realization rate
  const rentRealizedPercent = rent.expected > 0 ? Math.min(100, Math.round((rent.collected / rent.expected) * 100)) : 0

  return (
    <div className="owner-dashboard-view">
      {/* ==================================================
          SECTION 1: HEADER (COMPACT & SYSTEMATIC)
      ================================================== */}
      <section className="dashboard-intro-row">
        <div className="dashboard-greeting-block">
          <h2 className="dashboard-greeting-title">
            {getGreeting()}, {firstName} 👋
          </h2>
          <p className="dashboard-greeting-desc">
            Here’s what needs your attention today • {hostelName} • {currentDateFormatted}
          </p>
        </div>

        <div className="quick-actions-bar">
          <Link to="/owner/property" className="quick-action-btn primary" style={{ textDecoration: 'none' }}>
            <span className="btn-icon">🏢</span>
            <span>Manage Property</span>
          </Link>
          <Link to="/owner/rooms" className="quick-action-btn" style={{ textDecoration: 'none' }}>
            <span className="btn-icon">🛏️</span>
            <span>View Rooms</span>
          </Link>
          <Link to="/owner/payments" className="quick-action-btn" style={{ textDecoration: 'none' }}>
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
          SECTION 2: PROPERTY OCCUPANCY (FULL WIDTH)
      ================================================== */}
      <section className="dashboard-card occupancy-section">
        <div className="section-card-header">
          <div>
            <h3 className="section-title">Property Occupancy</h3>
            <p className="section-subtitle">
              Building capacity, room classifications derived from beds, and current occupancy rate
            </p>
          </div>
          <div className="section-header-links">
            <Link to="/owner/property" className="view-all-link">
              <span>Manage Property</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <span className="link-divider">•</span>
            <Link to="/owner/rooms" className="view-all-link">
              <span>View Rooms</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Primary Occupancy Metrics Bar */}
        <div className="occupancy-kpi-strip">
          <div className="occ-kpi-item">
            <span className="occ-kpi-label">TOTAL FLOORS</span>
            <span className="occ-kpi-num">{property.floors}</span>
            <span className="occ-kpi-sub">Levels configured</span>
          </div>
          <div className="occ-kpi-item">
            <span className="occ-kpi-label">TOTAL ROOMS</span>
            <span className="occ-kpi-num">{property.rooms}</span>
            <span className="occ-kpi-sub">{property.beds} Total Beds</span>
          </div>
          <div className="occ-kpi-item occ-highlight-blue">
            <span className="occ-kpi-label">OCCUPIED BEDS</span>
            <span className="occ-kpi-num">{property.bedsOccupied}</span>
            <span className="occ-kpi-sub">{property.occupancyRate}% Occupancy</span>
          </div>
          <div className="occ-kpi-item occ-highlight-green">
            <span className="occ-kpi-label">AVAILABLE BEDS</span>
            <span className="occ-kpi-num">{property.bedsAvailable}</span>
            <span className="occ-kpi-sub">Ready for Move-In</span>
          </div>
          <div className="occ-kpi-item occ-highlight-purple">
            <span className="occ-kpi-label">RESERVED BEDS</span>
            <span className="occ-kpi-num">{property.bedsReserved}</span>
            <span className="occ-kpi-sub">Queued Bookings</span>
          </div>
        </div>

        {/* Room Classification Cards (Derived from Beds Table) */}
        <div className="room-classification-grid">
          <div className="room-class-card class-full">
            <div className="room-class-header">
              <span className="room-class-badge badge-full">Fully Occupied</span>
              <span className="room-class-count">{property.roomsFullyOccupied}</span>
            </div>
            <p className="room-class-desc">Rooms with all beds currently filled</p>
          </div>

          <div className="room-class-card class-partial">
            <div className="room-class-header">
              <span className="room-class-badge badge-partial">Partially Filled</span>
              <span className="room-class-count">{property.roomsPartiallyOccupied}</span>
            </div>
            <p className="room-class-desc">Rooms with some beds occupied &amp; some available</p>
          </div>

          <div className="room-class-card class-vacant">
            <div className="room-class-header">
              <span className="room-class-badge badge-vacant">Vacant</span>
              <span className="room-class-count">{property.roomsVacant}</span>
            </div>
            <p className="room-class-desc">Rooms completely empty &amp; ready to assign</p>
          </div>

          <div className="room-class-card class-maint">
            <div className="room-class-header">
              <span className="room-class-badge badge-maint">Maintenance</span>
              <span className="room-class-count">{property.roomsMaintenance}</span>
            </div>
            <p className="room-class-desc">Rooms offline or under renovation</p>
          </div>
        </div>

        {/* Floor Breakdown Strip */}
        {floorSummary.length > 0 && (
          <div className="floor-summary-breakdown">
            <div className="floor-breakdown-title">FLOOR BREAKDOWN</div>
            <div className="floor-cards-row">
              {floorSummary.map((f) => {
                const fName = f.floor_name || `Floor ${f.floor_number}`
                return (
                  <Link
                    key={f.id || f.floor_number}
                    to="/owner/rooms"
                    className="floor-mini-card"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="floor-mini-name">{fName.toUpperCase()}</div>
                    <div className="floor-mini-stats">
                      <span>{f.rooms_count} Rooms</span>
                      <span className="bullet">•</span>
                      <span>{f.total_beds || f.beds_count || 0} Beds</span>
                    </div>
                    <div className="floor-mini-pills">
                      <span className="pill-occ">{f.occupied_beds || 0} Occupied</span>
                      <span className="pill-avail">{f.available_beds || 0} Available</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* ==================================================
          SECTION 3: NEEDS ATTENTION (FULL WIDTH)
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
          SECTION 4: UPCOMING VACANCIES & MOVE-INS (TWO COLUMNS)
      ================================================== */}
      <section className="dashboard-grid-two-col">
        {/* Column 1: Upcoming Vacancies */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Upcoming Vacancies</h3>
              <p className="section-subtitle">Occupied beds becoming available in the next 30 days</p>
            </div>
            <Link to="/owner/tenants" className="view-all-link">
              <span>View All Tenants</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {/* Full Room Vacancy Alert Banner if detected */}
          {fullRoomVacancies.length > 0 && (
            <div className="full-room-vacancy-banner">
              <span className="banner-icon">🏢</span>
              <div>
                <strong>Full Room Vacancy Expected</strong>
                <p>
                  {fullRoomVacancies.map((fv) => `${fv.room_number} (${fv.room_type || 'Sharing'}) - available from ${fv.formatted_date || fv.available_from}`).join('; ')}
                </p>
              </div>
            </div>
          )}

          {upcomingVacancies.length === 0 ? (
            <div className="empty-feed-placeholder">
              <div className="empty-feed-icon">🛏️</div>
              <p className="empty-feed-text">No vacancies expected within the next 30 days.</p>
            </div>
          ) : (
            <div className="upcoming-feed-list">
              {upcomingVacancies.slice(0, 5).map((vac, idx) => (
                <div key={vac.tenant_id || idx} className="upcoming-feed-item">
                  <div className="upcoming-item-left">
                    <div className="upcoming-item-title">
                      <strong>{vac.room}</strong> • <span className="bed-code-tag">{vac.bed}</span>
                      {vac.is_full_room_vacancy && (
                        <span className="full-room-chip">Full Room</span>
                      )}
                    </div>
                    <div className="upcoming-item-tenant">
                      👤 {vac.tenant_name || vac.name}
                    </div>
                  </div>

                  <div className="upcoming-item-right">
                    <span className="upcoming-date-label">
                      Available from: <strong>{vac.formatted_move_out_date || vac.move_out_date}</strong>
                    </span>
                    <span className={`days-remaining-pill ${vac.days_remaining <= 7 ? 'urgent' : ''}`}>
                      {vac.days_remaining === 0 ? 'Today' : `In ${vac.days_remaining} days`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Upcoming Move-Ins */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Upcoming Move-Ins</h3>
              <p className="section-subtitle">Confirmed bookings queued for resident check-in</p>
            </div>
            <Link to="/owner/bookings" className="view-all-link">
              <span>View Bookings</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {upcomingMoveIns.length === 0 ? (
            <div className="empty-feed-placeholder">
              <div className="empty-feed-icon">📅</div>
              <p className="empty-feed-text">No upcoming move-ins scheduled.</p>
            </div>
          ) : (
            <div className="upcoming-feed-list">
              {upcomingMoveIns.slice(0, 5).map((book, idx) => (
                <div key={book.id || idx} className="upcoming-feed-item">
                  <div className="upcoming-item-left">
                    <div className="upcoming-item-title">
                      <strong>{book.guest_name || book.name}</strong>
                    </div>
                    <div className="upcoming-item-tenant">
                      {book.room} • {book.bed}
                    </div>
                  </div>

                  <div className="upcoming-item-right">
                    <span className="upcoming-date-label">
                      Check-in: <strong>{book.formatted_date || book.move_in_date}</strong>
                    </span>
                    <span className="days-remaining-pill">
                      {book.days_remaining === 0 ? 'Today' : `In ${book.days_remaining} days`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          SECTION 5: RENT OVERVIEW & VISITORS (TWO COLUMNS)
      ================================================== */}
      <section className="dashboard-grid-two-col">
        {/* Column 1: Rent Overview */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Rent Overview</h3>
              <p className="section-subtitle">Financial realization for the current cycle</p>
            </div>
            <Link to="/owner/payments" className="view-all-link">
              <span>Payments Ledger</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <div className="rent-kpi-grid">
            <div className="rent-box">
              <span className="rent-box-label">Expected Target</span>
              <span className="rent-box-num">₹{rent.expected.toLocaleString('en-IN')}</span>
              <span className="rent-box-sub">Monthly target</span>
            </div>
            <div className="rent-box highlight-green">
              <span className="rent-box-label">Collected</span>
              <span className="rent-box-num">₹{rent.collected.toLocaleString('en-IN')}</span>
              <span className="rent-box-sub">{rentRealizedPercent}% realized</span>
            </div>
            <div className="rent-box highlight-amber">
              <span className="rent-box-label">Pending</span>
              <span className="rent-box-num">₹{rent.pending.toLocaleString('en-IN')}</span>
              <span className="rent-box-sub">Due this cycle</span>
            </div>
            <div className="rent-box highlight-red">
              <span className="rent-box-label">Overdue</span>
              <span className="rent-box-num">₹{rent.overdue.toLocaleString('en-IN')}</span>
              <span className="rent-box-sub">Needs follow-up</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="rent-progress-block">
            <div className="rent-progress-labels">
              <span>Collection Realization</span>
              <span>{rentRealizedPercent}%</span>
            </div>
            <div className="rent-progress-track">
              <div className="rent-progress-fill" style={{ width: `${rentRealizedPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Column 2: Visitor Activity */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Visitor Activity</h3>
              <p className="section-subtitle">Gate entry logs and visitor passes</p>
            </div>
            <Link to="/owner/visitors" className="view-all-link">
              <span>View Visitor Log</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <div className="visitor-stats-grid">
            <div className="visitor-stat-box">
              <span className="vis-num">{visitors.today}</span>
              <span className="vis-label">Today</span>
            </div>
            <div className="visitor-stat-box highlight-blue">
              <span className="vis-num">{visitors.currentlyInside}</span>
              <span className="vis-label">Currently Inside</span>
            </div>
            <div className="visitor-stat-box">
              <span className="vis-num">{visitors.thisWeek}</span>
              <span className="vis-label">This Week</span>
            </div>
            <div className="visitor-stat-box">
              <span className="vis-num">{visitors.thisMonth}</span>
              <span className="vis-label">This Month</span>
            </div>
          </div>

          {/* Active Visitors List (Max 3) */}
          <div className="active-visitors-sublist">
            <div className="active-vis-heading">CURRENTLY CHECKED IN</div>
            {visitors.active && visitors.active.length > 0 ? (
              visitors.active.slice(0, 3).map((av, idx) => (
                <div key={av.id || idx} className="active-vis-item">
                  <div>
                    <strong>{av.visitor_name}</strong>
                    <div className="active-vis-sub">
                      Visiting {av.visiting_tenant || av.tenant_name} • {av.room || av.room_number}
                    </div>
                  </div>
                  <span className="active-vis-time">Checked in {av.checked_in_time}</span>
                </div>
              ))
            ) : (
              <p className="empty-subtext">No active visitors currently inside property.</p>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 6: OPERATIONS & RECENT ACTIVITY (TWO COLUMNS)
      ================================================== */}
      <section className="dashboard-grid-two-col">
        {/* Column 1: Operations (Complaints & Maintenance) */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Operations</h3>
              <p className="section-subtitle">Active complaints and hostel facility maintenance</p>
            </div>
            <div className="section-header-links">
              <Link to="/owner/complaints" className="view-all-link">
                <span>Complaints</span>
              </Link>
              <span className="link-divider">•</span>
              <Link to="/owner/maintenance" className="view-all-link">
                <span>Maintenance</span>
              </Link>
            </div>
          </div>

          <div className="operations-quad-grid">
            <div className="ops-quad-item">
              <span className="ops-quad-num">{complaints.open}</span>
              <span className="ops-quad-label">Open Complaints</span>
            </div>
            <div className={`ops-quad-item ${complaints.highPriority > 0 ? 'highlight-red' : ''}`}>
              <span className="ops-quad-num">{complaints.highPriority}</span>
              <span className="ops-quad-label">High Priority</span>
            </div>
            <div className="ops-quad-item">
              <span className="ops-quad-num">{maintenance.inProgress}</span>
              <span className="ops-quad-label">In Progress</span>
            </div>
            <div className={`ops-quad-item ${maintenance.overdue > 0 ? 'highlight-amber' : ''}`}>
              <span className="ops-quad-num">{maintenance.overdue}</span>
              <span className="ops-quad-label">Overdue / Urgent</span>
            </div>
          </div>
        </div>

        {/* Column 2: Recent Activity */}
        <div className="dashboard-sub-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Recent Activity</h3>
              <p className="section-subtitle">Real-time audit log of operations across hostel</p>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <div className="empty-feed-placeholder">
              <div className="empty-feed-icon">📝</div>
              <p className="empty-feed-text">No recent activity recorded.</p>
            </div>
          ) : (
            <div className="activity-feed-list">
              {recentActivity.slice(0, 6).map((item, idx) => (
                <div key={item.id || idx} className="activity-feed-item">
                  <div className="activity-icon-badge">{item.icon || '📌'}</div>
                  <div className="activity-body">
                    <span className="activity-main-text">{item.text}</span>
                    {item.subtext && <span className="activity-sub-text">{item.subtext}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
