import React from 'react'
import { Link } from 'react-router-dom'
import './HomeFacilitiesPreview.css'

export default function HomeFacilitiesPreview() {
  const essentialFacilities = [
    {
      id: 'wifi',
      title: 'High-Speed Wi-Fi',
      desc: 'Seamless high-speed optical fiber internet across all rooms, dining, and study areas.',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h.01" />
          <path d="M2 8.82a15 15 0 0 1 20 0" />
          <path d="M5 12.859a10 10 0 0 1 14 0" />
          <path d="M8.5 16.429a5 5 0 0 1 7 0" />
        </svg>
      ),
    },
    {
      id: 'food',
      title: '3-Times Homely Food',
      desc: 'Nutritious breakfast, lunch, and dinner prepared fresh daily with Sunday special non-veg & veg treats.',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
          <path d="M15 11v11" />
          <path d="M6 2v20" />
          <path d="M6 7h4a2 2 0 0 0 2-2V2" />
        </svg>
      ),
    },
    {
      id: 'housekeeping',
      title: 'Daily Housekeeping',
      desc: 'Dedicated daily room, washroom, and corridor cleaning with strict hygiene standards.',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          <path d="M5 3v4" />
          <path d="M19 17v4" />
        </svg>
      ),
    },
    {
      id: 'security',
      title: '24/7 Security & CCTV',
      desc: 'Monitored premises, security guards on duty, and digital biometric/visitor logs for safety.',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'power',
      title: '100% Power Backup',
      desc: 'Heavy-duty automatic diesel generator support so you never face work or study interruptions.',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
    },
    {
      id: 'water',
      title: 'RO Purified Water',
      desc: 'Multi-stage RO filtered mineral drinking water dispensers and 24-hr hot water geysers.',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      ),
    },
  ]

  return (
    <section className="home-fac-section" id="facilities-preview">
      <div className="home-fac-container">
        {/* Section Header */}
        <div className="home-fac-header">
          <span className="home-fac-label">COMFORT &amp; CONVENIENCE</span>
          <h2 className="home-fac-title">All Essential Amenities Included</h2>
          <p className="home-fac-desc">
            Everything you need for productive study and relaxed living without hidden maintenance charges.
          </p>
        </div>

        {/* 6 Curated Amenities Grid */}
        <div className="home-fac-grid">
          {essentialFacilities.map((fac) => (
            <div key={fac.id} className="home-fac-card">
              <div className="home-fac-card-header">
                <div className="home-fac-icon-wrap">{fac.icon}</div>
                <h3 className="home-fac-card-title">{fac.title}</h3>
              </div>
              <p className="home-fac-card-text">{fac.desc}</p>
            </div>
          ))}
        </div>

        {/* Dining & Full Facilities Banner */}
        <div className="home-dining-highlight-card">
          <div className="dining-highlight-info">
            <span className="dining-pill">Homely Food Included</span>
            <h3 className="dining-highlight-title">Nutritious 3-Times Daily Meals</h3>
            <p className="dining-highlight-desc">
              Enjoy freshly prepared South &amp; North Indian meals, weekly biryani specials, and hygienic dining hall seating. Plus washing machines, hot water geysers, and elevator access.
            </p>
          </div>
          <Link to="/facilities" className="btn-view-all-fac">
            <span>Explore All 12 Facilities &rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
