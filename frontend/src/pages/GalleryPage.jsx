import React from 'react';
import { Link } from 'react-router-dom';
import Gallery from '../components/Gallery';
import './Pages.css';

const GalleryPage = () => {
  return (
    <div className="gallery-page">
      <div className="dedicated-page-bar">
        <div className="dedicated-page-bar-inner">
          <div className="dedicated-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span className="dedicated-breadcrumb-current">Photo Gallery</span>
          </div>
          <span>Click any photo to open full-screen view</span>
        </div>
      </div>

      {/* Full Gallery Section with Lightbox */}
      <Gallery preview={false} />
    </div>
  );
};

export default GalleryPage;
