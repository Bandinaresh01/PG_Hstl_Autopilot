import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  useTenantAuth,
  fetchTenantVisitors,
  submitTenantVisitorRequest,
  cancelTenantVisitorRequest,
} from '../../utils/tenantAuth'
import './TenantVisitorsPage.css'

const RELATIONSHIP_OPTIONS = [
  'Parent',
  'Sibling',
  'Friend',
  'Colleague',
  'Relative',
  'Delivery / Service',
  'Other',
]

const ID_TYPE_OPTIONS = [
  'Aadhaar Card',
  'Driving License',
  'College ID',
  'Passport',
  'PAN Card',
  'Other',
]

export default function TenantVisitorsPage() {
  const { tenantUser } = useTenantAuth()

  const [visitors, setVisitors] = useState([])
  const [summary, setSummary] = useState({ pending: 0, approved: 0, inside: 0, checked_out: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  // Filters & search
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [selectedPass, setSelectedPass] = useState(null)

  // Form State
  const defaultToday = new Date().toISOString().split('T')[0]
  const [formVisitorName, setFormVisitorName] = useState('')
  const [formVisitorPhone, setFormVisitorPhone] = useState('')
  const [formRelationship, setFormRelationship] = useState('Friend')
  const [formVisitDate, setFormVisitDate] = useState(defaultToday)
  const [formExpectedTime, setFormExpectedTime] = useState('02:00 PM - 06:00 PM')
  const [formDuration, setFormDuration] = useState('2')
  const [formPurpose, setFormPurpose] = useState('Personal Visit')
  const [formIdType, setFormIdType] = useState('Aadhaar Card')
  const [formIdNumber, setFormIdNumber] = useState('')
  const [formIsOvernight, setFormIsOvernight] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load visitors data
  const loadVisitors = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetchTenantVisitors()
      setVisitors(res.visitors || [])
      setSummary(res.summary || { pending: 0, approved: 0, inside: 0, checked_out: 0, total: 0 })
    } catch (err) {
      setError(err.message || 'Failed to load visitor passes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVisitors()
  }, [loadVisitors])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4500)
  }

  // Handle Form Submit
  const handleRequestSubmit = async (e) => {
    e.preventDefault()
    if (!formVisitorName.trim()) {
      showToast('Please provide visitor full name.')
      return
    }
    if (!formVisitorPhone.trim()) {
      showToast('Please provide visitor phone number.')
      return
    }
    if (!formVisitDate) {
      showToast('Please select expected visit date.')
      return
    }

    try {
      setSubmitting(true)
      const res = await submitTenantVisitorRequest({
        visitor_name: formVisitorName.trim(),
        visitor_phone: formVisitorPhone.trim(),
        relationship: formRelationship,
        visit_date: formVisitDate,
        expected_time: formExpectedTime.trim(),
        expected_duration_hours: parseInt(formDuration, 10) || 2,
        purpose: formPurpose.trim(),
        id_type: formIdType,
        id_number: formIdNumber.trim(),
        is_overnight: formIsOvernight,
      })

      showToast(`Visitor request for ${res.visitor?.visitor_name || 'guest'} submitted!`)
      setRequestModalOpen(false)
      // Reset form
      setFormVisitorName('')
      setFormVisitorPhone('')
      setFormRelationship('Friend')
      setFormVisitDate(defaultToday)
      setFormExpectedTime('02:00 PM - 06:00 PM')
      setFormDuration('2')
      setFormPurpose('Personal Visit')
      setFormIdNumber('')
      setFormIsOvernight(false)
      loadVisitors()
    } catch (err) {
      showToast(err.message || 'Failed to submit visitor request.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Cancel Request
  const handleCancelRequest = async (visitorId, visitorName) => {
    if (!window.confirm(`Are you sure you want to cancel the visitor request for ${visitorName}?`)) {
      return
    }

    try {
      await cancelTenantVisitorRequest(visitorId)
      showToast(`Visitor request #${visitorId} cancelled.`)
      loadVisitors()
    } catch (err) {
      showToast(err.message || 'Failed to cancel visitor request.')
    }
  }

  // Copy pass code
  const handleCopyPassCode = (code) => {
    if (!code) return
    navigator.clipboard?.writeText(code)
    showToast(`Pass Code ${code} copied to clipboard! Share it with your guest.`)
  }

  // Filter visitors
  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      // Pill filter
      if (activeFilter === 'INSIDE' && v.status !== 'CHECKED_IN') return false
      if (activeFilter === 'PENDING' && v.status !== 'PENDING_APPROVAL') return false
      if (activeFilter === 'APPROVED' && v.status !== 'APPROVED') return false
      if (activeFilter === 'PAST' && !['CHECKED_OUT', 'CANCELLED', 'REJECTED'].includes(v.status)) return false

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          v.visitor_name?.toLowerCase().includes(q) ||
          v.visitor_phone?.toLowerCase().includes(q) ||
          v.pass_code?.toLowerCase().includes(q) ||
          v.purpose?.toLowerCase().includes(q) ||
          v.relationship?.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [visitors, activeFilter, searchQuery])

  // Helper date formatter
  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A'
    const d = new Date(isoStr)
    return isNaN(d.getTime()) ? isoStr : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (isoStr) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="tenant-visitors-page">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="visitor-toast" role="alert">
          <span>ℹ️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="visitors-header-bar">
        <div className="visitors-title-group">
          <h1>
            <span>🚪</span>
            <span>Visitor Passes &amp; Gate Access</span>
          </h1>
          <p>Pre-approve your guests for quick verification and smooth entry at the hostel gate.</p>
        </div>

        <div className="visitors-actions">
          <button
            type="button"
            className="btn-refresh-visitors"
            onClick={loadVisitors}
            title="Refresh visitor logs"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="btn-request-visitor"
            onClick={() => setRequestModalOpen(true)}
          >
            <span>+</span>
            <span>Request Visitor Pass</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 2. KPI Summary Grid */}
      <section className="visitors-kpi-grid">
        <div className="visitor-kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="visitor-kpi-header">
            <span className="visitor-kpi-label">Inside Hostel Now</span>
            <div className="visitor-kpi-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              🚶
            </div>
          </div>
          <div className="visitor-kpi-number" style={{ color: '#1d4ed8' }}>{summary.inside}</div>
          <div className="visitor-kpi-sub">Currently on hostel premises</div>
        </div>

        <div className="visitor-kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="visitor-kpi-header">
            <span className="visitor-kpi-label">Active Approved Passes</span>
            <div className="visitor-kpi-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              🎟️
            </div>
          </div>
          <div className="visitor-kpi-number" style={{ color: '#047857' }}>{summary.approved}</div>
          <div className="visitor-kpi-sub">Ready for gate entry</div>
        </div>

        <div className="visitor-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="visitor-kpi-header">
            <span className="visitor-kpi-label">Pending Approval</span>
            <div className="visitor-kpi-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              ⏳
            </div>
          </div>
          <div className="visitor-kpi-number" style={{ color: '#b45309' }}>{summary.pending}</div>
          <div className="visitor-kpi-sub">Awaiting management review</div>
        </div>

        <div className="visitor-kpi-card">
          <div className="visitor-kpi-header">
            <span className="visitor-kpi-label">Total Recorded Visits</span>
            <div className="visitor-kpi-icon" style={{ backgroundColor: '#f8fafc', color: '#475569' }}>
              📋
            </div>
          </div>
          <div className="visitor-kpi-number">{summary.total}</div>
          <div className="visitor-kpi-sub">All-time visitor logs</div>
        </div>
      </section>

      {/* 3. Filters and Search Bar */}
      <div className="visitors-filter-bar">
        <div className="visitor-pills">
          <button
            type="button"
            className={`visitor-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            All Passes ({summary.total})
          </button>
          <button
            type="button"
            className={`visitor-pill ${activeFilter === 'INSIDE' ? 'active' : ''}`}
            onClick={() => setActiveFilter('INSIDE')}
          >
            Inside Now ({summary.inside})
          </button>
          <button
            type="button"
            className={`visitor-pill ${activeFilter === 'APPROVED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('APPROVED')}
          >
            Approved ({summary.approved})
          </button>
          <button
            type="button"
            className={`visitor-pill ${activeFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => setActiveFilter('PENDING')}
          >
            Pending ({summary.pending})
          </button>
          <button
            type="button"
            className={`visitor-pill ${activeFilter === 'PAST' ? 'active' : ''}`}
            onClick={() => setActiveFilter('PAST')}
          >
            Past / Completed
          </button>
        </div>

        <div className="visitor-search-box">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search visitor, phone, pass code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 4. Visitor Cards List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading your visitor passes...
        </div>
      ) : filteredVisitors.length === 0 ? (
        <div className="visitors-empty-state">
          <div className="empty-icon">🚪</div>
          <div className="empty-title">No visitor requests found</div>
          <div className="empty-desc">
            {searchQuery
              ? 'No visitors match your search criteria. Try a different query or filter.'
              : 'You have not submitted any visitor requests yet. Pre-approve your guests for hassle-free entry.'}
          </div>
          <button
            type="button"
            className="btn-request-visitor"
            style={{ margin: '0 auto' }}
            onClick={() => setRequestModalOpen(true)}
          >
            <span>+</span>
            <span>Request Visitor Pass</span>
          </button>
        </div>
      ) : (
        <div className="visitor-cards-list">
          {filteredVisitors.map((v) => {
            const isInside = v.status === 'CHECKED_IN'
            const isApproved = v.status === 'APPROVED'
            const isPending = v.status === 'PENDING_APPROVAL'
            const isRejected = v.status === 'REJECTED'

            let cardModClass = ''
            if (isInside) cardModClass = 'inside'
            else if (isApproved) cardModClass = 'approved'
            else if (isPending) cardModClass = 'pending'

            return (
              <div key={v.id} className={`visitor-card ${cardModClass}`}>
                {/* Header */}
                <div className="visitor-card-header">
                  <div className="visitor-profile-info">
                    <div className="visitor-avatar">
                      {v.visitor_name?.[0]?.toUpperCase() || 'V'}
                    </div>
                    <div>
                      <h3 className="visitor-name-title">
                        <span>{v.visitor_name}</span>
                        <span className="rel-badge">{v.relationship}</span>
                        {v.is_overnight && (
                          <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                            🌙 Overnight Stay
                          </span>
                        )}
                      </h3>
                      <p className="visitor-phone-sub">📞 {v.visitor_phone}</p>
                    </div>
                  </div>

                  <div className="visitor-status-group">
                    {/* Pass Code badge */}
                    {v.pass_code && (
                      <span
                        className="pass-code-pill"
                        title="Click to copy pass code"
                        onClick={() => handleCopyPassCode(v.pass_code)}
                      >
                        🎟️ {v.pass_code} 📋
                      </span>
                    )}

                    {/* Status Badge */}
                    <span className={`status-tag ${v.status.toLowerCase()}`}>
                      {isInside && <span className="pulse-dot" />}
                      {v.status === 'CHECKED_IN' && 'Inside Hostel'}
                      {v.status === 'PENDING_APPROVAL' && 'Pending Review'}
                      {v.status === 'APPROVED' && 'Approved (Pass Issued)'}
                      {v.status === 'CHECKED_OUT' && 'Visit Completed'}
                      {v.status === 'REJECTED' && 'Request Rejected'}
                      {v.status === 'CANCELLED' && 'Cancelled'}
                    </span>
                  </div>
                </div>

                {/* Meta Grid */}
                <div className="visitor-meta-grid">
                  <div className="meta-field">
                    <span className="lbl">Visit Date</span>
                    <span className="val">📅 {formatDate(v.visit_date)}</span>
                  </div>
                  <div className="meta-field">
                    <span className="lbl">Expected Time</span>
                    <span className="val">⏰ {v.expected_time || 'Standard Hours'}</span>
                  </div>
                  <div className="meta-field">
                    <span className="lbl">Estimated Duration</span>
                    <span className="val">⏱️ {v.expected_duration_hours} Hour(s)</span>
                  </div>
                  <div className="meta-field">
                    <span className="lbl">Purpose</span>
                    <span className="val">💬 {v.purpose}</span>
                  </div>
                </div>

                {/* Informational Callouts */}
                {isInside && (
                  <div className="visitor-callout inside-box">
                    <span>📍</span>
                    <span>
                      <strong>Currently Checked In:</strong> Entered at{' '}
                      <strong>{formatTime(v.check_in_time)}</strong> (verified by {v.checked_in_by || 'Security Gate'}).
                    </span>
                  </div>
                )}

                {isApproved && (
                  <div className="visitor-callout approved-box">
                    <span>✅</span>
                    <span>
                      <strong>Pass Code Issued:</strong> Share code <strong>{v.pass_code}</strong> with {v.visitor_name} to show at reception. {v.approval_notes && `Note: ${v.approval_notes}`}
                    </span>
                  </div>
                )}

                {isRejected && (
                  <div className="visitor-callout rejected-box">
                    <span>❌</span>
                    <span>
                      <strong>Rejection Reason:</strong> {v.rejection_reason || 'Request could not be approved by hostel management.'}
                    </span>
                  </div>
                )}

                {v.status === 'CHECKED_OUT' && (
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    🚪 Entry: <strong>{formatTime(v.check_in_time)}</strong> • Exit: <strong>{formatTime(v.check_out_time)}</strong> (logged by {v.checked_out_by || 'Reception'}).
                  </div>
                )}

                {/* Footer Actions */}
                <div className="visitor-card-footer">
                  <span className="visitor-time-meta">
                    Ticket ID: {v.id} • Requested on {formatDate(v.created_at)}
                  </span>

                  <div className="visitor-action-btns">
                    {v.pass_code && (
                      <button
                        type="button"
                        className="btn-card-secondary"
                        onClick={() => setSelectedPass(v)}
                      >
                        View Digital Pass &rarr;
                      </button>
                    )}

                    {(isPending || isApproved) && (
                      <button
                        type="button"
                        className="btn-card-danger"
                        onClick={() => handleCancelRequest(v.id, v.visitor_name)}
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ==================================================
          5. REQUEST VISITOR PASS MODAL
      ================================================== */}
      {requestModalOpen && (
        <div className="modal-overlay" onClick={() => setRequestModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Visitor Gate Pass</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setRequestModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRequestSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Visitor Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Verma"
                      value={formVisitorName}
                      onChange={(e) => setFormVisitorName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Visitor Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={formVisitorPhone}
                      onChange={(e) => setFormVisitorPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Relationship *</label>
                    <select
                      value={formRelationship}
                      onChange={(e) => setFormRelationship(e.target.value)}
                    >
                      {RELATIONSHIP_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Expected Visit Date *</label>
                    <input
                      type="date"
                      value={formVisitDate}
                      onChange={(e) => setFormVisitDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Expected Arrival Window</label>
                    <input
                      type="text"
                      placeholder="e.g. 02:00 PM - 05:00 PM"
                      value={formExpectedTime}
                      onChange={(e) => setFormExpectedTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Estimated Duration (Hours)</label>
                    <select
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                    >
                      <option value="1">1 Hour</option>
                      <option value="2">2 Hours</option>
                      <option value="3">3 Hours</option>
                      <option value="4">4 Hours</option>
                      <option value="6">Half Day (6 Hours)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Purpose of Visit *</label>
                  <input
                    type="text"
                    placeholder="e.g. Family visit, Project work, Luggage drop"
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>ID Proof Presented / Type</label>
                    <select
                      value={formIdType}
                      onChange={(e) => setFormIdType(e.target.value)}
                    >
                      {ID_TYPE_OPTIONS.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>ID Number (Optional / Reference)</label>
                    <input
                      type="text"
                      placeholder="e.g. Aadhaar last 4 or College ID"
                      value={formIdNumber}
                      onChange={(e) => setFormIdNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="isOvernightStay"
                    checked={formIsOvernight}
                    onChange={(e) => setFormIsOvernight(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isOvernightStay" style={{ fontSize: '0.88rem', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                    Overnight Guest Request (Requires prior warden confirmation)
                  </label>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '10px 12px', borderRadius: '6px' }}>
                  💡 <strong>Hostel Visiting Policy:</strong> Visiting hours are 9:00 AM - 8:30 PM. All visitors must carry valid photo identification for verification at the security desk.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setRequestModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting Request...' : 'Submit Visitor Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          6. DIGITAL VISITOR PASS MODAL
      ================================================== */}
      {selectedPass && (
        <div className="modal-overlay" onClick={() => setSelectedPass(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Digital Gate Pass</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSelectedPass(null)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="digital-pass-ticket">
                <div className="ticket-header">
                  <div>
                    <div className="ticket-brand">UrbanNest Hostel Gate Pass</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Security Gate Verification</div>
                  </div>
                  <div className="ticket-pass-code">{selectedPass.pass_code}</div>
                </div>

                <div className="ticket-body-grid">
                  <div className="ticket-field">
                    <span className="lbl">Visitor Name</span>
                    <span className="val">{selectedPass.visitor_name}</span>
                  </div>
                  <div className="ticket-field">
                    <span className="lbl">Relationship</span>
                    <span className="val">{selectedPass.relationship}</span>
                  </div>
                  <div className="ticket-field">
                    <span className="lbl">Host Resident</span>
                    <span className="val">{tenantUser?.full_name || selectedPass.tenant_name}</span>
                  </div>
                  <div className="ticket-field">
                    <span className="lbl">Room &amp; Bed</span>
                    <span className="val">{tenantUser?.room_number || selectedPass.room_number} • {tenantUser?.bed_code || selectedPass.bed_code}</span>
                  </div>
                  <div className="ticket-field">
                    <span className="lbl">Date of Visit</span>
                    <span className="val">{formatDate(selectedPass.visit_date)}</span>
                  </div>
                  <div className="ticket-field">
                    <span className="lbl">Pass Status</span>
                    <span className="val" style={{ color: selectedPass.status === 'CHECKED_IN' ? '#60a5fa' : '#34d399' }}>
                      {selectedPass.status === 'CHECKED_IN' ? 'Active Inside' : 'Approved'}
                    </span>
                  </div>
                </div>

                <div className="ticket-footer-notice">
                  📋 Present this pass code <strong>{selectedPass.pass_code}</strong> at the security desk upon arrival. ID verification required.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => handleCopyPassCode(selectedPass.pass_code)}
              >
                Copy Pass Code
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                onClick={() => setSelectedPass(null)}
              >
                Close Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
