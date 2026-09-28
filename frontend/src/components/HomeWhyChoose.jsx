import React from 'react'
import { whyChooseBenefits } from '../data/facilitiesData'
import './HomeWhyChoose.css'

export default function HomeWhyChoose() {
  return (
    <section className="why-choose-section-compact">
      <div className="why-choose-container-compact">
        <div className="why-header-compact">
          <span className="why-label-compact">THE URBANNEST STANDARD</span>
          <h2 className="why-title-compact">Why Choose UrbanNest?</h2>
          <p className="why-desc-compact">
            Thoughtfully built for working professionals and students seeking a hassle-free, secure stay in Hyderabad.
          </p>
        </div>

        <div className="why-grid-compact">
          {whyChooseBenefits.map((item) => (
            <div key={item.id} className="why-card-compact">
              <span className="why-num-compact">{item.number}</span>
              <h3 className="why-card-title-compact">{item.title}</h3>
              <p className="why-card-desc-compact">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
