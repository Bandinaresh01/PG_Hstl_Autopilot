import { Link } from 'react-router-dom'
import { hostelLocation, contactInfo } from '../data/locationData'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Brand Column */}
        <div className="footer-col footer-brand-col">
          <Link to="/" className="footer-brand">
            <span className="footer-brand-title">UrbanNest</span>
            <span className="footer-brand-subtitle">Hostel</span>
          </Link>
          <p className="footer-description">
            Comfortable, secure, and thoughtfully maintained accommodation for
            students and working professionals in Hyderabad.
          </p>
          <div className="footer-location-tag">
            <svg
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
            <span>{hostelLocation.city}, {hostelLocation.state}</span>
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="footer-col">
          <h4 className="footer-col-title">Quick Links</h4>
          <ul className="footer-links-list">
            <li>
              <Link to="/" className="footer-link">
                Home
              </Link>
            </li>
            <li>
              <Link to="/rooms" className="footer-link">
                Rooms &amp; Pricing
              </Link>
            </li>
            <li>
              <Link to="/facilities" className="footer-link">
                Facilities &amp; Services
              </Link>
            </li>
            <li>
              <Link to="/gallery" className="footer-link">
                Photo Gallery
              </Link>
            </li>
            <li>
              <Link to="/location" className="footer-link">
                Location &amp; Directions
              </Link>
            </li>
            <li>
              <Link to="/owner/login" className="footer-link" style={{ opacity: 0.85 }}>
                Owner Portal →
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Column */}
        <div className="footer-col">
          <h4 className="footer-col-title">Contact &amp; Enquiries</h4>
          <ul className="footer-contact-list">
            <li>
              <span className="contact-label">Phone:</span>
              <a href={contactInfo.callUrl} className="footer-contact-link">
                {contactInfo.phone}
              </a>
            </li>
            <li>
              <span className="contact-label">WhatsApp:</span>
              <a
                href={contactInfo.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-contact-link"
              >
                {contactInfo.whatsapp}
              </a>
            </li>
            <li>
              <span className="contact-label">Email:</span>
              <a
                href={`mailto:${contactInfo.email}`}
                className="footer-contact-link"
              >
                {contactInfo.email}
              </a>
            </li>
            <li>
              <span className="contact-label">Visiting Hours:</span>
              <span className="contact-value">{contactInfo.operatingHours}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p className="copyright-text">
            &copy; {new Date().getFullYear()} UrbanNest Hostel. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
