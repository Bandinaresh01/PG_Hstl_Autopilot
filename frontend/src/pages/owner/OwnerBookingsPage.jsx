import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { demoBookings, getBookingStats } from '../../data/bookingsData'
import './OwnerBookingsPage.css'
import './OwnerDashboardPage.css'

export default function OwnerBookingsPage() {
  const [bookings] = useState(demoBookings)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)

  const stats = useMemo(() => getBookingStats(bookings), [bookings])

  // Filter and search logic
  const filteredBookings = useMemo(() => {
    const today = new Date('2026-09-26')

    return bookings.filter((item) => {
      // 1. Tab filter
      if (activeFilter === 'PENDING' && item.bookingStatus !== 'PENDING') return false
      if (activeFilter === 'CONFIRMED' && item.bookingStatus !== 'CONFIRMED') return false
      if (activeFilter === 'CHECKED_IN' && item.bookingStatus !== 'CHECKED_IN') return false
      if (activeFilter === 'CANCELLED' && item.bookingStatus !== 'CANCELLED') return false
      if (activeFilter === 'UPCOMING_MOVE_INS') {
        const mDate = new Date(item.moveInDate)
        if (mDate < today || item.bookingStatus === 'CANCELLED' || item.bookingStatus === 'CHECKED_IN') {
          return false
        }
      }

      // 2. Search query (name, phone, booking ID, room)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = item.name.toLowerCase().includes(q)
        const matchPhone = item.phone.toLowerCase().includes(q)
        const matchId = item.id.toLowerCase().includes(q)
        const matchRoom = item.roomType.toLowerCase().includes(q)
        return matchName || matchPhone || matchId || matchRoom
      }

      return true
    })
  }, [bookings, activeFilter, searchQuery])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="owner-bookings-view">
      {/* 1. Header Row */}
      <div className="bookings-header-row">
        <div>
          <h1 className="bookings-title">Bookings</h1>
          <p className="bookings-subtitle">
            Track upcoming, confirmed, pending and completed hostel bookings.
          </p>
        </div>
      </div>

      {/* 2. Booking Summary KPI Cards */}
      <section className="kpi-primary-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Bookings</span>
            <div className="kpi-card-icon icon-beds">📑</div>
          </div>
          <div className="kpi-card-number">{stats.totalBookings}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">All records</span>
            <span className="kpi-sub-text">Current term</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Upcoming Move-Ins</span>
            <div className="kpi-card-icon icon-occupied">🧳</div>
          </div>
          <div className="kpi-card-number">{stats.upcomingMoveIns}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              Next 14 days
            </span>
            <span className="kpi-sub-text">Rooms allocated</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Pending Confirmation</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>⏳</div>
          </div>
          <div className="kpi-card-number">{stats.pendingConfirmation}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              Action needed
            </span>
            <span className="kpi-sub-text">Awaiting token</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Confirmed Bookings</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>✅</div>
          </div>
          <div className="kpi-card-number">{stats.confirmedBookings}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
              Ready for stay
            </span>
            <span className="kpi-sub-text">Deposit logged</span>
          </div>
        </div>
      </section>

      {/* 3. Search & Filter Bar */}
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
              placeholder="Search by guest name, phone, booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bookings-filter-tabs">
          {[
            { id: 'ALL', label: 'All Bookings' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'UPCOMING_MOVE_INS', label: 'Upcoming Move-Ins' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'CHECKED_IN', label: 'Checked In' },
            { id: 'CANCELLED', label: 'Cancelled' },
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

      {/* 4. Bookings Table */}
      <section className="dashboard-section">
        <div className="section-card-header">
          <div>
            <h3 className="section-title">All Reservations</h3>
            <p className="section-subtitle">
              Showing {filteredBookings.length} of {bookings.length} reservations
            </p>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="card-empty-state">
            <span className="empty-icon">📂</span>
            <p className="empty-title">No bookings match your filter criteria.</p>
            <p className="empty-desc">
              Try adjusting your search query or switching to &ldquo;All Bookings&rdquo; tab.
            </p>
          </div>
        ) : (
          <div className="enquiries-table-wrapper">
            <table className="enquiries-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Tenant / Guest</th>
                  <th>Phone</th>
                  <th>Preferred Room</th>
                  <th>Move-In Date</th>
                  <th>Booking Date</th>
                  <th>Booking Status</th>
                  <th>Payment Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <code style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                        {b.id}
                      </code>
                    </td>
                    <td>
                      <strong className="tenant-cell-name">{b.name}</strong>
                      <span className="tenant-cell-sub">{b.email}</span>
                    </td>
                    <td>
                      <span className="enquiry-phone">{b.phone}</span>
                    </td>
                    <td>
                      <span className="enquiry-room-tag">{b.roomType}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{formatDate(b.moveInDate)}</strong>
                    </td>
                    <td>
                      <span className="enquiry-date">{formatDate(b.bookingDate)}</span>
                    </td>
                    <td>
                      <span className={`badge-status ${b.bookingStatus.toLowerCase()}`}>
                        {b.bookingStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-pay ${b.paymentStatus.toLowerCase()}`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => setSelectedBooking(b)}
                          title="View Full Booking & Payment Details"
                        >
                          View
                        </button>
                        {b.bookingStatus === 'CONFIRMED' && (
                          <Link
                            to="/owner/rooms"
                            className="btn-table-action"
                            style={{
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              borderColor: '#bfdbfe',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                            }}
                            title="Assign Bed in Rooms"
                          >
                            Assign Bed
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Detail Modal */}
      {selectedBooking && (
        <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">Booking Details</h3>
                <span className={`badge-status ${selectedBooking.bookingStatus.toLowerCase()}`}>
                  {selectedBooking.bookingStatus.replace('_', ' ')}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedBooking(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Guest & Stay Info */}
              <div>
                <h4 className="modal-section-title">Guest Information</h4>
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <span className="modal-label">Full Name</span>
                    <span className="modal-value">{selectedBooking.name}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-label">Booking ID</span>
                    <span className="modal-value">{selectedBooking.id}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-label">Phone</span>
                    <span className="modal-value">{selectedBooking.phone}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-label">Email</span>
                    <span className="modal-value">{selectedBooking.email}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-label">Preferred Room Type</span>
                    <span className="modal-value">{selectedBooking.roomType}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-label">Expected Move-In</span>
                    <span className="modal-value">{formatDate(selectedBooking.moveInDate)}</span>
                  </div>
                </div>
              </div>

              {/* Financial Connection Breakdown */}
              <div>
                <h4 className="modal-section-title">Payment Breakdown &amp; Status</h4>
                <div className="payment-breakdown-card">
                  <div className="breakdown-row">
                    <span>Monthly Room Rent</span>
                    <strong>₹{selectedBooking.monthlyRent.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="breakdown-row">
                    <span>Security Deposit (Refundable)</span>
                    <strong>₹{selectedBooking.securityDeposit.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="breakdown-row">
                    <span>Advance Booking Token</span>
                    <span>₹{selectedBooking.bookingAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="breakdown-row total">
                    <span>Total Move-in Package</span>
                    <strong>
                      ₹{(selectedBooking.monthlyRent + selectedBooking.securityDeposit).toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="breakdown-row paid">
                    <span>Amount Paid to Date</span>
                    <strong>₹{selectedBooking.paidAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="breakdown-row due">
                    <span>Balance Due Upon Move-In</span>
                    <strong>
                      ₹
                      {Math.max(
                        0,
                        selectedBooking.monthlyRent +
                          selectedBooking.securityDeposit -
                          selectedBooking.paidAmount
                      ).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Operational Notes */}
              {selectedBooking.notes && (
                <div>
                  <h4 className="modal-section-title">Internal Notes</h4>
                  <div className="modal-notes-box">
                    {selectedBooking.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedBooking.bookingStatus === 'CONFIRMED' && (
                <Link
                  to="/owner/rooms"
                  className="quick-action-btn primary"
                  style={{ textDecoration: 'none' }}
                >
                  Assign Bed in Rooms
                </Link>
              )}
              <Link to="/owner/payments" className="btn-table-action" style={{ textDecoration: 'none' }}>
                Open Payments Ledger
              </Link>
              <button
                type="button"
                className="btn-table-action"
                onClick={() => setSelectedBooking(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
