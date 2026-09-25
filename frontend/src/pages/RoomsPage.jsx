import React from 'react';
import { Link } from 'react-router-dom';
import Rooms from '../components/Rooms';
import './Pages.css';

const RoomsPage = () => {
  return (
    <div className="rooms-page">
      <div className="dedicated-page-bar">
        <div className="dedicated-page-bar-inner">
          <div className="dedicated-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span className="dedicated-breadcrumb-current">Rooms & Pricing</span>
          </div>
          <span>Hyderabad, Telangana</span>
        </div>
      </div>

      {/* Full Rooms + Pricing + Availability Section */}
      <Rooms preview={false} />
    </div>
  );
};

export default RoomsPage;
