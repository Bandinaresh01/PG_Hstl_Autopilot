import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  useTenantAuth,
  fetchTenantPayments,
  fetchTenantPaymentSummary,
} from '../../utils/tenantAuth'
import './TenantPaymentsPage.css'
import './TenantDashboardPage.css'

export default function TenantPaymentsPage() {
  const { tenantUser } = useTenantAuth()

  // Data states
  const [summary, setSummary] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters & search
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  // Load authoritative tenant payment data
  const loadPaymentData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [summaryRes, paymentsRes] = await Promise.all([
        fetchTenantPaymentSummary(),
        fetchTenantPayments(activeFilter, searchQuery),
      ])
      setSummary(summaryRes)
      setPayments(paymentsRes.payments || [])
    } catch (err) {
      setError(err.message || 'Unable to load payment records.')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, searchQuery])

  useEffect(() => {
    loadPaymentData()
  }, [loadPaymentData])

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // 1. Status Filter Tab
      if (activeFilter === 'PAID' && item.status !== 'PAID') return false
      if (activeFilter === 'PENDING' && !['PENDING', 'DUE_SOON'].includes(item.status)) return false
      if (activeFilter === 'OVERDUE' && item.status !== 'OVERDUE') return false
      if (activeFilter === 'PARTIAL' && item.status !== 'PARTIAL') return false

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchId = (item.id || '').toLowerCase().includes(q)
        const matchType = (item.payment_type || '').toLowerCase().includes(q)
        const matchRef = (item.reference_number || '').toLowerCase().includes(q)
        const matchMethod = (item.payment_method || '').toLowerCase().includes(q)
        return matchId || matchType || matchRef || matchMethod
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

  const handlePrintReceipt = () => {
    window.print()
  }

  const handleOnlinePayClick = () => {
    setToastMessage('Online Payment Gateway: Direct UPI and Card payments will be enabled in next update!')
    setTimeout(() => setToastMessage(''), 4500)
  }

  // Derive top-level metrics (falling back gracefully)
  const monthlyRent = summary?.monthly_rent ?? tenantUser?.monthly_rent ?? 8500
  const outstandingAmount = summary?.outstanding_amount ?? 0
  const nextDueDate = summary?.next_due_date ? formatDate(summary.next_due_date) : 'Oct 05, 2026'
  const paymentStatus = summary?.payment_status ?? 'PAID'
  const currentDue = summary?.current_due
  const deposit = summary?.security_deposit
  const otherCharges = summary?.other_charges || []

  return (
    <div className="tenant-payments-view">
      {/* Toast Notification */}
      {toastMessage && <div className="toast-success">{toastMessage}</div>}

      {/* 1. Header Row */}
      <div className="payments-header-row">
        <div>
          <h1 className="payments-title">Payments &amp; Rent Due</h1>
          <p className="payments-subtitle">
            Authoritative statement of your monthly rent, security deposit, and payment history.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-tenant-action"
            onClick={loadPaymentData}
            title="Refresh payment records"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <section className="payment-kpi-grid">
        {/* Monthly Rent */}
        <div className="payment-kpi-card">
          <div className="payment-kpi-header">
            <span className="payment-kpi-label">Monthly Rent</span>
            <div className="payment-kpi-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              🏠
            </div>
          </div>
          <div className="payment-kpi-number">
            ₹{monthlyRent.toLocaleString('en-IN')}
          </div>
          <div className="payment-kpi-footer">
            <span>Cycle: 1st of every month</span>
          </div>
        </div>

        {/* Next Due Date */}
        <div className="payment-kpi-card">
          <div className="payment-kpi-header">
            <span className="payment-kpi-label">Next Due Date</span>
            <div className="payment-kpi-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
              📅
            </div>
          </div>
          <div className="payment-kpi-number" style={{ fontSize: '1.4rem' }}>
            {nextDueDate}
          </div>
          <div className="payment-kpi-footer">
            <span>{currentDue?.timing?.label || 'Scheduled Billing'}</span>
          </div>
        </div>

        {/* Outstanding Amount */}
        <div
          className={`payment-kpi-card ${
            outstandingAmount > 0
              ? paymentStatus === 'OVERDUE'
                ? 'overdue'
                : 'highlight'
              : ''
          }`}
        >
          <div className="payment-kpi-header">
            <span className="payment-kpi-label">Outstanding Balance</span>
            <div
              className="payment-kpi-icon"
              style={{
                backgroundColor: outstandingAmount > 0 ? '#fee2e2' : '#dcfce7',
                color: outstandingAmount > 0 ? '#b91c1c' : '#15803d',
              }}
            >
              ₹
            </div>
          </div>
          <div
            className="payment-kpi-number"
            style={{ color: outstandingAmount > 0 ? '#b91c1c' : '#16a34a' }}
          >
            ₹{outstandingAmount.toLocaleString('en-IN')}
          </div>
          <div className="payment-kpi-footer">
            <span
              className={`badge-pay ${paymentStatus.toLowerCase().replace('_', '-')}`}
            >
              {paymentStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Security Deposit Held */}
        <div className="payment-kpi-card">
          <div className="payment-kpi-header">
            <span className="payment-kpi-label">Security Deposit</span>
            <div className="payment-kpi-icon" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
              🛡️
            </div>
          </div>
          <div className="payment-kpi-number" style={{ color: '#166534' }}>
            ₹{(deposit?.amount || monthlyRent).toLocaleString('en-IN')}
          </div>
          <div className="payment-kpi-footer">
            <span className="badge-pay paid">{deposit?.status || 'PAID'}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Held for settlement</span>
          </div>
        </div>
      </section>

      {/* 3. Prominent Current Due Section */}
      <section>
        {outstandingAmount > 0 && currentDue ? (
          <div
            className={`current-due-banner ${
              currentDue.status === 'OVERDUE'
                ? 'overdue'
                : currentDue.status === 'PARTIAL'
                ? 'partial'
                : ''
            }`}
          >
            <div className="current-due-info">
              <div className="current-due-title-row">
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                  Current Charge Due
                </span>
                <span className={`badge-pay ${currentDue.status.toLowerCase().replace('_', '-')}`}>
                  {currentDue.status.replace('_', ' ')}
                </span>
                {currentDue.timing?.label && (
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: currentDue.timing.is_overdue ? '#b91c1c' : '#1e40af',
                    }}
                  >
                    • {currentDue.timing.label}
                  </span>
                )}
              </div>

              <div className="current-due-amount-row">
                <span className="current-due-amount">
                  ₹{currentDue.balance.toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                  remaining of ₹{currentDue.amount_due.toLocaleString('en-IN')}{' '}
                  {currentDue.amount_paid > 0 && `(₹${currentDue.amount_paid.toLocaleString('en-IN')} already paid)`}
                </span>
              </div>

              <div className="current-due-meta">
                <span>Charge: <strong>{currentDue.charge_type}</strong></span>
                <span>Due Date: <strong>{formatDate(currentDue.due_date)}</strong></span>
                {currentDue.notes && <span>Notes: {currentDue.notes}</span>}
              </div>
            </div>

            <div className="current-due-actions">
              <button
                type="button"
                className="btn-tenant-action"
                style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                onClick={() => setSelectedDetail(currentDue)}
              >
                View Breakdown
              </button>
              <button
                type="button"
                className="btn-tenant-action primary"
                style={{ backgroundColor: '#94a3b8', cursor: 'not-allowed' }}
                onClick={handleOnlinePayClick}
                title="Direct gateway integration coming soon"
              >
                💳 Pay Online (Coming Soon)
              </button>
            </div>
          </div>
        ) : (
          <div className="caught-up-banner">
            <span className="caught-up-icon">🎉</span>
            <div>
              <h3 className="caught-up-title">You're all caught up!</h3>
              <p className="caught-up-text">
                No outstanding dues or overdue rent on your account. Your room stay is in good standing.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 4. Security Deposit & Other Charges Cards */}
      <section className="charges-grid">
        {/* Security Deposit Card */}
        <div className="charge-card">
          <div className="charge-card-header">
            <h3 className="charge-card-title">
              <span>🛡️</span> Security Deposit
            </h3>
            <span className="badge-pay paid">{deposit?.status || 'PAID'}</span>
          </div>
          <div className="charge-detail-rows">
            <div className="charge-row">
              <span>Deposit Held:</span>
              <strong>₹{(deposit?.amount || monthlyRent).toLocaleString('en-IN')}</strong>
            </div>
            <div className="charge-row">
              <span>Paid On:</span>
              <span>{formatDate(deposit?.paid_date || '2026-07-01')}</span>
            </div>
            <div className="charge-row">
              <span>Payment Mode / Ref:</span>
              <span>{deposit?.reference || 'UPI / Transfer'}</span>
            </div>
            <div className="charge-row" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
              <span>* Fully refundable upon end-of-stay clearance &amp; keycard handover.</span>
            </div>
          </div>
        </div>

        {/* Other Charges / Utilities Breakdown */}
        <div className="charge-card">
          <div className="charge-card-header">
            <h3 className="charge-card-title">
              <span>⚡</span> Additional Charges &amp; Utilities
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
              {otherCharges.length} Item{otherCharges.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="charge-detail-rows">
            {otherCharges.length > 0 ? (
              otherCharges.map((chg) => (
                <div key={chg.id} className="charge-row" style={{ alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.85rem' }}>{chg.charge_type}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Due: {formatDate(chg.due_date)}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: '#b91c1c' }}>₹{chg.balance.toLocaleString('en-IN')}</span>
                    <span className={`badge-pay ${chg.status.toLowerCase().replace('_', '-')}`} style={{ display: 'block', fontSize: '0.675rem' }}>
                      {chg.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '12px 0', fontSize: '0.85rem', color: '#64748b' }}>
                No active incidental charges (electricity meter, maintenance, laundry, or meal fees).
              </div>
            )}
            <div className="charge-row" style={{ fontSize: '0.8rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
              <span>High-Speed Wi-Fi &amp; Daily Housekeeping included in monthly rent.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Payment History Table & Filter Bar */}
      <section className="history-section-card">
        <div className="history-card-header">
          <div className="history-tabs-group">
            {['ALL', 'PAID', 'PENDING', 'OVERDUE', 'PARTIAL'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`history-tab-btn ${activeFilter === tab ? 'active' : ''}`}
                onClick={() => setActiveFilter(tab)}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div>
            <input
              type="text"
              className="history-search-input"
              placeholder="Search reference, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 10px',
              }}
            />
            Loading authoritative payment records...
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#b91c1c' }}>
            <p style={{ margin: '0 0 10px' }}>⚠️ {error}</p>
            <button type="button" className="btn-tenant-action" onClick={loadPaymentData}>
              Retry
            </button>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📂</div>
            <h4 style={{ margin: '0 0 4px', color: '#0f172a' }}>No payment records found</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              {searchQuery ? 'Try clearing your search query.' : 'No invoices recorded for this filter.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Charge Type</th>
                    <th>Amount Due</th>
                    <th>Amount Paid</th>
                    <th>Balance</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Method / Ref</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => {
                    const statusClass = p.status.toLowerCase().replace('_', '-')
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.id}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{p.payment_type}</td>
                        <td>₹{Number(p.amount_due).toLocaleString('en-IN')}</td>
                        <td style={{ color: p.amount_paid > 0 ? '#166534' : '#64748b', fontWeight: 600 }}>
                          ₹{Number(p.amount_paid).toLocaleString('en-IN')}
                        </td>
                        <td style={{ fontWeight: 700, color: p.balance_amount > 0 ? '#b91c1c' : '#166534' }}>
                          ₹{Number(p.balance_amount).toLocaleString('en-IN')}
                        </td>
                        <td>{formatDate(p.due_date)}</td>
                        <td>
                          <span className={`badge-pay ${statusClass}`}>
                            {p.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem' }}>
                          <span style={{ display: 'block', fontWeight: 600 }}>{p.payment_method || 'Pending'}</span>
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{p.reference_number || '-'}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => setSelectedDetail(p)}
                            >
                              Details
                            </button>
                            {p.amount_paid > 0 && (
                              <button
                                type="button"
                                className="btn-table-action"
                                style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}
                                onClick={() => setSelectedReceipt(p)}
                              >
                                Receipt
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

            {/* Mobile Card List (Responsive) */}
            <div className="history-cards-mobile">
              {filteredPayments.map((p) => {
                const statusClass = p.status.toLowerCase().replace('_', '-')
                return (
                  <div key={p.id} className="mobile-payment-card">
                    <div className="mobile-card-row-top">
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
                          {p.payment_type}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.id} • Due: {formatDate(p.due_date)}</span>
                      </div>
                      <span className={`badge-pay ${statusClass}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div className="mobile-card-meta">
                        <span>Due: ₹{Number(p.amount_due).toLocaleString('en-IN')}</span>
                        <span>Paid: ₹{Number(p.amount_paid).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Balance</span>
                        <span className="mobile-card-amount" style={{ color: p.balance_amount > 0 ? '#b91c1c' : '#16a34a' }}>
                          ₹{Number(p.balance_amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="mobile-card-actions">
                      <button
                        type="button"
                        className="btn-table-action"
                        onClick={() => setSelectedDetail(p)}
                      >
                        Details
                      </button>
                      {p.amount_paid > 0 && (
                        <button
                          type="button"
                          className="btn-table-action"
                          style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}
                          onClick={() => setSelectedReceipt(p)}
                        >
                          Receipt
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* ==================================================
          6. PAYMENT DETAIL MODAL
      ================================================== */}
      {selectedDetail && (
        <div className="modal-overlay" onClick={() => setSelectedDetail(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">{selectedDetail.payment_type || 'Payment Details'}</h3>
                <span className={`badge-pay ${selectedDetail.status.toLowerCase().replace('_', '-')}`}>
                  {selectedDetail.status.replace('_', ' ')}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedDetail(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div className="detail-info-item">
                  <span className="detail-label">Payment ID</span>
                  <span className="detail-value">{selectedDetail.id}</span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-label">Charge Type</span>
                  <span className="detail-value">{selectedDetail.payment_type}</span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-label">Original Amount Due</span>
                  <span className="detail-value">₹{Number(selectedDetail.amount_due).toLocaleString('en-IN')}</span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-label">Amount Paid</span>
                  <span className="detail-value" style={{ color: '#166534', fontWeight: 700 }}>
                    ₹{Number(selectedDetail.amount_paid).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-label">Balance Remaining</span>
                  <span className="detail-value" style={{ color: selectedDetail.balance_amount > 0 ? '#b91c1c' : '#166534', fontWeight: 800 }}>
                    ₹{Number(selectedDetail.balance_amount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-label">Due Date</span>
                  <span className="detail-value">{formatDate(selectedDetail.due_date)}</span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-label">Payment Method</span>
                  <span className="detail-value">{selectedDetail.payment_method || 'Pending'}</span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-label">Reference Number</span>
                  <span className="detail-value">{selectedDetail.reference_number || 'N/A'}</span>
                </div>
              </div>

              {selectedDetail.paid_date && (
                <div className="detail-info-item" style={{ marginBottom: '12px' }}>
                  <span className="detail-label">Date Settled / Credited</span>
                  <span className="detail-value">{formatDate(selectedDetail.paid_date)}</span>
                </div>
              )}

              {selectedDetail.notes && (
                <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
                  <strong>Notes:</strong> {selectedDetail.notes}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              {selectedDetail.amount_paid > 0 && (
                <button
                  type="button"
                  className="quick-action-btn primary"
                  style={{ backgroundColor: '#16a34a' }}
                  onClick={() => {
                    setSelectedReceipt(selectedDetail)
                    setSelectedDetail(null)
                  }}
                >
                  View Official Receipt
                </button>
              )}
              <button
                type="button"
                className="btn-table-action"
                onClick={() => setSelectedDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          7. PRINTABLE BROWSER / MODAL RECEIPT
      ================================================== */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '14px 20px', backgroundColor: '#f8fafc' }}>
              <div className="modal-title-group">
                <h3 className="modal-title">Rent Payment Receipt</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedReceipt(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div className="receipt-paper">
                {/* Brand Header */}
                <div className="receipt-brand-header">
                  <h2 className="receipt-hostel-name">UrbanNest PG &amp; Hostel</h2>
                  <p className="receipt-hostel-sub">
                    Premium Student &amp; Professional Living • Gachibowli, Hyderabad
                  </p>
                  <div className="receipt-badge-row">
                    <span className="badge-pay paid">OFFICIAL PAYMENT RECEIPT</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="receipt-grid">
                  <div className="receipt-row">
                    <span style={{ color: '#64748b' }}>Receipt Ref No:</span>
                    <strong>{selectedReceipt.reference_number || `REC-${selectedReceipt.id}`}</strong>
                  </div>
                  <div className="receipt-row">
                    <span style={{ color: '#64748b' }}>Tenant Full Name:</span>
                    <strong>{tenantUser?.full_name || selectedReceipt.tenant_name || 'Hostel Resident'}</strong>
                  </div>
                  <div className="receipt-row">
                    <span style={{ color: '#64748b' }}>Tenant ID:</span>
                    <strong>{tenantUser?.user_code || selectedReceipt.tenant_id}</strong>
                  </div>
                  <div className="receipt-row">
                    <span style={{ color: '#64748b' }}>Assigned Accommodation:</span>
                    <strong>{tenantUser?.room_number || selectedReceipt.room_number || 'Room 204'} ({tenantUser?.bed_code || 'Bed A'})</strong>
                  </div>
                  <div className="receipt-row">
                    <span style={{ color: '#64748b' }}>Payment Category:</span>
                    <strong>{selectedReceipt.payment_type}</strong>
                  </div>
                  <div className="receipt-row">
                    <span style={{ color: '#64748b' }}>Payment Mode:</span>
                    <strong>{selectedReceipt.payment_method || 'UPI / Bank Transfer'}</strong>
                  </div>
                  <div className="receipt-row">
                    <span style={{ color: '#64748b' }}>Settlement Date:</span>
                    <strong>{formatDate(selectedReceipt.paid_date || selectedReceipt.due_date)}</strong>
                  </div>
                  <div className="receipt-row total">
                    <span>Total Amount Paid:</span>
                    <span>₹{Number(selectedReceipt.amount_paid).toLocaleString('en-IN')}</span>
                  </div>
                  {selectedReceipt.balance_amount > 0 && (
                    <div className="receipt-row" style={{ color: '#b91c1c', fontWeight: 600 }}>
                      <span>Remaining Balance:</span>
                      <span>₹{Number(selectedReceipt.balance_amount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                <div className="receipt-footer-note">
                  This is a computer-generated digital receipt issued by UrbanNest Hostel Management Autopilot.
                  No physical signature is required. Keep for your tax / HRA records.
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
              <button
                type="button"
                className="btn-copy-creds"
                style={{ padding: '8px 18px', fontSize: '0.875rem' }}
                onClick={handlePrintReceipt}
              >
                🖨️ Print / Save as PDF
              </button>
              <button
                type="button"
                className="btn-table-action"
                onClick={() => setSelectedReceipt(null)}
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
