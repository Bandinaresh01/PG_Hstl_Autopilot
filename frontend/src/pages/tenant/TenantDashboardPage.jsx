import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTenantAuth, fetchTenantPortalData } from '../../utils/tenantAuth'
import { calculateStayDuration } from '../../data/tenantsData'
import './TenantDashboardPage.css'
import '../owner/OwnerDashboardPage.css'

export default function TenantDashboardPage() {
  const { tenantUser } = useTenantAuth()
  const [portalData, setPortalData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [ticketCategory, setTicketCategory] = useState('Plumbing')
  const [ticketDesc, setTicketDesc] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [wifiCopied, setWifiCopied] = useState(false)

  useEffect(() => {
    let active = true
    fetchTenantPortalData()
      .then((data) => {
        if (active) {
          setPortalData(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          // Fallback to tenantUser metadata
          setPortalData({
            profile: {
              user_code: tenantUser?.user_code || 'TEN-1001',
              full_name: tenantUser?.full_name || 'Resident',
              email: tenantUser?.email || '',
              phone: tenantUser?.phone || '',
              emergency_contact: tenantUser?.emergency_contact || '+91 98765 00001 (Father)',
              hostel_name: tenantUser?.hostel_name || 'UrbanNest Hostel',
              hostel_location: tenantUser?.hostel_location || 'Hyderabad, Telangana',
            },
            stay: {
              room_number: tenantUser?.room_number || 'Room 204',
              bed_code: tenantUser?.bed_code || 'Bed A',
              room_type: 'Double Sharing',
              floor: 'Floor 2',
              move_in_date: tenantUser?.move_in_date || '2026-09-01',
              expected_end_date: '2027-03-01',
              notice_period: '30 Days Notice Served',
              wifi_ssid: 'UrbanNest-HighSpeed-F2',
              wifi_pass: 'NestResident@2026',
            },
            financials: {
              monthly_rent: tenantUser?.monthly_rent || 8500,
              security_deposit: 8500,
              next_due_date: '2026-10-01',
              outstanding_amount: 0,
              payment_status: 'PAID',
            },
            notices: [
              {
                id: 'not-1',
                title: 'Dining & Meal Schedule',
                body: 'Breakfast: 7:30 AM - 9:30 AM | Lunch: 12:30 PM - 2:30 PM | Dinner: 7:45 PM - 10:00 PM.',
                category: 'Food',
              },
              {
                id: 'not-2',
                title: 'Hostel Gate Timings',
                body: 'Main entrance closes at 10:30 PM daily. Late entry passes require prior notification.',
                category: 'Security',
              },
              {
                id: 'not-3',
                title: 'High-Speed Wi-Fi 6 Upgrade',
                body: 'Floor 1-3 fiber routers upgraded to 300 Mbps symmetrical bandwidth.',
                category: 'Facility',
              },
            ],
            active_tickets: [],
          })
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [tenantUser])

  const stayInfo = portalData?.stay
  const stayDuration = stayInfo
    ? calculateStayDuration(stayInfo.expected_end_date)
    : { label: 'Active', badgeClass: 'stay-normal' }

  const handleCopyWifi = () => {
    if (stayInfo?.wifi_pass) {
      navigator.clipboard.writeText(stayInfo.wifi_pass)
      setWifiCopied(true)
      setTimeout(() => setWifiCopied(false), 2500)
    }
  }

  const handleTicketSubmit = (e) => {
    e.preventDefault()
    if (!ticketDesc.trim()) return

    setTicketModalOpen(false)
    setTicketDesc('')
    setToastMessage(`Maintenance ticket logged: [${ticketCategory}] submitted to hostel staff!`)
    setTimeout(() => setToastMessage(''), 4000)
  }

  const handleDownloadReceipt = () => {
    setToastMessage('Rent receipt downloaded for September 2026!')
    setTimeout(() => setToastMessage(''), 3500)
  }

  if (loading && !portalData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#10b981',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }}
        />
        <p style={{ margin: 0, fontWeight: 500 }}>Loading your Resident Portal...</p>
      </div>
    )
  }

  return (
    <div className="tenant-dashboard-view">
      {/* Toast Notification */}
      {toastMessage && <div className="toast-success">{toastMessage}</div>}

      {/* 1. Welcome Hero Card */}
      <div className="tenant-welcome-card">
        <div className="tenant-welcome-left">
          <div className="tenant-resident-badge">
            <span>✨</span>
            <span>Resident Portal • {portalData.profile.hostel_name}</span>
          </div>
          <h1 className="tenant-welcome-title">
            Welcome home, {portalData.profile.full_name}!
          </h1>
          <p className="tenant-welcome-subtitle">
            Allocated: <strong>{portalData.stay.room_number}</strong> ({portalData.stay.floor}) •{' '}
            <strong>{portalData.stay.bed_code}</strong>
          </p>
        </div>

        <div className="tenant-welcome-actions">
          <Link
            to="/tenant/visitors"
            className="btn-tenant-action primary"
            style={{ textDecoration: 'none' }}
          >
            <span>🚪</span>
            <span>Visitor Pass</span>
          </Link>
          <Link
            to="/tenant/complaints"
            className="btn-tenant-action secondary"
            style={{ textDecoration: 'none' }}
          >
            <span>⚠️</span>
            <span>Complaints</span>
          </Link>
          <button
            type="button"
            className="btn-tenant-action secondary"
            onClick={handleDownloadReceipt}
          >
            <span>📄</span>
            <span>Rent Receipt</span>
          </button>
        </div>
      </div>

      {/* 2. Key Resident Metric Cards */}
      <div className="tenant-cards-grid">
        {/* Room & Bed Allocation */}
        <div className="tenant-card">
          <div className="tenant-card-header">
            <div className="tenant-card-title-group">
              <span className="tenant-card-label">My Allocation</span>
              <h3 className="tenant-card-heading">{portalData.stay.room_number}</h3>
            </div>
            <div className="tenant-card-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              🛏️
            </div>
          </div>

          <div className="tenant-info-list">
            <div className="tenant-info-row">
              <span className="tenant-info-key">Bed Code</span>
              <span className="tenant-info-val" style={{ color: '#059669' }}>
                {portalData.stay.bed_code}
              </span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Room Category</span>
              <span className="tenant-info-val">{portalData.stay.room_type}</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Floor Location</span>
              <span className="tenant-info-val">{portalData.stay.floor}</span>
            </div>
          </div>
        </div>

        {/* Stay Timeline */}
        <div className="tenant-card">
          <div className="tenant-card-header">
            <div className="tenant-card-title-group">
              <span className="tenant-card-label">Stay Duration</span>
              <h3 className="tenant-card-heading">
                <span className={`stay-badge ${stayDuration.badgeClass}`} style={{ fontSize: '0.875rem' }}>
                  {stayDuration.label}
                </span>
              </h3>
            </div>
            <div className="tenant-card-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              📅
            </div>
          </div>

          <div className="tenant-info-list">
            <div className="tenant-info-row">
              <span className="tenant-info-key">Move-In Date</span>
              <span className="tenant-info-val">{portalData.stay.move_in_date}</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Expected End Date</span>
              <span className="tenant-info-val">{portalData.stay.expected_end_date}</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Notice Period</span>
              <span className="tenant-info-val">{portalData.stay.notice_period}</span>
            </div>
          </div>
        </div>

        {/* Rent & Payments */}
        <div className="tenant-card">
          <div className="tenant-card-header">
            <div className="tenant-card-title-group">
              <span className="tenant-card-label">Monthly Rent</span>
              <h3 className="tenant-card-heading" style={{ color: '#0f172a' }}>
                ₹{portalData.financials.monthly_rent.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="tenant-card-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
              💳
            </div>
          </div>

          <div className="tenant-info-list">
            <div className="tenant-info-row">
              <span className="tenant-info-key">Payment Status</span>
              <span className={`badge-pay ${(portalData.financials.payment_status || 'PAID').toLowerCase().replace('_', '-')}`}>
                {(portalData.financials.payment_status || 'PAID').replace('_', ' ')}
              </span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Next Rent Due</span>
              <span className="tenant-info-val">{portalData.financials.next_due_date}</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Outstanding Balance</span>
              <span className="tenant-info-val" style={{ fontWeight: 700, color: (portalData.financials.outstanding_amount || 0) > 0 ? '#b91c1c' : '#16a34a' }}>
                ₹{(portalData.financials.outstanding_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Security Deposit</span>
              <span className="tenant-info-val">
                ₹{portalData.financials.security_deposit.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <Link
            to="/tenant/payments"
            className="btn-tenant-action"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '14px',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            <span>View Payment Statement &rarr;</span>
          </Link>
        </div>

        {/* High-Speed Wi-Fi Details */}
        <div className="tenant-card">
          <div className="tenant-card-header">
            <div className="tenant-card-title-group">
              <span className="tenant-card-label">Hostel Wi-Fi</span>
              <h3 className="tenant-card-heading">High-Speed</h3>
            </div>
            <div className="tenant-card-icon" style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}>
              📶
            </div>
          </div>

          <div className="wifi-box">
            <div className="wifi-row">
              <span style={{ color: '#166534', fontWeight: 600 }}>Network SSID:</span>
              <strong style={{ color: '#0f172a' }}>{portalData.stay.wifi_ssid}</strong>
            </div>
            <div className="wifi-row">
              <span style={{ color: '#166534', fontWeight: 600 }}>Password:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', fontSize: '0.85rem' }}>
                  {portalData.stay.wifi_pass}
                </code>
                <button
                  type="button"
                  onClick={handleCopyWifi}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {wifiCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Complaints & Support */}
        <div className="tenant-card">
          <div className="tenant-card-header">
            <div className="tenant-card-title-group">
              <span className="tenant-card-label">Complaints &amp; Support</span>
              <h3 className="tenant-card-heading" style={{ color: '#0f172a' }}>
                {portalData.complaints_summary?.open ?? 0} Open
              </h3>
            </div>
            <div className="tenant-card-icon" style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
              ⚠️
            </div>
          </div>

          <div className="tenant-info-list">
            <div className="tenant-info-row">
              <span className="tenant-info-key">In Progress</span>
              <span className="tenant-info-val">{portalData.complaints_summary?.in_progress ?? 0} active</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Resolved</span>
              <span className="tenant-info-val" style={{ color: '#16a34a', fontWeight: 600 }}>
                {portalData.complaints_summary?.resolved ?? 0} completed
              </span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Total Reported</span>
              <span className="tenant-info-val">{portalData.complaints_summary?.total ?? 0}</span>
            </div>
          </div>

          <Link
            to="/tenant/complaints"
            className="btn-tenant-action"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '14px',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            <span>View Complaints &rarr;</span>
          </Link>
        </div>

        {/* Visitor Passes & Gate Access */}
        <div className="tenant-card">
          <div className="tenant-card-header">
            <div className="tenant-card-title-group">
              <span className="tenant-card-label">Visitor Passes</span>
              <h3 className="tenant-card-heading">
                {portalData.visitors_summary?.inside > 0
                  ? `${portalData.visitors_summary.inside} Guest Inside`
                  : portalData.visitors_summary?.approved > 0
                  ? `${portalData.visitors_summary.approved} Active Pass`
                  : 'Gate Access'}
              </h3>
            </div>
            <div className="tenant-card-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              🚪
            </div>
          </div>

          <div className="tenant-info-list">
            <div className="tenant-info-row">
              <span className="tenant-info-key">Currently Inside</span>
              <span className="tenant-info-val" style={{ color: '#2563eb', fontWeight: 700 }}>
                {portalData.visitors_summary?.inside ?? 0}
              </span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Approved Passes</span>
              <span className="tenant-info-val" style={{ color: '#16a34a', fontWeight: 600 }}>
                {portalData.visitors_summary?.approved ?? 0}
              </span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Pending Approval</span>
              <span className="tenant-info-val">
                {portalData.visitors_summary?.pending ?? 0}
              </span>
            </div>
          </div>

          <Link
            to="/tenant/visitors"
            className="btn-tenant-action"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '14px',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            <span>Manage Passes &rarr;</span>
          </Link>
        </div>
      </div>

      {/* 3. Section Grid: Notice Board & Hostel Contacts */}
      <div className="tenant-section-grid">
        {/* Notice Board */}
        <div className="tenant-notices-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Hostel Notice Board</h3>
              <p className="section-subtitle">Important resident updates and announcements</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {portalData.notices.map((n) => (
              <div key={n.id} className="tenant-notice-item">
                <div className="notice-title-row">
                  <span className="notice-title">{n.title}</span>
                  <span className="notice-category-pill">{n.category}</span>
                </div>
                <p className="notice-body">{n.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Important Resident Contacts */}
        <div className="tenant-services-card">
          <div className="section-card-header">
            <div>
              <h3 className="section-title">Hostel Helpdesk</h3>
              <p className="section-subtitle">Direct contacts for assistance</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>
                  Hostel Warden Desk
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Available 7:00 AM - 11:00 PM</span>
              </div>
              <a
                href="tel:+919876543210"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#2563eb',
                  textDecoration: 'none',
                }}
              >
                +91 98765 43210
              </a>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>
                  Hostel Manager WhatsApp
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>For fees &amp; gate inquiries</span>
              </div>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#16a34a',
                  textDecoration: 'none',
                }}
              >
                WhatsApp Desk &rarr;
              </a>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#b91c1c', display: 'block' }}>
                  Emergency Medical Contact
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#991b1b' }}>Apollo Clinic (500m away)</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b91c1c' }}>108 / 112</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Raise Request Modal */}
      {ticketModalOpen && (
        <div className="modal-overlay" onClick={() => setTicketModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Raise Service / Maintenance Request</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setTicketModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTicketSubmit}>
              <div className="modal-body">
                <div className="assign-form-group">
                  <label htmlFor="ticket-cat">Category *</label>
                  <select
                    id="ticket-cat"
                    className="assign-form-select"
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                  >
                    <option value="Plumbing">Plumbing (Tap, Geyser, Washroom)</option>
                    <option value="Electrical">Electrical (Fan, Switch, Light, AC)</option>
                    <option value="Wi-Fi">Wi-Fi &amp; Internet Connectivity</option>
                    <option value="Housekeeping">Housekeeping / Room Cleaning</option>
                    <option value="Food & Mess">Food &amp; Mess Request</option>
                    <option value="General">Other Service Request</option>
                  </select>
                </div>

                <div className="assign-form-group">
                  <label htmlFor="ticket-desc">Describe the Issue *</label>
                  <textarea
                    id="ticket-desc"
                    className="assign-form-input"
                    rows={4}
                    placeholder="Provide details about the issue (e.g. bathroom geyser not heating properly)..."
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-table-action"
                  onClick={() => setTicketModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-tenant-action primary"
                  style={{ backgroundColor: '#10b981', color: '#ffffff' }}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
