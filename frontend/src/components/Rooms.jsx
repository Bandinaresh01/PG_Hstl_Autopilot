import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { roomTypes } from '../data/roomData'
import './Rooms.css'

export default function Rooms({ preview = false }) {
  const [selectedRoomModal, setSelectedRoomModal] = useState(null)
  const navigate = useNavigate()

  // Open room detail modal
  const handleOpenDetails = (room) => {
    setSelectedRoomModal(room)
  }

  // Close room detail modal
  const handleCloseDetails = () => {
    setSelectedRoomModal(null)
  }

  // Handle Enquire click: navigate to /enquiry?room=<id>
  const handleEnquire = (room) => {
    if (selectedRoomModal) {
      handleCloseDetails()
    }
    navigate(`/enquiry?room=${room.id}`, {
      state: { selectedRoomType: room.name, roomId: room.id },
    })
  }

  // Handle ESC key to close modal and lock/unlock body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedRoomModal) {
        handleCloseDetails()
      }
    }

    if (selectedRoomModal) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedRoomModal])

  return (
    <section id="rooms" className={`rooms-section ${preview ? 'rooms-preview-mode' : ''}`}>
      <div className="rooms-container">
        {/* Section Header */}
        <div className="rooms-header">
          <div className="rooms-label-wrapper">
            <span className="rooms-label">ROOM OPTIONS</span>
          </div>
          <h2 className="rooms-heading">Find the Right Space for You</h2>
          <p className="rooms-description">
            Choose from comfortable sharing options designed for students and
            working professionals.
          </p>
        </div>

        {/* Room Cards Grid */}
        <div className="rooms-grid">
          {roomTypes.map((room) => (
            <article
              key={room.id}
              className={`room-card ${room.isPopular ? 'popular-card' : ''}`}
            >
              {/* Popular Badge */}
              {room.isPopular && (
                <div className="popular-badge">Most Popular</div>
              )}

              {/* Room Card Image */}
              <div className="room-card-image-wrapper">
                <img
                  src={room.image}
                  alt={`${room.name} at UrbanNest Hostel`}
                  className="room-card-image"
                  loading="lazy"
                />
                {/* Availability Badge Overlay */}
                <div className="availability-badge">
                  <span className="availability-dot" aria-hidden="true"></span>
                  <span>{room.availableBeds} Beds Available</span>
                </div>
              </div>

              {/* Room Card Body */}
              <div className="room-card-body">
                <div className="room-card-top">
                  <h3 className="room-card-title">{room.name}</h3>
                  <span className="room-card-capacity">{room.capacity}</span>
                </div>

                <p className="room-card-description">{room.shortDescription}</p>

                {/* Pricing Block */}
                <div className="room-card-pricing">
                  <div className="price-item">
                    <span className="price-amount">
                      ₹{room.rent.toLocaleString('en-IN')}
                    </span>
                    <span className="price-period">/ month</span>
                  </div>
                  {!preview && (
                    <div className="deposit-item">
                      Security Deposit: ₹{room.deposit.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                {/* Quick Included Amenities (Shown on Full Rooms Page only) */}
                {!preview && (
                  <div className="room-card-features">
                    <span className="features-title">Included:</span>
                    <div className="features-tags">
                      {room.cardFeatures.map((feature, idx) => (
                        <span key={idx} className="feature-tag">
                          <span className="feature-check" aria-hidden="true">
                            ✓
                          </span>
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Action Buttons */}
                <div className="room-card-actions">
                  {preview ? (
                    <>
                      <Link
                        to="/rooms"
                        className="room-btn room-btn-details"
                      >
                        Room Details
                      </Link>
                      <button
                        type="button"
                        className="room-btn room-btn-enquire"
                        onClick={() => handleEnquire(room)}
                      >
                        Enquire Now
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="room-btn room-btn-details"
                        onClick={() => handleOpenDetails(room)}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className="room-btn room-btn-enquire"
                        onClick={() => handleEnquire(room)}
                      >
                        Enquire Now
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Preview Footer CTA (On Home Page) */}
        {preview ? (
          <div className="section-preview-footer">
            <Link to="/rooms" className="btn-view-all">
              <span>View All Rooms &amp; Amenities</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          /* Full Page Bottom CTA Banner (On /rooms Page) */
          <div className="rooms-bottom-cta">
            <div className="rooms-bottom-cta-content">
              <h3 className="rooms-bottom-cta-title">Interested in a room?</h3>
              <p className="rooms-bottom-cta-desc">
                Tell us your preferred sharing option and expected move-in date, and our team will assist you right away.
              </p>
            </div>
            <Link to="/enquiry" className="rooms-bottom-cta-btn">
              Enquire Now
            </Link>
          </div>
        )}
      </div>

      {/* View Details Modal (Active on Full Rooms Page) */}
      {selectedRoomModal && (
        <div
          className="modal-overlay"
          onClick={handleCloseDetails}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-room-title"
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <span className="modal-label">Room Details</span>
                <h3 id="modal-room-title" className="modal-title">
                  {selectedRoomModal.name}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close details"
                onClick={handleCloseDetails}
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="modal-body">
              {/* Modal Image */}
              <div className="modal-image-wrapper">
                <img
                  src={selectedRoomModal.image}
                  alt={selectedRoomModal.name}
                  className="modal-image"
                />
                <div className="modal-availability-tag">
                  <span className="availability-dot" aria-hidden="true"></span>
                  <span>{selectedRoomModal.availableBeds} Beds Available</span>
                </div>
              </div>

              {/* Price & Deposit Summary */}
              <div className="modal-pricing-grid">
                <div className="modal-pricing-box">
                  <span className="modal-pricing-box-label">Monthly Rent</span>
                  <div className="modal-pricing-box-val">
                    ₹{selectedRoomModal.rent.toLocaleString('en-IN')}
                    <span className="price-period"> / month</span>
                  </div>
                </div>
                <div className="modal-pricing-box">
                  <span className="modal-pricing-box-label">
                    Security Deposit
                  </span>
                  <div className="modal-pricing-box-val">
                    ₹{selectedRoomModal.deposit.toLocaleString('en-IN')}
                    <span className="deposit-note">(Refundable)</span>
                  </div>
                </div>
              </div>

              {/* Room Description */}
              <div className="modal-section">
                <h4 className="modal-section-title">Overview</h4>
                <p className="modal-description-text">
                  {selectedRoomModal.fullDescription}
                </p>
              </div>

              {/* Full Amenities Included */}
              <div className="modal-section">
                <h4 className="modal-section-title">What is Included</h4>
                <ul className="modal-amenities-list">
                  {selectedRoomModal.includedAmenities.map((amenity, idx) => (
                    <li key={idx} className="modal-amenity-item">
                      <span className="modal-check-icon" aria-hidden="true">
                        ✓
                      </span>
                      <span>{amenity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="modal-enquire-btn"
                onClick={() => handleEnquire(selectedRoomModal)}
              >
                Enquire About This Room
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
