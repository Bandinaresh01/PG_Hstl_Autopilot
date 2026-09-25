import { Link } from 'react-router-dom'
import { facilities, whyChooseBenefits } from '../data/facilitiesData'
import './Facilities.css'

export default function Facilities({ preview = false }) {
  // On Home preview, show the 4 featured essential facilities; on /facilities show all 12
  const displayedFacilities = preview
    ? facilities.filter((f) => f.isFeatured)
    : facilities

  // SVG Icon mapping for the 12 facilities
  const renderFacilityIcon = (id) => {
    switch (id) {
      case 'wifi':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h.01" />
            <path d="M2 8.82a15 15 0 0 1 20 0" />
            <path d="M5 12.859a10 10 0 0 1 14 0" />
            <path d="M8.5 16.429a5 5 0 0 1 7 0" />
          </svg>
        )
      case 'food':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
            <path d="M15 11v11" />
            <path d="M6 2v20" />
            <path d="M6 7h4a2 2 0 0 0 2-2V2" />
          </svg>
        )
      case 'security':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        )
      case 'housekeeping':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
          </svg>
        )
      case 'cctv':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
            <rect x="2" y="6" width="14" height="12" rx="2" />
          </svg>
        )
      case 'hot-water':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        )
      case 'power-backup':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        )
      case 'laundry':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="18" height="20" x="3" y="2" rx="2" />
            <circle cx="12" cy="13" r="5" />
            <path d="M12 10a2.5 2.5 0 0 0-2.5 2.5" />
            <circle cx="7.5" cy="5.5" r=".5" fill="currentColor" />
            <circle cx="10" cy="5.5" r=".5" fill="currentColor" />
          </svg>
        )
      case 'drinking-water':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 2H7l1 18a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2Z" />
            <path d="M6 8h12" />
          </svg>
        )
      case 'study-area':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h10" />
          </svg>
        )
      case 'parking':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="18" height="18" x="3" y="3" rx="3" />
            <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
          </svg>
        )
      case 'common-area':
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 11v 6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h3" />
            <path d="M17 11v6a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-3" />
            <path d="M6 11V7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v4" />
            <path d="M6 15h12" />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        )
    }
  }

  return (
    <section id="facilities" className="facilities-section">
      <div className="facilities-container">
        {/* ==================================================
            SUBSECTION 1: FACILITIES & SERVICES
        ================================================== */}
        <div className="facilities-header">
          <div className="facilities-label-wrapper">
            <span className="facilities-label">EVERYDAY COMFORT</span>
          </div>
          <h2 className="facilities-heading">
            {preview
              ? 'Top Everyday Facilities'
              : 'Everything You Need for a Comfortable Stay'}
          </h2>
          <p className="facilities-description">
            From essential utilities to everyday conveniences, UrbanNest is
            designed to make hostel living simple and comfortable.
          </p>
        </div>

        {/* Facilities Grid (4 on Home preview, 12 on /facilities) */}
        <div className="facilities-grid">
          {displayedFacilities.map((facility) => (
            <div
              key={facility.id}
              className={`facility-card ${
                facility.isFeatured ? 'featured-facility' : ''
              }`}
            >
              {facility.isFeatured && (
                <span className="featured-facility-tag">Essential</span>
              )}
              <div className="facility-icon-box">
                {renderFacilityIcon(facility.id)}
              </div>
              <h3 className="facility-name">{facility.name}</h3>
              <p className="facility-desc">{facility.description}</p>
            </div>
          ))}
        </div>

        {/* View All Facilities Button (Only on Home Preview) */}
        {preview && (
          <div className="section-preview-footer">
            <Link to="/facilities" className="btn-view-all">
              <span>View All 12 Facilities</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {/* ==================================================
            SUBSECTION 2: WHY CHOOSE URBANNEST (Shown on Home)
        ================================================== */}
        {preview && (
          <div className="why-choose-wrapper">
            <div className="why-choose-card">
              {/* Left Column: Property & Community Image */}
              <div className="why-choose-image-col">
                <div className="why-choose-image-container">
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=80"
                    alt="Students and professionals collaborating and living comfortably at UrbanNest Hostel Hyderabad"
                    className="why-choose-image"
                    loading="lazy"
                  />
                  <div className="why-choose-badge">
                    <span className="badge-star" aria-hidden="true">★</span>
                    <span>Trusted Student &amp; Executive Stay</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Why Choose Copy & Benefits */}
              <div className="why-choose-content-col">
                <div className="why-choose-label-wrapper">
                  <span className="facilities-label">WHY URBANNEST</span>
                </div>
                <h3 className="why-choose-heading">Why Choose UrbanNest?</h3>
                <p className="why-choose-description">
                  We believe student and executive accommodation should be simple,
                  welcoming, and secure. Here is what makes UrbanNest the
                  preferred choice in Hyderabad.
                </p>

                {/* 4 Benefit Items */}
                <div className="benefits-list">
                  {whyChooseBenefits.map((benefit) => (
                    <div key={benefit.id} className="benefit-item">
                      <span className="benefit-number">{benefit.number}</span>
                      <div className="benefit-text-block">
                        <h4 className="benefit-title">{benefit.title}</h4>
                        <p className="benefit-desc">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Action CTAs */}
                <div className="why-choose-actions">
                  <Link to="/rooms" className="why-btn why-btn-primary">
                    Explore Rooms
                  </Link>
                  <Link to="/enquiry" className="why-btn why-btn-secondary">
                    Enquire Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA on Full /facilities Page */}
        {!preview && (
          <div className="facilities-page-cta">
            <p className="facilities-page-cta-text">
              Ready to see which room fits your budget and sharing preference?
            </p>
            <div className="why-choose-actions" style={{ justifyContent: 'center' }}>
              <Link to="/rooms" className="why-btn why-btn-primary">
                Explore Rooms &amp; Pricing
              </Link>
              <Link to="/enquiry" className="why-btn why-btn-secondary">
                Enquire Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
