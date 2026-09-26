import React from 'react'
import { useTenantAuth } from '../../utils/tenantAuth'
import './TenantDashboardPage.css'

export default function TenantStayPage() {
  const { tenantUser } = useTenantAuth()

  return (
    <div className="tenant-dashboard-view">
      <div className="section-card-header" style={{ marginBottom: '8px' }}>
        <div>
          <h2 className="section-title">My Stay &amp; Room Details</h2>
          <p className="section-subtitle">Official allocation, amenities, and hostel agreement terms</p>
        </div>
      </div>

      <div className="tenant-cards-grid">
        <div className="tenant-card">
          <div className="tenant-card-header">
            <div className="tenant-card-title-group">
              <span className="tenant-card-label">Assigned Room</span>
              <h3 className="tenant-card-heading">{tenantUser?.room_number || 'Room 204'}</h3>
            </div>
            <div className="tenant-card-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              🛏️
            </div>
          </div>
          <div className="tenant-info-list">
            <div className="tenant-info-row">
              <span className="tenant-info-key">Bed Code</span>
              <span className="tenant-info-val">{tenantUser?.bed_code || 'Bed A'}</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Room Category</span>
              <span className="tenant-info-val">Double Sharing</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Floor</span>
              <span className="tenant-info-val">Floor 2</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Move-In Date</span>
              <span className="tenant-info-val">{tenantUser?.move_in_date || '2026-09-01'}</span>
            </div>
          </div>
        </div>

        <div className="tenant-card">
          <div className="tenant-card-header">
            <div className="tenant-card-title-group">
              <span className="tenant-card-label">Room Amenities</span>
              <h3 className="tenant-card-heading">Included</h3>
            </div>
            <div className="tenant-card-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              ✨
            </div>
          </div>
          <div className="tenant-info-list">
            <div className="tenant-info-row">
              <span className="tenant-info-key">Air Conditioning</span>
              <span className="tenant-info-val" style={{ color: '#059669' }}>✓ Yes</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Attached Washroom</span>
              <span className="tenant-info-val" style={{ color: '#059669' }}>✓ Yes</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Study Desk &amp; Locker</span>
              <span className="tenant-info-val" style={{ color: '#059669' }}>✓ Dedicated</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Power Backup</span>
              <span className="tenant-info-val" style={{ color: '#059669' }}>✓ 24x7 Inverter</span>
            </div>
          </div>
        </div>

        <div className="tenant-card">
          <div className="tenant-card-header">
            <div className="tenant-card-title-group">
              <span className="tenant-card-label">Stay Policy</span>
              <h3 className="tenant-card-heading">Rules</h3>
            </div>
            <div className="tenant-card-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
              📜
            </div>
          </div>
          <div className="tenant-info-list">
            <div className="tenant-info-row">
              <span className="tenant-info-key">Notice Period</span>
              <span className="tenant-info-val">30 Days</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Gate Closing</span>
              <span className="tenant-info-val">10:30 PM Daily</span>
            </div>
            <div className="tenant-info-row">
              <span className="tenant-info-key">Security Deposit</span>
              <span className="tenant-info-val">Refundable on move-out</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
