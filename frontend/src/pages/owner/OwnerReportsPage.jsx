import React, { useState, useEffect } from 'react'
import { fetchOwnerDashboard } from '../../utils/ownerAuth'
import './OwnerReportsPage.css'

export default function OwnerReportsPage() {
  const [dashboardData, setDashboardData] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState('2026-09')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOwnerDashboard()
      .then((data) => {
        setDashboardData(data)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [])

  const financials = dashboardData?.financials || {
    expected_rent: 0,
    collected_rent: 0,
    pending_rent: 0,
    overdue_rent: 0,
  }

  const summary = dashboardData?.summary || {
    total_rooms: 0,
    total_beds: 0,
    occupied_beds: 0,
    available_beds: 0,
    reserved_beds: 0,
    occupancy_rate: 0,
    current_tenants: 0,
  }

  const operations = dashboardData?.operations || {
    open_complaints: 0,
    maintenance_attention: 0,
    visitors_inside: 0,
    pending_visitors: 0,
  }

  const exportCSV = () => {
    const rows = [
      ['Metric Category', 'Metric Name', 'Value'],
      ['Financials', 'Expected Monthly Rent', `₹${financials.expected_rent}`],
      ['Financials', 'Collected Rent', `₹${financials.collected_rent}`],
      ['Financials', 'Pending Rent', `₹${financials.pending_rent}`],
      ['Financials', 'Overdue Rent', `₹${financials.overdue_rent}`],
      ['Occupancy', 'Total Rooms', summary.total_rooms],
      ['Occupancy', 'Total Beds', summary.total_beds],
      ['Occupancy', 'Occupied Beds', summary.occupied_beds],
      ['Occupancy', 'Available Beds', summary.available_beds],
      ['Occupancy', 'Reserved Beds', summary.reserved_beds],
      ['Occupancy', 'Occupancy Rate (%)', `${summary.occupancy_rate}%`],
      ['Operations', 'Open Complaints', operations.open_complaints],
      ['Operations', 'Maintenance Tasks Due', operations.maintenance_attention],
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `urbannest-report-${selectedMonth}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="owner-reports-container">
      {/* Header */}
      <div className="reports-header-row">
        <div>
          <h1 className="reports-header-title">Financial &amp; Occupancy Reports</h1>
          <p className="reports-header-sub">
            Unified analytics, revenue performance, and bed inventory utilization.
          </p>
        </div>
        <div className="reports-controls">
          <select
            className="reports-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="2026-09">September 2026 (Current Cycle)</option>
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
            <option value="ALL">All-Time Cumulative</option>
          </select>
          <button type="button" className="btn-report-export" onClick={exportCSV}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

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
          <span>Generating operational reports...</span>
        </div>
      ) : (
        <div className="reports-grid">
          {/* Revenue Breakdown */}
          <div className="report-card">
            <div>
              <h2 className="report-card-title">Rent &amp; Collections</h2>
              <p className="report-card-sub">Monthly cash collection efficiency</p>
            </div>
            <div className="report-stat-rows">
              <div className="report-stat-row">
                <span className="report-stat-label">Expected Target Rent</span>
                <span className="report-stat-val">₹{financials.expected_rent.toLocaleString('en-IN')}</span>
              </div>
              <div className="report-stat-row" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <span className="report-stat-label" style={{ color: '#166534' }}>Realized Collections</span>
                <span className="report-stat-val" style={{ color: '#15803d' }}>
                  ₹{financials.collected_rent.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">Pending Collection</span>
                <span className="report-stat-val" style={{ color: '#b45309' }}>
                  ₹{financials.pending_rent.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="report-stat-row" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                <span className="report-stat-label" style={{ color: '#991b1b' }}>Overdue Rent</span>
                <span className="report-stat-val" style={{ color: '#dc2626' }}>
                  ₹{financials.overdue_rent.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">Collection Realization Rate</span>
                <span className="report-stat-val" style={{ color: '#2563eb' }}>
                  {financials.expected_rent > 0
                    ? `${Math.round((financials.collected_rent / financials.expected_rent) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Occupancy Utilization */}
          <div className="report-card">
            <div>
              <h2 className="report-card-title">Inventory &amp; Bed Utilization</h2>
              <p className="report-card-sub">Current occupancy status and room capacity</p>
            </div>
            <div className="report-stat-rows">
              <div className="report-stat-row">
                <span className="report-stat-label">Total Room Count</span>
                <span className="report-stat-val">{summary.total_rooms} Rooms</span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">Total Capacity</span>
                <span className="report-stat-val">{summary.total_beds} Beds</span>
              </div>
              <div className="report-stat-row" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                <span className="report-stat-label" style={{ color: '#1e40af' }}>Occupied Beds</span>
                <span className="report-stat-val" style={{ color: '#1d4ed8' }}>{summary.occupied_beds} Beds</span>
              </div>
              <div className="report-stat-row" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <span className="report-stat-label" style={{ color: '#166534' }}>Available for Booking</span>
                <span className="report-stat-val" style={{ color: '#15803d' }}>{summary.available_beds} Beds</span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">Current Occupancy Rate</span>
                <span className="report-stat-val" style={{ color: '#7c3aed' }}>{summary.occupancy_rate}%</span>
              </div>
            </div>
          </div>

          {/* Operations & Tenant Health */}
          <div className="report-card">
            <div>
              <h2 className="report-card-title">Operational Health</h2>
              <p className="report-card-sub">Tickets, security gate logs, and maintenance</p>
            </div>
            <div className="report-stat-rows">
              <div className="report-stat-row">
                <span className="report-stat-label">Active Tenants</span>
                <span className="report-stat-val">{summary.current_tenants} Residents</span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">Open Complaints</span>
                <span className="report-stat-val" style={{ color: operations.open_complaints > 0 ? '#b45309' : '#16a34a' }}>
                  {operations.open_complaints}
                </span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">Pending Maintenance Attention</span>
                <span className="report-stat-val">{operations.maintenance_attention}</span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">Visitors Currently Inside</span>
                <span className="report-stat-val">{operations.visitors_inside}</span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">Pending Visitor Requests</span>
                <span className="report-stat-val">{operations.pending_visitors}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
