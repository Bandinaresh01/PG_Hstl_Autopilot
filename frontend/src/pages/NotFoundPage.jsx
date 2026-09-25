import React from 'react';
import { Link } from 'react-router-dom';
import './Pages.css';

const NotFoundPage = () => {
  return (
    <section className="not-found-section">
      <div className="not-found-card">
        <span className="not-found-code">Error 404</span>
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-text">
          The page you are looking for does not exist.
        </p>
        <Link to="/" className="not-found-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Home
        </Link>
      </div>
    </section>
  );
};

export default NotFoundPage;
