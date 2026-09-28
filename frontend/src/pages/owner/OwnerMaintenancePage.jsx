import React, { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchOwnerMaintenance,
  createOwnerMaintenanceTask,
  updateOwnerMaintenanceTask,
  updateOwnerComplaint,
} from '../../utils/ownerAuth'
import './OwnerComplaintsPage.css'
import './OwnerMaintenancePage.css'
import '../tenant/TenantComplaintsPage.css'

const MAINTENANCE_STAFF_OPTIONS = [
  'Maintenance Staff',
  'Plumber (Ramesh)',
  'Electrician (Suresh)',
  'CleanAqua Services (Vendor)',
  'Housekeeping Lead',
  'Carpenter (Vikram)',
  'AC Technician',
  'Manager',
  'Other Vendor',
]

const STATUS_OPTIONS = ['OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export default function OwnerMaintenancePage() {
  const [searchParams] = useSearchParams()
  const initialStatusParam = searchParams.get('status')?.toUpperCase() || 'ALL'

  const [tasks, setTasks] = useState([])
  const [summary, setSummary] = useState({
    open: 0,
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    urgent: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState('')

  // Filter & Search
  const [activeFilter, setActiveFilter] = useState(
    ['OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'URGENT'].includes(initialStatusParam)
      ? initialStatusParam
      : 'ALL'
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Create Task Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newPriority, setNewPriority] = useState('MEDIUM')
  const [newAssignedTo, setNewAssignedTo] = useState('Maintenance Staff')
  const [newScheduledDate, setNewScheduledDate] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newComplaintId, setNewComplaintId] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit / Manage Task Modal
  const [selectedTask, setSelectedTask] = useState(null)
  const [editStatus, setEditStatus] = useState('OPEN')
  const [editAssignedTo, setEditAssignedTo] = useState('')
  const [editPriority, setEditPriority] = useState('MEDIUM')
  const [editScheduledDate, setEditScheduledDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4500)
  }

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetchOwnerMaintenance(activeFilter, 'ALL', searchQuery)
      setTasks(res.tasks || [])
      setSummary(
        res.summary || {
          open: 0,
          scheduled: 0,
          in_progress: 0,
          completed: 0,
          urgent: 0,
          total: 0,
        }
      )
    } catch (err) {
      setError(err.message || 'Failed to load maintenance tasks.')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, searchQuery])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const openEditModal = (task) => {
    setSelectedTask(task)
    setEditStatus(task.status || 'OPEN')
    setEditAssignedTo(task.assigned_to || '')
    setEditPriority(task.priority || 'MEDIUM')
    setEditScheduledDate(task.scheduled_date || '')
    setEditDueDate(task.due_date || '')
    setEditNotes(task.notes || '')
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      showToast('Please provide an issue title.')
      return
    }
    if (!newLocation.trim()) {
      showToast('Please provide a location.')
      return
    }

    try {
      setCreating(true)
      const res = await createOwnerMaintenanceTask({
        title: newTitle.trim(),
        description: newDesc.trim(),
        location: newLocation.trim(),
        priority: newPriority,
        assigned_to: newAssignedTo,
        scheduled_date: newScheduledDate || null,
        due_date: newDueDate || null,
        notes: newNotes.trim(),
        complaint_id: newComplaintId.trim() || null,
      })

      showToast(`Maintenance task #${res.task?.id} created successfully!`)
      setCreateModalOpen(false)
      // Reset form
      setNewTitle('')
      setNewDesc('')
      setNewLocation('')
      setNewPriority('MEDIUM')
      setNewAssignedTo('Maintenance Staff')
      setNewScheduledDate('')
      setNewDueDate('')
      setNewNotes('')
      setNewComplaintId('')
      loadTasks()
    } catch (err) {
      showToast(err.message || 'Failed to create task.')
    } finally {
      setCreating(false)
    }
  }

  const handleSaveTask = async (e) => {
    if (e) e.preventDefault()
    if (!selectedTask) return

    try {
      setSaving(true)
      await updateOwnerMaintenanceTask(selectedTask.id, {
        status: editStatus,
        assigned_to: editAssignedTo,
        priority: editPriority,
        scheduled_date: editScheduledDate || null,
        due_date: editDueDate || null,
        notes: editNotes.trim(),
      })

      showToast(`Task #${selectedTask.id} updated successfully.`)
      setSelectedTask(null)
      loadTasks()
    } catch (err) {
      showToast(err.message || 'Failed to update task.')
    } finally {
      setSaving(false)
    }
  }

  // Quick Resolve linked complaint
  const handleResolveLinkedComplaint = async () => {
    if (!selectedTask?.complaint_id) return
    try {
      await updateOwnerComplaint(selectedTask.complaint_id, {
        status: 'RESOLVED',
        tenant_visible_notes: `Maintenance work order ${selectedTask.id} has been completed and verified by hostel facilities team.`,
      })
      showToast(`Linked complaint #${selectedTask.complaint_id} marked RESOLVED!`)
      loadTasks()
    } catch (err) {
      showToast(err.message || 'Failed to resolve linked complaint.')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="owner-maintenance-container">
      {/* Toast */}
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
            <span>🔧</span>
            <span>Maintenance</span>
          </h1>
          <p>Track hostel repairs, service work and maintenance tasks.</p>
        </div>

        <div className="header-action-group">
          <Link
            to="/owner/complaints"
            className="btn-header-secondary"
            style={{ textDecoration: 'none' }}
          >
            <span>⚠️</span>
            <span>View Tenant Complaints &rarr;</span>
          </Link>
          <button
            type="button"
            className="btn-header-secondary"
            onClick={loadTasks}
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="btn-header-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <span>+</span>
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Grid */}
      <section className="owner-kpi-grid">
        <div
          className={`owner-kpi-card ${activeFilter === 'OPEN' ? 'active' : ''}`}
          onClick={() => setActiveFilter('OPEN')}
        >
          <div className="owner-kpi-head">
            <span className="owner-kpi-label">Open</span>
            <span className="owner-kpi-icon">📝</span>
          </div>
          <div className="owner-kpi-value">{summary.open}</div>
          <span className="owner-kpi-sub">Work orders queued</span>
        </div>

        <div
          className={`owner-kpi-card ${activeFilter === 'SCHEDULED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('SCHEDULED')}
        >
          <div className="owner-kpi-head">
            <span className="owner-kpi-label">Scheduled</span>
            <span className="owner-kpi-icon">📅</span>
          </div>
          <div className="owner-kpi-value">{summary.scheduled}</div>
          <span className="owner-kpi-sub">Planned technician dates</span>
        </div>

        <div
          className={`owner-kpi-card ${activeFilter === 'IN_PROGRESS' ? 'active' : ''}`}
          onClick={() => setActiveFilter('IN_PROGRESS')}
        >
          <div className="owner-kpi-head">
            <span className="owner-kpi-label">In Progress</span>
            <span className="owner-kpi-icon">⚡</span>
          </div>
          <div className="owner-kpi-value">{summary.in_progress}</div>
          <span className="owner-kpi-sub">Repairs underway</span>
        </div>

        <div
          className={`owner-kpi-card ${activeFilter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('COMPLETED')}
        >
          <div className="owner-kpi-head">
            <span className="owner-kpi-label">Completed</span>
            <span className="owner-kpi-icon">✅</span>
          </div>
          <div className="owner-kpi-value">{summary.completed}</div>
          <span className="owner-kpi-sub">Finished tasks</span>
        </div>

        <div
          className={`owner-kpi-card ${activeFilter === 'URGENT' ? 'active' : ''}`}
          onClick={() => setActiveFilter('URGENT')}
        >
          <div className="owner-kpi-head">
            <span className="owner-kpi-label">Urgent Attention</span>
            <span className="owner-kpi-icon">🚨</span>
          </div>
          <div className="owner-kpi-value" style={{ color: summary.urgent > 0 ? '#dc2626' : 'inherit' }}>
            {summary.urgent}
          </div>
          <span className="owner-kpi-sub">Critical facility repairs</span>
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
            className={`owner-filter-pill ${activeFilter === 'SCHEDULED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('SCHEDULED')}
          >
            Scheduled ({summary.scheduled})
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
            className={`owner-filter-pill ${activeFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('COMPLETED')}
          >
            Completed ({summary.completed})
          </button>
          <button
            type="button"
            className={`owner-filter-pill ${activeFilter === 'URGENT' ? 'active' : ''}`}
            onClick={() => setActiveFilter('URGENT')}
          >
            Urgent ({summary.urgent})
          </button>
        </div>

        <div className="owner-search-wrap">
          <span className="owner-search-icon">🔍</span>
          <input
            type="text"
            className="owner-search-input"
            placeholder="Search tasks, locations, staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 4. Maintenance Table */}
      <div className="owner-table-wrapper">
        <table className="owner-table">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Issue</th>
              <th>Location</th>
              <th>Source</th>
              <th>Priority</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Scheduled</th>
              <th>Due Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && tasks.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading maintenance tasks...
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>🛠️</div>
                  <strong>No maintenance tasks found.</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem' }}>
                    Click New Task above to log preventive servicing or facility work orders.
                  </p>
                </td>
              </tr>
            ) : (
              tasks.map((t) => {
                const st = (t.status || 'OPEN').toUpperCase()
                const pri = (t.priority || 'MEDIUM').toUpperCase()

                return (
                  <tr key={t.id}>
                    <td>
                      <span className="badge-id" style={{ color: '#c2410c', backgroundColor: '#fff7ed' }}>
                        {t.id}
                      </span>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.875rem' }}>
                        {t.title}
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
                        {t.description || t.notes || 'Routine task'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{t.location}</span>
                    </td>
                    <td>
                      {t.complaint_id ? (
                        <span className="maintenance-source-badge complaint">
                          <span>⚠️</span>
                          <span>{t.complaint_id}</span>
                        </span>
                      ) : (
                        <span className="maintenance-source-badge direct">
                          <span>🏢 Facility</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-priority ${pri.toLowerCase()}`}>
                        {pri}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                        {t.assigned_to || 'Maintenance Team'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-m-status ${st.toLowerCase().replace('_', '-')}`}>
                        {st.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(t.scheduled_date)}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(t.due_date)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="action-btn-manage"
                        onClick={() => openEditModal(t)}
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
          5. CREATE MAINTENANCE TASK MODAL
      ================================================== */}
      {createModalOpen && (
        <div className="modal-overlay" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Maintenance Task</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setCreateModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {/* Title */}
                <div className="form-group">
                  <label className="form-label" htmlFor="task-title">
                    Task / Issue Summary <span className="req">*</span>
                  </label>
                  <input
                    id="task-title"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 5000L Overhead Water Tank Chlorination & Cleaning"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Location */}
                <div className="form-group">
                  <label className="form-label" htmlFor="task-location">
                    Location / Area <span className="req">*</span>
                  </label>
                  <input
                    id="task-location"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rooftop Water Tanks, Room 204 Bathroom, Kitchen"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label" htmlFor="task-desc">
                    Scope of Work &amp; Description
                  </label>
                  <textarea
                    id="task-desc"
                    className="form-textarea"
                    rows={3}
                    placeholder="Detailed steps, equipment required, or vendor scope..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>

                {/* Assigned To & Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-staff">
                      Assigned To
                    </label>
                    <select
                      id="task-staff"
                      className="form-select"
                      value={newAssignedTo}
                      onChange={(e) => setNewAssignedTo(e.target.value)}
                    >
                      {MAINTENANCE_STAFF_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="task-priority">
                      Priority Level
                    </label>
                    <select
                      id="task-priority"
                      className="form-select"
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent (Immediate)</option>
                    </select>
                  </div>
                </div>

                {/* Schedule & Due Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-sched-date">
                      Scheduled Date
                    </label>
                    <input
                      id="task-sched-date"
                      type="date"
                      className="form-input"
                      value={newScheduledDate}
                      onChange={(e) => setNewScheduledDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="task-due-date">
                      Target Due Date
                    </label>
                    <input
                      id="task-due-date"
                      type="date"
                      className="form-input"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Optional Complaint ID Link */}
                <div className="form-group">
                  <label className="form-label" htmlFor="task-complaint-id">
                    Link Tenant Complaint ID (Optional)
                  </label>
                  <input
                    id="task-complaint-id"
                    type="text"
                    className="form-input"
                    placeholder="e.g. CMP-9001 (auto-links work order to resident ticket)"
                    value={newComplaintId}
                    onChange={(e) => setNewComplaintId(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label" htmlFor="task-notes">
                    Internal Procurement / Vendor Notes
                  </label>
                  <input
                    id="task-notes"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Quotation approved ₹1,200. Advance paid ₹500."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Maintenance Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          6. EDIT / MANAGE MAINTENANCE TASK MODAL
      ================================================== */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge-id" style={{ color: '#c2410c', backgroundColor: '#fff7ed' }}>
                    {selectedTask.id}
                  </span>
                  {selectedTask.complaint_id && (
                    <span className="maintenance-source-badge complaint">
                      Linked: {selectedTask.complaint_id}
                    </span>
                  )}
                </div>
                <h2 style={{ marginTop: '4px' }}>{selectedTask.title}</h2>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSelectedTask(null)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTask}>
              <div className="manage-modal-body">
                {/* Meta Grid */}
                <div className="detail-meta-grid">
                  <div className="detail-meta-item">
                    <span className="lbl">Location</span>
                    <span className="val">{selectedTask.location}</span>
                  </div>
                  <div className="detail-meta-item">
                    <span className="lbl">Status</span>
                    <span className={`badge-m-status ${(selectedTask.status || 'OPEN').toLowerCase().replace('_', '-')}`} style={{ display: 'inline-block', width: 'fit-content' }}>
                      {selectedTask.status}
                    </span>
                  </div>
                  <div className="detail-meta-item">
                    <span className="lbl">Created</span>
                    <span className="val">{formatDate(selectedTask.created_at)}</span>
                  </div>
                  <div className="detail-meta-item">
                    <span className="lbl">Source</span>
                    <span className="val">{selectedTask.complaint_id ? `Complaint ${selectedTask.complaint_id}` : 'General Hostel Work'}</span>
                  </div>
                </div>

                {/* Scope & Description */}
                {selectedTask.description && (
                  <div className="form-group">
                    <label className="form-label">Scope Description</label>
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.875rem',
                        color: '#334155',
                      }}
                    >
                      {selectedTask.description}
                    </div>
                  </div>
                )}

                {/* Status Transitions */}
                <div className="form-group">
                  <label className="form-label">Task Status</label>
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

                {/* Staff & Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-m-staff">
                      Assigned Technician / Vendor
                    </label>
                    <select
                      id="edit-m-staff"
                      className="form-select"
                      value={editAssignedTo}
                      onChange={(e) => setEditAssignedTo(e.target.value)}
                    >
                      {MAINTENANCE_STAFF_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-m-pri">
                      Priority Level
                    </label>
                    <select
                      id="edit-m-pri"
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

                {/* Schedule & Due Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-m-sched">
                      Scheduled Date
                    </label>
                    <input
                      id="edit-m-sched"
                      type="date"
                      className="form-input"
                      value={editScheduledDate}
                      onChange={(e) => setEditScheduledDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-m-due">
                      Due Date
                    </label>
                    <input
                      id="edit-m-due"
                      type="date"
                      className="form-input"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Progress / Completion Notes */}
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-m-notes">
                    Progress / Completion / Billing Notes
                  </label>
                  <textarea
                    id="edit-m-notes"
                    className="form-textarea"
                    rows={3}
                    placeholder="Enter technician remarks, materials purchased, or completion confirmation..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>

                {/* Linked Complaint Resolution Action */}
                {selectedTask.complaint_id && (
                  <div
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
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
                      <strong style={{ fontSize: '0.8125rem', color: '#166534', display: 'block' }}>
                        Linked Complaint: #{selectedTask.complaint_id}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                        Work done? You can mark the resident ticket resolved directly from here.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: '#166534', borderColor: '#86efac', backgroundColor: '#ffffff' }}
                      onClick={handleResolveLinkedComplaint}
                    >
                      Resolve Linked Complaint &rarr;
                    </button>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedTask(null)}
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {editStatus !== 'COMPLETED' && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: '#16a34a', borderColor: '#86efac', backgroundColor: '#f0fdf4' }}
                      onClick={() => setEditStatus('COMPLETED')}
                    >
                      Quick Mark Completed
                    </button>
                  )}

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Task'}
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
