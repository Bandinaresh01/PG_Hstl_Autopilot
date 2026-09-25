import { Link } from 'react-router-dom'
import {
  hostelLocation,
  nearbyPlaces,
  contactInfo,
} from '../data/locationData'
import './Location.css'

export default function Location({ preview = false }) {
  // Render clean icons for nearby places
  const renderNearbyIcon = (type) => {
    switch (type) {
      case 'college':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        )
      case 'transit':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="16" height="16" x="4" y="3" rx="2" />
            <path d="M4 11h16" />
            <path d="M12 3v8" />
            <path d="m8 19-2 3" />
            <path d="m18 22-2-3" />
            <circle cx="8" cy="15" r="1" fill="currentColor" />
            <circle cx="16" cy="15" r="1" fill="currentColor" />
          </svg>
        )
      case 'hospital':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        )
      case 'market':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        )
      case 'food':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
            <path d="M15 11v11" />
            <path d="M6 2v20" />
            <path d="M6 7h4a2 2 0 0 0 2-2V2" />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        )
    }
  }

  // If on Home page preview mode, render compact location preview
  if (preview) {
    return (
      <section id="location" className="location-section location-preview-mode">
        <div className="location-container">
          <div className="location-preview-card">
            <div className="location-preview-content">
              <div className="location-label-wrapper">
                <span className="location-label">LOCATION</span>
              </div>
              <h2 className="location-preview-heading">
                Convenient Living in {hostelLocation.city}
              </h2>
              <p className="location-preview-desc">
                Strategically situated in the {hostelLocation.area} with rapid
                transit connections to Hyderabad's premier universities, tech
                parks, and daily conveniences.
              </p>

              {/* 3 Quick Nearby Badges */}
              <div className="location-preview-badges">
                {nearbyPlaces.slice(0, 3).map((place) => (
                  <div key={place.id} className="preview-badge-item">
                    <span className="preview-badge-icon">
                      {renderNearbyIcon(place.iconType)}
                    </span>
                    <span className="preview-badge-name">{place.name}</span>
                    <span className="preview-badge-time">{place.time}</span>
                  </div>
                ))}
              </div>

              <div className="location-preview-action">
                <Link to="/location" className="btn-view-all">
                  <span>View Location Details &amp; Map</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            {/* Compact Map Preview Teaser */}
            <div className="location-preview-map">
              <iframe
                title="UrbanNest Hyderabad Location Map Preview"
                src={hostelLocation.mapEmbedPlaceholder}
                className="preview-map-iframe"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
              <div className="preview-map-tag">
                <span className="map-pin-pulse" aria-hidden="true"></span>
                <span>{hostelLocation.city}, {hostelLocation.state}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Full /location page
  return (
    <section id="location" className="location-section">
      <div className="location-container">
        {/* Section Header */}
        <div className="location-header">
          <div className="location-label-wrapper">
            <span className="location-label">LOCATION</span>
          </div>
          <h2 className="location-heading">Everything You Need, Close By</h2>
          <p className="location-description">
            UrbanNest is strategically located in Hyderabad, ensuring students and
            working professionals stay closely connected to key educational institutions,
            tech corridors, and daily transit.
          </p>
        </div>

        {/* Location Layout Grid */}
        <div className="location-grid">
          {/* Left Column: Address, Nearby Places & Quick Contact */}
          <div className="location-info-col">
            {/* Address Banner */}
            <div className="location-address-card">
              <div className="address-icon-box">
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
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
              </div>
              <div className="address-details">
                <span className="address-city">
                  {hostelLocation.city}, {hostelLocation.state}
                </span>
                <p className="address-sub">{hostelLocation.area}</p>
                <p className="address-text">{hostelLocation.address}</p>
              </div>
            </div>

            {/* Nearby Places Cards */}
            <div className="nearby-places-section">
              <h3 className="nearby-places-title">Nearby Transit &amp; Hubs</h3>
              <div className="nearby-places-list">
                {nearbyPlaces.map((place) => (
                  <div key={place.id} className="nearby-place-card">
                    <div className="nearby-icon-wrapper">
                      {renderNearbyIcon(place.iconType)}
                    </div>
                    <div className="nearby-text">
                      <div className="nearby-name-row">
                        <span className="nearby-name">{place.name}</span>
                        <span className="nearby-time-badge">{place.time}</span>
                      </div>
                      <span className="nearby-desc">{place.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Contact Info Block */}
            <div className="location-contact-box">
              <h3 className="contact-box-title">Have Questions About Location?</h3>
              <p className="contact-box-desc">
                Contact our front desk team for precise directions or to schedule a visit.
              </p>
              <div className="contact-actions-row">
                <a
                  href={contactInfo.callUrl}
                  className="contact-action-btn btn-call"
                  aria-label={`Call us at ${contactInfo.phone}`}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z" />
                  </svg>
                  <span>Call Us</span>
                </a>
                <a
                  href={contactInfo.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-action-btn btn-whatsapp-location"
                  aria-label="Chat on WhatsApp"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.711 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Map Presentation Area */}
          <div className="location-map-col">
            <div className="location-map-card">
              <iframe
                title="UrbanNest Hostel Hyderabad Location Map"
                src={hostelLocation.mapEmbedPlaceholder}
                className="location-map-iframe"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
              <div className="map-overlay-banner">
                <div className="map-badge-info">
                  <span className="map-pin-pulse" aria-hidden="true"></span>
                  <div>
                    <strong className="map-badge-title">UrbanNest Hostel</strong>
                    <span className="map-badge-sub">Hyderabad, Telangana</span>
                  </div>
                </div>
                <a
                  href={hostelLocation.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-get-directions"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  <span>Get Directions</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
