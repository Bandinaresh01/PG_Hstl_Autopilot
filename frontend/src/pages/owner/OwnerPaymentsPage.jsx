import React, { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  initialPayments,
  demoMonthlyTrends,
  getPaymentSummary,
} from '../../data/paymentsData'
import './OwnerPaymentsPage.css'
import './OwnerBookingsPage.css'
import './OwnerDashboardPage.css'

export default function OwnerPaymentsPage() {
  const [searchParams] = useSearchParams()
  const initialFilterParam = searchParams.get('status')?.toUpperCase() || 'ALL'

  const [payments, setPayments] = useState(initialPayments)
  const [activeFilter, setActiveFilter] = useState(
    ['PAID', 'PENDING', 'DUE_SOON', 'OVERDUE'].includes(initialFilterParam)
      ? initialFilterParam
      : 'ALL'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Record Payment Form State
  const [recordForm, setRecordForm] = useState({
    tenantName: '',
    room: '',
    type: 'Monthly Rent',
    amount: '',
    paidDate: '2026-09-26',
    reference: '',
    notes: '',
  })

  // Dynamic Summary calculations
  const summary = useMemo(() => getPaymentSummary(payments), [payments])

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // 1. Filter Tab
      if (activeFilter === 'PAID' && item.status !== 'PAID') return false
      if (activeFilter === 'PENDING' && item.status !== 'PENDING') return false
      if (activeFilter === 'DUE_SOON' && item.status !== 'DUE_SOON') return false
      if (activeFilter === 'OVERDUE' && item.status !== 'OVERDUE') return false

      // 2. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = item.tenantName.toLowerCase().includes(q)
        const matchRoom = item.room.toLowerCase().includes(q)
        const matchId = item.id.toLowerCase().includes(q)
        const matchRef = (item.reference || '').toLowerCase().includes(q)
        return matchName || matchRoom || matchId || matchRef
      }

      return true
    })
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

  const handleRecordSubmit = (e) => {
    e.preventDefault()
    if (!recordForm.tenantName || !recordForm.amount) return

    const newPayment = {
      id: `PAY-MANUAL-${Date.now().toString().slice(-4)}`,
      tenantId: `TEN-MANUAL`,
      tenantName: recordForm.tenantName,
      phone: '-',
      room: recordForm.room || 'General Room',
      type: recordForm.type,
      amount: Number(recordForm.amount) || 0,
      dueDate: recordForm.paidDate,
      paidDate: recordForm.paidDate,
      status: 'PAID',
      reference: recordForm.reference || `UPI/REC-${Date.now().toString().slice(-6)}`,
      notes: recordForm.notes || 'Recorded manually via Owner CRM',
    }

    setPayments((prev) => [newPayment, ...prev])
    setShowRecordModal(false)
    setRecordForm({
      tenantName: '',
      room: '',
      type: 'Monthly Rent',
      amount: '',
      paidDate: '2026-09-26',
      reference: '',
      notes: '',
    })

    setToastMessage(`Payment of ₹${Number(newPayment.amount).toLocaleString('en-IN')} recorded for ${newPayment.tenantName}`)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Percentages for status bar
  const paidPercent = 84.1
  const pendingPercent = 10.6
  const overduePercent = 5.3

  return (
    <div className="owner-payments-view">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="quick-action-toast" role="status">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Row */}
      <div className="payments-header-row">
        <div>
          <h1 className="payments-title">Payments</h1>
          <p className="payments-subtitle">
            Track rent collection, booking payments, deposits and pending balances.
          </p>
        </div>

        <button
          type="button"
          className="quick-action-btn primary"
          onClick={() => setShowRecordModal(true)}
        >
          <span className="btn-icon">₹</span>
          <span>Record Payment</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <section className="kpi-primary-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Expected</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>📋</div>
          </div>
          <div className="kpi-card-number">₹{summary.totalExpected.toLocaleString('en-IN')}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">September cycle</span>
            <span className="kpi-sub-text">All active beds</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Collected</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>💰</div>
          </div>
          <div className="kpi-card-number" style={{ color: '#15803d' }}>
            ₹{summary.totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
              84.1% Realized
            </span>
            <span className="kpi-sub-text">In bank &amp; cash</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Pending</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>⏳</div>
          </div>
          <div className="kpi-card-number" style={{ color: '#b45309' }}>
            ₹{summary.totalPending.toLocaleString('en-IN')}
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              Due this cycle
            </span>
            <span className="kpi-sub-text">Upcoming dates</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Overdue</span>
            <div className="kpi-card-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>⚠️</div>
          </div>
          <div className="kpi-card-number" style={{ color: '#dc2626' }}>
            ₹{summary.totalOverdue.toLocaleString('en-IN')}
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
              Past deadline
            </span>
            <span className="kpi-sub-text">Follow-up needed</span>
          </div>
        </div>
      </section>

      {/* 3. Secondary Nav Strip (Direct Link to Rent Dues Module) */}
      <div className="payments-nav-strip">
        <div className="nav-pills-group">
          <span className="nav-pill-btn active">
            <span>All Payment Transactions</span>
          </span>
          <Link to="/owner/dues" className="nav-pill-btn">
            <span>📅</span>
            <span>Rent Dues &amp; Deadlines</span>
          </Link>
        </div>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Real-time collection ledger &bull; UrbanNest Operations
        </span>
      </div>

      {/* 4. Financial Charts: Monthly Rent Collection & Payment Status Overview */}
      <section className="charts-grid-two-col">
        {/* Card 1: Monthly Rent Collection Bar Visualizer */}
        <div className="financial-chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-card-title">Monthly Rent Collection</h3>
              <span className="chart-card-sub">Expected vs. Collected comparison for recent months</span>
            </div>
            <span className="bar-rate-badge">5-Month Trend</span>
          </div>

          <div className="monthly-bars-container">
            {demoMonthlyTrends.map((trend) => (
              <div key={trend.month} className="bar-month-row">
                <div className="bar-meta-row">
                  <span className="bar-month-name">{trend.month}</span>
                  <div className="bar-figures">
                    <span className="bar-collected">
                      ₹{trend.collected.toLocaleString('en-IN')}
                    </span>
                    <span className="bar-expected">
                      / ₹{trend.expected.toLocaleString('en-IN')}
                    </span>
                    <span className="bar-rate-badge">{trend.rate}%</span>
                  </div>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.min(100, (trend.collected / trend.expected) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Payment Status Overview */}
        <div className="financial-chart-card status-breakdown-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-card-title">Payment Status Overview</h3>
              <span className="chart-card-sub">Current September month collection health</span>
            </div>
          </div>

          <div>
            <div className="progress-segmented-bar">
              <div className="segment-paid" style={{ width: `${paidPercent}%` }} title="Paid (84.1%)" />
              <div className="segment-pending" style={{ width: `${pendingPercent}%` }} title="Pending (10.6%)" />
              <div className="segment-overdue" style={{ width: `${overduePercent}%` }} title="Overdue (5.3%)" />
            </div>
          </div>

          <div className="breakdown-legend-list">
            <div className="legend-item">
              <div className="legend-indicator-group">
                <span className="legend-dot" style={{ backgroundColor: '#16a34a' }} />
                <span>Collected (84.1%)</span>
              </div>
              <span className="legend-amount">₹{summary.totalCollected.toLocaleString('en-IN')}</span>
            </div>
            <div className="legend-item">
              <div className="legend-indicator-group">
                <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />
                <span>Pending / Due Soon (10.6%)</span>
              </div>
              <span className="legend-amount">₹{summary.totalPending.toLocaleString('en-IN')}</span>
            </div>
            <div className="legend-item">
              <div className="legend-indicator-group">
                <span className="legend-dot" style={{ backgroundColor: '#ef4444' }} />
                <span>Overdue (5.3%)</span>
              </div>
              <span className="legend-amount" style={{ color: '#dc2626' }}>
                ₹{summary.totalOverdue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <Link
            to="/owner/dues"
            className="btn-table-action"
            style={{ textAlign: 'center', textDecoration: 'none', marginTop: '8px' }}
          >
            Review Pending &amp; Overdue Accounts &rarr;
          </Link>
        </div>
      </section>

      {/* 5. Search & Filter Bar */}
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
              placeholder="Search by tenant name, room, or reference ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bookings-filter-tabs">
          {[
            { id: 'ALL', label: 'All Payments' },
            { id: 'PAID', label: 'Paid' },
            { id: 'DUE_SOON', label: 'Due Soon' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'OVERDUE', label: 'Overdue' },
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

      {/* 6. Payment Table */}
      <section className="dashboard-section">
        <div className="section-card-header">
          <div>
            <h3 className="section-title">Transactions Ledger</h3>
            <p className="section-subtitle">
              Showing {filteredPayments.length} of {payments.length} entries
            </p>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="card-empty-state">
            <span className="empty-icon">💳</span>
            <p className="empty-title">No payment records available.</p>
            <p className="empty-desc">
              No transactions match your current search or filter selection.
            </p>
          </div>
        ) : (
          <div className="enquiries-table-wrapper">
            <table className="enquiries-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Tenant</th>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Paid Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                        {p.id}
                      </code>
                    </td>
                    <td>
                      <strong className="tenant-cell-name">{p.tenantName}</strong>
                    </td>
                    <td>
                      <span className="enquiry-room-tag">{p.room}</span>
                    </td>
                    <td>
                      <span className="badge-pay-type">{p.type}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>
                        ₹{p.amount.toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td>{formatDate(p.dueDate)}</td>
                    <td>
                      <span style={{ color: p.paidDate ? '#16a34a' : '#64748b' }}>
                        {formatDate(p.paidDate)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-pay ${p.status.toLowerCase().replace('_', '-')}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-table-action"
                        onClick={() => setSelectedPayment(p)}
                        title="View Receipt Details"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 7. View Payment Detail Modal */}
      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">Payment Record</h3>
                <span className={`badge-pay ${selectedPayment.status.toLowerCase().replace('_', '-')}`}>
                  {selectedPayment.status.replace('_', ' ')}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedPayment(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-label">Payment ID</span>
                  <span className="modal-value">{selectedPayment.id}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-label">Tenant Name</span>
                  <span className="modal-value">{selectedPayment.tenantName}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-label">Room / Bed</span>
                  <span className="modal-value">{selectedPayment.room}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-label">Payment Type</span>
                  <span className="modal-value">{selectedPayment.type}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-label">Amount</span>
                  <span className="modal-value" style={{ fontSize: '1.1rem', color: '#16a34a' }}>
                    ₹{selectedPayment.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-label">Due Date</span>
                  <span className="modal-value">{formatDate(selectedPayment.dueDate)}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-label">Paid Date</span>
                  <span className="modal-value">
                    {selectedPayment.paidDate ? formatDate(selectedPayment.paidDate) : 'Pending Collection'}
                  </span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-label">Reference / UTR</span>
                  <span className="modal-value">
                    <code>{selectedPayment.reference || 'None'}</code>
                  </span>
                </div>
              </div>

              {selectedPayment.notes && (
                <div>
                  <h4 className="modal-section-title">Ledger Notes</h4>
                  <div className="modal-notes-box">
                    {selectedPayment.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="quick-action-btn primary"
                onClick={() => setSelectedPayment(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Record Payment Modal */}
      {showRecordModal && (
        <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleRecordSubmit}>
              <div className="modal-header">
                <h3 className="modal-title">Record Payment</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowRecordModal(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="form-grid-two">
                  <div className="form-field-group">
                    <label className="form-field-label">Tenant Name *</label>
                    <input
                      type="text"
                      className="form-field-input"
                      placeholder="e.g. Rahul Kumar"
                      value={recordForm.tenantName}
                      onChange={(e) => setRecordForm({ ...recordForm, tenantName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label">Room / Bed</label>
                    <input
                      type="text"
                      className="form-field-input"
                      placeholder="e.g. Room 204 / Bed B"
                      value={recordForm.room}
                      onChange={(e) => setRecordForm({ ...recordForm, room: e.target.value })}
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label">Payment Type *</label>
                    <select
                      className="form-field-select"
                      value={recordForm.type}
                      onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
                    >
                      <option value="Monthly Rent">Monthly Rent</option>
                      <option value="Security Deposit">Security Deposit</option>
                      <option value="Booking Amount">Booking Amount</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Food">Food</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label">Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-field-input"
                      placeholder="e.g. 8500"
                      value={recordForm.amount}
                      onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label">Paid Date *</label>
                    <input
                      type="date"
                      className="form-field-input"
                      value={recordForm.paidDate}
                      onChange={(e) => setRecordForm({ ...recordForm, paidDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label">Reference / UTR / Receipt No.</label>
                    <input
                      type="text"
                      className="form-field-input"
                      placeholder="e.g. UPI/6281928374"
                      value={recordForm.reference}
                      onChange={(e) => setRecordForm({ ...recordForm, reference: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Ledger Notes</label>
                  <input
                    type="text"
                    className="form-field-input"
                    placeholder="e.g. Paid via Google Pay QR code at counter"
                    value={recordForm.notes}
                    onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-table-action"
                  onClick={() => setShowRecordModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="quick-action-btn primary">
                  Save Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
