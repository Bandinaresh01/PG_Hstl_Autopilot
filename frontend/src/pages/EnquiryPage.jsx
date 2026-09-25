import React, { useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { roomTypes } from '../data/roomData'
import { contactInfo } from '../data/locationData'
import { API_BASE_URL } from '../config/api'
import './Pages.css'

const EnquiryPage = () => {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const queryRoomId = searchParams.get('room')
  const stateRoomTitle = location.state?.selectedRoomType

  const matchedRoom =
    roomTypes.find((r) => r.id === queryRoomId) ||
    roomTypes.find((r) => r.name === stateRoomTitle) ||
    null

  // Form field states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState(
    matchedRoom ? matchedRoom.id : roomTypes[1].id
  )
  const [moveInDate, setMoveInDate] = useState('immediately')
  const [occupation, setOccupation] = useState('Student')
  const [message, setMessage] = useState('')

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    // Frontend basic validation
    if (!name.trim() || !phone.trim()) {
      setErrorMessage('Please enter both your full name and phone number.')
      return
    }

    setIsSubmitting(true)

    const selectedRoomObj = roomTypes.find((r) => r.id === selectedRoomId)
    const preferredRoomName = selectedRoomObj ? selectedRoomObj.name : selectedRoomId

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      preferred_room: preferredRoomName,
      move_in_date: moveInDate,
      occupation: occupation,
      message: message.trim(),
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/enquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)

      if (response.ok && response.status === 201 && result) {
        // Clear form fields upon successful backend creation
        setName('')
        setPhone('')
        setEmail('')
        setMoveInDate('immediately')
        setOccupation('Student')
        setMessage('')
        setSubmitted(true)
      } else {
        setErrorMessage(
          "We couldn't submit your enquiry. Please try again."
        )
      }
    } catch {
      setErrorMessage(
        "We couldn't submit your enquiry. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="enquiry-page">
      <div className="dedicated-page-bar">
        <div className="dedicated-page-bar-inner">
          <div className="dedicated-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span className="dedicated-breadcrumb-current">Enquire Now</span>
          </div>
          <span>UrbanNest Hostel — Admissions &amp; Booking</span>
        </div>
      </div>

      <section className="enquiry-page-section">
        <div className="enquiry-page-container">
          <div className="enquiry-page-header">
            <span className="enquiry-page-label">GET IN TOUCH</span>
            <h1 className="enquiry-page-title">Enquire About Your Stay</h1>
            <p className="enquiry-page-subtitle">
              Share your details and preferred room type. Our team will contact you shortly with availability and move-in options.
            </p>
          </div>

          <div className="enquiry-shell-grid">
            <div className="enquiry-shell-card">
              {matchedRoom && !submitted && (
                <div className="enquiry-selected-banner">
                  <span>
                    Enquiring for: <strong>{matchedRoom.name}</strong> (₹
                    {matchedRoom.rent.toLocaleString('en-IN')}/month)
                  </span>
                  <Link
                    to="/rooms"
                    style={{ color: '#15803d', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Change Room
                  </Link>
                </div>
              )}

              {errorMessage && !submitted && (
                <div
                  role="alert"
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '0.85rem 1.15rem',
                    borderRadius: '12px',
                    marginBottom: '1.25rem',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {submitted ? (
                <div className="enquiry-success-box">
                  <div className="enquiry-success-icon">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '0.5rem' }}>
                    Enquiry Received!
                  </h3>
                  <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    Thank you for your interest in UrbanNest Hostel. Our warden/manager will reach out to you shortly via phone or WhatsApp.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button
                      type="button"
                      className="enquiry-call-btn"
                      onClick={() => {
                        setSubmitted(false)
                        setErrorMessage('')
                      }}
                    >
                      Submit Another Enquiry
                    </button>
                    <Link to="/rooms" className="not-found-btn" style={{ padding: '0.75rem 1.4rem' }}>
                      Browse Rooms
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="enquiry-form-grid">
                    <div className="enquiry-form-group">
                      <label className="enquiry-form-label" htmlFor="fullName">
                        Full Name
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        className="enquiry-form-input"
                        placeholder="e.g. Rahul Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="enquiry-form-group">
                      <label className="enquiry-form-label" htmlFor="phone">
                        Phone / WhatsApp Number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        className="enquiry-form-input"
                        placeholder="e.g. +91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="enquiry-form-grid">
                    <div className="enquiry-form-group">
                      <label className="enquiry-form-label" htmlFor="email">
                        Email Address (Optional)
                      </label>
                      <input
                        id="email"
                        type="email"
                        className="enquiry-form-input"
                        placeholder="e.g. rahul@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="enquiry-form-group">
                      <label className="enquiry-form-label" htmlFor="occupation">
                        Occupation
                      </label>
                      <select
                        id="occupation"
                        className="enquiry-form-select"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                      >
                        <option value="Student">Student</option>
                        <option value="Working Professional">Working Professional</option>
                        <option value="Exam Aspirant / Intern">Exam Aspirant / Intern</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="enquiry-form-grid">
                    <div className="enquiry-form-group">
                      <label className="enquiry-form-label" htmlFor="roomType">
                        Preferred Room Type
                      </label>
                      <select
                        id="roomType"
                        className="enquiry-form-select"
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                      >
                        {roomTypes.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name} — ₹{room.rent.toLocaleString('en-IN')}/month ({room.availableBeds} beds available)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="enquiry-form-group">
                      <label className="enquiry-form-label" htmlFor="moveIn">
                        Expected Move-In
                      </label>
                      <select
                        id="moveIn"
                        className="enquiry-form-select"
                        value={moveInDate}
                        onChange={(e) => setMoveInDate(e.target.value)}
                      >
                        <option value="immediately">Immediately / Within 3 Days</option>
                        <option value="this-month">Within This Month</option>
                        <option value="next-month">Next Month</option>
                        <option value="visiting-first">Want to Schedule a Visit First</option>
                      </select>
                    </div>
                  </div>

                  <div className="enquiry-form-group full-width">
                    <label className="enquiry-form-label" htmlFor="notes">
                      Questions or Special Requests (Optional)
                    </label>
                    <textarea
                      id="notes"
                      rows="3"
                      className="enquiry-form-textarea"
                      placeholder="Ask about food timings, two-wheeler parking, or room visit timings..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="enquiry-submit-btn"
                    disabled={isSubmitting}
                    style={{ opacity: isSubmitting ? 0.75 : 1 }}
                  >
                    {isSubmitting ? 'Submitting Enquiry...' : 'Send Enquiry Request'}
                  </button>
                </form>
              )}
            </div>

            <aside className="enquiry-side-card">
              <h3 className="enquiry-side-title">Prefer Instant Contact?</h3>
              <p className="enquiry-side-text">
                Chat directly with our property manager on WhatsApp or call us to book a guided property visit in Madhapur, Hyderabad.
              </p>

              <div className="enquiry-side-actions">
                <a
                  href={contactInfo.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="enquiry-whatsapp-btn"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.711 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
                  </svg>
                  <span>Chat on WhatsApp</span>
                </a>
                <a href={contactInfo.callUrl} className="enquiry-call-btn">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>Call {contactInfo.phone}</span>
                </a>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0.25rem 0' }} />

              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.35rem' }}>
                  Visiting Hours
                </div>
                <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500 }}>
                  {contactInfo.operatingHours}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}

export default EnquiryPage
