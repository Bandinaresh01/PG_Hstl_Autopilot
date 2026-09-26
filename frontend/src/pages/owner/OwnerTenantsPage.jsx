import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { initialTenants, calculateStayDuration, getTenantStats } from '../../data/tenantsData'
import { initialRooms } from '../../data/roomsData'
import { createTenantAccount } from '../../utils/ownerAuth'
import './OwnerTenantsPage.css'
import './OwnerRoomsPage.css'
import './OwnerDashboardPage.css'

export default function OwnerTenantsPage() {
  const [tenants, setTenants] = useState(initialTenants)
  const [activeTab, setActiveTab] = useState('ALL')
  const [floorFilter, setFloorFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [addTenantModalOpen, setAddTenantModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Tenant Account Creation Confirmation Modal
  const [accountConfirmTenant, setAccountConfirmTenant] = useState(null)
  const [confirmName, setConfirmName] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [confirmPhone, setConfirmPhone] = useState('')
  const [confirmRoom, setConfirmRoom] = useState('')
  const [confirmBed, setConfirmBed] = useState('')
  const [confirmMoveIn, setConfirmMoveIn] = useState('')
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [accountCreateError, setAccountCreateError] = useState('')

  // Account Created Result Modal
  const [createdAccountResult, setCreatedAccountResult] = useState(null)
  const [showTempPass, setShowTempPass] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)

  // In-memory track of created accounts: { [tenantId]: accountData }
  const [createdAccountIds, setCreatedAccountIds] = useState({})

  // New Tenant Form state
  const [newTenantName, setNewTenantName] = useState('')
  const [newTenantPhone, setNewTenantPhone] = useState('')
  const [newTenantEmail, setNewTenantEmail] = useState('')
  const [newTenantOccupation, setNewTenantOccupation] = useState('')
  const [newTenantEmergency, setNewTenantEmergency] = useState('')
  const [newTenantRoomId, setNewTenantRoomId] = useState('RM-101')
  const [newTenantBedId, setNewTenantBedId] = useState('101-B')
  const [newTenantMoveIn, setNewTenantMoveIn] = useState('2026-10-01')
  const [newTenantEnd, setNewTenantEnd] = useState('2027-03-31')
  const [newTenantRent, setNewTenantRent] = useState(6500)
  const [newTenantDeposit, setNewTenantDeposit] = useState(6500)

  // Derive stats
  const stats = useMemo(() => getTenantStats(tenants), [tenants])

  // Filtered tenants list
  const filteredTenants = useMemo(() => {
    return tenants.filter((item) => {
      // 1. Tab filters
      if (activeTab === 'ACTIVE' && item.status !== 'ACTIVE') return false
      if (activeTab === 'PENDING' && item.status !== 'PENDING') return false
      if (activeTab === 'NOTICE_PERIOD' && item.status !== 'NOTICE_PERIOD') return false
      if (activeTab === 'MOVED_OUT' && item.status !== 'MOVED_OUT') return false
      if (activeTab === 'ENDING_SOON') {
        const stay = calculateStayDuration(item.expectedEndDate)
        if (!stay.isEndingSoon || item.status === 'MOVED_OUT') return false
      }

      // 2. Floor filter
      if (floorFilter !== 'ALL' && item.floor !== floorFilter) return false

      // 3. Room Type filter
      if (typeFilter !== 'ALL' && item.roomType !== typeFilter) return false

      // 4. Search query (Name, ID, Phone, Email, Room, Occupation)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = item.name.toLowerCase().includes(q)
        const matchId = item.id.toLowerCase().includes(q)
        const matchPhone = item.phone.toLowerCase().includes(q)
        const matchEmail = item.email.toLowerCase().includes(q)
        const matchRoom = item.roomNumber.toLowerCase().includes(q)
        const matchOcc = item.occupation.toLowerCase().includes(q)
        return matchName || matchId || matchPhone || matchEmail || matchRoom || matchOcc
      }

      return true
    })
  }, [tenants, activeTab, floorFilter, typeFilter, searchQuery])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Quick Action: Confirm Move-in for pending tenant
  const handleConfirmMoveIn = (tenantId) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id !== tenantId) return t
        return {
          ...t,
          status: 'ACTIVE',
          notes: `${t.notes || ''} • Checked in on 2026-09-26. Keycard handed over.`.trim(),
        }
      })
    )

    if (selectedTenant && selectedTenant.id === tenantId) {
      setSelectedTenant((prev) => ({ ...prev, status: 'ACTIVE' }))
    }

    setToastMessage('Move-in confirmed! Tenant status is now ACTIVE.')
    setTimeout(() => {
      setToastMessage('')
    }, 3500)
  }

  // Submit New Tenant Admission
  const handleAddTenantSubmit = (e) => {
    e.preventDefault()
    if (!newTenantName.trim() || !newTenantPhone.trim()) {
      alert('Please fill in tenant name and phone number.')
      return
    }

    const assignedRoom = initialRooms.find((r) => r.id === newTenantRoomId)

    const newEntry = {
      id: `TEN-${Math.floor(100 + Math.random() * 900)}`,
      name: newTenantName.trim(),
      phone: newTenantPhone.trim(),
      email: newTenantEmail.trim() || 'resident@example.com',
      occupation: newTenantOccupation.trim() || 'Working Professional',
      emergencyContact: newTenantEmergency.trim() || 'Verified Family Member',
      roomId: newTenantRoomId,
      roomNumber: assignedRoom ? assignedRoom.roomNumber : 'Room 101',
      bedId: newTenantBedId,
      bedCode: `Bed ${newTenantBedId.split('-')[1] || 'A'}`,
      roomType: assignedRoom ? assignedRoom.roomType : 'Double Sharing',
      floor: assignedRoom ? assignedRoom.floor : 'Floor 1',
      moveInDate: newTenantMoveIn,
      expectedEndDate: newTenantEnd,
      noticePeriod: '1 Month',
      monthlyRent: Number(newTenantRent),
      securityDeposit: Number(newTenantDeposit),
      nextDueDate: newTenantMoveIn,
      outstandingAmount: 0,
      paymentStatus: 'PAID',
      status: 'ACTIVE',
      notes: 'New admission enrolled via Owner Portal.',
    }

    setTenants((prev) => [newEntry, ...prev])
    setAddTenantModalOpen(false)
    setToastMessage(`Tenant ${newEntry.name} successfully admitted to ${newEntry.roomNumber}!`)
    setTimeout(() => {
      setToastMessage('')
    }, 3500)
  }

  // Account Creation Handlers
  const openAccountModal = (t) => {
    setAccountConfirmTenant(t)
    setConfirmName(t.name || '')
    setConfirmEmail(t.email || '')
    setConfirmPhone(t.phone || '')
    setConfirmRoom(t.roomNumber || '')
    setConfirmBed(t.bedCode || '')
    setConfirmMoveIn(t.moveInDate || '')
    setAccountCreateError('')
  }

  const handleConfirmAccountCreate = async (e) => {
    e.preventDefault()
    if (!confirmEmail.trim() || !confirmEmail.includes('@')) {
      setAccountCreateError('Please enter a valid email address for tenant login.')
      return
    }
    setIsCreatingAccount(true)
    setAccountCreateError('')

    try {
      const payload = {
        name: confirmName.trim(),
        email: confirmEmail.trim().toLowerCase(),
        phone: confirmPhone.trim(),
        roomNumber: confirmRoom,
        bedCode: confirmBed,
        moveInDate: confirmMoveIn,
        emergencyContact: accountConfirmTenant.emergencyContact || '',
        monthlyRent: accountConfirmTenant.monthlyRent || 8500,
      }

      const data = await createTenantAccount(accountConfirmTenant.id, payload)

      // Store in created map
      setCreatedAccountIds((prev) => ({
        ...prev,
        [accountConfirmTenant.id]: data.account,
      }))

      // Close confirm modal, open result screen
      setAccountConfirmTenant(null)
      setCreatedAccountResult(data.account)
      setShowTempPass(false)
      setCopiedPass(false)
      setCopiedAll(false)

      setToastMessage(`Login credentials generated for ${data.account.name}!`)
      setTimeout(() => setToastMessage(''), 4000)
    } catch (err) {
      setAccountCreateError(err.message || 'Failed to create tenant login account.')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const handleCopyPassword = (pass) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(pass)
    }
    setCopiedPass(true)
    setTimeout(() => setCopiedPass(false), 2500)
  }

  const handleCopyAllDetails = (account) => {
    const portalUrl = `${window.location.origin}/tenant/login`
    const text = `🏡 *Welcome to UrbanNest PG & Hostel Resident Portal*

Hello ${account.name},
Your resident portal account has been activated!

*Login Details:*
• Portal URL: ${portalUrl}
• Login Email: ${account.email}
• Temporary Password: ${account.temporary_password}
• Resident ID: ${account.tenant_id}
• Assigned Room: ${account.room_number} (${account.bed_code})

*Note:* You will be prompted to set your personal permanent password upon your first login. Please keep your credentials secure!`

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
    }
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 3000)
  }

  return (
    <div className="owner-tenants-view">
      {/* 1. Toast Notification */}
      {toastMessage && <div className="toast-success">{toastMessage}</div>}

      {/* 2. Header Row */}
      <div className="tenants-header-row">
        <div>
          <h1 className="tenants-title">Tenant Management</h1>
          <p className="tenants-subtitle">
            Directory of active residents, upcoming admissions, stay terms, and KYC status.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="quick-action-btn primary"
            onClick={() => setAddTenantModalOpen(true)}
          >
            <span className="btn-icon">+</span>
            <span>New Admission</span>
          </button>
        </div>
      </div>

      {/* 3. Summary KPI Cards */}
      <section className="kpi-primary-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Tenants</span>
            <div className="kpi-card-icon icon-beds">👥</div>
          </div>
          <div className="kpi-card-number">{stats.totalTenants}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">Registered</span>
            <span className="kpi-sub-text">Excludes moved out</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Active Residents</span>
            <div className="kpi-card-icon icon-occupied">🏡</div>
          </div>
          <div className="kpi-card-number" style={{ color: '#16a34a' }}>
            {stats.activeTenants}
          </div>
          <div className="kpi-card-footer">
            <span
              className="kpi-badge-neutral"
              style={{ backgroundColor: '#f0fdf4', color: '#166534' }}
            >
              In Hostel Now
            </span>
            <span className="kpi-sub-text">Beds occupied</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Moving In Soon</span>
            <div
              className="kpi-card-icon"
              style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}
            >
              🧳
            </div>
          </div>
          <div className="kpi-card-number" style={{ color: '#7c3aed' }}>
            {stats.movingInSoon}
          </div>
          <div className="kpi-card-footer">
            <span
              className="kpi-badge-neutral"
              style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}
            >
              Check-In Pending
            </span>
            <span className="kpi-sub-text">Next 7 days</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Ending Soon / Notice</span>
            <div
              className="kpi-card-icon"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
            >
              ⏳
            </div>
          </div>
          <div className="kpi-card-number" style={{ color: '#dc2626' }}>
            {stats.endingSoon}
          </div>
          <div className="kpi-card-footer">
            <span
              className="kpi-badge-neutral"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
            >
              Within 30 Days
            </span>
            <span className="kpi-sub-text">Prepare bed turnover</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Moved Out</span>
            <div className="kpi-card-icon icon-available">📦</div>
          </div>
          <div className="kpi-card-number">{stats.movedOut}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">Past Residents</span>
            <span className="kpi-sub-text">Deposits settled</span>
          </div>
        </div>
      </section>

      {/* 4. Controls: Search, Floor, Type, Status Tabs */}
      <section className="tenants-controls-card">
        <div className="tenants-search-filter-row">
          <div className="tenants-search-wrap">
            <span className="tenants-search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              className="tenants-search-input"
              placeholder="Search by tenant name, ID, phone, email, room, occupation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="tenants-select-filter"
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            aria-label="Filter by floor"
          >
            <option value="ALL">All Floors</option>
            <option value="Floor 1">Floor 1</option>
            <option value="Floor 2">Floor 2</option>
            <option value="Floor 3">Floor 3</option>
          </select>

          <select
            className="tenants-select-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by room type"
          >
            <option value="ALL">All Room Types</option>
            <option value="Single Sharing">Single Sharing</option>
            <option value="Double Sharing">Double Sharing</option>
            <option value="Triple Sharing">Triple Sharing</option>
          </select>
        </div>

        {/* Tab Filters */}
        <div className="tenants-filter-tabs">
          <button
            type="button"
            className={`tenant-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All Tenants ({tenants.length})
          </button>
          <button
            type="button"
            className={`tenant-tab-btn ${activeTab === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('ACTIVE')}
          >
            Active Residents ({tenants.filter((t) => t.status === 'ACTIVE').length})
          </button>
          <button
            type="button"
            className={`tenant-tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
            onClick={() => setActiveTab('PENDING')}
          >
            Moving In Soon ({tenants.filter((t) => t.status === 'PENDING').length})
          </button>
          <button
            type="button"
            className={`tenant-tab-btn ${activeTab === 'NOTICE_PERIOD' ? 'active' : ''}`}
            onClick={() => setActiveTab('NOTICE_PERIOD')}
          >
            Notice Period ({tenants.filter((t) => t.status === 'NOTICE_PERIOD').length})
          </button>
          <button
            type="button"
            className={`tenant-tab-btn ${activeTab === 'ENDING_SOON' ? 'active' : ''}`}
            onClick={() => setActiveTab('ENDING_SOON')}
          >
            Ending Soon ({stats.endingSoon})
          </button>
          <button
            type="button"
            className={`tenant-tab-btn ${activeTab === 'MOVED_OUT' ? 'active' : ''}`}
            onClick={() => setActiveTab('MOVED_OUT')}
          >
            Moved Out ({tenants.filter((t) => t.status === 'MOVED_OUT').length})
          </button>
        </div>
      </section>

      {/* 5. Tenants Table */}
      {filteredTenants.length === 0 ? (
        <div
          className="tenants-controls-card"
          style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}
        >
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>👤</span>
          <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.1rem' }}>No tenants found</h3>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Try clearing the search query or changing the filter options.</p>
        </div>
      ) : (
        <div className="tenants-table-card">
          <div className="tenants-table-wrap">
            <table className="tenants-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Contact</th>
                  <th>Room &amp; Bed</th>
                  <th>Move-In</th>
                  <th>Stay Term &amp; End</th>
                  <th>Monthly Rent</th>
                  <th>Payment Status</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t) => {
                  const initials = t.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                  const stay = calculateStayDuration(t.expectedEndDate)

                  return (
                    <tr key={t.id}>
                      {/* Tenant Avatar & Name */}
                      <td>
                        <div className="tenant-cell-wrap">
                          <div className="tenant-avatar-badge">{initials}</div>
                          <div className="tenant-name-col">
                            <span className="tenant-name-text">{t.name}</span>
                            <span className="tenant-sub-info">
                              {t.id} • {t.occupation.split('•')[0]}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                            {t.phone}
                          </span>
                          <span className="tenant-sub-info">{t.email}</span>
                        </div>
                      </td>

                      {/* Room & Bed */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="room-bed-pill">
                            <span>{t.roomNumber}</span>
                            <span>•</span>
                            <span style={{ color: '#2563eb' }}>{t.bedCode}</span>
                          </span>
                          <span className="tenant-sub-info">{t.roomType}</span>
                        </div>
                      </td>

                      {/* Move-In Date */}
                      <td>
                        <span style={{ fontWeight: 500, color: '#334155' }}>
                          {formatDate(t.moveInDate)}
                        </span>
                      </td>

                      {/* Stay Term & End with dynamic countdown */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                            {formatDate(t.expectedEndDate)}
                          </span>
                          <span className={`stay-badge ${stay.badgeClass}`}>
                            {stay.label}
                          </span>
                        </div>
                      </td>

                      {/* Monthly Rent */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: '#0f172a' }}>
                            ₹{t.monthlyRent.toLocaleString('en-IN')}
                          </strong>
                          <span className="tenant-sub-info">
                            Due: {formatDate(t.nextDueDate)}
                          </span>
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td>
                        <span className={`badge-pay ${t.paymentStatus.toLowerCase()}`}>
                          {t.paymentStatus.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Tenant Status */}
                      <td>
                        <span className={`badge-tenant-status ${t.status.toLowerCase()}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => setSelectedTenant(t)}
                            title="View Tenant Profile"
                          >
                            Profile
                          </button>
                          {createdAccountIds[t.id] ? (
                            <button
                              type="button"
                              className="btn-table-action"
                              style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', fontWeight: 600 }}
                              onClick={() => setCreatedAccountResult(createdAccountIds[t.id])}
                              title="View Portal Credentials"
                            >
                              🔑 Credentials
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-table-action"
                              style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontWeight: 600 }}
                              onClick={() => openAccountModal(t)}
                              title="Generate Tenant Portal Login Access"
                            >
                              ⚡ Create Login
                            </button>
                          )}
                          {t.status === 'PENDING' && (
                            <button
                              type="button"
                              className="btn-table-action"
                              style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}
                              onClick={() => handleConfirmMoveIn(t.id)}
                              title="Check-in and activate tenant"
                            >
                              Check-In
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================
          6. TENANT DETAILS / PROFILE MODAL
      ================================================== */}
      {selectedTenant && (
        <div className="modal-overlay" onClick={() => setSelectedTenant(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">{selectedTenant.name}</h3>
                <span className={`badge-tenant-status ${selectedTenant.status.toLowerCase()}`}>
                  {selectedTenant.status.replace('_', ' ')}
                </span>
                <span className="room-bed-pill">
                  {selectedTenant.roomNumber} • {selectedTenant.bedCode}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedTenant(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Personal Information */}
              <div>
                <h4 className="modal-section-title">Personal &amp; Contact Information</h4>
                <div className="detail-info-grid">
                  <div className="detail-info-item">
                    <span className="detail-label">Tenant ID</span>
                    <span className="detail-value">{selectedTenant.id}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{selectedTenant.phone}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Email Address</span>
                    <span className="detail-value">{selectedTenant.email}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Occupation / Employer</span>
                    <span className="detail-value">{selectedTenant.occupation}</span>
                  </div>
                  <div className="detail-info-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="detail-label">Emergency Contact</span>
                    <span className="detail-value" style={{ color: '#b91c1c' }}>
                      {selectedTenant.emergencyContact}
                    </span>
                  </div>
                </div>
              </div>

              {/* Room & Stay Details */}
              <div>
                <h4 className="modal-section-title">Stay &amp; Room Assignment</h4>
                <div className="detail-info-grid">
                  <div className="detail-info-item">
                    <span className="detail-label">Room &amp; Bed</span>
                    <span className="detail-value">
                      {selectedTenant.roomNumber} ({selectedTenant.floor}) • {selectedTenant.bedCode}
                    </span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Room Type</span>
                    <span className="detail-value">{selectedTenant.roomType}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Move-In Date</span>
                    <span className="detail-value">{formatDate(selectedTenant.moveInDate)}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Expected Stay End</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="detail-value">
                        {formatDate(selectedTenant.expectedEndDate)}
                      </span>
                      <span
                        className={`stay-badge ${
                          calculateStayDuration(selectedTenant.expectedEndDate).badgeClass
                        }`}
                      >
                        {calculateStayDuration(selectedTenant.expectedEndDate).label}
                      </span>
                    </div>
                  </div>
                  <div className="detail-info-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="detail-label">Notice Period Term</span>
                    <span className="detail-value">{selectedTenant.noticePeriod}</span>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div>
                <h4 className="modal-section-title">Financial &amp; Rent Ledger</h4>
                <div className="detail-info-grid">
                  <div className="detail-info-item">
                    <span className="detail-label">Monthly Rent</span>
                    <span className="detail-value">
                      ₹{selectedTenant.monthlyRent.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Security Deposit Held</span>
                    <span className="detail-value">
                      ₹{selectedTenant.securityDeposit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Next Rent Due Date</span>
                    <span className="detail-value">{formatDate(selectedTenant.nextDueDate)}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Current Payment Status</span>
                    <div>
                      <span className={`badge-pay ${selectedTenant.paymentStatus.toLowerCase()}`}>
                        {selectedTenant.paymentStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KYC & Documents Check */}
              <div>
                <h4 className="modal-section-title">KYC Documents &amp; Verification</h4>
                <div className="doc-cards-grid">
                  <div className="doc-card-item">
                    <span className="doc-name">Government ID (Aadhaar)</span>
                    <span className="doc-status-verified">✓ Verified</span>
                  </div>
                  <div className="doc-card-item">
                    <span className="doc-name">Rental Agreement</span>
                    <span className="doc-status-verified">✓ Executed</span>
                  </div>
                  <div className="doc-card-item">
                    <span className="doc-name">Police Verification</span>
                    <span className="doc-status-verified">✓ Submitted</span>
                  </div>
                </div>
              </div>

              {/* Complaints & Support */}
              <div>
                <h4 className="modal-section-title">Complaints &amp; Maintenance Tickets</h4>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem',
                    color: '#64748b',
                  }}
                >
                  No open complaints or unresolved maintenance tickets for this resident.
                </div>
              </div>

              {/* Tenant Portal Login Access */}
              <div
                style={{
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdf4',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 className="modal-section-title" style={{ margin: 0, color: '#166534' }}>
                      🔑 Tenant Portal Login Access
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: '#15803d' }}>
                      Allows resident to access their isolated personal portal, view Wi-Fi info, rent invoices, and raise tickets.
                    </p>
                  </div>
                  {createdAccountIds[selectedTenant.id] ? (
                    <span className="login-access-badge created">
                      ✓ Login Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="quick-action-btn primary"
                      style={{ fontSize: '0.8125rem', padding: '6px 14px' }}
                      onClick={() => openAccountModal(selectedTenant)}
                    >
                      ⚡ Create Tenant Login
                    </button>
                  )}
                </div>
                {createdAccountIds[selectedTenant.id] && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '8px',
                      borderTop: '1px solid #dcfce7',
                    }}
                  >
                    <span style={{ fontSize: '0.825rem', color: '#14532d' }}>
                      User ID: <strong>{createdAccountIds[selectedTenant.id].tenant_id}</strong> • Login Email: <strong>{createdAccountIds[selectedTenant.id].email}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn-table-action"
                      style={{ fontSize: '0.75rem', padding: '4px 10px', backgroundColor: '#ffffff' }}
                      onClick={() => setCreatedAccountResult(createdAccountIds[selectedTenant.id])}
                    >
                      View Login Details
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedTenant.notes && (
                <div>
                  <h4 className="modal-section-title">Hostel Notes</h4>
                  <div className="modal-notes-box">{selectedTenant.notes}</div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!createdAccountIds[selectedTenant.id] && (
                <button
                  type="button"
                  className="quick-action-btn primary"
                  onClick={() => openAccountModal(selectedTenant)}
                >
                  ⚡ Create Tenant Login
                </button>
              )}
              {selectedTenant.status === 'PENDING' && (
                <button
                  type="button"
                  className="quick-action-btn primary"
                  style={{ backgroundColor: '#16a34a' }}
                  onClick={() => handleConfirmMoveIn(selectedTenant.id)}
                >
                  Confirm Check-In
                </button>
              )}
              <Link
                to="/owner/rooms"
                className="btn-table-action"
                style={{ textDecoration: 'none' }}
              >
                View in Rooms
              </Link>
              <Link
                to="/owner/dues"
                className="btn-table-action"
                style={{ textDecoration: 'none' }}
              >
                View Rent Ledger
              </Link>
              <button
                type="button"
                className="btn-table-action"
                onClick={() => setSelectedTenant(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          6B. CONFIRM CREATE TENANT ACCOUNT MODAL
      ================================================== */}
      {accountConfirmTenant && (
        <div className="modal-overlay" onClick={() => !isCreatingAccount && setAccountConfirmTenant(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">Create Tenant Portal Login</h3>
                <span className="badge-tenant-status active">Approved Resident</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !isCreatingAccount && setAccountConfirmTenant(null)}
                aria-label="Close"
                disabled={isCreatingAccount}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAccountCreate}>
              <div className="modal-body">
                <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                  Provision an official Supabase Auth login account for <strong>{accountConfirmTenant.name}</strong>.
                  The tenant will receive login credentials and be guided through first-time onboarding.
                </p>

                {accountCreateError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: '0.875rem',
                      marginBottom: '16px',
                    }}
                  >
                    ⚠️ {accountCreateError}
                  </div>
                )}

                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label>Tenant ID / Code</label>
                    <input
                      type="text"
                      className="assign-form-input"
                      value={accountConfirmTenant.id}
                      disabled
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="assign-form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      className="assign-form-input"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label>Login Email (Primary Identifier) *</label>
                    <input
                      type="email"
                      className="assign-form-input"
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      placeholder="resident@example.com"
                      required
                    />
                  </div>
                  <div className="assign-form-group">
                    <label>Contact Phone *</label>
                    <input
                      type="tel"
                      className="assign-form-input"
                      value={confirmPhone}
                      onChange={(e) => setConfirmPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label>Assigned Room</label>
                    <input
                      type="text"
                      className="assign-form-input"
                      value={confirmRoom}
                      disabled
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="assign-form-group">
                    <label>Bed Code</label>
                    <input
                      type="text"
                      className="assign-form-input"
                      value={confirmBed}
                      disabled
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div className="assign-form-group">
                  <label>Move-In Date</label>
                  <input
                    type="date"
                    className="assign-form-input"
                    value={confirmMoveIn}
                    disabled
                    style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                  />
                </div>

                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '0.825rem',
                    color: '#1e40af',
                    lineHeight: 1.5,
                  }}
                >
                  🔒 <strong>Secure Credential Handover:</strong> A temporary password will be created securely in Supabase Auth.
                  You will be shown the generated credentials on the next screen to copy and send via WhatsApp/SMS.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-table-action"
                  onClick={() => setAccountConfirmTenant(null)}
                  disabled={isCreatingAccount}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="quick-action-btn primary"
                  disabled={isCreatingAccount}
                >
                  {isCreatingAccount ? 'Provisioning Account...' : 'Generate Access & Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          6C. ACCOUNT CREATED RESULT SCREEN MODAL
      ================================================== */}
      {createdAccountResult && (
        <div className="modal-overlay" onClick={() => setCreatedAccountResult(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header" style={{ borderBottomColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
              <div className="modal-title-group">
                <h3 className="modal-title" style={{ color: '#166534' }}>
                  ✓ Tenant Account Created
                </h3>
                <span className="login-access-badge created">Active</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCreatedAccountResult(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="account-result-card">
                <div className="account-result-row">
                  <span className="account-result-key">Tenant Code:</span>
                  <span className="account-result-val">{createdAccountResult.tenant_id}</span>
                </div>
                <div className="account-result-row">
                  <span className="account-result-key">Full Name:</span>
                  <span className="account-result-val">{createdAccountResult.name}</span>
                </div>
                <div className="account-result-row">
                  <span className="account-result-key">Login Email:</span>
                  <span className="account-result-val">{createdAccountResult.email}</span>
                </div>
                <div className="account-result-row">
                  <span className="account-result-key">Room &amp; Bed:</span>
                  <span className="account-result-val">
                    {createdAccountResult.room_number} • {createdAccountResult.bed_code}
                  </span>
                </div>
                <div className="account-result-row">
                  <span className="account-result-key">Portal URL:</span>
                  <span className="account-result-val" style={{ fontSize: '0.8rem' }}>
                    {window.location.origin}/tenant/login
                  </span>
                </div>
              </div>

              {/* Temporary Password Box */}
              <div style={{ marginTop: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Temporary Password (One-Time Demo Access):
                </label>
                <div className="temp-password-box">
                  <span className="temp-password-text">
                    {showTempPass ? createdAccountResult.temporary_password : '••••••••••••'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-table-action"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      onClick={() => setShowTempPass(!showTempPass)}
                    >
                      {showTempPass ? '🙈 Hide' : '👁️ Reveal'}
                    </button>
                    <button
                      type="button"
                      className="btn-copy-creds"
                      onClick={() => handleCopyPassword(createdAccountResult.temporary_password)}
                    >
                      {copiedPass ? '✓ Copied' : '📋 Copy Password'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Instruction Card */}
              <div
                style={{
                  marginTop: '16px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '0.825rem',
                  color: '#92400e',
                  lineHeight: 1.5,
                }}
              >
                ℹ️ <strong>First-Time Onboarding Required:</strong> When the resident signs in with this temporary password,
                they will be required to set their permanent personal password and agree to hostel guidelines before gaining access.
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn-copy-creds"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                onClick={() => handleCopyAllDetails(createdAccountResult)}
              >
                {copiedAll ? '✓ All Details Copied to Clipboard!' : '📋 Copy Login Details (WhatsApp / SMS)'}
              </button>
              <button
                type="button"
                className="btn-table-action"
                onClick={() => setCreatedAccountResult(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          7. NEW TENANT ADMISSION MODAL
      ================================================== */}
      {addTenantModalOpen && (
        <div className="modal-overlay" onClick={() => setAddTenantModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">New Tenant Admission</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAddTenantModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTenantSubmit}>
              <div className="modal-body">
                {/* Name & Occupation */}
                <div className="assign-form-group">
                  <label htmlFor="adm-name">Tenant Full Name *</label>
                  <input
                    id="adm-name"
                    type="text"
                    className="assign-form-input"
                    placeholder="e.g. Varun Teja"
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    required
                  />
                </div>

                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label htmlFor="adm-phone">Phone Number *</label>
                    <input
                      id="adm-phone"
                      type="tel"
                      className="assign-form-input"
                      placeholder="+91 98765 00000"
                      value={newTenantPhone}
                      onChange={(e) => setNewTenantPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="adm-email">Email Address</label>
                    <input
                      id="adm-email"
                      type="email"
                      className="assign-form-input"
                      placeholder="resident@example.com"
                      value={newTenantEmail}
                      onChange={(e) => setNewTenantEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label htmlFor="adm-occ">Occupation / Company</label>
                    <input
                      id="adm-occ"
                      type="text"
                      className="assign-form-input"
                      placeholder="e.g. Software Engineer • Google"
                      value={newTenantOccupation}
                      onChange={(e) => setNewTenantOccupation(e.target.value)}
                    />
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="adm-emergency">Emergency Contact</label>
                    <input
                      id="adm-emergency"
                      type="text"
                      className="assign-form-input"
                      placeholder="+91 98765 11111 (Father)"
                      value={newTenantEmergency}
                      onChange={(e) => setNewTenantEmergency(e.target.value)}
                    />
                  </div>
                </div>

                {/* Room & Bed */}
                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label htmlFor="adm-room">Assigned Room</label>
                    <select
                      id="adm-room"
                      className="assign-form-select"
                      value={newTenantRoomId}
                      onChange={(e) => setNewTenantRoomId(e.target.value)}
                    >
                      {initialRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roomNumber} ({r.floor} • {r.roomType})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="adm-bed">Bed Code</label>
                    <select
                      id="adm-bed"
                      className="assign-form-select"
                      value={newTenantBedId}
                      onChange={(e) => setNewTenantBedId(e.target.value)}
                    >
                      <option value="101-B">Bed B (Room 101)</option>
                      <option value="101-C">Bed C (Room 101)</option>
                      <option value="104-B">Bed B (Room 104)</option>
                      <option value="201-B">Bed B (Room 201)</option>
                      <option value="202-B">Bed B (Room 202)</option>
                      <option value="204-B">Bed B (Room 204)</option>
                      <option value="301-A">Bed A (Room 301)</option>
                      <option value="303-B">Bed B (Room 303)</option>
                      <option value="305-B">Bed B (Room 305)</option>
                    </select>
                  </div>
                </div>

                {/* Move In & Expected End Date */}
                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label htmlFor="adm-movein">Move-In Date *</label>
                    <input
                      id="adm-movein"
                      type="date"
                      className="assign-form-input"
                      value={newTenantMoveIn}
                      onChange={(e) => setNewTenantMoveIn(e.target.value)}
                      required
                    />
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="adm-end">Expected Stay End Date</label>
                    <input
                      id="adm-end"
                      type="date"
                      className="assign-form-input"
                      value={newTenantEnd}
                      onChange={(e) => setNewTenantEnd(e.target.value)}
                    />
                  </div>
                </div>

                {/* Financials */}
                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label htmlFor="adm-rent">Monthly Rent (₹)</label>
                    <input
                      id="adm-rent"
                      type="number"
                      className="assign-form-input"
                      value={newTenantRent}
                      onChange={(e) => setNewTenantRent(e.target.value)}
                    />
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="adm-dep">Security Deposit (₹)</label>
                    <input
                      id="adm-dep"
                      type="number"
                      className="assign-form-input"
                      value={newTenantDeposit}
                      onChange={(e) => setNewTenantDeposit(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-table-action"
                  onClick={() => setAddTenantModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="quick-action-btn primary">
                  Save Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
