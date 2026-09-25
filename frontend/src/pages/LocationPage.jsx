import React from 'react';
import { Link } from 'react-router-dom';
import Location from '../components/Location';
import './Pages.css';

const LocationPage = () => {
  return (
    <div className="location-page">
      <div className="dedicated-page-bar">
        <div className="dedicated-page-bar-inner">
          <div className="dedicated-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span className="dedicated-breadcrumb-current">Location & Directions</span>
          </div>
          <span>Madhapur – HITEC City Road, Hyderabad</span>
        </div>
      </div>

      {/* Full Location Section with Map & Nearby Places */}
      <Location preview={false} />
    </div>
  );
};

export default LocationPage;
