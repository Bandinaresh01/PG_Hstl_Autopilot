import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { galleryImages } from '../data/galleryData'
import './Gallery.css'

export default function Gallery({ preview = false }) {
  const [activeImageIndex, setActiveImageIndex] = useState(null)

  const displayedImages = preview
    ? galleryImages.slice(0, 4)
    : galleryImages

  const isLightboxOpen = activeImageIndex !== null
  const currentImage = isLightboxOpen ? galleryImages[activeImageIndex] : null

  // Open Lightbox
  const handleOpenLightbox = (index) => {
    setActiveImageIndex(index)
  }

  // Close Lightbox
  const handleCloseLightbox = () => {
    setActiveImageIndex(null)
  }

  // Next Image
  const handleNext = useCallback(() => {
    setActiveImageIndex((prevIndex) =>
      prevIndex === galleryImages.length - 1 ? 0 : prevIndex + 1
    )
  }, [])

  // Previous Image
  const handlePrev = useCallback(() => {
    setActiveImageIndex((prevIndex) =>
      prevIndex === 0 ? galleryImages.length - 1 : prevIndex - 1
    )
  }, [])

  // Keyboard navigation (Escape, ArrowLeft, ArrowRight) and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return
      if (e.key === 'Escape') {
        handleCloseLightbox()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      }
    }

    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLightboxOpen, handleNext, handlePrev])

  return (
    <section id="gallery" className={`gallery-section ${preview ? 'gallery-preview-mode' : ''}`}>
      <div className="gallery-container">
        {/* Section Header */}
        <div className="gallery-header">
          <div className="gallery-label-wrapper">
            <span className="gallery-label">OUR SPACES</span>
          </div>
          <h2 className="gallery-heading">Take a Look Around UrbanNest</h2>
          <p className="gallery-description">
            Explore the rooms and shared spaces designed to make everyday
            living comfortable.
          </p>
        </div>

        {/* Dynamic Asymmetrical Gallery Grid */}
        <div className="gallery-grid">
          {displayedImages.map((item, index) => (
            <div
              key={item.id}
              className={`gallery-item ${item.featured ? 'featured-item' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`View ${item.title}`}
              onClick={() => handleOpenLightbox(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleOpenLightbox(index)
                }
              }}
            >
              <img
                src={item.image}
                alt={item.title}
                className="gallery-image"
                loading="lazy"
              />
              <div className="gallery-item-overlay">
                <span className="gallery-category-pill">{item.category}</span>
                <h3 className="gallery-item-title">{item.title}</h3>
                <span className="gallery-view-hint">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  Click to Expand
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* View Full Gallery CTA on Home Preview */}
        {preview && (
          <div className="section-preview-footer">
            <Link to="/gallery" className="btn-view-all">
              <span>View Full Gallery</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && currentImage && (
        <div
          className="lightbox-overlay"
          onClick={handleCloseLightbox}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
        >
          <div
            className="lightbox-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              className="lightbox-close-btn"
              aria-label="Close image preview"
              onClick={handleCloseLightbox}
            >
              ✕
            </button>

            {/* Navigation Previous Button */}
            <button
              type="button"
              className="lightbox-nav-btn lightbox-prev-btn"
              aria-label="Previous image"
              onClick={handlePrev}
            >
              ‹
            </button>

            {/* Main Lightbox Image Viewport */}
            <div className="lightbox-image-container">
              <img
                src={currentImage.image}
                alt={currentImage.title}
                className="lightbox-image"
              />
            </div>

            {/* Navigation Next Button */}
            <button
              type="button"
              className="lightbox-nav-btn lightbox-next-btn"
              aria-label="Next image"
              onClick={handleNext}
            >
              ›
            </button>

            {/* Lightbox Footer Info */}
            <div className="lightbox-info">
              <div className="lightbox-info-left">
                <span className="lightbox-category">
                  {currentImage.category}
                </span>
                <h3 id="lightbox-title" className="lightbox-title">
                  {currentImage.title}
                </h3>
                <p className="lightbox-desc">{currentImage.description}</p>
              </div>
              <div className="lightbox-counter">
                {activeImageIndex + 1} / {galleryImages.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
