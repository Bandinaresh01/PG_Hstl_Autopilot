import React, { useState } from 'react'
import './TenantDashboardPage.css'

export default function TenantServicesPage() {
  const [tickets, setTickets] = useState([
    {
      id: 'TCK-102',
      category: 'Wi-Fi',
      desc: 'Speed test shows packet drop during evening hours.',
      date: '2026-09-22',
      status: 'RESOLVED',
    },
  ])
  const [category, setCategory] = useState('Plumbing')
  const [desc, setDesc] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const handleCreate = (e) => {
    e.preventDefault()
    if (!desc.trim()) return

    const newTicket = {
      id: `TCK-${Math.floor(100 + Math.random() * 900)}`,
      category,
      desc: desc.trim(),
      date: '2026-09-26',
      status: 'OPEN',
    }
    setTickets([newTicket, ...tickets])
    setDesc('')
    setToastMessage('New service request submitted! Assigned to maintenance staff.')
    setTimeout(() => setToastMessage(''), 4000)
  }

  return (
    <div className="tenant-dashboard-view">
      {toastMessage && <div className="toast-success">{toastMessage}</div>}

      <div className="section-card-header" style={{ marginBottom: '8px' }}>
        <div>
          <h2 className="section-title">Hostel Services &amp; Maintenance Requests</h2>
          <p className="section-subtitle">Request plumbing, electrical, internet, or cleaning assistance from hostel staff</p>
        </div>
      </div>

      <div className="tenant-section-grid">
        {/* New Ticket Form */}
        <div className="tenant-card">
          <div className="tenant-card-header">
            <h3 className="tenant-card-heading">New Service Ticket</h3>
          </div>

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="assign-form-group">
              <label htmlFor="serv-cat">Issue Category *</label>
              <select
                id="serv-cat"
                className="assign-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Plumbing">Plumbing (Tap, Geyser, Flush, Washroom)</option>
                <option value="Electrical">Electrical (Fan, Switch, Light, Inverter)</option>
                <option value="Wi-Fi">Wi-Fi &amp; Internet</option>
                <option value="Housekeeping">Housekeeping &amp; Waste Disposal</option>
                <option value="Food & Mess">Mess &amp; Dining Inquiry</option>
                <option value="General">Other Service Issue</option>
              </select>
            </div>

            <div className="assign-form-group">
              <label htmlFor="serv-desc">Description *</label>
              <textarea
                id="serv-desc"
                className="assign-form-input"
                rows={3}
                placeholder="Describe what needs repair or attention..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-tenant-action primary"
              style={{ backgroundColor: '#10b981', color: '#ffffff', width: 'fit-content' }}
            >
              Submit Ticket
            </button>
          </form>
        </div>

        {/* Existing Tickets */}
        <div className="tenant-card">
          <div className="tenant-card-header">
            <h3 className="tenant-card-heading">My Requests ({tickets.length})</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tickets.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                    {t.id} • {t.category}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: t.status === 'OPEN' ? '#fef3c7' : '#f0fdf4',
                      color: t.status === 'OPEN' ? '#b45309' : '#15803d',
                    }}
                  >
                    {t.status}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>{t.desc}</p>
                <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Logged on {t.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
