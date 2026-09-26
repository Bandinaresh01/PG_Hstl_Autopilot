import React, { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { fetchOwnerComplaints, updateOwnerComplaint, createOwnerMaintenanceTask } from '../../utils/ownerAuth'
import './OwnerComplaintsPage.css'
import '../tenant/TenantComplaintsPage.css'

const ASSIGNABLE_ROLES = [
  'Manager',
  'Maintenance Staff',
  'Cleaning Staff',
  'Electrician',
  'Plumber',
  'Security Guard',
  'Vendor / External Service',
  'Other',
]

const STATUS_OPTIONS = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

export default function OwnerComplaintsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialStatusParam = searchParams.get('status')?.toUpperCase() || 'ALL'

  const [complaints, setComplaints] = useState([])
  const [summary, setSummary] = useState({
    open: 0,
    assigned: 0,
    in_progress: 0,
    resolved_today: 0,
    high_priority: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState('')

  // Filters
  const [activeFilter, setActiveFilter] = useState(
    ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'HIGH_PRIORITY'].includes(initialStatusParam)
      ? initialStatusParam
      : 'ALL'
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Manage Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [editStatus, setEditStatus] = useState('OPEN')
  const [editAssignedTo, setEditAssignedTo] = useState('')
  const [editPriority, setEditPriority] = useState('MEDIUM')
  const [editOwnerNotes, setEditOwnerNotes] = useState('')
  const [editTenantNotes, setEditTenantNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Convert to Maintenance modal inline
  const [converting, setConverting] = useState(false)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4500)
  }

  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetchOwnerComplaints(activeFilter, 'ALL', searchQuery)
      setComplaints(res.complaints || [])
      setSummary(
        res.summary || {
          open: 0,
          assigned: 0,
          in_progress: 0,
          resolved_today: 0,
          high_priority: 0,
          total: 0,
        }
      )
    } catch (err) {
      setError(err.message || 'Failed to load complaints.')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, searchQuery])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  const openManageModal = (complaint) => {
    setSelectedComplaint(complaint)
    setEditStatus(complaint.status || 'OPEN')
    setEditAssignedTo(complaint.assigned_to || '')
    setEditPriority(complaint.priority || 'MEDIUM')
    setEditOwnerNotes(complaint.owner_notes || '')
    setEditTenantNotes(complaint.tenant_visible_notes || '')
  }

  const handleSaveComplaint = async (e) => {
    if (e) e.preventDefault()
    if (!selectedComplaint) return

    try {
      setSaving(true)
      await updateOwnerComplaint(selectedComplaint.id, {
        status: editStatus,
        assigned_to: editAssignedTo,
        priority: editPriority,
        owner_notes: editOwnerNotes,
        tenant_visible_notes: editTenantNotes,
      })

      showToast(`Complaint #${selectedComplaint.id} updated successfully.`)
      setSelectedComplaint(null)
      loadComplaints()
    } catch (err) {
      showToast(err.message || 'Failed to update complaint.')
    } finally {
      setSaving(false)
    }
  }

  // Quick Action: Convert Complaint to Maintenance Task
  const handleConvertToMaintenance = async () => {
    if (!selectedComplaint) return
    try {
      setConverting(true)
      const res = await createOwnerMaintenanceTask({
        complaint_id: selectedComplaint.id,
        title: `${selectedComplaint.category}: ${selectedComplaint.title}`,
        description: selectedComplaint.description,
        location: selectedComplaint.location || selectedComplaint.room_number,
        priority: selectedComplaint.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        assigned_to: editAssignedTo || 'Maintenance Staff',
        status: 'OPEN',
        notes: `Work order created for tenant complaint ${selectedComplaint.id} (${selectedComplaint.tenant_name}).`,
      })

      showToast(`Maintenance task #${res.task?.id} generated and linked to complaint!`)
      setSelectedComplaint(null)
      loadComplaints()
      // Option to navigate to maintenance
      setTimeout(() => {
        navigate('/owner/maintenance')
      }, 1000)
    } catch (err) {
      showToast(err.message || 'Failed to create maintenance task.')
    } finally {
      setConverting(false)
    }
  }

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
    <div className="owner-complaints-container">
      {/* Toast Alert */}
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
      <div className="complaints-page-header">
        <div>
          <h1>
            <span>🛠️</span>
            <span>Complaints</span>
          </h1>
          <p>Track resident support tickets, assign staff, and communicate resolution.</p>
        </div>

        <div className="header-action-group">
          <Link
            to="/owner/maintenance"
            className="btn-header-secondary"
            style={{ textDecoration: 'none' }}
          >
            <span>🔧</span>
            <span>View Maintenance Tasks &rarr;</span>
          </Link>
          <button
            type="button"
            className="btn-header-secondary"
            onClick={loadComplaints}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* 2. Summary KPI Cards */}
      <section className="owner-kpi-grid">
        <div
          className={`owner-kpi-card ${activeFilter === 'OPEN' ? 'active' : ''}`}
          onClick={() => setActiveFilter('OPEN')}
        >
          <div className="owner-kpi-head">
            <span className="owner-kpi-label">Open</span>
            <span className="owner-kpi-icon">📬</span>
          </div>
          <div className="owner-kpi-value">{summary.open}</div>
          <span className="owner-kpi-sub">Awaiting assignment</span>
        </div>

        <div
          className={`owner-kpi-card ${activeFilter === 'ASSIGNED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ASSIGNED')}
        >
          <div className="owner-kpi-head">
            <span className="owner-kpi-label">Assigned</span>
            <span className="owner-kpi-icon">👤</span>
          </div>
          <div className="owner-kpi-value">{summary.assigned}</div>
          <span className="owner-kpi-sub">Allocated to staff</span>
        </div>

        <div
          className={`owner-kpi-card ${activeFilter === 'IN_PROGRESS' ? 'active' : ''}`}
          onClick={() => setActiveFilter('IN_PROGRESS')}
        >
          <div className="owner-kpi-head">
            <span className="owner-kpi-label">In Progress</span>
            <span className="owner-kpi-icon">⚙️</span>
          </div>
          <div className="owner-kpi-value">{summary.in_progress}</div>
          <span className="owner-kpi-sub">Work currently active</span>
        </div>

        <div
          className={`owner-kpi-card ${activeFilter === 'RESOLVED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('RESOLVED')}
        >
          <div className="owner-kpi-head">
            <span className="owner-kpi-label">Resolved Today</span>
            <span className="owner-kpi-icon">✅</span>
          </div>
          <div className="owner-kpi-value">{summary.resolved_today}</div>
          <span className="owner-kpi-sub">Closed successfully</span>
        </div>

        <div
          className={`owner-kpi-card ${activeFilter === 'HIGH_PRIORITY' ? 'active' : ''}`}
          onClick={() => setActiveFilter('HIGH_PRIORITY')}
        >
          <div className="owner-kpi-head">
            <span className="owner-kpi-label">High Priority</span>
            <span className="owner-kpi-icon">🔥</span>
          </div>
          <div className="owner-kpi-value" style={{ color: summary.high_priority > 0 ? '#dc2626' : 'inherit' }}>
            {summary.high_priority}
          </div>
          <span className="owner-kpi-sub">Requires quick action</span>
        </div>
      </section>

      {/* 3. Filter Bar */}
      <div className="owner-filter-bar">
        <div className="owner-filter-pills">
          <button
            type="button"
            className={`owner-filter-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            All ({summary.total})
          </button>
          <button
            type="button"
            className={`owner-filter-pill ${activeFilter === 'OPEN' ? 'active' : ''}`}
            onClick={() => setActiveFilter('OPEN')}
          >
            Open ({summary.open})
          </button>
          <button
            type="button"
            className={`owner-filter-pill ${activeFilter === 'ASSIGNED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ASSIGNED')}
          >
            Assigned ({summary.assigned})
          </button>
          <button
            type="button"
            className={`owner-filter-pill ${activeFilter === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => setActiveFilter('IN_PROGRESS')}
          >
            In Progress ({summary.in_progress})
          </button>
          <button
            type="button"
            className={`owner-filter-pill ${activeFilter === 'RESOLVED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('RESOLVED')}
          >
            Resolved
          </button>
          <button
            type="button"
            className={`owner-filter-pill ${activeFilter === 'HIGH_PRIORITY' ? 'active' : ''}`}
            onClick={() => setActiveFilter('HIGH_PRIORITY')}
          >
            High Priority ({summary.high_priority})
          </button>
        </div>

        <div className="owner-search-wrap">
          <span className="owner-search-icon">🔍</span>
          <input
            type="text"
            className="owner-search-input"
            placeholder="Search tenant, room, ID, issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 4. Complaints Table */}
      <div className="owner-table-wrapper">
        <table className="owner-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tenant</th>
              <th>Room</th>
              <th>Category</th>
              <th>Issue Title</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th>Assigned To</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && complaints.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading complaints...
                </td>
              </tr>
            ) : complaints.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>🍃</div>
                  <strong>No active complaints found.</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem' }}>
                    All clear! When tenants report issues, they will appear in this table.
                  </p>
                </td>
              </tr>
            ) : (
              complaints.map((c) => {
                const st = (c.status || 'OPEN').toUpperCase()
                const pri = (c.priority || 'MEDIUM').toUpperCase()

                return (
                  <tr key={c.id}>
                    <td>
                      <span className="badge-id">{c.id}</span>
                    </td>
                    <td>
                      <span className="badge-tenant">{c.tenant_name || 'Resident'}</span>
                      <span className="badge-room-sub">{c.tenant_id}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{c.room_number || '-'}</span>
                      {c.location && c.location !== c.room_number && (
                        <span className="badge-room-sub">{c.location}</span>
                      )}
                    </td>
                    <td>
                      <span className="badge-cat-tag">{c.category}</span>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.875rem' }}>
                        {c.title}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {c.description}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-priority ${pri.toLowerCase()}`}>
                        {pri}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${st.toLowerCase().replace('_', '-')}`}>
                        {st.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(c.created_at)}
                    </td>
                    <td>
                      {c.assigned_to ? (
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                          {c.assigned_to}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          Unassigned
                        </span>
                      )}
                      {c.linked_maintenance && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.7rem',
                            color: '#c2410c',
                            fontWeight: 600,
                          }}
                        >
                          🔗 {c.linked_maintenance.id}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="action-btn-manage"
                        onClick={() => openManageModal(c)}
                      >
                        Manage &rarr;
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==================================================
          5. OWNER MANAGE COMPLAINT MODAL
      ================================================== */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge-id">{selectedComplaint.id}</span>
                  <span className="badge-cat-tag">{selectedComplaint.category}</span>
                </div>
                <h2 style={{ marginTop: '4px' }}>{selectedComplaint.title}</h2>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSelectedComplaint(null)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveComplaint}>
              <div className="manage-modal-body">
                {/* Tenant & Accommodation Meta */}
                <div className="detail-meta-grid">
                  <div className="detail-meta-item">
                    <span className="lbl">Tenant</span>
                    <span className="val">{selectedComplaint.tenant_name} ({selectedComplaint.tenant_id})</span>
                  </div>
                  <div className="detail-meta-item">
                    <span className="lbl">Room / Area</span>
                    <span className="val">{selectedComplaint.room_number} • {selectedComplaint.location}</span>
                  </div>
                  <div className="detail-meta-item">
                    <span className="lbl">Reported Date</span>
                    <span className="val">{formatDateTime(selectedComplaint.created_at)}</span>
                  </div>
                  <div className="detail-meta-item">
                    <span className="lbl">Last Update</span>
                    <span className="val">{formatDateTime(selectedComplaint.updated_at || selectedComplaint.created_at)}</span>
                  </div>
                </div>

                {/* Full Description */}
                <div className="form-group">
                  <label className="form-label">Resident Problem Description</label>
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

                {/* Status Transitions */}
                <div className="form-group">
                  <label className="form-label">Complaint Lifecycle Status</label>
                  <div className="quick-status-group">
                    {STATUS_OPTIONS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`quick-status-btn ${editStatus === st ? 'selected' : ''}`}
                        onClick={() => setEditStatus(st)}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignment & Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-assigned">
                      Assign Responsibility
                    </label>
                    <select
                      id="edit-assigned"
                      className="form-select"
                      value={editAssignedTo}
                      onChange={(e) => setEditAssignedTo(e.target.value)}
                    >
                      <option value="">-- Select Staff / Role --</option>
                      {ASSIGNABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-priority">
                      Urgency / Priority
                    </label>
                    <select
                      id="edit-priority"
                      className="form-select"
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Notes Duo Container */}
                <div className="notes-duo-container">
                  {/* Internal Notes (Owner/Staff Only) */}
                  <div className="note-box-staff">
                    <span className="note-box-title">
                      <span>🔒</span>
                      <span>Internal Staff Notes</span>
                    </span>
                    <textarea
                      className="note-box-textarea"
                      rows={3}
                      placeholder="Visible ONLY to hostel owner & staff. e.g. Parts quotation ₹450 received from hardware shop."
                      value={editOwnerNotes}
                      onChange={(e) => setEditOwnerNotes(e.target.value)}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#92400e' }}>
                      Never shown to resident.
                    </span>
                  </div>

                  {/* Tenant Update (Visible to Resident) */}
                  <div className="note-box-tenant">
                    <span className="note-box-title">
                      <span>📢</span>
                      <span>Tenant Update / Resolution</span>
                    </span>
                    <textarea
                      className="note-box-textarea"
                      rows={3}
                      placeholder="Visible to the tenant in their portal. e.g. Technician Ramesh scheduled to visit today at 3 PM."
                      value={editTenantNotes}
                      onChange={(e) => setEditTenantNotes(e.target.value)}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#166534' }}>
                      Pushed directly to resident's portal.
                    </span>
                  </div>
                </div>

                {/* Quick Convert to Maintenance Work Order */}
                <div
                  style={{
                    backgroundColor: '#fff7ed',
                    border: '1px solid #fed7aa',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.8125rem', color: '#9a3412', display: 'block' }}>
                      Convert to Maintenance Task
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: '#c2410c' }}>
                      Track procurement, repair schedule, and vendor work order.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-convert-maintenance"
                    disabled={converting}
                    onClick={handleConvertToMaintenance}
                  >
                    <span>🔧</span>
                    <span>{converting ? 'Creating...' : 'Convert to Task'}</span>
                  </button>
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedComplaint(null)}
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {editStatus !== 'RESOLVED' && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: '#16a34a', borderColor: '#86efac', backgroundColor: '#f0fdf4' }}
                      onClick={() => {
                        setEditStatus('RESOLVED')
                        if (!editTenantNotes.trim()) {
                          setEditTenantNotes('Issue has been inspected, repaired and verified. Marked resolved.')
                        }
                      }}
                    >
                      Quick Mark Resolved
                    </button>
                  )}

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save & Update'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
