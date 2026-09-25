import './HostelOverview.css'

export default function HostelOverview() {
  const highlights = [
    {
      id: 'comfortable-rooms',
      text: 'Comfortable Rooms',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 4v16" />
          <path d="M2 8h18a2 2 0 0 1 2 2v10" />
          <path d="M2 17h20" />
          <path d="M6 8v9" />
        </svg>
      ),
    },
    {
      id: 'sharing-options',
      text: 'Multiple Sharing Options',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'study-environment',
      text: 'Study-Friendly Environment',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      ),
    },
    {
      id: 'secure-living',
      text: 'Secure Living',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'daily-amenities',
      text: 'Essential Daily Amenities',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      id: 'hyderabad-location',
      text: 'Convenient Hyderabad Location',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
  ]

  // Configurable quick property stats (easily editable placeholders)
  const quickStats = [
    { value: '3', label: 'Room Types' },
    { value: '24/7', label: 'Security' },
    { value: 'WiFi', label: 'Available' },
    { value: 'Daily', label: 'Housekeeping' },
  ]

  return (
    <section id="about" className="overview-section">
      <div className="overview-container">
        {/* Section Header (Label, Heading, Description) */}
        <div className="overview-header">
          <div className="overview-label-wrapper">
            <span className="overview-label">ABOUT URBANNEST</span>
          </div>
          <h2 className="overview-heading">
            A Better Place to Stay, Study &amp; Live
          </h2>
          <p className="overview-description">
            UrbanNest provides comfortable, secure, and thoughtfully maintained
            accommodation for students and working professionals in Hyderabad.
            Designed to offer the ease of a hassle-free stay with all essential daily
            amenities and a peaceful community environment.
          </p>
        </div>

        {/* Left Column: Hostel Property / Interior Image */}
        <div className="overview-image-wrapper">
          <div className="overview-image-card">
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
              alt="UrbanNest Hostel Hyderabad reception entrance and managed living environment"
              className="overview-image"
              loading="lazy"
            />
            <div className="overview-image-badge">
              <span className="overview-badge-icon" aria-hidden="true">✦</span>
              <span>Safe &amp; Well-Managed Accommodation</span>
            </div>
          </div>
        </div>

        {/* Details: Highlights & Quick Stats */}
        <div className="overview-details">
          {/* Highlights Grid */}
          <div className="overview-highlights-grid">
            {highlights.map((item) => (
              <div key={item.id} className="overview-highlight-card">
                <span className="highlight-icon-wrapper" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="highlight-text">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Quick Property Stats Bar */}
          <div className="overview-stats-grid">
            {quickStats.map((stat, idx) => (
              <div key={idx} className="overview-stat-card">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
