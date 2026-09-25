import React from 'react'
import { Link } from 'react-router-dom'
import './Hero.css'

export default function Hero() {
  const trustHighlights = [
    'Comfortable Rooms',
    'Homely Food',
    '24/7 Security',
    'Convenient Location',
  ]

  return (
    <section id="home" className="hero-section">
      <div className="hero-container">
        {/* Left Column: Content */}
        <div className="hero-content">
          {/* Location Badge */}
          <div className="hero-location-badge">
            <svg
              className="location-icon"
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Hyderabad, Telangana</span>
          </div>

          {/* Main Heading */}
          <h1 className="hero-heading">
            Comfortable Living.
            <br />
            <span className="hero-heading-highlight">Made Simple.</span>
          </h1>

          {/* Supporting Description */}
          <p className="hero-description">
            Comfortable rooms, essential amenities, homely food, and thoughtfully
            managed spaces for students and working professionals.
          </p>

          {/* CTA Buttons */}
          <div className="hero-actions">
            <Link to="/rooms" className="hero-btn hero-btn-primary">
              Explore Rooms
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
            <Link to="/enquiry" className="hero-btn hero-btn-secondary">
              Enquire Now
            </Link>
          </div>

          {/* Four Hostel-Specific Trust Highlights */}
          <div className="hero-highlights">
            {trustHighlights.map((item, index) => (
              <div key={index} className="highlight-item">
                <span className="check-icon" aria-hidden="true">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Multi-Image Hospitality Composition */}
        <div className="hero-visual-wrapper">
          <div className="hero-composition">
            {/* Primary Large Image: Building & Property Entrance */}
            <div className="hero-main-card">
              <img
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80"
                alt="UrbanNest Hostel building exterior and managed residential property in Hyderabad"
                className="hero-main-img"
                loading="eager"
              />
              <div className="hero-badge-tag hero-badge-location">
                <span className="badge-dot" aria-hidden="true"></span>
                <span>Verified Stay • Hyderabad</span>
              </div>
            </div>

            {/* Secondary Supporting Images: Room & Dining */}
            <div className="hero-sub-cards">
              {/* Supporting Card 1: Clean Furnished Bedroom */}
              <div className="hero-sub-card">
                <img
                  src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80"
                  alt="Comfortable furnished bedroom with study workstation at UrbanNest Hostel"
                  className="hero-sub-img"
                  loading="eager"
                />
                <span className="hero-sub-label">Furnished Rooms</span>
              </div>

              {/* Supporting Card 2: Homely Dining Area */}
              <div className="hero-sub-card">
                <img
                  src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
                  alt="Clean and spacious resident dining hall at UrbanNest Hostel"
                  className="hero-sub-img"
                  loading="eager"
                />
                <span className="hero-sub-label">Homely Meals</span>
              </div>
            </div>

            {/* Floating Trust Badge 2 */}
            <div className="hero-badge-floating">
              <span className="floating-badge-icon" aria-hidden="true">🍲</span>
              <div className="floating-badge-text">
                <strong>Homely Food Included</strong>
                <span>3 Daily Fresh Meals</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
