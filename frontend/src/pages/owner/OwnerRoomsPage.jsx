import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { fetchOwnerRooms, createOwnerRoom, createOwnerTenant, updateOwnerBedStatus } from '../../utils/ownerAuth'
import { calculateStayDuration } from '../../data/tenantsData'
import './OwnerRoomsPage.css'
import './OwnerDashboardPage.css'

export default function OwnerRoomsPage() {
  const [rooms, setRooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState('GRID') // 'GRID' | 'TABLE'
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [floorFilter, setFloorFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [targetRoomId, setTargetRoomId] = useState('')
  const [targetBedId, setTargetBedId] = useState('')
  const [tenantNameInput, setTenantNameInput] = useState('')
  const [tenantPhoneInput, setTenantPhoneInput] = useState('')
  const [tenantEmailInput, setTenantEmailInput] = useState('')
  const [moveInDateInput, setMoveInDateInput] = useState('2026-10-01')
  const [stayEndDateInput, setStayEndDateInput] = useState('2027-03-31')
  const [toastMessage, setToastMessage] = useState('')

  // Add Room Modal State
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false)
  const [newRoomNumber, setNewRoomNumber] = useState('')
  const [newRoomType, setNewRoomType] = useState('DOUBLE')
  const [newFloor, setNewFloor] = useState(2)
  const [newMonthlyRent, setNewMonthlyRent] = useState(8500)
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false)

  // Fetch rooms from backend database
  const loadRooms = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await fetchOwnerRooms()
      const rawRooms = data.rooms || []
      const normalized = rawRooms.map((r) => ({
        id: r.id,
        roomNumber: r.room_number ? (String(r.room_number).startsWith('Room ') ? r.room_number : `Room ${r.room_number}`) : (r.roomNumber || 'Room'),
        roomType: r.room_type || r.roomType || 'Double Sharing',
        floor: r.floor ? (typeof r.floor === 'number' ? `Floor ${r.floor}` : r.floor) : 'Floor 1',
        monthlyRent: Number(r.monthly_rent || r.monthlyRent || 0),
        deposit: Number(r.security_deposit || r.deposit || 0),
        capacity: r.capacity || r.beds?.length || 2,
        status: r.status || 'ACTIVE',
        amenities: r.amenities || ['Attached Washroom', 'High-Speed Wi-Fi', 'Study Desks', 'Wardrobes'],
        beds: (r.beds || []).map((b) => ({
          id: b.id,
          bedCode: b.bed_code || b.bedCode || 'Bed',
          status: b.status || 'AVAILABLE',
          tenantId: b.tenant_id || b.tenantId || null,
          tenantName: b.tenant_name || b.tenantName || null,
          moveInDate: b.move_in_date || b.moveInDate || null,
          expectedEndDate: b.expected_end_date || b.expectedEndDate || null,
        }))
      }))
      setRooms(normalized)
    } catch (err) {
      console.error('Failed to load rooms:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  // Calculate live stats
  const stats = useMemo(() => {
    let totalBeds = 0
    let occupiedBeds = 0
    let availableBeds = 0
    let reservedBeds = 0
    let maintenanceBeds = 0

    rooms.forEach((r) => {
      ;(r.beds || []).forEach((b) => {
        totalBeds += 1
        if (b.status === 'OCCUPIED') occupiedBeds += 1
        else if (b.status === 'AVAILABLE') availableBeds += 1
        else if (b.status === 'RESERVED') reservedBeds += 1
        else if (b.status === 'MAINTENANCE' || b.status === 'UNAVAILABLE') maintenanceBeds += 1
      })
    })

    return {
      totalRooms: rooms.length,
      totalBeds,
      occupiedBeds,
      availableBeds,
      reservedBeds,
      maintenanceBeds,
    }
  }, [rooms])

  // Available beds for selected room in Assign Modal
  const availableBedsForTargetRoom = useMemo(() => {
    if (!targetRoomId) return []
    const r = rooms.find((room) => room.id === targetRoomId)
    if (!r) return []
    return r.beds.filter((b) => b.status === 'AVAILABLE')
  }, [rooms, targetRoomId])

  // Filtered rooms logic
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (statusFilter === 'AVAILABLE' && r.status !== 'AVAILABLE') return false
      if (statusFilter === 'PARTIALLY_OCCUPIED' && r.status !== 'PARTIALLY_OCCUPIED') return false
      if (statusFilter === 'FULLY_OCCUPIED' && r.status !== 'FULLY_OCCUPIED') return false
      if (statusFilter === 'MAINTENANCE' && r.status !== 'MAINTENANCE') return false

      if (floorFilter !== 'ALL' && r.floor !== floorFilter) return false
      if (typeFilter !== 'ALL' && r.roomType !== typeFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchRoomNum = r.roomNumber.toLowerCase().includes(q)
        const matchFloor = r.floor.toLowerCase().includes(q)
        const matchType = r.roomType.toLowerCase().includes(q)
        const matchTenant = r.beds.some(
          (b) => b.tenantName && b.tenantName.toLowerCase().includes(q)
        )
        const matchBed = r.beds.some((b) => b.bedCode.toLowerCase().includes(q))
        return matchRoomNum || matchFloor || matchType || matchTenant || matchBed
      }

      return true
    })
  }, [rooms, statusFilter, floorFilter, typeFilter, searchQuery])

  // Trigger quick assign for a specific room and bed
  const handleOpenAssignModal = (roomId = '', bedId = '') => {
    const defaultRoom = roomId || (rooms.find((r) => r.beds.some((b) => b.status === 'AVAILABLE'))?.id || '')
    setTargetRoomId(defaultRoom)
    
    if (bedId) {
      setTargetBedId(bedId)
    } else {
      const r = rooms.find((room) => room.id === defaultRoom)
      const firstAvailableBed = r?.beds.find((b) => b.status === 'AVAILABLE')
      setTargetBedId(firstAvailableBed?.id || '')
    }

    setTenantNameInput('')
    setTenantPhoneInput('')
    setTenantEmailInput('')
    setMoveInDateInput('2026-10-01')
    setStayEndDateInput('2027-03-31')
    setAssignModalOpen(true)
  }

  // Handle room selection change in modal
  const handleRoomSelectChange = (newRoomId) => {
    setTargetRoomId(newRoomId)
    const r = rooms.find((room) => room.id === newRoomId)
    const firstAvailableBed = r?.beds.find((b) => b.status === 'AVAILABLE')
    setTargetBedId(firstAvailableBed?.id || '')
  }

  // Submit Assign Tenant via real backend API
  const handleAssignTenantSubmit = async (e) => {
    e.preventDefault()
    if (!targetRoomId || !targetBedId || !tenantNameInput.trim()) {
      alert('Please select a room, an available bed, and enter tenant name.')
      return
    }

    try {
      await createOwnerTenant({
        full_name: tenantNameInput.trim(),
        phone: tenantPhoneInput.trim(),
        email: tenantEmailInput.trim(),
        room_id: targetRoomId,
        bed_id: targetBedId,
        move_in_date: moveInDateInput,
        expected_end_date: stayEndDateInput,
        status: 'ACTIVE'
      })

      await loadRooms()
      setAssignModalOpen(false)
      if (selectedRoomForDetails?.id === targetRoomId) {
        setSelectedRoomForDetails(null)
      }

      setToastMessage(`Assigned ${tenantNameInput} to bed successfully!`)
      setTimeout(() => setToastMessage(''), 3500)
    } catch (err) {
      alert(err.message || 'Failed to assign tenant to bed.')
    }
  }

  // Submit Add Room via real backend API
  const handleAddRoomSubmit = async (e) => {
    e.preventDefault()
    if (!newRoomNumber.trim()) {
      alert('Please enter a room number.')
      return
    }

    try {
      setIsSubmittingRoom(true)
      await createOwnerRoom({
        room_number: newRoomNumber.trim(),
        room_type: newRoomType,
        floor: Number(newFloor),
        monthly_rent: Number(newMonthlyRent),
        security_deposit: Number(newMonthlyRent),
        capacity: newRoomType === 'SINGLE' ? 1 : newRoomType === 'TRIPLE' ? 3 : 2
      })

      await loadRooms()
      setAddRoomModalOpen(false)
      setNewRoomNumber('')
      setToastMessage(`Room ${newRoomNumber} created successfully in database!`)
      setTimeout(() => setToastMessage(''), 3500)
    } catch (err) {
      alert(err.message || 'Failed to create room.')
    } finally {
      setIsSubmittingRoom(false)
    }
  }

  return (
    <div className="owner-rooms-view">
      {/* 1. Toast Notification */}
      {toastMessage && <div className="toast-success">{toastMessage}</div>}

      {/* 2. Header Row */}
      <div className="rooms-header-row">
        <div>
          <h1 className="rooms-title">Rooms &amp; Beds Inventory</h1>
          <p className="rooms-subtitle">
            Live overview of hostel rooms, bed assignments, occupancy, and tenant allocations.
          </p>
        </div>
        <div className="rooms-header-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="quick-action-btn secondary"
            onClick={() => setAddRoomModalOpen(true)}
            style={{ backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1' }}
          >
            <span className="btn-icon">+</span>
            <span>Add Room</span>
          </button>
          <button
            type="button"
            className="quick-action-btn primary"
            onClick={() => handleOpenAssignModal()}
          >
            <span className="btn-icon">+</span>
            <span>Assign Bed</span>
          </button>
        </div>
      </div>

      {/* 3. Operational KPI Summary Grid */}
      <section className="kpi-primary-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Rooms</span>
            <div className="kpi-card-icon icon-beds">🏢</div>
          </div>
          <div className="kpi-card-number">{stats.totalRooms}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">3 Floors</span>
            <span className="kpi-sub-text">100% configured</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Beds</span>
            <div className="kpi-card-icon icon-beds">🛏️</div>
          </div>
          <div className="kpi-card-number">{stats.totalBeds}</div>
          <div className="kpi-card-footer">
            <span className="kpi-badge-neutral">Full Capacity</span>
            <span className="kpi-sub-text">Across all rooms</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Occupied Beds</span>
            <div className="kpi-card-icon icon-occupied">👥</div>
          </div>
          <div className="kpi-card-number">{stats.occupiedBeds}</div>
          <div className="kpi-card-footer">
            <span
              className="kpi-badge-neutral"
              style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
            >
              {Math.round((stats.occupiedBeds / (stats.totalBeds || 1)) * 100)}% Occupancy
            </span>
            <span className="kpi-sub-text">Active residents</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Available Beds</span>
            <div className="kpi-card-icon icon-available">✨</div>
          </div>
          <div className="kpi-card-number" style={{ color: '#16a34a' }}>
            {stats.availableBeds}
          </div>
          <div className="kpi-card-footer">
            <span
              className="kpi-badge-neutral"
              style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}
            >
              Ready to Book
            </span>
            <span className="kpi-sub-text">Immediate move-in</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Reserved Beds</span>
            <div
              className="kpi-card-icon"
              style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}
            >
              🧳
            </div>
          </div>
          <div className="kpi-card-number" style={{ color: '#7c3aed' }}>
            {stats.reservedBeds}
          </div>
          <div className="kpi-card-footer">
            <span
              className="kpi-badge-neutral"
              style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}
            >
              Move-in Queued
            </span>
            <span className="kpi-sub-text">Advance token paid</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Maintenance</span>
            <div
              className="kpi-card-icon"
              style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}
            >
              🛠️
            </div>
          </div>
          <div className="kpi-card-number" style={{ color: '#ea580c' }}>
            {stats.maintenanceBeds}
          </div>
          <div className="kpi-card-footer">
            <span
              className="kpi-badge-neutral"
              style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}
            >
              Unavailable
            </span>
            <span className="kpi-sub-text">Repairs underway</span>
          </div>
        </div>
      </section>

      {/* 4. Controls Card: Search, Filters, View Mode Toggle */}
      <section className="rooms-controls-card">
        <div className="rooms-search-filter-row">
          <div className="rooms-search-wrap">
            <span className="rooms-search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              className="rooms-search-input"
              placeholder="Search by Room #, Floor, Tenant name, or Bed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="rooms-select-filter"
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
            className="rooms-select-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by room type"
          >
            <option value="ALL">All Room Types</option>
            <option value="Single Sharing">Single Sharing</option>
            <option value="Double Sharing">Double Sharing</option>
            <option value="Triple Sharing">Triple Sharing</option>
          </select>

          {/* Grid vs Table View Toggle */}
          <div className="view-toggle-group">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'GRID' ? 'active' : ''}`}
              onClick={() => setViewMode('GRID')}
              title="Grid View"
            >
              <span>▦</span>
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'TABLE' ? 'active' : ''}`}
              onClick={() => setViewMode('TABLE')}
              title="Table View"
            >
              <span>☰</span>
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="rooms-filter-tabs">
          <button
            type="button"
            className={`room-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Rooms ({rooms.length})
          </button>
          <button
            type="button"
            className={`room-tab-btn ${statusFilter === 'AVAILABLE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('AVAILABLE')}
          >
            Available ({rooms.filter((r) => r.status === 'AVAILABLE').length})
          </button>
          <button
            type="button"
            className={`room-tab-btn ${statusFilter === 'PARTIALLY_OCCUPIED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('PARTIALLY_OCCUPIED')}
          >
            Partially Occupied ({rooms.filter((r) => r.status === 'PARTIALLY_OCCUPIED').length})
          </button>
          <button
            type="button"
            className={`room-tab-btn ${statusFilter === 'FULLY_OCCUPIED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('FULLY_OCCUPIED')}
          >
            Fully Occupied ({rooms.filter((r) => r.status === 'FULLY_OCCUPIED').length})
          </button>
          <button
            type="button"
            className={`room-tab-btn ${statusFilter === 'MAINTENANCE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('MAINTENANCE')}
          >
            Maintenance ({rooms.filter((r) => r.status === 'MAINTENANCE').length})
          </button>
        </div>
      </section>

      {/* 5. Main Content: Grid or Table View */}
      {filteredRooms.length === 0 ? (
        <div
          className="rooms-controls-card"
          style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}
        >
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🔍</span>
          <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.1rem' }}>No rooms matched your filters</h3>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Try clearing the search query or changing the filter options.</p>
        </div>
      ) : viewMode === 'GRID' ? (
        /* GRID VIEW */
        <div className="rooms-grid">
          {filteredRooms.map((room) => {
            const totalBeds = room.beds.length
            const occupiedCount = room.beds.filter(
              (b) => b.status === 'OCCUPIED' || b.status === 'RESERVED'
            ).length
            const occPercentage = Math.round((occupiedCount / totalBeds) * 100)

            return (
              <div key={room.id} className="room-card">
                {/* Header */}
                <div className="room-card-head">
                  <div className="room-card-title-group">
                    <div className="room-number-wrap">
                      <span className="room-number-text">{room.roomNumber}</span>
                      <span className="room-floor-pill">{room.floor}</span>
                    </div>
                    <span className="room-type-meta">
                      {room.roomType} • {totalBeds} Bed{totalBeds > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="room-rent-badge">
                    <span className="room-rent-val">₹{room.monthlyRent.toLocaleString('en-IN')}</span>
                    <span className="room-rent-sub">per bed / mo</span>
                  </div>
                </div>

                {/* Occupancy Bar */}
                <div className="room-occupancy-bar-wrap">
                  <div className="room-occupancy-info">
                    <span>
                      {occupiedCount} of {totalBeds} Beds Occupied
                    </span>
                    <span className={`room-status-badge ${room.status.toLowerCase()}`}>
                      {room.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="occupancy-track">
                    <div
                      className={`occupancy-fill ${
                        occPercentage === 100
                          ? 'full'
                          : occPercentage > 0
                          ? 'partial'
                          : 'empty'
                      }`}
                      style={{ width: `${occPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Beds Roster */}
                <div className="beds-roster">
                  {room.beds.map((bed) => {
                    const isOccupied = bed.status === 'OCCUPIED'
                    const isAvailable = bed.status === 'AVAILABLE'
                    const isReserved = bed.status === 'RESERVED'
                    const isMaintenance = bed.status === 'MAINTENANCE'

                    const stayInfo = isOccupied ? calculateStayDuration(bed.expectedEndDate) : null

                    return (
                      <div
                        key={bed.id}
                        className={`bed-tile ${bed.status.toLowerCase()}`}
                      >
                        <div className="bed-tile-left">
                          <div className="bed-code-icon">{bed.bedCode.replace('Bed ', '')}</div>
                          <div className="bed-details-text">
                            {isOccupied && (
                              <>
                                <span className="bed-tenant-name">{bed.tenantName}</span>
                                <span className="bed-tenant-sub">
                                  {stayInfo ? stayInfo.label : 'Active stay'}
                                </span>
                              </>
                            )}
                            {isReserved && (
                              <>
                                <span className="bed-tenant-name">{bed.tenantName} (Reserved)</span>
                                <span className="bed-tenant-sub">
                                  Move-in: {bed.moveInDate || 'Upcoming'}
                                </span>
                              </>
                            )}
                            {isAvailable && (
                              <>
                                <span className="bed-tenant-name" style={{ color: '#15803d' }}>
                                  Available Bed
                                </span>
                                <span className="bed-tenant-sub">Ready for tenant assignment</span>
                              </>
                            )}
                            {isMaintenance && (
                              <>
                                <span className="bed-tenant-name" style={{ color: '#c2410c' }}>
                                  Under Maintenance
                                </span>
                                <span className="bed-tenant-sub">Service required</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="bed-tile-right">
                          <span className={`bed-status-pill ${bed.status.toLowerCase()}`}>
                            {bed.status}
                          </span>
                          {isAvailable && (
                            <button
                              type="button"
                              className="btn-assign-quick"
                              onClick={() => handleOpenAssignModal(room.id, bed.id)}
                              title="Assign a tenant to this bed"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="room-card-footer">
                  <span className="amenity-dots-snippet" title={room.amenities.join(', ')}>
                    {room.amenities.slice(0, 3).join(' • ')}
                    {room.amenities.length > 3 ? ` +${room.amenities.length - 3}` : ''}
                  </span>
                  <button
                    type="button"
                    className="btn-room-details"
                    onClick={() => setSelectedRoomForDetails(room)}
                  >
                    View Details &rarr;
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rooms-table-card">
          <div className="rooms-table-wrap">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Floor</th>
                  <th>Type</th>
                  <th>Rent / mo</th>
                  <th>Deposit</th>
                  <th>Capacity</th>
                  <th>Beds Overview</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => {
                  const totalBeds = room.beds.length
                  const occupiedCount = room.beds.filter(
                    (b) => b.status === 'OCCUPIED' || b.status === 'RESERVED'
                  ).length
                  const hasAvailable = room.beds.some((b) => b.status === 'AVAILABLE')

                  return (
                    <tr key={room.id}>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{room.roomNumber}</strong>
                      </td>
                      <td>
                        <span className="room-floor-pill">{room.floor}</span>
                      </td>
                      <td>
                        <span style={{ color: '#475569', fontSize: '0.85rem' }}>{room.roomType}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>
                          ₹{room.monthlyRent.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>₹{room.deposit.toLocaleString('en-IN')}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {occupiedCount} / {totalBeds}
                        </span>
                      </td>
                      <td>
                        <div className="table-beds-list">
                          {room.beds.map((b) => (
                            <span
                              key={b.id}
                              className={`table-bed-chip ${b.status.toLowerCase()}`}
                              title={`${b.bedCode}: ${b.status} ${
                                b.tenantName ? `(${b.tenantName})` : ''
                              }`}
                            >
                              {b.bedCode.replace('Bed ', '')}: {b.status[0]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`room-status-badge ${room.status.toLowerCase()}`}>
                          {room.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => setSelectedRoomForDetails(room)}
                          >
                            Details
                          </button>
                          {hasAvailable && (
                            <button
                              type="button"
                              className="btn-table-action"
                              style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}
                              onClick={() => handleOpenAssignModal(room.id)}
                            >
                              Assign
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
          6. ROOM DETAILS MODAL
      ================================================== */}
      {selectedRoomForDetails && (
        <div className="modal-overlay" onClick={() => setSelectedRoomForDetails(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">{selectedRoomForDetails.roomNumber} Details</h3>
                <span className={`room-status-badge ${selectedRoomForDetails.status.toLowerCase()}`}>
                  {selectedRoomForDetails.status.replace('_', ' ')}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedRoomForDetails(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Basic Specs */}
              <div>
                <h4 className="modal-section-title">Room Specifications</h4>
                <div className="detail-info-grid">
                  <div className="detail-info-item">
                    <span className="detail-label">Floor Location</span>
                    <span className="detail-value">{selectedRoomForDetails.floor}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Room Type</span>
                    <span className="detail-value">{selectedRoomForDetails.roomType}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Monthly Rent per Bed</span>
                    <span className="detail-value">
                      ₹{selectedRoomForDetails.monthlyRent.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">Security Deposit per Bed</span>
                    <span className="detail-value">
                      ₹{selectedRoomForDetails.deposit.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h4 className="modal-section-title">Included Amenities</h4>
                <div className="amenities-pills-list">
                  {selectedRoomForDetails.amenities.map((amenity, idx) => (
                    <span key={idx} className="amenity-pill">
                      ✓ {amenity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bed Inventory & Occupant Roster */}
              <div>
                <h4 className="modal-section-title">Beds Inventory &amp; Resident Roster</h4>
                <div className="modal-beds-list">
                  {selectedRoomForDetails.beds.map((b) => {
                    const stay = b.status === 'OCCUPIED' ? calculateStayDuration(b.expectedEndDate) : null

                    return (
                      <div key={b.id} className="modal-bed-card">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                              {b.bedCode}
                            </strong>
                            <span className={`bed-status-pill ${b.status.toLowerCase()}`}>
                              {b.status}
                            </span>
                          </div>
                          {b.status === 'OCCUPIED' && (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                              <span>Tenant: </span>
                              <strong style={{ color: '#0f172a' }}>{b.tenantName}</strong>
                              <span> • Since {b.moveInDate}</span>
                              {stay && (
                                <span style={{ marginLeft: '6px' }}>({stay.label})</span>
                              )}
                            </div>
                          )}
                          {b.status === 'RESERVED' && (
                            <div style={{ fontSize: '0.8rem', color: '#6d28d9', marginTop: '4px' }}>
                              <span>Reserved by </span>
                              <strong>{b.tenantName}</strong>
                              <span> • Check-in on {b.moveInDate}</span>
                            </div>
                          )}
                          {b.status === 'AVAILABLE' && (
                            <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '4px' }}>
                              Available for immediate assignment
                            </div>
                          )}
                        </div>

                        {b.status === 'AVAILABLE' && (
                          <button
                            type="button"
                            className="btn-assign-quick"
                            onClick={() => {
                              setSelectedRoomForDetails(null)
                              handleOpenAssignModal(selectedRoomForDetails.id, b.id)
                            }}
                          >
                            Assign Bed
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="quick-action-btn primary"
                onClick={() => setSelectedRoomForDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          7. ASSIGN TENANT MODAL WORKFLOW
      ================================================== */}
      {assignModalOpen && (
        <div className="modal-overlay" onClick={() => setAssignModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3 className="modal-title">Assign Tenant to Bed</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAssignModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignTenantSubmit}>
              <div className="modal-body">
                <div className="assign-notice-callout">
                  <span aria-hidden="true">💡</span>
                  <span>
                    Only beds in <strong>AVAILABLE</strong> status can be assigned. Occupied beds are
                    automatically prevented from double booking.
                  </span>
                </div>

                {/* Room & Bed Selectors */}
                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label htmlFor="assign-room-select">Select Room *</label>
                    <select
                      id="assign-room-select"
                      className="assign-form-select"
                      value={targetRoomId}
                      onChange={(e) => handleRoomSelectChange(e.target.value)}
                      required
                    >
                      {rooms.map((r) => {
                        const availCount = r.beds.filter((b) => b.status === 'AVAILABLE').length
                        return (
                          <option key={r.id} value={r.id}>
                            {r.roomNumber} ({r.floor} • {availCount} avail)
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="assign-form-group">
                    <label htmlFor="assign-bed-select">Select Bed *</label>
                    <select
                      id="assign-bed-select"
                      className="assign-form-select"
                      value={targetBedId}
                      onChange={(e) => setTargetBedId(e.target.value)}
                      required
                      disabled={availableBedsForTargetRoom.length === 0}
                    >
                      {availableBedsForTargetRoom.length === 0 ? (
                        <option value="">No available beds in this room</option>
                      ) : (
                        availableBedsForTargetRoom.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bedCode} (Available)
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Tenant Details */}
                <div className="assign-form-group">
                  <label htmlFor="tenant-name-input">Tenant Full Name *</label>
                  <input
                    id="tenant-name-input"
                    type="text"
                    className="assign-form-input"
                    placeholder="e.g. Deepak Sharma"
                    value={tenantNameInput}
                    onChange={(e) => setTenantNameInput(e.target.value)}
                    required
                  />
                </div>

                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label htmlFor="tenant-phone-input">Phone Number</label>
                    <input
                      id="tenant-phone-input"
                      type="tel"
                      className="assign-form-input"
                      placeholder="+91 98765 00000"
                      value={tenantPhoneInput}
                      onChange={(e) => setTenantPhoneInput(e.target.value)}
                    />
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="tenant-email-input">Email Address</label>
                    <input
                      id="tenant-email-input"
                      type="email"
                      className="assign-form-input"
                      placeholder="tenant@example.com"
                      value={tenantEmailInput}
                      onChange={(e) => setTenantEmailInput(e.target.value)}
                    />
                  </div>
                </div>

                {/* Move In & Expected End Date */}
                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label htmlFor="move-in-input">Move-In Date *</label>
                    <input
                      id="move-in-input"
                      type="date"
                      className="assign-form-input"
                      value={moveInDateInput}
                      onChange={(e) => setMoveInDateInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="stay-end-input">Expected Stay End Date</label>
                    <input
                      id="stay-end-input"
                      type="date"
                      className="assign-form-input"
                      value={stayEndDateInput}
                      onChange={(e) => setStayEndDateInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-table-action"
                  onClick={() => setAssignModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="quick-action-btn primary"
                  disabled={availableBedsForTargetRoom.length === 0}
                >
                  Confirm Bed Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Add Room Modal */}
      {addRoomModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Create New Room</h3>
                <p className="modal-subtitle">Add a room to the hostel inventory with auto-generated beds</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAddRoomModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddRoomSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="assign-form-group">
                  <label htmlFor="new-room-num">Room Number *</label>
                  <input
                    id="new-room-num"
                    type="text"
                    className="assign-form-input"
                    placeholder="e.g. 204 or 302"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="assign-form-row">
                  <div className="assign-form-group">
                    <label htmlFor="new-room-type">Room Type *</label>
                    <select
                      id="new-room-type"
                      className="assign-form-select"
                      value={newRoomType}
                      onChange={(e) => setNewRoomType(e.target.value)}
                    >
                      <option value="SINGLE">Single Sharing (1 Bed)</option>
                      <option value="DOUBLE">Double Sharing (2 Beds)</option>
                      <option value="TRIPLE">Triple Sharing (3 Beds)</option>
                    </select>
                  </div>
                  <div className="assign-form-group">
                    <label htmlFor="new-floor">Floor Number *</label>
                    <select
                      id="new-floor"
                      className="assign-form-select"
                      value={newFloor}
                      onChange={(e) => setNewFloor(Number(e.target.value))}
                    >
                      <option value={1}>Floor 1</option>
                      <option value={2}>Floor 2</option>
                      <option value={3}>Floor 3</option>
                      <option value={4}>Floor 4</option>
                    </select>
                  </div>
                </div>

                <div className="assign-form-group">
                  <label htmlFor="new-rent">Monthly Rent (₹) *</label>
                  <input
                    id="new-rent"
                    type="number"
                    min="1000"
                    step="500"
                    className="assign-form-input"
                    value={newMonthlyRent}
                    onChange={(e) => setNewMonthlyRent(e.target.value)}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
                    Security deposit will be defaulted to 1 month rent.
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-table-action"
                  onClick={() => setAddRoomModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="quick-action-btn primary"
                  disabled={isSubmittingRoom}
                >
                  {isSubmittingRoom ? 'Creating...' : 'Create Room & Beds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
