import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  initialPayments,
  calculateDueDetails,
  getDueStats,
} from '../../data/paymentsData'
import './OwnerDuesPage.css'
import './OwnerPaymentsPage.css'
import './OwnerBookingsPage.css'
import './OwnerDashboardPage.css'

export default function OwnerDuesPage() {
  const [payments, setPayments] = useState(initialPayments)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState(null)
  const [recordModalData, setRecordModalData] = useState(null)

  // Calculate high-level due stats
  const dueStats = useMemo(() => getDueStats(payments), [payments])

  // Process and filter uncompleted dues
  const dueItems = useMemo(() => {
    // Only non-paid items belong in the Dues ledger
    const pendingList = payments.filter((p) => p.status !== 'PAID')

    return pendingList
      .map((item) => {
        const timing = calculateDueDetails(item.dueDate, item.status)
        return {
          ...item,
          timing,
        }
      })
      .filter((item) => {
        // Tab filter
        if (activeFilter === 'DUE_TODAY' && !item.timing.isToday) return false
        if (activeFilter === 'OVERDUE' && !item.timing.isOverdue) return false
        if (activeFilter === 'DUE_THIS_WEEK' && !item.timing.isDueSoon && !item.timing.isToday) return false
        if (activeFilter === 'UPCOMING' && (item.timing.isOverdue || item.timing.isToday)) return false

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchName = item.tenantName.toLowerCase().includes(q)
          const matchRoom = item.room.toLowerCase().includes(q)
          const matchPhone = (item.phone || '').includes(q)
          return matchName || matchRoom || matchPhone
        }

        return true
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  }, [payments, activeFilter, searchQuery])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleSendReminder = (tenantName, phone) => {
    setToastMessage(`Payment reminder sent to ${tenantName} (${phone}) via WhatsApp & SMS.`)
    setTimeout(() => setToastMessage(null), 4000)
  }

  const handleRecordModalSubmit = (e) => {
    e.preventDefault()
    if (!recordModalData) return

    setPayments((prev) =>
      prev.map((p) =>
        p.id === recordModalData.id
          ? {
              ...p,
              status: 'PAID',
              paidDate: '2026-09-26',
              reference: `UPI/${Date.now().toString().slice(-6)}`,
            }
          : p
      )
    )

    setToastMessage(`Marked ₹${recordModalData.amount.toLocaleString('en-IN')} as collected from ${recordModalData.tenantName}.`)
    setRecordModalData(null)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Pre-configured upcoming timeline events
  const timelineEvents = [
    {
      timing: 'Today',
      tenant: 'Rahul Kumar',
      room: 'Room 204 / Bed B',
      amount: 8500,
      badgeClass: 'today',
    },
    {
      timing: 'Today',
      tenant: 'Arjun Mehta',
      room: 'Room 101 / Bed A',
      amount: 7000,
      badgeClass: 'today',
    },
    {
      timing: 'Tomorrow',
      tenant: 'Priya Reddy',
      room: 'Room 302 / Bed A',
      amount: 12000,
      badgeClass: 'tomorrow',
    },
    {
      timing: 'Sep 27',
      tenant: 'Aditya Varma',
      room: 'Room 201 / Bed A (Power)',
      amount: 1850,
      badgeClass: 'tomorrow',
    },
    {
      timing: 'Sep 29',
      tenant: 'Harshita Sen',
      room: 'Room 304 / Bed A',
      amount: 1200,
      badgeClass: 'upcoming',
    },
    {
      timing: 'Oct 05',
      tenant: 'Sneha Kapoor',
      room: 'Room 205 / Bed B',
      amount: 9500,
      badgeClass: 'upcoming',
    },
  ]

  return (
    <div className="owner-dues-view">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="quick-action-toast" role="status">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Row */}
      <div className="dues-header-row">
        <div>
          <h1 className="dues-title">Rent Dues &amp; Timeline</h1>
          <p className="dues-subtitle">
            Track who needs to pay, upcoming deadlines, and overdue accounts.
          </p>
        </div>

        <Link to="/owner/payments" className="btn-table-action" style={{ textDecoration: 'none' }}>
          &larr; Back to Payments Ledger
        </Link>
      </div>

      {/* 2. Due Summary Cards */}
      <section className="kpi-primary-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Due Today</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>⚡</div>
          </div>
          <div className="kpi-card-number" style={{ color: '#b91c1c' }}>
            {dueStats.dueToday}
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
              Immediate action
            </span>
            <span className="kpi-sub-text">Expected by midnight</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Due This Week</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>📅</div>
          </div>
          <div className="kpi-card-number">{dueStats.dueThisWeek}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              Next 7 days
            </span>
            <span className="kpi-sub-text">Reminders queued</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Overdue</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>⚠️</div>
          </div>
          <div className="kpi-card-number" style={{ color: '#dc2626' }}>
            {dueStats.overdue}
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
              Past deadline
            </span>
            <span className="kpi-sub-text">Escalation needed</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Upcoming</span>
            <div className="kpi-card-icon icon-beds">⏳</div>
          </div>
          <div className="kpi-card-number">{dueStats.upcoming}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">Future dues</span>
            <span className="kpi-sub-text">Invoices issued</span>
          </div>
        </div>
      </section>

      {/* 3. Upcoming Payment Timeline / Calendar List */}
      <section className="timeline-card">
        <div className="timeline-header">
          <div>
            <h3 className="timeline-title">Upcoming Due Timeline</h3>
            <span className="timeline-sub">Chronological queue of expected resident payments</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Operating Base: Sep 26, 2026</span>
        </div>

        <div className="timeline-scroll-row">
          {timelineEvents.map((evt, idx) => (
            <div key={idx} className={`timeline-event-card ${evt.badgeClass}`}>
              <span className="event-date-badge">{evt.timing}</span>
              <strong className="event-tenant-name">{evt.tenant}</strong>
              <span className="event-room-info">{evt.room}</span>
              <span className="event-amount">₹{evt.amount.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Controls: Search & Filter Bar */}
      <section className="bookings-controls-card">
        <div className="bookings-search-row">
          <div className="bookings-search-input-wrap">
            <svg
              className="search-icon-svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="bookings-search-input"
              placeholder="Search by tenant name, room number, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bookings-filter-tabs">
          {[
            { id: 'ALL', label: 'All Dues' },
            { id: 'DUE_TODAY', label: 'Due Today' },
            { id: 'DUE_THIS_WEEK', label: 'Due This Week' },
            { id: 'OVERDUE', label: 'Overdue' },
            { id: 'UPCOMING', label: 'Upcoming' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`booking-tab-btn ${activeFilter === tab.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* 5. Due Table */}
      <section className="dashboard-section">
        <div className="section-card-header">
          <div>
            <h3 className="section-title">Rent Due Register</h3>
            <p className="section-subtitle">
              Showing {dueItems.length} active collection items
            </p>
          </div>
        </div>

        {dueItems.length === 0 ? (
          <div className="card-empty-state">
            <span className="empty-icon">✅</span>
            <p className="empty-title">No pending dues found.</p>
            <p className="empty-desc">
              All accounts for this filter category are current with no outstanding balances.
            </p>
          </div>
        ) : (
          <div className="enquiries-table-wrapper">
            <table className="enquiries-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Room / Bed</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Timeline Status</th>
                  <th>Status</th>
                  <th>Phone</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dueItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className="tenant-cell-name">{item.tenantName}</strong>
                      <span className="tenant-cell-sub">{item.type}</span>
                    </td>
                    <td>
                      <span className="enquiry-room-tag">{item.room}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                        ₹{item.amount.toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td>{formatDate(item.dueDate)}</td>
                    <td>
                      <span className={`timing-badge ${item.timing.badgeClass}`}>
                        {item.timing.label}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-pay ${item.status.toLowerCase().replace('_', '-')}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="enquiry-phone">{item.phone}</span>
                    </td>
                    <td>
                      <div className="dues-action-group">
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => setRecordModalData(item)}
                          title="Record Payment for this tenant"
                        >
                          Collect
                        </button>
                        <button
                          type="button"
                          className="btn-reminder"
                          onClick={() => handleSendReminder(item.tenantName, item.phone)}
                          title="Send WhatsApp Payment Reminder"
                        >
                          Remind
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 6. Quick Collect Modal */}
      {recordModalData && (
        <div className="modal-overlay" onClick={() => setRecordModalData(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleRecordModalSubmit}>
              <div className="modal-header">
                <h3 className="modal-title">Collect Rent: {recordModalData.tenantName}</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setRecordModalData(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <span className="modal-label">Tenant</span>
                    <span className="modal-value">{recordModalData.tenantName}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-label">Room</span>
                    <span className="modal-value">{recordModalData.room}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-label">Due Date</span>
                    <span className="modal-value">{formatDate(recordModalData.dueDate)}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-label">Outstanding Amount</span>
                    <span className="modal-value" style={{ color: '#dc2626' }}>
                      ₹{recordModalData.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="form-grid-two">
                  <div className="form-field-group">
                    <label className="form-field-label">Payment Date</label>
                    <input
                      type="date"
                      className="form-field-input"
                      defaultValue="2026-09-26"
                      required
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-field-label">Payment Mode</label>
                    <select className="form-field-select" defaultValue="UPI">
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="Cash">Cash at Counter</option>
                      <option value="Bank">Bank NEFT / IMPS</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-table-action"
                  onClick={() => setRecordModalData(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="quick-action-btn primary">
                  Confirm Full Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
