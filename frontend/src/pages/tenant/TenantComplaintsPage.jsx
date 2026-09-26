import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTenantAuth, fetchTenantComplaints, submitTenantComplaint } from '../../utils/tenantAuth'
import './TenantComplaintsPage.css'

const CATEGORIES = [
  'Internet / WiFi',
  'Water',
  'Electricity',
  'Plumbing',
  'Cleaning',
  'Food',
  'Furniture',
  'Room Maintenance',
  'Security',
  'Other',
]

const AREA_OPTIONS = [
  'Assigned Room / Bed',
  'Bathroom',
  'Dining Area',
  'Kitchen',
  'Common Area',
  'Study Area',
  'Other',
]

export default function TenantComplaintsPage() {
  const { tenantUser } = useTenantAuth()
  const { complaintId } = useParams()
  const navigate = useNavigate()

  const [complaints, setComplaints] = useState([])
  const [summary, setSummary] = useState({ open: 0, in_progress: 0, resolved: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  // Filters & search
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [raiseModalOpen, setRaiseModalOpen] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState(null)

  // Raise Form State
  const defaultRoomArea = `${tenantUser?.room_number || 'Room 204'} / ${tenantUser?.bed_code || 'Bed A'}`
  const [formCategory, setFormCategory] = useState('Internet / WiFi')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formAreaSelection, setFormAreaSelection] = useState('Assigned Room / Bed')
  const [formCustomLocation, setFormCustomLocation] = useState('')
  const [formPriority, setFormPriority] = useState('MEDIUM')
  const [submitting, setSubmitting] = useState(false)

  // Load complaints
  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetchTenantComplaints()
      setComplaints(res.complaints || [])
      setSummary(res.summary || { open: 0, in_progress: 0, resolved: 0, total: 0 })
    } catch (err) {
      setError(err.message || 'Failed to load complaints.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  // Handle direct link with :complaintId
  useEffect(() => {
    if (complaintId && complaints.length > 0) {
      const match = complaints.find((c) => c.id === complaintId)
      if (match) {
        setSelectedComplaint(match)
      }
    }
  }, [complaintId, complaints])

  const openDetailModal = (complaint) => {
    setSelectedComplaint(complaint)
    if (complaint?.id) {
      navigate(`/tenant/complaints/${complaint.id}`)
    }
  }

  const closeDetailModal = () => {
    setSelectedComplaint(null)
    if (complaintId) {
      navigate('/tenant/complaints', { replace: true })
    }
  }

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4500)
  }

  // Handle raise submit
  const handleRaiseSubmit = async (e) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      showToast('Please provide an issue title.')
      return
    }
    if (!formDesc.trim()) {
      showToast('Please describe the issue in detail.')
      return
    }

    let finalLocation = defaultRoomArea
    if (formAreaSelection === 'Other' && formCustomLocation.trim()) {
      finalLocation = formCustomLocation.trim()
    } else if (formAreaSelection !== 'Assigned Room / Bed') {
      finalLocation = formAreaSelection
    }

    try {
      setSubmitting(true)
      const res = await submitTenantComplaint({
        category: formCategory,
        title: formTitle.trim(),
        description: formDesc.trim(),
        location: finalLocation,
        priority: formPriority,
      })

      showToast(`Complaint #${res.complaint?.id || ''} raised successfully! Staff notified.`)
      setRaiseModalOpen(false)
      // Reset form
      setFormTitle('')
      setFormDesc('')
      setFormCategory('Internet / WiFi')
      setFormPriority('MEDIUM')
      setFormAreaSelection('Assigned Room / Bed')
      setFormCustomLocation('')
      // Reload
      loadComplaints()
    } catch (err) {
      showToast(err.message || 'Failed to submit complaint. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const st = (c.status || 'OPEN').toUpperCase()
      if (activeFilter === 'OPEN' && !['OPEN', 'ASSIGNED'].includes(st)) return false
      if (activeFilter === 'IN_PROGRESS' && st !== 'IN_PROGRESS') return false
      if (activeFilter === 'RESOLVED' && !['RESOLVED', 'CLOSED'].includes(st)) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const title = (c.title || '').toLowerCase()
        const desc = (c.description || '').toLowerCase()
        const cat = (c.category || '').toLowerCase()
        const id = (c.id || '').toLowerCase()
        const loc = (c.location || '').toLowerCase()
        if (!title.includes(q) && !desc.includes(q) && !cat.includes(q) && !id.includes(q) && !loc.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [complaints, activeFilter, searchQuery])

  const formatDate = (isoStr) => {
    if (!isoStr) return '-'
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return isoStr
    }
  }

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '-'
    try {
      const d = new Date(isoStr)
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoStr
    }
  }

  return (
    <div className="tenant-complaints-view">
      {/* Toast Notice */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1100,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="complaints-header-row">
        <div className="complaints-title-group">
          <h1>
            <span>⚠️</span>
            <span>Complaints &amp; Support</span>
          </h1>
          <p>Report hostel issues and track their resolution in real time.</p>
        </div>

        <div className="complaints-actions">
          <button
            type="button"
            className="btn-refresh-complaints"
            onClick={loadComplaints}
            title="Refresh complaint status"
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            className="btn-raise-complaint"
            onClick={() => setRaiseModalOpen(true)}
          >
            <span>+</span>
            <span>Raise Complaint</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 2. KPI Summary Cards */}
      <section className="complaints-kpi-grid">
        <div className="complaint-kpi-card">
          <div className="complaint-kpi-header">
            <span className="complaint-kpi-label">Open</span>
            <div className="complaint-kpi-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              📬
            </div>
          </div>
          <div className="complaint-kpi-number">{summary.open}</div>
          <div className="complaint-kpi-sub">Pending staff review</div>
        </div>

        <div className="complaint-kpi-card">
          <div className="complaint-kpi-header">
            <span className="complaint-kpi-label">In Progress</span>
            <div className="complaint-kpi-icon" style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
              🔧
            </div>
          </div>
          <div className="complaint-kpi-number">{summary.in_progress}</div>
          <div className="complaint-kpi-sub">Technician / work assigned</div>
        </div>

        <div className="complaint-kpi-card">
          <div className="complaint-kpi-header">
            <span className="complaint-kpi-label">Resolved</span>
            <div className="complaint-kpi-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              ✅
            </div>
          </div>
          <div className="complaint-kpi-number">{summary.resolved}</div>
          <div className="complaint-kpi-sub">Completed &amp; verified</div>
        </div>

        <div className="complaint-kpi-card">
          <div className="complaint-kpi-header">
            <span className="complaint-kpi-label">Total Reported</span>
            <div className="complaint-kpi-icon" style={{ backgroundColor: '#f8fafc', color: '#475569' }}>
              📋
            </div>
          </div>
          <div className="complaint-kpi-number">{summary.total}</div>
          <div className="complaint-kpi-sub">All-time tickets logged</div>
        </div>
      </section>

      {/* 3. Filters and Search Bar */}
      <div className="complaints-filter-bar">
        <div className="complaint-pills">
          <button
            type="button"
            className={`complaint-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            All ({summary.total})
          </button>
          <button
            type="button"
            className={`complaint-pill ${activeFilter === 'OPEN' ? 'active' : ''}`}
            onClick={() => setActiveFilter('OPEN')}
          >
            Open ({summary.open})
          </button>
          <button
            type="button"
            className={`complaint-pill ${activeFilter === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => setActiveFilter('IN_PROGRESS')}
          >
            In Progress ({summary.in_progress})
          </button>
          <button
            type="button"
            className={`complaint-pill ${activeFilter === 'RESOLVED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('RESOLVED')}
          >
            Resolved ({summary.resolved})
          </button>
        </div>

        <div className="complaint-search-box">
          <span className="search-icon-decor">🔍</span>
          <input
            type="text"
            className="complaint-search-input"
            placeholder="Search complaints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 4. Complaints List */}
      {loading && complaints.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
          <p>Loading complaints...</p>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="complaints-empty-state">
          <div className="empty-state-icon">🎉</div>
          <h3 className="empty-state-title">No complaints found.</h3>
          <p className="empty-state-desc">
            {activeFilter !== 'ALL' || searchQuery
              ? 'No tickets match the selected filter criteria.'
              : 'Everything in your room and hostel area is running smoothly! If you face any issues, click Raise Complaint above.'}
          </p>
          <button
            type="button"
            className="btn-raise-complaint"
            style={{ marginTop: '8px' }}
            onClick={() => setRaiseModalOpen(true)}
          >
            + Raise a Complaint
          </button>
        </div>
      ) : (
        <div className="complaints-list-grid">
          {filteredComplaints.map((c) => {
            const st = (c.status || 'OPEN').toUpperCase()
            const pri = (c.priority || 'MEDIUM').toUpperCase()

            return (
              <div key={c.id} className="complaint-item-card">
                <div className="complaint-card-top">
                  <div className="complaint-meta-badges">
                    <span className="complaint-id-tag">{c.id}</span>
                    <span className="badge-category">{c.category}</span>
                    <span className={`badge-priority ${pri.toLowerCase()}`}>
                      {pri} Priority
                    </span>
                  </div>

                  <span className={`badge-status ${st.toLowerCase().replace('_', '-')}`}>
                    {st.replace('_', ' ')}
                  </span>
                </div>

                <div className="complaint-card-main">
                  <h3>{c.title}</h3>
                  <p className="complaint-desc-text">{c.description}</p>
                </div>

                {/* Show Tenant Visible Update if provided by owner/staff */}
                {c.tenant_visible_notes && (
                  <div className={`tenant-update-box ${st === 'RESOLVED' ? '' : 'info'}`}>
                    <span className="update-box-icon">
                      {st === 'RESOLVED' ? '✅' : '💬'}
                    </span>
                    <div className="update-box-content">
                      <span className="update-box-title">
                        {st === 'RESOLVED' ? 'Resolution Details' : 'Hostel Staff Update'}
                      </span>
                      <p className="update-box-text">{c.tenant_visible_notes}</p>
                    </div>
                  </div>
                )}

                <div className="complaint-card-footer">
                  <div className="complaint-footer-meta">
                    <span>📍 {c.location}</span>
                    <span>🕒 Reported: {formatDate(c.created_at)}</span>
                    {c.updated_at && c.updated_at !== c.created_at && (
                      <span>Updated: {formatDate(c.updated_at)}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-view-complaint"
                    onClick={() => openDetailModal(c)}
                  >
                    View Status &amp; Timeline &rarr;
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ==================================================
          5. RAISE COMPLAINT MODAL
      ================================================== */}
      {raiseModalOpen && (
        <div className="modal-overlay" onClick={() => setRaiseModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Raise a Complaint</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setRaiseModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit}>
              <div className="modal-body">
                {/* Category */}
                <div className="form-group">
                  <label className="form-label" htmlFor="complaint-cat">
                    Issue Category <span className="req">*</span>
                  </label>
                  <select
                    id="complaint-cat"
                    className="form-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    required
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label" htmlFor="complaint-title">
                    Issue Title <span className="req">*</span>
                  </label>
                  <input
                    id="complaint-title"
                    type="text"
                    className="form-input"
                    placeholder="e.g. WiFi connection drop on 2nd floor"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label" htmlFor="complaint-desc">
                    Detailed Description <span className="req">*</span>
                  </label>
                  <textarea
                    id="complaint-desc"
                    className="form-textarea"
                    rows={4}
                    placeholder="Describe what is wrong, when it started, and any relevant details..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    required
                  />
                </div>

                {/* Room / Area */}
                <div className="form-group">
                  <label className="form-label" htmlFor="complaint-area">
                    Room / Area <span className="req">*</span>
                  </label>
                  <select
                    id="complaint-area"
                    className="form-select"
                    value={formAreaSelection}
                    onChange={(e) => setFormAreaSelection(e.target.value)}
                  >
                    {AREA_OPTIONS.map((area) => (
                      <option key={area} value={area}>
                        {area === 'Assigned Room / Bed'
                          ? `My Room (${defaultRoomArea})`
                          : area}
                      </option>
                    ))}
                  </select>

                  {formAreaSelection === 'Other' && (
                    <input
                      type="text"
                      className="form-input"
                      style={{ marginTop: '8px' }}
                      placeholder="Specify custom area (e.g. 3rd Floor Water Dispenser)"
                      value={formCustomLocation}
                      onChange={(e) => setFormCustomLocation(e.target.value)}
                      required
                    />
                  )}
                </div>

                {/* Priority Selection */}
                <div className="form-group">
                  <label className="form-label">
                    Priority Level <span className="req">*</span>
                  </label>
                  <div className="priority-selector">
                    <button
                      type="button"
                      className={`priority-option-btn ${formPriority === 'LOW' ? 'selected low' : ''}`}
                      onClick={() => setFormPriority('LOW')}
                    >
                      🟢 Low
                    </button>
                    <button
                      type="button"
                      className={`priority-option-btn ${formPriority === 'MEDIUM' ? 'selected medium' : ''}`}
                      onClick={() => setFormPriority('MEDIUM')}
                    >
                      🟡 Medium
                    </button>
                    <button
                      type="button"
                      className={`priority-option-btn ${formPriority === 'HIGH' ? 'selected high' : ''}`}
                      onClick={() => setFormPriority('HIGH')}
                    >
                      🔴 High
                    </button>
                  </div>
                  <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    Select High only for urgent water, electrical, or critical amenity failures.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setRaiseModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          6. VIEW COMPLAINT DETAILS MODAL
      ================================================== */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="complaint-id-tag">{selectedComplaint.id}</span>
                <h2>Complaint Details</h2>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={closeDetailModal}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Meta Grid */}
              <div className="detail-meta-grid">
                <div className="detail-meta-item">
                  <span className="lbl">Category</span>
                  <span className="val">{selectedComplaint.category}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="lbl">Status</span>
                  <span className={`badge-status ${(selectedComplaint.status || 'OPEN').toLowerCase().replace('_', '-')}`} style={{ display: 'inline-block', width: 'fit-content' }}>
                    {selectedComplaint.status}
                  </span>
                </div>
                <div className="detail-meta-item">
                  <span className="lbl">Priority</span>
                  <span className={`badge-priority ${(selectedComplaint.priority || 'MEDIUM').toLowerCase()}`} style={{ display: 'inline-block', width: 'fit-content' }}>
                    {selectedComplaint.priority}
                  </span>
                </div>
                <div className="detail-meta-item">
                  <span className="lbl">Location</span>
                  <span className="val">{selectedComplaint.location}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="lbl">Reported On</span>
                  <span className="val">{formatDateTime(selectedComplaint.created_at)}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="lbl">Last Updated</span>
                  <span className="val">{formatDateTime(selectedComplaint.updated_at || selectedComplaint.created_at)}</span>
                </div>
              </div>

              {/* Title and Description */}
              <div className="form-group">
                <label className="form-label">Issue Summary</label>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                  {selectedComplaint.title}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Problem Description</label>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.875rem',
                    color: '#334155',
                    lineHeight: 1.5,
                  }}
                >
                  {selectedComplaint.description}
                </div>
              </div>

              {/* Staff / Resolution Update Section */}
              {selectedComplaint.tenant_visible_notes ? (
                <div className="form-group">
                  <label className="form-label" style={{ color: selectedComplaint.status === 'RESOLVED' ? '#166534' : '#1e40af' }}>
                    {selectedComplaint.status === 'RESOLVED' ? 'Resolution & Closing Summary' : 'Hostel Staff Response'}
                  </label>
                  <div
                    style={{
                      backgroundColor: selectedComplaint.status === 'RESOLVED' ? '#f0fdf4' : '#eff6ff',
                      border: `1px solid ${selectedComplaint.status === 'RESOLVED' ? '#86efac' : '#bfdbfe'}`,
                      borderRadius: '8px',
                      padding: '14px',
                      fontSize: '0.875rem',
                      color: selectedComplaint.status === 'RESOLVED' ? '#14532d' : '#1e3a8a',
                      lineHeight: 1.5,
                    }}
                  >
                    {selectedComplaint.tenant_visible_notes}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '0.8125rem',
                    color: '#64748b',
                    textAlign: 'center',
                  }}
                >
                  ⏳ Your ticket has been logged and assigned to the facilities queue. Staff response will appear here once reviewed.
                </div>
              )}

              {/* Assistance note */}
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  padding: '8px 12px',
                  borderRadius: '6px',
                }}
              >
                💡 For emergency issues, you can also reach the warden office directly at <strong>+91 98765 00002</strong>.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeDetailModal}
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
