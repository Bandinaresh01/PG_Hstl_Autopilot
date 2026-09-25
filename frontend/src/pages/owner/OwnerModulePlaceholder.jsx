import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import './OwnerDashboardPage.css'

export default function OwnerModulePlaceholder({ title, description, nextPhase = 'Phase 3' }) {
  const location = useLocation()

  return (
    <div className="owner-placeholder-container">
      <div className="owner-placeholder-card">
        <div className="placeholder-icon-badge">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <span className="placeholder-phase-tag">Upcoming Module • {nextPhase}</span>
        <h2 className="placeholder-title">{title}</h2>
        <p className="placeholder-desc">
          {description ||
            `The ${title} workflow is scheduled for the upcoming development phase. The Owner Dashboard is fully active with live operational previews.`}
        </p>
        <div className="placeholder-action-row">
          <Link to="/owner/dashboard" className="btn-placeholder-action">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
          <span className="placeholder-route-tag">Route: {location.pathname}</span>
        </div>
      </div>
    </div>
  )
}
