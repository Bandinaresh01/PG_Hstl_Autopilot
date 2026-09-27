import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchOwnerProperty,
  fetchOwnerFloors,
  createOwnerFloor,
  updateOwnerFloor,
  createOwnerRoom,
  updateOwnerRoom,
  addOwnerBed,
  updateOwnerBedStatus,
} from '../../utils/ownerAuth'
import './OwnerPropertyPage.css'
import './OwnerDashboardPage.css'

export default function OwnerPropertyPage() {
  const [propertyData, setPropertyData] = useState(null)
  const [floors, setFloors] = useState([])
  const [rooms, setRooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Expanded state for floors accordion (default all open)
  const [expandedFloors, setExpandedFloors] = useState({})

  // Floor Modals
  const [addFloorModalOpen, setAddFloorModalOpen] = useState(false)
  const [floorNumberInput, setFloorNumberInput] = useState(0)
  const [floorNameInput, setFloorNameInput] = useState('')
  const [isSubmittingFloor, setIsSubmittingFloor] = useState(false)

  const [editFloorModalOpen, setEditFloorModalOpen] = useState(false)
  const [editingFloor, setEditingFloor] = useState(null)
  const [editFloorNameInput, setEditFloorNameInput] = useState('')
  const [editFloorNumberInput, setEditFloorNumberInput] = useState(0)
  const [editFloorStatusInput, setEditFloorStatusInput] = useState('ACTIVE')

  // Room Modals
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false)
  const [targetFloorId, setTargetFloorId] = useState('')
  const [roomNumberInput, setRoomNumberInput] = useState('')
  const [roomTypeInput, setRoomTypeInput] = useState('DOUBLE')
  const [roomCapacityInput, setRoomCapacityInput] = useState(2)
  const [roomRentInput, setRoomRentInput] = useState(8500)
  const [roomDepositInput, setRoomDepositInput] = useState(8500)
  const [roomStatusInput, setRoomStatusInput] = useState('AVAILABLE')
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false)

  const [editRoomModalOpen, setEditRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [editRoomNumberInput, setEditRoomNumberInput] = useState('')
  const [editRoomFloorIdInput, setEditRoomFloorIdInput] = useState('')
  const [editRoomTypeInput, setEditRoomTypeInput] = useState('DOUBLE')
  const [editRoomCapacityInput, setEditRoomCapacityInput] = useState(2)
  const [editRoomRentInput, setEditRoomRentInput] = useState(8500)
  const [editRoomDepositInput, setEditRoomDepositInput] = useState(8500)
  const [editRoomStatusInput, setEditRoomStatusInput] = useState('AVAILABLE')
  const [applyRentToExisting, setApplyRentToExisting] = useState(false)
  const [isSubmittingEditRoom, setIsSubmittingEditRoom] = useState(false)

  // Bed Status Change Modal
  const [bedModalOpen, setBedModalOpen] = useState(false)
  const [selectedBed, setSelectedBed] = useState(null)
  const [selectedBedRoom, setSelectedBedRoom] = useState(null)
  const [bedStatusInput, setBedStatusInput] = useState('AVAILABLE')
  const [isUpdatingBed, setIsUpdatingBed] = useState(false)

  // Load property hierarchy and room inventory
  const loadProperty = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const prop = data.property || data.summary || {}
      setPropertyData(prop)
      const propFloors = prop.floors || data.floors || []
      const propRooms = prop.rooms || data.rooms || []
      setFloors(propFloors)
      setRooms(propRooms)

      // Default expand all floors
      const initialExpanded = {}
      propFloors.forEach((f) => {
        initialExpanded[f.id || f.floor_number] = true
      })
      setExpandedFloors(initialExpanded)
    } catch (err) {
      console.error('Failed to load property hierarchy:', err)
      setErrorMessage(err.message || 'Failed to load property configuration.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProperty()
  }, [loadProperty])

  // Toast notification timer
  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 4000)
  }

  const toggleFloorExpand = (floorKey) => {
    setExpandedFloors((prev) => ({
      ...prev,
      [floorKey]: !prev[floorKey],
    }))
  }

  // Handle Room Type change auto-setting capacity
  const handleRoomTypeChange = (type, setType, setCapacity) => {
    setType(type)
    if (type === 'SINGLE') setCapacity(1)
    else if (type === 'DOUBLE') setCapacity(2)
    else if (type === 'TRIPLE') setCapacity(3)
    else if (type === 'FOUR_SHARING') setCapacity(4)
  }

  // Open Add Room modal optionally preselecting a floor
  const handleOpenAddRoomModal = (floorId = '') => {
    const defaultFloorId = floorId || (floors[0]?.id || '')
    setTargetFloorId(defaultFloorId)
    setRoomNumberInput('')
    setRoomTypeInput('DOUBLE')
    setRoomCapacityInput(2)
    setRoomRentInput(8500)
    setRoomDepositInput(8500)
    setRoomStatusInput('AVAILABLE')
    setAddRoomModalOpen(true)
  }

  // Submit Add Floor
  const handleAddFloorSubmit = async (e) => {
    e.preventDefault()
    setIsSubmittingFloor(true)
    setErrorMessage('')
    try {
      await createOwnerFloor({
        floor_number: Number(floorNumberInput),
        floor_name: floorNameInput.trim() || undefined,
      })
      showSuccess(`Floor ${floorNumberInput} created successfully!`)
      setAddFloorModalOpen(false)
      setFloorNameInput('')
      setFloorNumberInput((prev) => Number(prev) + 1)
      await loadProperty()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create floor.')
    } finally {
      setIsSubmittingFloor(false)
    }
  }

  // Submit Edit Floor
  const handleEditFloorSubmit = async (e) => {
    e.preventDefault()
    if (!editingFloor) return
    setIsSubmittingFloor(true)
    setErrorMessage('')
    try {
      await updateOwnerFloor(editingFloor.id, {
        floor_name: editFloorNameInput.trim(),
        floor_number: Number(editFloorNumberInput),
        status: editFloorStatusInput,
      })
      showSuccess(`Floor updated successfully!`)
      setEditFloorModalOpen(false)
      await loadProperty()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update floor.')
    } finally {
      setIsSubmittingFloor(false)
    }
  }

  // Submit Add Room
  const handleAddRoomSubmit = async (e) => {
    e.preventDefault()
    if (!roomNumberInput.trim()) {
      setErrorMessage('Room number is required.')
      return
    }
    setIsSubmittingRoom(true)
    setErrorMessage('')
    try {
      await createOwnerRoom({
        floor_id: targetFloorId || undefined,
        room_number: roomNumberInput.trim(),
        room_type: roomTypeInput,
        capacity: Number(roomCapacityInput),
        monthly_rent: Number(roomRentInput),
        security_deposit: Number(roomDepositInput),
        status: roomStatusInput,
      })
      showSuccess(`Room ${roomNumberInput} added with ${roomCapacityInput} beds generated!`)
      setAddRoomModalOpen(false)
      await loadProperty()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create room.')
    } finally {
      setIsSubmittingRoom(false)
    }
  }

  // Open Edit Room Modal
  const handleOpenEditRoomModal = (room) => {
    setEditingRoom(room)
    setEditRoomNumberInput(room.room_number || '')
    setEditRoomFloorIdInput(room.floor_id || '')
    setEditRoomTypeInput(room.room_type || 'DOUBLE')
    setEditRoomCapacityInput(room.capacity || 2)
    setEditRoomRentInput(room.monthly_rent || 0)
    setEditRoomDepositInput(room.security_deposit || 0)
    setEditRoomStatusInput(room.status || 'AVAILABLE')
    setApplyRentToExisting(false)
    setEditRoomModalOpen(true)
  }

  // Submit Edit Room
  const handleEditRoomSubmit = async (e) => {
    e.preventDefault()
    if (!editingRoom) return
    setIsSubmittingEditRoom(true)
    setErrorMessage('')
    try {
      await updateOwnerRoom(editingRoom.id, {
        room_number: editRoomNumberInput.trim(),
        floor_id: editRoomFloorIdInput || undefined,
        room_type: editRoomTypeInput,
        capacity: Number(editRoomCapacityInput),
        monthly_rent: Number(editRoomRentInput),
        security_deposit: Number(editRoomDepositInput),
        status: editRoomStatusInput,
        apply_to_existing_tenants: applyRentToExisting,
      })
      showSuccess(`Room ${editRoomNumberInput} updated successfully!`)
      setEditRoomModalOpen(false)
      await loadProperty()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update room.')
    } finally {
      setIsSubmittingEditRoom(false)
    }
  }

  // Quick Add Bed to Room
  const handleQuickAddBed = async (room) => {
    setErrorMessage('')
    try {
      const res = await addOwnerBed(room.id)
      showSuccess(`Added ${res.bed?.bed_code || 'Bed'} to Room ${room.room_number}!`)
      await loadProperty()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to add bed.')
    }
  }

  // Open Bed Status Modal
  const handleOpenBedModal = (bed, room) => {
    setSelectedBed(bed)
    setSelectedBedRoom(room)
    setBedStatusInput(bed.status || 'AVAILABLE')
    setBedModalOpen(true)
  }

  // Submit Bed Status Update
  const handleBedStatusSubmit = async (e) => {
    e.preventDefault()
    if (!selectedBed) return
    setIsUpdatingBed(true)
    setErrorMessage('')
    try {
      await updateOwnerBedStatus(selectedBed.id, bedStatusInput)
      showSuccess(`Bed ${selectedBed.bed_code} status set to ${bedStatusInput}!`)
      setBedModalOpen(false)
      await loadProperty()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update bed status.')
    } finally {
      setIsUpdatingBed(false)
    }
  }

  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const map = {}
    floors.forEach((f) => {
      const key = f.id || String(f.floor_number)
      map[key] = []
    })

    rooms.forEach((r) => {
      // Find matching floor by floor_id or floor number
      let key = r.floor_id
      if (!key) {
        const found = floors.find((f) => f.floor_number === r.floor)
        if (found) key = found.id
      }
      if (!key && floors.length > 0) {
        key = floors[0].id
      }
      if (key) {
        if (!map[key]) map[key] = []
        map[key].push(r)
      }
    })
    return map
  }, [floors, rooms])

  return (
    <div className="owner-property-container">
      {/* 1. Toast Feedback */}
      {successMessage && (
        <div className="quick-action-toast" role="status">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="property-error-banner" role="alert">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage}</span>
          <button type="button" className="close-banner-btn" onClick={() => setErrorMessage('')}>×</button>
        </div>
      )}

      {/* 2. Page Header */}
      <div className="property-header-row">
        <div>
          <h1 className="property-header-title">Property Setup &amp; Hierarchy</h1>
          <p className="property-header-sub">
            Configure your hostel floors, rooms, bed capacity, monthly rent per person, and deposits dynamically.
          </p>
        </div>
        <div className="property-header-actions">
          <button
            type="button"
            className="action-btn secondary-btn"
            onClick={loadProperty}
            disabled={isLoading}
            title="Refresh from Supabase"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh
          </button>
          <button
            type="button"
            className="action-btn secondary-btn"
            onClick={() => {
              setFloorNumberInput(floors.length)
              setFloorNameInput('')
              setAddFloorModalOpen(true)
            }}
          >
            <span className="btn-icon">+</span> Add Floor
          </button>
          <button
            type="button"
            className="action-btn primary-btn"
            onClick={() => handleOpenAddRoomModal()}
          >
            <span className="btn-icon">+</span> Add Room
          </button>
        </div>
      </div>

      {/* 3. KPI Metrics Summary Cards */}
      <div className="property-stats-grid">
        <div className="property-stat-card">
          <div className="stat-label">Total Floors</div>
          <div className="stat-value">{propertyData?.floors_count ?? floors.length}</div>
          <div className="stat-sub">Configured in building</div>
        </div>
        <div className="property-stat-card">
          <div className="stat-label">Total Rooms</div>
          <div className="stat-value">{propertyData?.rooms_count ?? rooms.length}</div>
          <div className="stat-sub">Across all floors</div>
        </div>
        <div className="property-stat-card">
          <div className="stat-label">Total Bed Capacity</div>
          <div className="stat-value">{propertyData?.beds_count ?? 0}</div>
          <div className="stat-sub">Total student/tenant beds</div>
        </div>
        <div className="property-stat-card stat-occupied">
          <div className="stat-label">Occupied Beds</div>
          <div className="stat-value">{propertyData?.occupied_beds ?? 0}</div>
          <div className="stat-sub">
            {propertyData?.occupancy_rate ?? 0}% overall occupancy
          </div>
        </div>
        <div className="property-stat-card stat-available">
          <div className="stat-label">Available Beds</div>
          <div className="stat-value">{propertyData?.available_beds ?? 0}</div>
          <div className="stat-sub">Ready for new tenants</div>
        </div>
      </div>

      {/* 4. Policy Explanation Banner */}
      <div className="property-policy-callout">
        <div className="callout-icon">ℹ️</div>
        <div className="callout-text">
          <strong>Configurable Property Rules:</strong>
          <ul>
            <li><strong>Monthly Rent</strong> is defined <em>per bed / per person per month</em> (e.g. ₹8,500/mo).</li>
            <li><strong>Bed Generation:</strong> Creating or expanding a room automatically provisions labeled beds (<em>Bed A, Bed B...</em>).</li>
            <li><strong>Capacity Safety Guard:</strong> You can expand capacity at any time, but you cannot reduce capacity below currently occupied or reserved beds.</li>
            <li><strong>Rent Updates:</strong> You can apply new rents strictly to future tenants or optionally update active tenant monthly rates. Historical payments and records remain immutable.</li>
          </ul>
        </div>
      </div>

      {/* 5. Floors & Rooms Hierarchy */}
      <div className="floors-container">
        {isLoading && floors.length === 0 ? (
          <div className="property-loading-state">
            <div className="loading-spinner" />
            <p>Loading property structure from Supabase...</p>
          </div>
        ) : floors.length === 0 ? (
          <div className="property-empty-state">
            <div className="empty-icon">🏢</div>
            <h3>No Floors Configured Yet</h3>
            <p>Define your hostel floors to start organizing rooms, beds, and rent pricing.</p>
            <button
              type="button"
              className="action-btn primary-btn"
              onClick={() => setAddFloorModalOpen(true)}
            >
              + Create First Floor
            </button>
          </div>
        ) : (
          floors.map((floor) => {
            const floorKey = floor.id || String(floor.floor_number)
            const isExpanded = expandedFloors[floorKey] !== false
            const floorRooms = roomsByFloor[floorKey] || []
            const totalFloorBeds = floorRooms.reduce((sum, r) => sum + (r.capacity || (r.beds?.length || 0)), 0)
            const occupiedFloorBeds = floorRooms.reduce((sum, r) => sum + (r.occupied_beds_count ?? 0), 0)
            const availableFloorBeds = totalFloorBeds - occupiedFloorBeds

            return (
              <div key={floorKey} className="floor-card">
                {/* Floor Header Bar */}
                <div className="floor-card-header" onClick={() => toggleFloorExpand(floorKey)}>
                  <div className="floor-title-group">
                    <button
                      type="button"
                      className={`floor-accordion-toggle ${isExpanded ? 'open' : ''}`}
                      aria-label="Toggle Floor"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFloorExpand(floorKey)
                      }}
                    >
                      ▼
                    </button>
                    <div>
                      <div className="floor-name-row">
                        <h2 className="floor-name">
                          {floor.floor_name || `Floor ${floor.floor_number}`}
                        </h2>
                        <span className="floor-number-tag">Floor #{floor.floor_number}</span>
                        {floor.status === 'INACTIVE' && (
                          <span className="badge-inactive">Inactive</span>
                        )}
                      </div>
                      <div className="floor-meta-stats">
                        <span>{floorRooms.length} {floorRooms.length === 1 ? 'Room' : 'Rooms'}</span>
                        <span className="bullet">•</span>
                        <span>{totalFloorBeds} {totalFloorBeds === 1 ? 'Bed' : 'Beds'}</span>
                        <span className="bullet">•</span>
                        <span className="meta-occupied">{occupiedFloorBeds} Occupied</span>
                        <span className="bullet">•</span>
                        <span className="meta-available">{availableFloorBeds} Available</span>
                      </div>
                    </div>
                  </div>

                  <div className="floor-header-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="floor-action-btn"
                      title="Edit Floor Details"
                      onClick={() => {
                        setEditingFloor(floor)
                        setEditFloorNameInput(floor.floor_name || '')
                        setEditFloorNumberInput(floor.floor_number)
                        setEditFloorStatusInput(floor.status || 'ACTIVE')
                        setEditFloorModalOpen(true)
                      }}
                    >
                      ✏️ Edit Floor
                    </button>
                    <button
                      type="button"
                      className="floor-action-btn primary"
                      onClick={() => handleOpenAddRoomModal(floor.id)}
                    >
                      + Add Room
                    </button>
                  </div>
                </div>

                {/* Rooms List (Inside Expanded Floor) */}
                {isExpanded && (
                  <div className="floor-card-body">
                    {floorRooms.length === 0 ? (
                      <div className="floor-empty-rooms">
                        <p>No rooms added to this floor yet.</p>
                        <button
                          type="button"
                          className="action-btn secondary-btn small"
                          onClick={() => handleOpenAddRoomModal(floor.id)}
                        >
                          + Add Room to {floor.floor_name || `Floor ${floor.floor_number}`}
                        </button>
                      </div>
                    ) : (
                      <div className="rooms-hierarchy-grid">
                        {floorRooms.map((room) => {
                          const beds = room.beds || []
                          const occupiedCount = room.occupied_beds_count ?? beds.filter((b) => b.status === 'OCCUPIED').length
                          const availableCount = room.available_beds_count ?? beds.filter((b) => b.status === 'AVAILABLE').length

                          return (
                            <div key={room.id} className="room-hierarchy-card">
                              {/* Room Top Bar */}
                              <div className="room-top-bar">
                                <div>
                                  <div className="room-num-row">
                                    <h3 className="room-num">
                                      Room {room.room_number}
                                    </h3>
                                    <span className={`room-type-badge ${room.room_type?.toLowerCase() || ''}`}>
                                      {room.room_type ? room.room_type.replace('_', ' ') : 'Double'}
                                    </span>
                                  </div>
                                  <div className="room-pricing-row">
                                    <span className="room-rent-highlight">
                                      ₹{Number(room.monthly_rent || 0).toLocaleString('en-IN')}
                                    </span>
                                    <span className="room-rent-unit">/ bed / month</span>
                                    <span className="room-deposit-sub">
                                      • Dep: ₹{Number(room.security_deposit || 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                </div>

                                <div className="room-status-group">
                                  <span className={`status-pill ${room.status?.toLowerCase() || 'available'}`}>
                                    {room.status || 'AVAILABLE'}
                                  </span>
                                  <div className="room-actions-btns">
                                    <button
                                      type="button"
                                      className="btn-room-edit"
                                      title="Edit Room Pricing & Capacity"
                                      onClick={() => handleOpenEditRoomModal(room)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-room-add-bed"
                                      title="Add extra bed to this room"
                                      onClick={() => handleQuickAddBed(room)}
                                    >
                                      + Bed
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Capacity & Occupancy Progress */}
                              <div className="room-occupancy-bar">
                                <div className="occupancy-labels">
                                  <span>Capacity: {room.capacity || beds.length} Beds</span>
                                  <span>
                                    {occupiedCount} Occupied / {availableCount} Available
                                  </span>
                                </div>
                                <div className="occupancy-track">
                                  <div
                                    className="occupancy-fill"
                                    style={{
                                      width: `${room.capacity ? Math.min(100, Math.round((occupiedCount / room.capacity) * 100)) : 0}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Visual Beds Matrix */}
                              <div className="room-beds-section">
                                <div className="beds-section-label">Beds in Room:</div>
                                <div className="beds-chips-grid">
                                  {beds.map((bed) => {
                                    const isOccupied = bed.status === 'OCCUPIED'
                                    const isAvailable = bed.status === 'AVAILABLE'
                                    const isReserved = bed.status === 'RESERVED'
                                    const isMaintenance = bed.status === 'MAINTENANCE' || bed.status === 'UNAVAILABLE'

                                    let chipClass = 'bed-chip-available'
                                    if (isOccupied) chipClass = 'bed-chip-occupied'
                                    else if (isReserved) chipClass = 'bed-chip-reserved'
                                    else if (isMaintenance) chipClass = 'bed-chip-maintenance'

                                    return (
                                      <div
                                        key={bed.id}
                                        className={`bed-chip ${chipClass}`}
                                        onClick={() => !isOccupied && handleOpenBedModal(bed, room)}
                                        title={
                                          isOccupied
                                            ? `Assigned to ${bed.tenant_name || 'Tenant'}`
                                            : `Click to change status (${bed.status})`
                                        }
                                        style={{ cursor: isOccupied ? 'default' : 'pointer' }}
                                      >
                                        <div className="bed-chip-header">
                                          <span className="bed-chip-icon">🛏️</span>
                                          <span className="bed-chip-code">{bed.bed_code}</span>
                                        </div>
                                        <div className="bed-chip-status">
                                          {isOccupied ? (
                                            <span className="tenant-tag" title={bed.tenant_name}>
                                              👤 {bed.tenant_name ? bed.tenant_name.split(' ')[0] : 'Occupied'}
                                            </span>
                                          ) : (
                                            <span className="status-text">{bed.status}</span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* =========================================================================
          MODAL 1: ADD FLOOR
      ========================================================================= */}
      {addFloorModalOpen && (
        <div className="modal-backdrop">
          <div className="property-modal-dialog">
            <div className="modal-header">
              <h2>Add New Hostel Floor</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAddFloorModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddFloorSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="floorNumber">Floor Number *</label>
                <input
                  id="floorNumber"
                  type="number"
                  min="0"
                  max="50"
                  required
                  value={floorNumberInput}
                  onChange={(e) => setFloorNumberInput(e.target.value)}
                  placeholder="e.g. 0 for Ground, 1 for 1st Floor"
                />
                <span className="form-hint">
                  Use 0 for Ground Floor, 1 for First Floor, 2 for Second Floor, etc.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="floorName">Floor Name (Optional)</label>
                <input
                  id="floorName"
                  type="text"
                  value={floorNameInput}
                  onChange={(e) => setFloorNameInput(e.target.value)}
                  placeholder="e.g. Ground Floor, 1st Floor, Executive Wing"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="action-btn secondary-btn"
                  onClick={() => setAddFloorModalOpen(false)}
                  disabled={isSubmittingFloor}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn primary-btn"
                  disabled={isSubmittingFloor}
                >
                  {isSubmittingFloor ? 'Creating...' : 'Create Floor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDIT FLOOR
      ========================================================================= */}
      {editFloorModalOpen && editingFloor && (
        <div className="modal-backdrop">
          <div className="property-modal-dialog">
            <div className="modal-header">
              <h2>Edit Floor Details</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditFloorModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditFloorSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="editFloorNumber">Floor Number *</label>
                <input
                  id="editFloorNumber"
                  type="number"
                  min="0"
                  max="50"
                  required
                  value={editFloorNumberInput}
                  onChange={(e) => setEditFloorNumberInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="editFloorName">Floor Name *</label>
                <input
                  id="editFloorName"
                  type="text"
                  required
                  value={editFloorNameInput}
                  onChange={(e) => setEditFloorNameInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="editFloorStatus">Floor Status</label>
                <select
                  id="editFloorStatus"
                  value={editFloorStatusInput}
                  onChange={(e) => setEditFloorStatusInput(e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="action-btn secondary-btn"
                  onClick={() => setEditFloorModalOpen(false)}
                  disabled={isSubmittingFloor}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn primary-btn"
                  disabled={isSubmittingFloor}
                >
                  {isSubmittingFloor ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ADD ROOM
      ========================================================================= */}
      {addRoomModalOpen && (
        <div className="modal-backdrop">
          <div className="property-modal-dialog">
            <div className="modal-header">
              <h2>Add New Room</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAddRoomModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddRoomSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="targetFloor">Floor *</label>
                <select
                  id="targetFloor"
                  required
                  value={targetFloorId}
                  onChange={(e) => setTargetFloorId(e.target.value)}
                >
                  {floors.map((f) => (
                    <option key={f.id || f.floor_number} value={f.id || ''}>
                      {f.floor_name || `Floor ${f.floor_number}`} (Floor #{f.floor_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="roomNumber">Room Number *</label>
                  <input
                    id="roomNumber"
                    type="text"
                    required
                    placeholder="e.g. 101, 202, G01"
                    value={roomNumberInput}
                    onChange={(e) => setRoomNumberInput(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="roomType">Room Type *</label>
                  <select
                    id="roomType"
                    value={roomTypeInput}
                    onChange={(e) =>
                      handleRoomTypeChange(
                        e.target.value,
                        setRoomTypeInput,
                        setRoomCapacityInput
                      )
                    }
                  >
                    <option value="SINGLE">Single Room (1 Bed)</option>
                    <option value="DOUBLE">Double Sharing (2 Beds)</option>
                    <option value="TRIPLE">Triple Sharing (3 Beds)</option>
                    <option value="FOUR_SHARING">4 Sharing (4 Beds)</option>
                    <option value="CUSTOM">Custom Capacity</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="roomCapacity">Bed Capacity (Beds) *</label>
                  <input
                    id="roomCapacity"
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={roomCapacityInput}
                    onChange={(e) => setRoomCapacityInput(e.target.value)}
                  />
                  <span className="form-hint">
                    Auto-generates Bed A, Bed B... for each bed slot.
                  </span>
                </div>
                <div className="form-group">
                  <label htmlFor="roomStatus">Room Status</label>
                  <select
                    id="roomStatus"
                    value={roomStatusInput}
                    onChange={(e) => setRoomStatusInput(e.target.value)}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="roomRent">Monthly Rent (₹ per Bed / Person) *</label>
                  <input
                    id="roomRent"
                    type="number"
                    min="1000"
                    step="100"
                    required
                    value={roomRentInput}
                    onChange={(e) => setRoomRentInput(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="roomDeposit">Security Deposit (₹) *</label>
                  <input
                    id="roomDeposit"
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={roomDepositInput}
                    onChange={(e) => setRoomDepositInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="action-btn secondary-btn"
                  onClick={() => setAddRoomModalOpen(false)}
                  disabled={isSubmittingRoom}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn primary-btn"
                  disabled={isSubmittingRoom}
                >
                  {isSubmittingRoom ? 'Adding Room & Beds...' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: EDIT ROOM & CAPACITY SAFETY GUARD
      ========================================================================= */}
      {editRoomModalOpen && editingRoom && (
        <div className="modal-backdrop">
          <div className="property-modal-dialog">
            <div className="modal-header">
              <h2>Edit Room {editingRoom.room_number}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditRoomModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditRoomSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="editRoomFloor">Floor</label>
                <select
                  id="editRoomFloor"
                  value={editRoomFloorIdInput}
                  onChange={(e) => setEditRoomFloorIdInput(e.target.value)}
                >
                  {floors.map((f) => (
                    <option key={f.id || f.floor_number} value={f.id || ''}>
                      {f.floor_name || `Floor ${f.floor_number}`} (Floor #{f.floor_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="editRoomNumber">Room Number *</label>
                  <input
                    id="editRoomNumber"
                    type="text"
                    required
                    value={editRoomNumberInput}
                    onChange={(e) => setEditRoomNumberInput(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editRoomType">Room Type</label>
                  <select
                    id="editRoomType"
                    value={editRoomTypeInput}
                    onChange={(e) =>
                      handleRoomTypeChange(
                        e.target.value,
                        setEditRoomTypeInput,
                        setEditRoomCapacityInput
                      )
                    }
                  >
                    <option value="SINGLE">Single Room (1 Bed)</option>
                    <option value="DOUBLE">Double Sharing (2 Beds)</option>
                    <option value="TRIPLE">Triple Sharing (3 Beds)</option>
                    <option value="FOUR_SHARING">4 Sharing (4 Beds)</option>
                    <option value="CUSTOM">Custom Capacity</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="editRoomCapacity">Bed Capacity (Beds) *</label>
                  <input
                    id="editRoomCapacity"
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={editRoomCapacityInput}
                    onChange={(e) => setEditRoomCapacityInput(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editRoomStatus">Status</label>
                  <select
                    id="editRoomStatus"
                    value={editRoomStatusInput}
                    onChange={(e) => setEditRoomStatusInput(e.target.value)}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="FULL">FULL</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              </div>

              {/* Capacity Safety Guard Alert */}
              {Number(editRoomCapacityInput) < (editingRoom.capacity || 2) && (
                <div className="capacity-warning-box">
                  <strong>⚠️ Capacity Reduction Safety Rule:</strong>
                  <p>
                    Room currently has {editingRoom.occupied_beds_count ?? 0} active/reserved occupants.
                    You cannot reduce capacity below the number of occupied beds. Only unoccupied available beds will be safely removed.
                  </p>
                </div>
              )}

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="editRoomRent">Monthly Rent (₹ per Bed / Person) *</label>
                  <input
                    id="editRoomRent"
                    type="number"
                    min="1000"
                    step="100"
                    required
                    value={editRoomRentInput}
                    onChange={(e) => setEditRoomRentInput(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editRoomDeposit">Security Deposit (₹) *</label>
                  <input
                    id="editRoomDeposit"
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={editRoomDepositInput}
                    onChange={(e) => setEditRoomDepositInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Rent Update Scope Selection */}
              <div className="rent-propagation-card">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={applyRentToExisting}
                    onChange={(e) => setApplyRentToExisting(e.target.checked)}
                  />
                  <span className="checkbox-label">
                    <strong>Also update monthly rent for active tenants in this room</strong>
                  </span>
                </label>
                <p className="rent-prop-sub">
                  If unchecked (default), new rent applies strictly to new incoming tenants. Historical receipts and past dues are never modified.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="action-btn secondary-btn"
                  onClick={() => setEditRoomModalOpen(false)}
                  disabled={isSubmittingEditRoom}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn primary-btn"
                  disabled={isSubmittingEditRoom}
                >
                  {isSubmittingEditRoom ? 'Saving Changes...' : 'Save Room Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: CHANGE BED STATUS
      ========================================================================= */}
      {bedModalOpen && selectedBed && (
        <div className="modal-backdrop">
          <div className="property-modal-dialog">
            <div className="modal-header">
              <h2>Manage Bed: {selectedBed.bed_code}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setBedModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleBedStatusSubmit} className="modal-form">
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.9rem' }}>
                Room {selectedBedRoom?.room_number} • Bed {selectedBed.bed_code}
              </p>

              <div className="form-group">
                <label htmlFor="bedStatusSelect">Bed Status</label>
                <select
                  id="bedStatusSelect"
                  value={bedStatusInput}
                  onChange={(e) => setBedStatusInput(e.target.value)}
                >
                  <option value="AVAILABLE">AVAILABLE (Open for booking)</option>
                  <option value="RESERVED">RESERVED (Hold for upcoming tenant)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Temporarily offline)</option>
                  <option value="UNAVAILABLE">UNAVAILABLE</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="action-btn secondary-btn"
                  onClick={() => setBedModalOpen(false)}
                  disabled={isUpdatingBed}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn primary-btn"
                  disabled={isUpdatingBed}
                >
                  {isUpdatingBed ? 'Updating...' : 'Update Bed Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
