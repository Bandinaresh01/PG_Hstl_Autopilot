import React from 'react';
import { Link } from 'react-router-dom';
import Facilities from '../components/Facilities';
import './Pages.css';

const FacilitiesPage = () => {
  return (
    <div className="facilities-page">
      <div className="dedicated-page-bar">
        <div className="dedicated-page-bar-inner">
          <div className="dedicated-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span className="dedicated-breadcrumb-current">Facilities & Services</span>
          </div>
          <span>All 12 Essential Amenities Included</span>
        </div>
      </div>

      {/* Full Facilities & Services Section */}
      <Facilities preview={false} />
    </div>
  );
};

export default FacilitiesPage;
