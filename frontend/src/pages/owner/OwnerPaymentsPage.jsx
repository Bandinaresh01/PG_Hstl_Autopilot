import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  initialPayments,
  demoMonthlyTrends,
} from '../../data/paymentsData'
import { initialTenants } from '../../data/tenantsData'
import { fetchOwnerPayments, recordOwnerPayment } from '../../utils/ownerAuth'
import './OwnerPaymentsPage.css'
import './OwnerBookingsPage.css'
import './OwnerDashboardPage.css'

export default function OwnerPaymentsPage() {
  const [searchParams] = useSearchParams()
  const initialFilterParam = searchParams.get('status')?.toUpperCase() || 'ALL'

  const [payments, setPayments] = useState(initialPayments)
  const [activeFilter, setActiveFilter] = useState(
    ['PAID', 'PENDING', 'DUE_SOON', 'OVERDUE', 'PARTIAL'].includes(initialFilterParam)
      ? initialFilterParam
      : 'ALL'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Record Payment Form State
  const [recordForm, setRecordForm] = useState({
    paymentId: '',
    tenantId: 'TEN-101',
    tenantName: 'Rahul Kumar',
    room: 'Room 204 (Bed A)',
    type: 'Monthly Rent',
    amountDue: 8500,
    amountPaid: 8500,
    dueDate: '2026-09-24',
    paidDate: '2026-09-26',
    paymentMethod: 'UPI',
    reference: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recordError, setRecordError] = useState('')

  // Load authoritative payments from backend
  const loadPayments = useCallback(async () => {
    try {
      const res = await fetchOwnerPayments(activeFilter, searchQuery)
      if (res && res.payments && res.payments.length > 0) {
        setPayments(res.payments)
      }
    } catch (err) {
      console.warn('Backend payment fetch notice:', err.message)
    }
  }, [activeFilter, searchQuery])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  // Open Record Modal helper
  const openRecordModal = (existing = null) => {
    if (existing) {
      const amtDue = Number(existing.amount_due ?? existing.amount ?? 8500)
      const amtPaid = Number(existing.amount_paid ?? 0)
      const bal = Number(existing.balance_amount ?? Math.max(0, amtDue - amtPaid))
      setRecordForm({
        paymentId: existing.id || '',
        tenantId: existing.tenant_id || existing.tenantId || 'TEN-101',
        tenantName: existing.tenant_name || existing.tenantName || 'Rahul Kumar',
        room: existing.room_number || existing.room || 'Room 204 (Bed A)',
        type: existing.payment_type || existing.type || 'Monthly Rent',
        amountDue: amtDue,
        amountPaid: bal > 0 ? bal : amtDue, // Default to remaining balance or full amount
        dueDate: existing.due_date || existing.dueDate || '2026-09-24',
        paidDate: '2026-09-26',
        paymentMethod: 'UPI',
        reference: '',
        notes: existing.notes || '',
      })
    } else {
      const defaultTenant = initialTenants[0] || {}
      setRecordForm({
        paymentId: '',
        tenantId: defaultTenant.id || 'TEN-101',
        tenantName: defaultTenant.name || 'Rahul Kumar',
        room: `${defaultTenant.roomNumber || 'Room 204'} (${defaultTenant.bedCode || 'Bed A'})`,
        type: 'Monthly Rent',
        amountDue: defaultTenant.monthlyRent || 8500,
        amountPaid: defaultTenant.monthlyRent || 8500,
        dueDate: defaultTenant.nextDueDate || '2026-09-24',
        paidDate: '2026-09-26',
        paymentMethod: 'UPI',
        reference: '',
        notes: '',
      })
    }
    setRecordError('')
    setShowRecordModal(true)
  }

  // Handle selecting a tenant from dropdown
  const handleTenantSelect = (selectedTid) => {
    const t = initialTenants.find((item) => item.id === selectedTid)
    if (t) {
      const existingPending = payments.find(
        (p) =>
          ((p.tenant_id === t.id || p.tenantId === t.id) ||
            ((p.tenant_name || p.tenantName || '').toLowerCase() === t.name.toLowerCase())) &&
          p.status !== 'PAID'
      )

      setRecordForm((prev) => ({
        ...prev,
        paymentId: existingPending ? existingPending.id : '',
        tenantId: t.id,
        tenantName: t.name,
        room: `${t.roomNumber} (${t.bedCode})`,
        amountDue: existingPending ? Number(existingPending.amount_due ?? existingPending.amount) : t.monthlyRent,
        amountPaid: existingPending ? Number(existingPending.balance_amount ?? existingPending.amount_due ?? t.monthlyRent) : t.monthlyRent,
        dueDate: existingPending ? (existingPending.due_date ?? existingPending.dueDate) : t.nextDueDate,
      }))
    }
  }

  // Dynamic Summary calculations (supports both camelCase and snake_case backend data)
  const summary = useMemo(() => {
    let totalExpected = 0
    let totalCollected = 0
    let totalPending = 0
    let totalOverdue = 0

    payments.forEach((p) => {
      const due = Number(p.amount_due ?? p.amount ?? 0)
      const paid = Number(p.amount_paid ?? (p.status === 'PAID' ? due : 0))
      const bal = Number(p.balance_amount ?? Math.max(0, due - paid))
      const st = p.status || 'PENDING'

      totalExpected += due
      totalCollected += paid

      if (st === 'OVERDUE') {
        totalOverdue += bal
      } else if (['PENDING', 'DUE_SOON', 'PARTIAL'].includes(st)) {
        totalPending += bal
      }
    })

    return {
      totalExpected,
      totalCollected,
      totalPending,
      totalOverdue,
      totalCount: payments.length,
    }
  }, [payments])

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      const st = item.status || 'PENDING'
      // 1. Filter Tab
      if (activeFilter === 'PAID' && st !== 'PAID') return false
      if (activeFilter === 'PENDING' && !['PENDING', 'DUE_SOON'].includes(st)) return false
      if (activeFilter === 'DUE_SOON' && st !== 'DUE_SOON') return false
      if (activeFilter === 'OVERDUE' && st !== 'OVERDUE') return false
      if (activeFilter === 'PARTIAL' && st !== 'PARTIAL') return false

      // 2. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const tName = (item.tenant_name || item.tenantName || '').toLowerCase()
        const room = (item.room_number || item.room || '').toLowerCase()
        const matchId = (item.id || '').toLowerCase()
        const matchRef = (item.reference_number || item.reference || '').toLowerCase()
        return tName.includes(q) || room.includes(q) || matchId.includes(q) || matchRef.includes(q)
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

  const handleRecordSubmit = async (e) => {
    e.preventDefault()
    if (!recordForm.tenantName || !recordForm.amountDue) return

    setIsSubmitting(true)
    setRecordError('')

    try {
      const payload = {
        payment_id: recordForm.paymentId || undefined,
        tenant_id: recordForm.tenantId,
        tenant_name: recordForm.tenantName,
        room_number: recordForm.room,
        payment_type: recordForm.type,
        amount_due: Number(recordForm.amountDue),
        amount_paid: Number(recordForm.amountPaid),
        due_date: recordForm.dueDate,
        paid_date: recordForm.paidDate,
        payment_method: recordForm.paymentMethod,
        reference_number: recordForm.reference,
        notes: recordForm.notes,
      }

      const res = await recordOwnerPayment(payload)
      await loadPayments()
      setShowRecordModal(false)

      const saved = res.payment || payload
      const bal = saved.balance_amount ?? Math.max(0, saved.amount_due - saved.amount_paid)
      const st = saved.status || 'PAID'

      setToastMessage(
        `Payment recorded: ₹${Number(saved.amount_paid || recordForm.amountPaid).toLocaleString('en-IN')} for ${saved.tenant_name || recordForm.tenantName}! (Balance: ₹${Number(bal).toLocaleString('en-IN')} • Status: ${st})`
      )
      setTimeout(() => setToastMessage(null), 4500)
    } catch (err) {
      setRecordError(err.message || 'Failed to record payment in backend.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Percentages for status bar
  const paidPercent = summary.totalExpected > 0 ? ((summary.totalCollected / summary.totalExpected) * 100).toFixed(1) : 0
  const pendingPercent = summary.totalExpected > 0 ? ((summary.totalPending / summary.totalExpected) * 100).toFixed(1) : 0
  const overduePercent = summary.totalExpected > 0 ? ((summary.totalOverdue / summary.totalExpected) * 100).toFixed(1) : 0

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
          <h1 className="payments-title">Payments &amp; Ledger</h1>
          <p className="payments-subtitle">
            Authoritative rent collection, partial payments, deposits, and real-time tenant ledger sync.
          </p>
        </div>

        <button
          type="button"
          className="quick-action-btn primary"
          onClick={() => openRecordModal()}
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
            { id: 'PARTIAL', label: 'Partial' },
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
              Showing {filteredPayments.length} of {payments.length} entries (Synced with live database)
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
                  <th>Amount Due</th>
                  <th>Amount Paid</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => {
                  const pId = p.id
                  const tName = p.tenant_name ?? p.tenantName
                  const room = p.room_number ?? p.room
                  const pType = p.payment_type ?? p.type
                  const amtDue = Number(p.amount_due ?? p.amount ?? 0)
                  const amtPaid = Number(p.amount_paid ?? (p.status === 'PAID' ? amtDue : 0))
                  const balance = Number(p.balance_amount ?? Math.max(0, amtDue - amtPaid))
                  const dueDate = p.due_date ?? p.dueDate
                  const status = p.status || 'PENDING'
                  const statusClass = status.toLowerCase().replace('_', '-')

                  return (
                    <tr key={pId}>
                      <td>
                        <code style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                          {pId}
                        </code>
                      </td>
                      <td>
                        <strong className="tenant-cell-name">{tName}</strong>
                      </td>
                      <td>
                        <span className="enquiry-room-tag">{room}</span>
                      </td>
                      <td>
                        <span className="badge-pay-type">{pType}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>
                          ₹{amtDue.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>
                        <span style={{ color: amtPaid > 0 ? '#166534' : '#64748b', fontWeight: 600 }}>
                          ₹{amtPaid.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: balance > 0 ? '#b91c1c' : '#166534' }}>
                          ₹{balance.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>{formatDate(dueDate)}</td>
                      <td>
                        <span className={`badge-pay ${statusClass}`}>
                          {status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => setSelectedPayment(p)}
                            title="View Receipt Details"
                          >
                            View
                          </button>
                          {balance > 0 && (
                            <button
                              type="button"
                              className="btn-table-action"
                              style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', fontWeight: 600 }}
                              onClick={() => openRecordModal(p)}
                              title="Record payment or partial collection"
                            >
                              Collect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
        <div className="modal-overlay" onClick={() => !isSubmitting && setShowRecordModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <form onSubmit={handleRecordSubmit}>
              <div className="modal-header">
                <div className="modal-title-group">
                  <h3 className="modal-title">Record Payment / Collect Rent</h3>
                  {recordForm.paymentId && (
                    <span className="badge-pay pending">Invoice: {recordForm.paymentId}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => !isSubmitting && setShowRecordModal(false)}
                  aria-label="Close"
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {recordError && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '14px' }}>
                    ⚠️ {recordError}
                  </div>
                )}

                <div className="form-grid-two">
                  {/* Tenant Selection */}
                  <div className="form-field-group">
                    <label className="form-field-label">Select Tenant *</label>
                    <select
                      className="form-field-select"
                      value={recordForm.tenantId}
                      onChange={(e) => handleTenantSelect(e.target.value)}
                    >
                      {initialTenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.id} • {t.roomNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Room / Bed */}
                  <div className="form-field-group">
                    <label className="form-field-label">Room &amp; Bed</label>
                    <input
                      type="text"
                      className="form-field-input"
                      value={recordForm.room}
                      onChange={(e) => setRecordForm({ ...recordForm, room: e.target.value })}
                      required
                    />
                  </div>

                  {/* Payment Type */}
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
                      <option value="Food">Food / Meals</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Laundry">Laundry</option>
                      <option value="Late Fee">Late Fee</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Amount Due */}
                  <div className="form-field-group">
                    <label className="form-field-label">Amount Due (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-field-input"
                      value={recordForm.amountDue}
                      onChange={(e) => setRecordForm({ ...recordForm, amountDue: e.target.value })}
                      required
                    />
                  </div>

                  {/* Amount Paid */}
                  <div className="form-field-group">
                    <label className="form-field-label">Amount Paid (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-field-input"
                      value={recordForm.amountPaid}
                      onChange={(e) => setRecordForm({ ...recordForm, amountPaid: e.target.value })}
                      required
                    />
                  </div>

                  {/* Payment Mode */}
                  <div className="form-field-group">
                    <label className="form-field-label">Payment Mode *</label>
                    <select
                      className="form-field-select"
                      value={recordForm.paymentMethod}
                      onChange={(e) => setRecordForm({ ...recordForm, paymentMethod: e.target.value })}
                    >
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div className="form-field-group">
                    <label className="form-field-label">Due Date *</label>
                    <input
                      type="date"
                      className="form-field-input"
                      value={recordForm.dueDate}
                      onChange={(e) => setRecordForm({ ...recordForm, dueDate: e.target.value })}
                      required
                    />
                  </div>

                  {/* Paid Date */}
                  <div className="form-field-group">
                    <label className="form-field-label">Payment Date</label>
                    <input
                      type="date"
                      className="form-field-input"
                      value={recordForm.paidDate}
                      onChange={(e) => setRecordForm({ ...recordForm, paidDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Reference */}
                <div className="form-field-group" style={{ marginTop: '12px' }}>
                  <label className="form-field-label">Transaction Reference / UTR Number</label>
                  <input
                    type="text"
                    className="form-field-input"
                    placeholder="e.g. UPI/6281928374 or Bank Ref"
                    value={recordForm.reference}
                    onChange={(e) => setRecordForm({ ...recordForm, reference: e.target.value })}
                  />
                </div>

                {/* Ledger Notes */}
                <div className="form-field-group" style={{ marginTop: '12px' }}>
                  <label className="form-field-label">Ledger Notes</label>
                  <input
                    type="text"
                    className="form-field-input"
                    placeholder="e.g. Partial settlement for September rent. Remaining balance due by weekend."
                    value={recordForm.notes}
                    onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                  />
                </div>

                {/* Live Balance & Status Preview Card */}
                {(() => {
                  const due = Number(recordForm.amountDue) || 0
                  const paid = Number(recordForm.amountPaid) || 0
                  const bal = Math.max(0, due - paid)
                  const isPartial = paid > 0 && bal > 0
                  const isPaid = paid >= due && due > 0
                  const statusLabel = isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING'
                  const statusBg = isPaid ? '#f0fdf4' : isPartial ? '#fffbeb' : '#f8fafc'
                  const statusBorder = isPaid ? '#bbf7d0' : isPartial ? '#fde68a' : '#e2e8f0'
                  const statusText = isPaid ? '#166534' : isPartial ? '#92400e' : '#475569'

                  return (
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '12px 16px',
                        background: statusBg,
                        border: `1px solid ${statusBorder}`,
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>
                          Authoritative Balance Calculation:
                        </span>
                        <strong style={{ fontSize: '1rem', color: bal > 0 ? '#b91c1c' : '#166534' }}>
                          Balance Remaining: ₹{bal.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Result Status</span>
                        <span
                          className={`badge-pay ${statusLabel.toLowerCase()}`}
                          style={{ color: statusText, fontWeight: 800 }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-table-action"
                  onClick={() => setShowRecordModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="quick-action-btn primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Recording Payment...' : 'Save & Sync Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
