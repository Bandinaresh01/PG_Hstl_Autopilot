import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { foodHighlights, mealSchedule, foodImages } from '../data/foodData'
import './FoodDining.css'

export default function FoodDining() {
  const [activeMealIndex, setActiveMealIndex] = useState(0)

  // Icon mapping for highlights
  const renderHighlightIcon = (icon) => {
    switch (icon) {
      case 'meals':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
            <path d="M15 11v11" />
            <path d="M6 2v20" />
            <path d="M6 7h4a2 2 0 0 0 2-2V2" />
          </svg>
        )
      case 'dining':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 10h6" />
            <path d="M9 14h6" />
            <path d="M9 18h6" />
          </svg>
        )
      case 'kitchen':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v18" />
            <path d="M3 12h18" />
          </svg>
        )
      case 'water':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        )
      case 'time':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        )
    }
  }

  const activeMeal = mealSchedule[activeMealIndex]

  return (
    <section id="dining" className="food-dining-section">
      <div className="food-dining-container">
        {/* Section Header */}
        <div className="food-dining-header">
          <div className="food-dining-label-wrapper">
            <span className="food-dining-label">FOOD &amp; DINING</span>
          </div>
          <h2 className="food-dining-heading">Homely Food, Every Day</h2>
          <p className="food-dining-description">
            Enjoy convenient daily meals served in a clean and comfortable dining environment.
            Prepared fresh using quality ingredients with rotating regional varieties.
          </p>
        </div>

        {/* 2-Column Presentation: Visual Composition Left, Meal Features Right */}
        <div className="food-dining-grid">
          {/* Left Column: Food & Dining Image Showcase */}
          <div className="food-visuals-col">
            <div className="food-main-img-card">
              <img
                src={foodImages.mainDining}
                alt="Clean and hygienic resident dining hall at UrbanNest Hostel"
                className="food-main-img"
                loading="lazy"
              />
              <div className="food-img-badge">
                <span className="food-badge-dot" aria-hidden="true"></span>
                <span>Resident Dining Hall</span>
              </div>
            </div>

            <div className="food-sub-imgs-row">
              <div className="food-sub-img-card">
                <img
                  src={foodImages.kitchen}
                  alt="Spotless commercial hostel kitchen with hygienic preparation"
                  className="food-sub-img"
                  loading="lazy"
                />
                <span className="food-sub-caption">Hygienic Kitchen</span>
              </div>
              <div className="food-sub-img-card">
                <img
                  src={foodImages.mealPlate}
                  alt="Nutritious wholesome Indian meal served daily to residents"
                  className="food-sub-img"
                  loading="lazy"
                />
                <span className="food-sub-caption">Fresh Daily Meals</span>
              </div>
            </div>
          </div>

          {/* Right Column: Key Highlights & Interactive Meal Variety Tabs */}
          <div className="food-content-col">
            {/* Highlights List */}
            <div className="food-highlights-list">
              {foodHighlights.map((item) => (
                <div key={item.id} className="food-highlight-item">
                  <div className="food-highlight-icon">
                    {renderHighlightIcon(item.icon)}
                  </div>
                  <div className="food-highlight-text">
                    <h3 className="food-highlight-title">{item.title}</h3>
                    <p className="food-highlight-desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Meal Variety Schedule Preview */}
            <div className="meal-schedule-card">
              <div className="meal-schedule-top">
                <h4 className="meal-schedule-title">Daily Meal Timings &amp; Menu Preview</h4>
                <div className="meal-tabs" role="tablist">
                  {mealSchedule.map((item, idx) => (
                    <button
                      key={item.meal}
                      type="button"
                      role="tab"
                      aria-selected={activeMealIndex === idx}
                      className={`meal-tab-btn ${activeMealIndex === idx ? 'active' : ''}`}
                      onClick={() => setActiveMealIndex(idx)}
                    >
                      {item.meal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="meal-details-box">
                <div className="meal-meta-row">
                  <span className="meal-badge">{activeMeal.badge}</span>
                  <span className="meal-time">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {activeMeal.time}
                  </span>
                </div>
                <div className="meal-type-label">Typical Menu Items:</div>
                <p className="meal-items-text">{activeMeal.items}</p>
              </div>

              <div className="food-cta-row">
                <Link to="/enquiry" className="food-enquire-btn">
                  Ask About Meal Plans
                  <span aria-hidden="true">→</span>
                </Link>
                <span className="food-note">Custom diet preferences can be discussed during room enquiry.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
