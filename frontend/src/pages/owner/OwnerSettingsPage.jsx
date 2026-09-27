import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useOwnerAuth } from '../../utils/ownerAuth'
import './OwnerSettingsPage.css'

export default function OwnerSettingsPage() {
  const { ownerUser } = useOwnerAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [saveSuccess, setSaveSuccess] = useState(null)

  // Profile Form State
  const [profile, setProfile] = useState({
    name: ownerUser?.hostel_name || 'UrbanNest Luxury PG & Hostel',
    registrationNo: 'TS-HYD-PG-2024-8841',
    address: 'Plot 42, Silicon Valley Colony, Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    googleMapsUrl: 'https://maps.google.com/?q=Madhapur+Hyderabad',
  })

  // Contact Form State
  const [contact, setContact] = useState({
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    email: 'contact@urbannest.in',
    frontDeskHours: '6:00 AM – 11:00 PM',
    emergencyContact: '+91 98765 99999 (Hostel Warden)',
  })

  // Pricing & Stay Rules
  const [rules, setRules] = useState({
    depositMonths: '1 Month Rent',
    noticePeriodDays: '30 Days',
    lateFinePerDay: '₹100 / day after 5th of month',
    electricityPolicy: '100 units included, ₹9/unit thereafter',
    visitorPolicy: 'Allowed in common areas till 8:00 PM',
  })

  // Facilities Toggle State
  const [facilities, setFacilities] = useState({
    wifi: true,
    food: true,
    cleaning: true,
    security: true,
    powerBackup: true,
    roWater: true,
    washingMachine: true,
    geyser: true,
    gym: false,
    lift: true,
  })

  // House Timings
  const [timings, setTimings] = useState({
    gateClosing: '10:30 PM',
    breakfast: '7:30 AM – 9:30 AM',
    lunch: '12:30 PM – 2:30 PM',
    dinner: '7:45 PM – 9:45 PM',
    quietHours: '11:00 PM – 6:00 AM',
  })

  const handleSave = (sectionName) => {
    setSaveSuccess(`${sectionName} saved successfully!`)
    setTimeout(() => setSaveSuccess(null), 3500)
  }

  const toggleFacility = (key) => {
    setFacilities((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="owner-settings-container">
      {/* Toast Feedback */}
      {saveSuccess && (
        <div className="quick-action-toast" role="status">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="settings-header-row">
        <div>
          <h1 className="settings-header-title">Hostel Settings &amp; Preferences</h1>
          <p className="settings-header-sub">
            Manage your property details, operational rules, meal schedules, and pricing preferences.
          </p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Navigation Sidebar */}
        <aside className="settings-nav">
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span>🏨</span>
            <span>Hostel Profile</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            <span>📞</span>
            <span>Contact &amp; Desk</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            <span>💰</span>
            <span>Pricing &amp; Policies</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'property' ? 'active' : ''}`}
            onClick={() => setActiveTab('property')}
          >
            <span>🏢</span>
            <span>Property &amp; Floors</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'facilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('facilities')}
          >
            <span>✨</span>
            <span>Amenities &amp; Services</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'timings' ? 'active' : ''}`}
            onClick={() => setActiveTab('timings')}
          >
            <span>⏰</span>
            <span>Timings &amp; Meals</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <span>🛡️</span>
            <span>Account &amp; Auth</span>
          </button>
        </aside>

        {/* Settings Content Area */}
        <main className="settings-content-card">
          {activeTab === 'profile' && (
            <div>
              <h2 className="settings-section-title">Hostel Profile</h2>
              <p className="settings-section-desc">Public business information displayed on tenant invoices and website.</p>

              <div className="settings-form-grid">
                <div className="settings-field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="settings-label">Hostel Display Name</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Registration / License Number</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={profile.registrationNo}
                    onChange={(e) => setProfile({ ...profile, registrationNo: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">City</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  />
                </div>

                <div className="settings-field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="settings-label">Street Address</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">State</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={profile.state}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Pincode</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={profile.pincode}
                    onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                  />
                </div>

                <div className="settings-field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="settings-label">Google Maps Directions Link</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={profile.googleMapsUrl}
                    onChange={(e) => setProfile({ ...profile, googleMapsUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="settings-actions-footer">
                <button type="button" className="btn-settings-save" onClick={() => handleSave('Hostel Profile')}>
                  Save Profile Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div>
              <h2 className="settings-section-title">Contact &amp; Front Desk</h2>
              <p className="settings-section-desc">Hostel management helpline numbers and front desk operational hours.</p>

              <div className="settings-form-grid">
                <div className="settings-field-group">
                  <label className="settings-label">Primary Reception Phone</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">WhatsApp Helpline</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={contact.whatsapp}
                    onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Official Support Email</label>
                  <input
                    type="email"
                    className="settings-input"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Front Desk Office Hours</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={contact.frontDeskHours}
                    onChange={(e) => setContact({ ...contact, frontDeskHours: e.target.value })}
                  />
                </div>

                <div className="settings-field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="settings-label">Emergency Warden Helpline</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={contact.emergencyContact}
                    onChange={(e) => setContact({ ...contact, emergencyContact: e.target.value })}
                  />
                </div>
              </div>

              <div className="settings-actions-footer">
                <button type="button" className="btn-settings-save" onClick={() => handleSave('Contact Details')}>
                  Save Contact Information
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div>
              <h2 className="settings-section-title">Pricing &amp; Operational Policies</h2>
              <p className="settings-section-desc">Default deposit rules, payment deadlines, late fees, and notice periods.</p>

              <div className="settings-form-grid">
                <div className="settings-field-group">
                  <label className="settings-label">Standard Security Deposit</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={rules.depositMonths}
                    onChange={(e) => setRules({ ...rules, depositMonths: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Notice Period for Vacating</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={rules.noticePeriodDays}
                    onChange={(e) => setRules({ ...rules, noticePeriodDays: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Late Payment Fine Policy</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={rules.lateFinePerDay}
                    onChange={(e) => setRules({ ...rules, lateFinePerDay: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Electricity Billing Rule</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={rules.electricityPolicy}
                    onChange={(e) => setRules({ ...rules, electricityPolicy: e.target.value })}
                  />
                </div>

                <div className="settings-field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="settings-label">Visitor Policy Summary</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={rules.visitorPolicy}
                    onChange={(e) => setRules({ ...rules, visitorPolicy: e.target.value })}
                  />
                </div>
              </div>

              <div className="settings-actions-footer">
                <button type="button" className="btn-settings-save" onClick={() => handleSave('Pricing & Policies')}>
                  Save Policy Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'property' && (
            <div>
              <h2 className="settings-section-title">Property Setup &amp; Hierarchy</h2>
              <p className="settings-section-desc">
                Configure dynamic floors, rooms, bed capacity, monthly rent per person, and deposits.
              </p>

              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', margin: '20px 0' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#0f172a' }}>
                  Hostel Architecture &amp; Room Allocation
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 20px' }}>
                  UrbanNest CRM uses a strict relational property hierarchy: <strong>Hostel &rarr; Floors &rarr; Rooms &rarr; Beds</strong>.
                  All numbers, rents, and capacities are owner-controlled and stored directly in your Supabase database.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>MONTHLY RENT</div>
                    <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, marginTop: '4px' }}>Per Bed / Person</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>Configurable per room type</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>BED GENERATION</div>
                    <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, marginTop: '4px' }}>Automatic Lettering</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>Bed A, Bed B, Bed C...</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>CAPACITY GUARD</div>
                    <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, marginTop: '4px' }}>Occupancy Protected</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>Cannot drop below occupants</div>
                  </div>
                </div>

                <Link
                  to="/owner/property"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                  }}
                >
                  <span>Open Property Setup &amp; Hierarchy Manager</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'facilities' && (
            <div>
              <h2 className="settings-section-title">Hostel Amenities &amp; Services</h2>
              <p className="settings-section-desc">Toggle the amenities actively provided to residents at your property.</p>

              <div className="settings-toggle-list">
                {[
                  { key: 'wifi', title: 'High-Speed Wi-Fi', sub: 'Dedicated commercial fiber network' },
                  { key: 'food', title: '3-Times Homely Food', sub: 'Breakfast, lunch, and dinner buffet' },
                  { key: 'cleaning', title: 'Daily Housekeeping', sub: 'Room, corridor & bathroom sanitation' },
                  { key: 'security', title: '24/7 CCTV & Security', sub: 'Gate entry logging and camera monitoring' },
                  { key: 'powerBackup', title: '100% Power Backup', sub: 'Automatic diesel generator backup' },
                  { key: 'roWater', title: 'RO Purified Drinking Water', sub: 'Commercial water filtration units' },
                  { key: 'washingMachine', title: 'Washing Machines', sub: 'Dedicated laundry area for tenants' },
                  { key: 'geyser', title: 'Hot Water Geysers', sub: 'Available 24 hours in all washrooms' },
                  { key: 'gym', title: 'Fitness Gym Area', sub: 'Cardio equipment & weights' },
                  { key: 'lift', title: 'Elevator / Lift', sub: 'Access to all floors' },
                ].map((item) => (
                  <div key={item.key} className="settings-toggle-item">
                    <div className="toggle-item-info">
                      <span className="toggle-item-title">{item.title}</span>
                      <span className="toggle-item-sub">{item.sub}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={facilities[item.key]}
                      onChange={() => toggleFacility(item.key)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                ))}
              </div>

              <div className="settings-actions-footer">
                <button type="button" className="btn-settings-save" onClick={() => handleSave('Amenities')}>
                  Save Amenities Selection
                </button>
              </div>
            </div>
          )}

          {activeTab === 'timings' && (
            <div>
              <h2 className="settings-section-title">Hostel Timings &amp; Schedules</h2>
              <p className="settings-section-desc">Gate closing rules and dining hall operating hours.</p>

              <div className="settings-form-grid">
                <div className="settings-field-group">
                  <label className="settings-label">Main Gate Curfew / Closing Time</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={timings.gateClosing}
                    onChange={(e) => setTimings({ ...timings, gateClosing: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Quiet Hours Period</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={timings.quietHours}
                    onChange={(e) => setTimings({ ...timings, quietHours: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Breakfast Buffet Timing</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={timings.breakfast}
                    onChange={(e) => setTimings({ ...timings, breakfast: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Lunch Buffet Timing</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={timings.lunch}
                    onChange={(e) => setTimings({ ...timings, lunch: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Dinner Buffet Timing</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={timings.dinner}
                    onChange={(e) => setTimings({ ...timings, dinner: e.target.value })}
                  />
                </div>
              </div>

              <div className="settings-actions-footer">
                <button type="button" className="btn-settings-save" onClick={() => handleSave('Timings')}>
                  Save Timings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div>
              <h2 className="settings-section-title">Account &amp; Security</h2>
              <p className="settings-section-desc">Owner portal account information and Supabase Auth credentials.</p>

              <div className="settings-form-grid">
                <div className="settings-field-group">
                  <label className="settings-label">Owner Full Name</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={ownerUser?.full_name || 'Rajesh Kumar'}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Registered Owner Email</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={ownerUser?.email || 'owner@urbannest.in'}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Security Role</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={ownerUser?.role || 'OWNER'}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Authentication Provider</label>
                  <input
                    type="text"
                    className="settings-input"
                    value="Supabase Auth (Cloud Verified)"
                    disabled
                    style={{ background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', padding: '16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <strong style={{ color: '#1e40af', fontSize: '0.875rem' }}>Password Management</strong>
                <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: '#1d4ed8' }}>
                  To change your owner password, use the &quot;Forgot password&quot; link on the login page or update your Supabase Auth user credentials in the Supabase Dashboard.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
