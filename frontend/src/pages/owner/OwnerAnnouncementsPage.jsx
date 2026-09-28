import React, { useState, useEffect, useCallback } from 'react'
import {
  fetchOwnerAnnouncements,
  createOwnerAnnouncement,
  deleteOwnerAnnouncement,
} from '../../utils/ownerAuth'
import './OwnerAnnouncementsPage.css'

export default function OwnerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionNotice, setActionNotice] = useState(null)

  // New announcement form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'NORMAL',
    target_audience: 'ALL_TENANTS',
  })

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchOwnerAnnouncements()
      setAnnouncements(data.announcements || [])
    } catch (err) {
      setError(err.message || 'Unable to load announcements.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Please provide both a title and message for the announcement.')
      return
    }

    setIsSubmitting(true)
    try {
      await createOwnerAnnouncement(formData)
      setActionNotice('Announcement broadcasted to tenants successfully!')
      setTimeout(() => setActionNotice(null), 3500)
      setShowCreateModal(false)
      setFormData({
        title: '',
        message: '',
        priority: 'NORMAL',
        target_audience: 'ALL_TENANTS',
      })
      loadAnnouncements()
    } catch (err) {
      alert(`Failed to create announcement: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (annId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return

    try {
      await deleteOwnerAnnouncement(annId)
      setActionNotice('Announcement deleted.')
      setTimeout(() => setActionNotice(null), 3000)
      loadAnnouncements()
    } catch (err) {
      alert(`Failed to delete announcement: ${err.message}`)
    }
  }

  const formatCleanDate = (dateStr) => {
    if (!dateStr) return 'Recently'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="owner-announcements-container">
      {actionNotice && (
        <div className="quick-action-toast" role="status">
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="ann-header-row">
        <div>
          <h1 className="ann-header-title">Hostel Notices &amp; Announcements</h1>
          <p className="ann-header-sub">
            Broadcast operational notices, festival holiday schedules, and meal timing updates to all residents.
          </p>
        </div>
        <button
          type="button"
          className="btn-new-ann"
          onClick={() => setShowCreateModal(true)}
        >
          <span>+ Post Announcement</span>
        </button>
      </div>

      {error && (
        <div className="login-error-banner" style={{ margin: '0' }}>
          <span>{error}</span>
          <button type="button" onClick={loadAnnouncements} style={{ marginLeft: '12px', background: '#0f172a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px' }}>Retry</button>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <span>Loading announcements...</span>
        </div>
      ) : announcements.length === 0 ? (
        <div className="card-empty-state" style={{ padding: '48px 24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span className="empty-icon">📢</span>
          <p className="empty-title">No announcements posted yet</p>
          <p className="empty-desc">
            Use the &quot;Post Announcement&quot; button above to publish meal updates, maintenance notices, or community guidelines for tenants.
          </p>
        </div>
      ) : (
        <div className="ann-list-grid">
          {announcements.map((ann) => {
            const isUrgent = ann.priority === 'URGENT' || ann.is_urgent
            return (
              <div key={ann.id} className={`ann-card ${isUrgent ? 'urgent' : ''}`}>
                <div className="ann-card-header">
                  <div className="ann-title-row">
                    <h3 className="ann-title">{ann.title}</h3>
                    <span className={`ann-badge ${isUrgent ? 'urgent' : 'normal'}`}>
                      {isUrgent ? 'Urgent Notice' : 'General Notice'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-ann-delete"
                    onClick={() => handleDelete(ann.id)}
                    title="Delete notice"
                  >
                    Delete
                  </button>
                </div>
                <p className="ann-message">{ann.message}</p>
                <div className="ann-footer">
                  <span>Target: <strong>{ann.target_audience || 'All Tenants'}</strong></span>
                  <span>Posted: {formatCleanDate(ann.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="ann-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="ann-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                New Announcement
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                  Notice Title *
                </label>
                <input
                  type="text"
                  className="settings-input"
                  placeholder="e.g., Water Tank Cleaning Notice / Sunday Special Menu"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                  Message Details *
                </label>
                <textarea
                  className="settings-textarea"
                  rows={4}
                  placeholder="Type full instructions, timings, or notice for hostel tenants..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                    Priority
                  </label>
                  <select
                    className="settings-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="NORMAL">Normal Notice</option>
                    <option value="URGENT">Urgent Alert</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                    Target Audience
                  </label>
                  <select
                    className="settings-select"
                    value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  >
                    <option value="ALL_TENANTS">All Residents</option>
                    <option value="FLOOR_1">Floor 1 Residents</option>
                    <option value="FLOOR_2">Floor 2 Residents</option>
                    <option value="FLOOR_3">Floor 3 Residents</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn-settings-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-settings-save"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Posting...' : 'Broadcast Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
