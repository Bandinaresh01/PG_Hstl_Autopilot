import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchOwnerEnquiries, updateOwnerEnquiryStatus } from '../../utils/ownerAuth'
import './OwnerLeadsPage.css'

export default function OwnerLeadsPage() {
  const [enquiries, setEnquiries] = useState([])
  const [counts, setCounts] = useState({ all: 0, new: 0, interested: 0, visit_scheduled: 0, booked: 0, closed: 0 })
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  const loadEnquiries = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchOwnerEnquiries(statusFilter, searchQuery)
      setEnquiries(data.enquiries || [])
      if (data.counts) {
        setCounts(data.counts)
      }
    } catch (err) {
      setError(err.message || 'Unable to load leads and enquiries.')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    loadEnquiries()
  }, [loadEnquiries])

  const handleStatusChange = async (enquiryId, newStatus) => {
    try {
      await updateOwnerEnquiryStatus(enquiryId, newStatus)
      setActionSuccess(`Enquiry status updated to ${newStatus}`)
      setTimeout(() => setActionSuccess(null), 3000)
      loadEnquiries()
      if (selectedLead && selectedLead.id === enquiryId) {
        setSelectedLead((prev) => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      alert(`Failed to update status: ${err.message}`)
    }
  }

  const formatCleanDate = (dateStr) => {
    if (!dateStr) return 'Recent'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="owner-leads-container">
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="quick-action-toast" role="status">
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="leads-header-row">
        <div>
          <h1 className="leads-header-title">Leads &amp; Enquiries</h1>
          <p className="leads-header-sub">
            Track, qualify, and convert website enquiries into admitted hostel residents.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-lead-action"
            onClick={loadEnquiries}
            title="Refresh leads list"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Refresh</span>
          </button>
          <Link to="/owner/bookings" className="btn-lead-action" style={{ background: '#0f172a', color: '#fff', borderColor: '#0f172a' }}>
            <span>Bookings &rarr;</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="leads-kpi-grid">
        <div className="leads-kpi-card" onClick={() => setStatusFilter('ALL')} style={{ cursor: 'pointer' }}>
          <span className="leads-kpi-label">Total Leads</span>
          <span className="leads-kpi-val">{counts.all}</span>
          <span className="leads-kpi-meta">All prospective tenants</span>
        </div>

        <div className="leads-kpi-card" onClick={() => setStatusFilter('NEW')} style={{ cursor: 'pointer', borderLeft: '4px solid #2563eb' }}>
          <span className="leads-kpi-label" style={{ color: '#2563eb' }}>New Enquiries</span>
          <span className="leads-kpi-val" style={{ color: '#2563eb' }}>{counts.new}</span>
          <span className="leads-kpi-meta">Awaiting first contact</span>
        </div>

        <div className="leads-kpi-card" onClick={() => setStatusFilter('INTERESTED')} style={{ cursor: 'pointer', borderLeft: '4px solid #b45309' }}>
          <span className="leads-kpi-label" style={{ color: '#b45309' }}>Interested</span>
          <span className="leads-kpi-val" style={{ color: '#b45309' }}>{counts.interested}</span>
          <span className="leads-kpi-meta">Follow-up in progress</span>
        </div>

        <div className="leads-kpi-card" onClick={() => setStatusFilter('VISIT_SCHEDULED')} style={{ cursor: 'pointer', borderLeft: '4px solid #7c3aed' }}>
          <span className="leads-kpi-label" style={{ color: '#7c3aed' }}>Visits Scheduled</span>
          <span className="leads-kpi-val" style={{ color: '#7c3aed' }}>{counts.visit_scheduled}</span>
          <span className="leads-kpi-meta">Hostel tours planned</span>
        </div>

        <div className="leads-kpi-card" onClick={() => setStatusFilter('BOOKED')} style={{ cursor: 'pointer', borderLeft: '4px solid #16a34a' }}>
          <span className="leads-kpi-label" style={{ color: '#16a34a' }}>Booked</span>
          <span className="leads-kpi-val" style={{ color: '#16a34a' }}>{counts.booked}</span>
          <span className="leads-kpi-meta">Converted to bookings</span>
        </div>
      </div>

      {/* Toolbar: Filters and Search */}
      <div className="leads-toolbar">
        <div className="leads-tabs">
          {[
            { id: 'ALL', label: 'All Leads', count: counts.all },
            { id: 'NEW', label: 'New', count: counts.new },
            { id: 'INTERESTED', label: 'Interested', count: counts.interested },
            { id: 'VISIT_SCHEDULED', label: 'Visits', count: counts.visit_scheduled },
            { id: 'BOOKED', label: 'Booked', count: counts.booked },
            { id: 'CLOSED', label: 'Closed', count: counts.closed },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`lead-tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="tab-badge">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="leads-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="leads-search-input"
            placeholder="Search by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem' }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="login-error-banner" style={{ margin: '0' }}>
          <span>{error}</span>
          <button type="button" onClick={loadEnquiries} style={{ marginLeft: '12px', background: '#0f172a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px' }}>Retry</button>
        </div>
      )}

      {/* Leads Table Container */}
      <div className="leads-table-container">
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
            <span>Loading prospective tenant leads from Supabase...</span>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="card-empty-state" style={{ padding: '48px 24px' }}>
            <span className="empty-icon">📬</span>
            <p className="empty-title">No enquiries found</p>
            <p className="empty-desc">
              {statusFilter !== 'ALL' || searchQuery
                ? 'Try adjusting your filter or search query.'
                : 'When visitors submit the public website enquiry form, their details will appear here automatically.'}
            </p>
          </div>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th>Lead / Contact</th>
                <th>Preferred Room</th>
                <th>Expected Move-In</th>
                <th>Occupation</th>
                <th>Status</th>
                <th>Received</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((lead) => {
                const statusLower = (lead.status || 'new').toLowerCase().replace(' ', '_')
                const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '')
                const waUrl = cleanPhone ? `https://wa.me/91${cleanPhone.slice(-10)}` : '#'

                return (
                  <tr key={lead.id}>
                    <td>
                      <div className="lead-name-cell">
                        <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>{lead.name}</strong>
                        <div className="lead-contact-cell">
                          <span className="lead-contact-phone">{lead.phone}</span>
                          {lead.email && <span className="lead-contact-email">{lead.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="lead-room-badge">{lead.preferred_room}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{lead.move_in_date || 'Flexible'}</span>
                    </td>
                    <td>
                      <span style={{ color: '#475569' }}>{lead.occupation || '-'}</span>
                    </td>
                    <td>
                      <select
                        className={`lead-status-select status-${statusLower}`}
                        value={lead.status || 'NEW'}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      >
                        <option value="NEW">New</option>
                        <option value="INTERESTED">Interested</option>
                        <option value="VISIT_SCHEDULED">Visit Scheduled</option>
                        <option value="BOOKED">Booked</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        {formatCleanDate(lead.created_at)}
                      </span>
                    </td>
                    <td>
                      <div className="lead-actions-cell" style={{ justifyContent: 'flex-end' }}>
                        {cleanPhone && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-lead-action whatsapp"
                            title="Chat on WhatsApp"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn-lead-action"
                          onClick={() => setSelectedLead(lead)}
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLead && (
        <div className="lead-modal-backdrop" onClick={() => setSelectedLead(null)}>
          <div className="lead-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lead-modal-header">
              <div>
                <h3 className="lead-modal-title">{selectedLead.name}</h3>
                <p className="lead-modal-sub">
                  Enquiry ID: {selectedLead.id} • Received on {formatCleanDate(selectedLead.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <div className="lead-detail-grid">
              <div className="detail-item">
                <span className="detail-label">Phone</span>
                <span className="detail-val">{selectedLead.phone}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <span className="detail-val">{selectedLead.email || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Preferred Room</span>
                <span className="detail-val">{selectedLead.preferred_room}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Target Move-in Date</span>
                <span className="detail-val">{selectedLead.move_in_date || 'Flexible'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Occupation / Profile</span>
                <span className="detail-val">{selectedLead.occupation || 'Not specified'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Current Pipeline Status</span>
                <select
                  className={`lead-status-select status-${(selectedLead.status || 'new').toLowerCase().replace(' ', '_')}`}
                  value={selectedLead.status || 'NEW'}
                  onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                  style={{ width: 'fit-content' }}
                >
                  <option value="NEW">New</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="VISIT_SCHEDULED">Visit Scheduled</option>
                  <option value="BOOKED">Booked</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-label">Notes &amp; Messages</span>
              <div className="lead-message-box">
                {selectedLead.message || 'No additional notes provided.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-between', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <Link
                to="/owner/bookings"
                className="btn-lead-action"
                style={{ background: '#2563eb', color: '#fff', borderColor: '#2563eb', padding: '8px 16px' }}
                onClick={() => setSelectedLead(null)}
              >
                Create Booking for Lead &rarr;
              </Link>
              <button
                type="button"
                className="btn-lead-action"
                onClick={() => setSelectedLead(null)}
                style={{ marginLeft: 'auto' }}
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
