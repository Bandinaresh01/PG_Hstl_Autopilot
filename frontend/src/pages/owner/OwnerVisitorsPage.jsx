import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchOwnerVisitors,
  approveOwnerVisitor,
  rejectOwnerVisitor,
  checkInOwnerVisitor,
  checkOutOwnerVisitor,
  createOwnerWalkInVisitor,
} from '../../utils/ownerAuth'
import './OwnerVisitorsPage.css'

const RELATIONSHIPS = [
  'Parent',
  'Sibling',
  'Friend',
  'Colleague',
  'Relative',
  'Delivery / Service',
  'Other',
]

export default function OwnerVisitorsPage() {
  const [visitors, setVisitors] = useState([])
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    inside: 0,
    checked_out_today: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  // Filters & search
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [quickCodeInput, setQuickCodeInput] = useState('')

  // Modals
  const [walkInModalOpen, setWalkInModalOpen] = useState(false)
  const [approveModalVisitor, setApproveModalVisitor] = useState(null)
  const [rejectModalVisitor, setRejectModalVisitor] = useState(null)
  const [checkInModalVisitor, setCheckInModalVisitor] = useState(null)
  const [checkOutModalVisitor, setCheckOutModalVisitor] = useState(null)
  const [detailsModalVisitor, setDetailsModalVisitor] = useState(null)

  // Form states
  const [approvalNotes, setApprovalNotes] = useState('')
  const [approvalStaffNotes, setApprovalStaffNotes] = useState('')

  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionStaffNotes, setRejectionStaffNotes] = useState('')

  const [checkInGuard, setCheckInGuard] = useState('Security Desk - Gate 1')
  const [checkInIdVerified, setCheckInIdVerified] = useState(true)

  const [checkOutGuard, setCheckOutGuard] = useState('Security Desk - Gate 1')

  // Walk-in form state
  const defaultToday = new Date().toISOString().split('T')[0]
  const [walkInVisitorName, setWalkInVisitorName] = useState('')
  const [walkInVisitorPhone, setWalkInVisitorPhone] = useState('')
  const [walkInRelationship, setWalkInRelationship] = useState('Friend')
  const [walkInTenantName, setWalkInTenantName] = useState('')
  const [walkInRoomNumber, setWalkInRoomNumber] = useState('Room 204')
  const [walkInPurpose, setWalkInPurpose] = useState('Walk-in visit')
  const [walkInDuration, setWalkInDuration] = useState('2')
  const [walkInAutoCheckIn, setWalkInAutoCheckIn] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Load visitors from backend
  const loadVisitors = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetchOwnerVisitors(activeFilter, 'ALL', searchQuery)
      setVisitors(res.visitors || [])
      setSummary(
        res.summary || {
          pending: 0,
          approved: 0,
          inside: 0,
          checked_out_today: 0,
          total: 0,
        }
      )
    } catch (err) {
      setError(err.message || 'Failed to load visitor records.')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, searchQuery])

  useEffect(() => {
    loadVisitors()
  }, [loadVisitors])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4500)
  }

  // Quick Code Lookup Action
  const handleQuickLookup = (e) => {
    e.preventDefault()
    const code = quickCodeInput.trim().toUpperCase()
    if (!code) return

    const match = visitors.find(
      (v) =>
        v.pass_code?.toUpperCase() === code ||
        v.id?.toUpperCase() === code ||
        v.visitor_phone?.includes(code)
    )

    if (match) {
      if (match.status === 'APPROVED') {
        setCheckInModalVisitor(match)
        showToast(`Pass ${match.pass_code} found! Ready for Check-In.`)
      } else if (match.status === 'CHECKED_IN') {
        setCheckOutModalVisitor(match)
        showToast(`Visitor ${match.visitor_name} is currently inside! Ready for Check-Out.`)
      } else {
        setDetailsModalVisitor(match)
        showToast(`Visitor record ${match.id} loaded (Status: ${match.status}).`)
      }
    } else {
      showToast(`No visitor found matching code or phone: "${code}".`)
    }
  }

  // Handle Approve Submit
  const handleApproveSubmit = async (e) => {
    e.preventDefault()
    if (!approveModalVisitor) return
    try {
      setSubmitting(true)
      const res = await approveOwnerVisitor(approveModalVisitor.id, {
        approval_notes: approvalNotes.trim(),
        owner_notes: approvalStaffNotes.trim(),
      })
      showToast(`Pass ${res.visitor?.pass_code || ''} generated and approved for ${approveModalVisitor.visitor_name}!`)
      setApproveModalVisitor(null)
      setApprovalNotes('')
      setApprovalStaffNotes('')
      loadVisitors()
    } catch (err) {
      showToast(err.message || 'Failed to approve visitor.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Reject Submit
  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!rejectModalVisitor) return
    if (!rejectionReason.trim()) {
      showToast('Please provide a reason for rejection.')
      return
    }
    try {
      setSubmitting(true)
      await rejectOwnerVisitor(rejectModalVisitor.id, {
        rejection_reason: rejectionReason.trim(),
        owner_notes: rejectionStaffNotes.trim(),
      })
      showToast(`Visitor request #${rejectModalVisitor.id} rejected. Resident notified.`)
      setRejectModalVisitor(null)
      setRejectionReason('')
      setRejectionStaffNotes('')
      loadVisitors()
    } catch (err) {
      showToast(err.message || 'Failed to reject visitor.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Check-In Submit
  const handleCheckInSubmit = async (e) => {
    e.preventDefault()
    if (!checkInModalVisitor) return
    try {
      setSubmitting(true)
      await checkInOwnerVisitor(checkInModalVisitor.id, {
        checked_in_by: checkInGuard.trim(),
        owner_notes: checkInIdVerified ? 'Physical ID verified at gate.' : 'ID check pending.',
      })
      showToast(`Visitor ${checkInModalVisitor.visitor_name} checked in! Status updated to Inside.`)
      setCheckInModalVisitor(null)
      loadVisitors()
    } catch (err) {
      showToast(err.message || 'Failed to record visitor check-in.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Check-Out Submit
  const handleCheckOutSubmit = async (e) => {
    e.preventDefault()
    if (!checkOutModalVisitor) return
    try {
      setSubmitting(true)
      await checkOutOwnerVisitor(checkOutModalVisitor.id, {
        checked_out_by: checkOutGuard.trim(),
      })
      showToast(`Visitor ${checkOutModalVisitor.visitor_name} checked out. Visit completed!`)
      setCheckOutModalVisitor(null)
      loadVisitors()
    } catch (err) {
      showToast(err.message || 'Failed to record visitor check-out.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Walk-in Registration
  const handleWalkInSubmit = async (e) => {
    e.preventDefault()
    if (!walkInVisitorName.trim()) {
      showToast('Visitor name is required.')
      return
    }
    if (!walkInVisitorPhone.trim()) {
      showToast('Visitor phone is required.')
      return
    }
    if (!walkInTenantName.trim()) {
      showToast('Host resident name is required.')
      return
    }

    try {
      setSubmitting(true)
      const res = await createOwnerWalkInVisitor({
        visitor_name: walkInVisitorName.trim(),
        visitor_phone: walkInVisitorPhone.trim(),
        relationship: walkInRelationship,
        tenant_name: walkInTenantName.trim(),
        room_number: walkInRoomNumber.trim(),
        purpose: walkInPurpose.trim(),
        expected_duration_hours: parseInt(walkInDuration, 10) || 2,
        auto_check_in: walkInAutoCheckIn,
        checked_in_by: 'Reception Desk',
      })

      showToast(`Walk-in visitor ${res.visitor?.visitor_name} registered with pass ${res.visitor?.pass_code}!`)
      setWalkInModalOpen(false)
      setWalkInVisitorName('')
      setWalkInVisitorPhone('')
      setWalkInTenantName('')
      loadVisitors()
    } catch (err) {
      showToast(err.message || 'Failed to register walk-in visitor.')
    } finally {
      setSubmitting(false)
    }
  }

  // Helper date formatter
  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A'
    const d = new Date(isoStr)
    return isNaN(d.getTime()) ? isoStr : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (isoStr) => {
    if (!isoStr) return '—'
    const d = new Date(isoStr)
    return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="owner-visitors-page">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="owner-toast" role="alert">
          <span>🛡️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header */}
      <div className="owner-visitors-header">
        <div className="visitors-header-title">
          <h1>
            <span>🚪</span>
            <span>Visitor Logs &amp; Gate Security</span>
          </h1>
          <p>Authorize resident guest passes, monitor current building visitors, and log gate entry/exit.</p>
        </div>

        <div className="visitors-header-actions">
          <button
            type="button"
            className="btn-header-secondary"
            onClick={loadVisitors}
            title="Refresh records"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="btn-walkin-primary"
            onClick={() => setWalkInModalOpen(true)}
          >
            <span>⚡</span>
            <span>Log Walk-in Visitor</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 2. KPI Summary Grid */}
      <section className="owner-visitors-kpi-grid">
        <div className="kpi-stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="kpi-stat-top">
            <span className="kpi-stat-label">Inside Hostel Now</span>
            <div className="kpi-stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              🚶
            </div>
          </div>
          <div className="kpi-stat-value" style={{ color: '#1d4ed8' }}>{summary.inside}</div>
          <div className="kpi-stat-sub">Active visitors on premises</div>
        </div>

        <div className="kpi-stat-card" style={{ borderLeft: summary.pending > 0 ? '4px solid #f59e0b' : '4px solid #e2e8f0' }}>
          <div className="kpi-stat-top">
            <span className="kpi-stat-label">Pending Approval</span>
            <div className="kpi-stat-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
              ⏳
            </div>
          </div>
          <div className="kpi-stat-value" style={{ color: summary.pending > 0 ? '#b45309' : '#0f172a' }}>
            {summary.pending}
          </div>
          <div className="kpi-stat-sub">Resident requests awaiting review</div>
        </div>

        <div className="kpi-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="kpi-stat-top">
            <span className="kpi-stat-label">Approved Passes</span>
            <div className="kpi-stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>
              🎟️
            </div>
          </div>
          <div className="kpi-stat-value" style={{ color: '#047857' }}>{summary.approved}</div>
          <div className="kpi-stat-sub">Valid passes ready for gate check-in</div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-top">
            <span className="kpi-stat-label">Checked Out Today</span>
            <div className="kpi-stat-icon" style={{ backgroundColor: '#f8fafc', color: '#475569' }}>
              🚪
            </div>
          </div>
          <div className="kpi-stat-value">{summary.checked_out_today}</div>
          <div className="kpi-stat-sub">Exited hostel premises today</div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-top">
            <span className="kpi-stat-label">Total Logged</span>
            <div className="kpi-stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
              📋
            </div>
          </div>
          <div className="kpi-stat-value">{summary.total}</div>
          <div className="kpi-stat-sub">All-time visitor records</div>
        </div>
      </section>

      {/* 3. Quick Pass Lookup Banner */}
      <form onSubmit={handleQuickLookup} className="quick-lookup-banner">
        <div className="lookup-desc">
          <span style={{ fontSize: '1.4rem' }}>⚡</span>
          <div>
            <strong>Gate Fast Verification &amp; Instant Check-In/Out:</strong>
            <br />
            <span>Enter Pass Code (e.g. VP-4219) or Visitor Phone to immediately record arrival or departure.</span>
          </div>
        </div>

        <div className="lookup-input-group">
          <input
            type="text"
            placeholder="VP-XXXX / Phone"
            value={quickCodeInput}
            onChange={(e) => setQuickCodeInput(e.target.value)}
          />
          <button type="submit" className="btn-lookup-action">
            Search Gate Pass
          </button>
        </div>
      </form>

      {/* 4. Filter Toolbar */}
      <div className="visitors-toolbar">
        <div className="toolbar-pills">
          <button
            type="button"
            className={`toolbar-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            All Logs ({summary.total})
          </button>
          <button
            type="button"
            className={`toolbar-pill ${activeFilter === 'INSIDE' ? 'active' : ''}`}
            onClick={() => setActiveFilter('INSIDE')}
          >
            Inside Now ({summary.inside})
          </button>
          <button
            type="button"
            className={`toolbar-pill ${activeFilter === 'PENDING_APPROVAL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('PENDING_APPROVAL')}
          >
            Pending Review ({summary.pending})
          </button>
          <button
            type="button"
            className={`toolbar-pill ${activeFilter === 'APPROVED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('APPROVED')}
          >
            Approved ({summary.approved})
          </button>
          <button
            type="button"
            className={`toolbar-pill ${activeFilter === 'CHECKED_OUT' ? 'active' : ''}`}
            onClick={() => setActiveFilter('CHECKED_OUT')}
          >
            Checked Out
          </button>
        </div>

        <div className="toolbar-search">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Filter visitor, phone, resident, room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 5. Visitors Table */}
      <div className="visitors-table-card">
        <div className="visitors-table-container">
          <table className="visitors-table">
            <thead>
              <tr>
                <th>Pass Code / ID</th>
                <th>Visitor</th>
                <th>Host Resident</th>
                <th>Visit Date &amp; Schedule</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Entry / Exit Times</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Loading visitor records...
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No visitor records found matching your selected filter.
                  </td>
                </tr>
              ) : (
                visitors.map((v) => {
                  const isInside = v.status === 'CHECKED_IN'
                  const isApproved = v.status === 'APPROVED'
                  const isPending = v.status === 'PENDING_APPROVAL'

                  return (
                    <tr key={v.id} className={isInside ? 'row-inside' : ''}>
                      <td>
                        {v.pass_code ? (
                          <span className="pass-badge">{v.pass_code}</span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                            {v.id}
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="visitor-main-cell">
                          <span className="v-name">{v.visitor_name}</span>
                          <span className="v-phone">📞 {v.visitor_phone}</span>
                          <span className="v-rel-pill">{v.relationship}</span>
                        </div>
                      </td>

                      <td>
                        <div className="resident-cell">
                          <span className="r-name">{v.tenant_name}</span>
                          <span className="r-room">
                            🛏️ {v.room_number} {v.bed_code ? `• ${v.bed_code}` : ''}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600 }}>📅 {formatDate(v.visit_date)}</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            ⏰ {v.expected_time || 'General'} ({v.expected_duration_hours}h)
                          </span>
                          {v.is_overnight && (
                            <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
                              🌙 Overnight Stay
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ maxWidth: '170px', fontSize: '0.85rem', color: '#334155' }}>
                          {v.purpose}
                        </div>
                      </td>

                      <td>
                        <span className={`status-tag ${v.status.toLowerCase()}`}>
                          {isInside && <span className="pulse-dot" />}
                          {v.status === 'CHECKED_IN' && 'Inside'}
                          {v.status === 'PENDING_APPROVAL' && 'Pending'}
                          {v.status === 'APPROVED' && 'Approved'}
                          {v.status === 'CHECKED_OUT' && 'Checked Out'}
                          {v.status === 'REJECTED' && 'Rejected'}
                          {v.status === 'CANCELLED' && 'Cancelled'}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>In: <strong>{formatTime(v.check_in_time)}</strong></span>
                          <span>Out: <strong>{formatTime(v.check_out_time)}</strong></span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          {/* Pending Actions */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                className="btn-action-approve"
                                onClick={() => setApproveModalVisitor(v)}
                                title="Approve Request & Issue Pass"
                              >
                                ✓ Approve
                              </button>
                              <button
                                type="button"
                                className="btn-action-reject"
                                onClick={() => setRejectModalVisitor(v)}
                                title="Reject Request"
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}

                          {/* Approved Actions */}
                          {isApproved && (
                            <button
                              type="button"
                              className="btn-action-checkin"
                              onClick={() => setCheckInModalVisitor(v)}
                              title="Log Gate Entry"
                            >
                              🚪 Check In
                            </button>
                          )}

                          {/* Inside Actions */}
                          {isInside && (
                            <button
                              type="button"
                              className="btn-action-checkout"
                              onClick={() => setCheckOutModalVisitor(v)}
                              title="Log Gate Exit"
                            >
                              🏃 Check Out
                            </button>
                          )}

                          {/* View Details */}
                          <button
                            type="button"
                            className="btn-action-details"
                            onClick={() => setDetailsModalVisitor(v)}
                            title="View pass details and history"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================
          6. APPROVE VISITOR MODAL
      ================================================== */}
      {approveModalVisitor && (
        <div className="owner-modal-overlay" onClick={() => setApproveModalVisitor(null)}>
          <div className="owner-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h2>Approve Visitor Pass Request</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setApproveModalVisitor(null)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleApproveSubmit}>
              <div className="owner-modal-body">
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div><strong>Visitor:</strong> {approveModalVisitor.visitor_name} ({approveModalVisitor.relationship})</div>
                  <div><strong>Host Resident:</strong> {approveModalVisitor.tenant_name} ({approveModalVisitor.room_number})</div>
                  <div><strong>Scheduled Date:</strong> {formatDate(approveModalVisitor.visit_date)} • {approveModalVisitor.expected_time}</div>
                  <div><strong>Purpose:</strong> {approveModalVisitor.purpose}</div>
                </div>

                <div className="form-group">
                  <label>Approval Instructions (Visible to Resident on Pass)</label>
                  <input
                    type="text"
                    placeholder="e.g. Standard visiting hours apply. Please present physical ID at Gate 1."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Internal Staff Notes (Private / Security Staff only)</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Resident verbally confirmed visit with warden."
                    value={approvalStaffNotes}
                    onChange={(e) => setApprovalStaffNotes(e.target.value)}
                  />
                </div>

                <div style={{ fontSize: '0.82rem', color: '#047857', background: '#ecfdf5', padding: '10px', borderRadius: '6px' }}>
                  🎟️ A unique Pass Code (e.g. VP-XXXX) will be generated automatically upon approval and synced to the resident's portal.
                </div>
              </div>

              <div className="owner-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setApproveModalVisitor(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  style={{ background: '#10b981' }}
                  disabled={submitting}
                >
                  {submitting ? 'Approving...' : 'Confirm & Issue Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          7. REJECT VISITOR MODAL
      ================================================== */}
      {rejectModalVisitor && (
        <div className="owner-modal-overlay" onClick={() => setRejectModalVisitor(null)}>
          <div className="owner-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h2 style={{ color: '#dc2626' }}>Reject Visitor Pass Request</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setRejectModalVisitor(null)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div className="owner-modal-body">
                <div>
                  You are rejecting the visitor request from <strong>{rejectModalVisitor.tenant_name}</strong> for guest <strong>{rejectModalVisitor.visitor_name}</strong>.
                </div>

                <div className="form-group">
                  <label>Rejection Reason * (Will be shown to the resident)</label>
                  <textarea
                    rows="3"
                    placeholder="e.g. Visiting hours end at 8:30 PM. Overnight guests require 48 hours advance parent permission."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Internal Staff Notes (Private)</label>
                  <input
                    type="text"
                    placeholder="e.g. Contacted warden regarding hostel curfew."
                    value={rejectionStaffNotes}
                    onChange={(e) => setRejectionStaffNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="owner-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setRejectModalVisitor(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  style={{ background: '#dc2626' }}
                  disabled={submitting}
                >
                  {submitting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          8. CHECK-IN MODAL (ENTRY TRACKING)
      ================================================== */}
      {checkInModalVisitor && (
        <div className="owner-modal-overlay" onClick={() => setCheckInModalVisitor(null)}>
          <div className="owner-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h2>Gate Entry Check-In</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setCheckInModalVisitor(null)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit}>
              <div className="owner-modal-body">
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '4px' }}>
                    Pass: {checkInModalVisitor.pass_code || checkInModalVisitor.id}
                  </div>
                  <div><strong>Visitor:</strong> {checkInModalVisitor.visitor_name} ({checkInModalVisitor.visitor_phone})</div>
                  <div><strong>Visiting:</strong> {checkInModalVisitor.tenant_name} in {checkInModalVisitor.room_number}</div>
                  <div><strong>ID Type:</strong> {checkInModalVisitor.id_type || 'Govt ID'}</div>
                </div>

                <div className="form-group">
                  <label>Gatekeeper / Security Staff Name</label>
                  <input
                    type="text"
                    value={checkInGuard}
                    onChange={(e) => setCheckInGuard(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="idVerified"
                    checked={checkInIdVerified}
                    onChange={(e) => setCheckInIdVerified(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="idVerified" style={{ fontSize: '0.88rem', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                    Physical government photo ID verified at gate desk
                  </label>
                </div>
              </div>

              <div className="owner-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setCheckInModalVisitor(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  style={{ background: '#2563eb' }}
                  disabled={submitting}
                >
                  {submitting ? 'Recording Entry...' : 'Confirm Entry / Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          9. CHECK-OUT MODAL (EXIT TRACKING)
      ================================================== */}
      {checkOutModalVisitor && (
        <div className="owner-modal-overlay" onClick={() => setCheckOutModalVisitor(null)}>
          <div className="owner-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h2>Gate Exit Check-Out</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setCheckOutModalVisitor(null)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCheckOutSubmit}>
              <div className="owner-modal-body">
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#b45309', marginBottom: '4px' }}>
                    Pass: {checkOutModalVisitor.pass_code || checkOutModalVisitor.id}
                  </div>
                  <div><strong>Visitor:</strong> {checkOutModalVisitor.visitor_name} ({checkOutModalVisitor.visitor_phone})</div>
                  <div><strong>Resident:</strong> {checkOutModalVisitor.tenant_name} • {checkOutModalVisitor.room_number}</div>
                  <div><strong>Checked In At:</strong> {formatTime(checkOutModalVisitor.check_in_time)}</div>
                </div>

                <div className="form-group">
                  <label>Logging Staff Name</label>
                  <input
                    type="text"
                    value={checkOutGuard}
                    onChange={(e) => setCheckOutGuard(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="owner-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setCheckOutModalVisitor(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  style={{ background: '#f59e0b' }}
                  disabled={submitting}
                >
                  {submitting ? 'Recording Departure...' : 'Confirm Departure / Check-Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          10. LOG WALK-IN VISITOR MODAL
      ================================================== */}
      {walkInModalOpen && (
        <div className="owner-modal-overlay" onClick={() => setWalkInModalOpen(false)}>
          <div className="owner-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h2>Log Reception Walk-in Visitor</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setWalkInModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit}>
              <div className="owner-modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Visitor Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Verma"
                      value={walkInVisitorName}
                      onChange={(e) => setWalkInVisitorName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Visitor Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 00000"
                      value={walkInVisitorPhone}
                      onChange={(e) => setWalkInVisitorPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Host Resident Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={walkInTenantName}
                      onChange={(e) => setWalkInTenantName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Host Room Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. Room 204"
                      value={walkInRoomNumber}
                      onChange={(e) => setWalkInRoomNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Relationship</label>
                    <select
                      value={walkInRelationship}
                      onChange={(e) => setWalkInRelationship(e.target.value)}
                    >
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Estimated Hours</label>
                    <select
                      value={walkInDuration}
                      onChange={(e) => setWalkInDuration(e.target.value)}
                    >
                      <option value="1">1 Hour</option>
                      <option value="2">2 Hours</option>
                      <option value="3">3 Hours</option>
                      <option value="4">4 Hours</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Purpose of Visit</label>
                  <input
                    type="text"
                    placeholder="e.g. Emergency visit, Delivery drop, College study"
                    value={walkInPurpose}
                    onChange={(e) => setWalkInPurpose(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="autoCheckIn"
                    checked={walkInAutoCheckIn}
                    onChange={(e) => setWalkInAutoCheckIn(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="autoCheckIn" style={{ fontSize: '0.88rem', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                    Mark as Checked In Immediately (Visitor is at the reception desk now)
                  </label>
                </div>
              </div>

              <div className="owner-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setWalkInModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  style={{ background: '#0284c7' }}
                  disabled={submitting}
                >
                  {submitting ? 'Registering...' : 'Register Walk-in Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          11. VISITOR DETAILS MODAL
      ================================================== */}
      {detailsModalVisitor && (
        <div className="owner-modal-overlay" onClick={() => setDetailsModalVisitor(null)}>
          <div className="owner-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h2>Visitor Pass &amp; Audit Log</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setDetailsModalVisitor(null)}
              >
                &times;
              </button>
            </div>

            <div className="owner-modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="pass-badge" style={{ fontSize: '1.1rem' }}>
                  {detailsModalVisitor.pass_code || detailsModalVisitor.id}
                </span>
                <span className={`status-tag ${detailsModalVisitor.status.toLowerCase()}`}>
                  {detailsModalVisitor.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>VISITOR</span>
                  <strong>{detailsModalVisitor.visitor_name}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>📞 {detailsModalVisitor.visitor_phone}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{detailsModalVisitor.relationship}</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>HOST RESIDENT</span>
                  <strong>{detailsModalVisitor.tenant_name}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#2563eb' }}>🛏️ {detailsModalVisitor.room_number}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>📞 {detailsModalVisitor.tenant_phone || 'Resident on record'}</div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><strong>Visit Date:</strong> {formatDate(detailsModalVisitor.visit_date)}</div>
                <div><strong>Schedule:</strong> {detailsModalVisitor.expected_time || 'Standard Hours'} ({detailsModalVisitor.expected_duration_hours}h)</div>
                <div><strong>Purpose:</strong> {detailsModalVisitor.purpose}</div>
                <div><strong>ID Document:</strong> {detailsModalVisitor.id_type || 'Aadhaar Card'} {detailsModalVisitor.id_number && `(${detailsModalVisitor.id_number})`}</div>
                {detailsModalVisitor.is_overnight && (
                  <div style={{ color: '#b45309', fontWeight: 600 }}>🌙 Overnight Stay Declared</div>
                )}
              </div>

              {/* Gate Entry & Exit Audit */}
              <div style={{ background: '#f1f5f9', padding: '14px', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Gate Audit Timestamps:</div>
                <div>🚪 <strong>Entry Time:</strong> {detailsModalVisitor.check_in_time ? `${formatDate(detailsModalVisitor.check_in_time)} at ${formatTime(detailsModalVisitor.check_in_time)} (by ${detailsModalVisitor.checked_in_by || 'Gate'})` : 'Not yet checked in'}</div>
                <div>🏃 <strong>Exit Time:</strong> {detailsModalVisitor.check_out_time ? `${formatDate(detailsModalVisitor.check_out_time)} at ${formatTime(detailsModalVisitor.check_out_time)} (by ${detailsModalVisitor.checked_out_by || 'Gate'})` : 'Still active / not checked out'}</div>
              </div>

              {/* Rejection / Approval Notes */}
              {detailsModalVisitor.rejection_reason && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', color: '#991b1b', fontSize: '0.88rem' }}>
                  <strong>Rejection Reason:</strong> {detailsModalVisitor.rejection_reason}
                </div>
              )}

              {detailsModalVisitor.approval_notes && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px', borderRadius: '8px', color: '#065f46', fontSize: '0.88rem' }}>
                  <strong>Approval Gate Notes:</strong> {detailsModalVisitor.approval_notes}
                </div>
              )}

              {detailsModalVisitor.owner_notes && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <strong>🔒 Internal Staff Notes:</strong>
                  <pre style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#475569' }}>
                    {detailsModalVisitor.owner_notes}
                  </pre>
                </div>
              )}
            </div>

            <div className="owner-modal-footer">
              <button
                type="button"
                className="btn-modal-submit"
                onClick={() => setDetailsModalVisitor(null)}
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
