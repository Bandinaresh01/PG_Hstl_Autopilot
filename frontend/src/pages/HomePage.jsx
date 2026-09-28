import React from 'react'
import Hero from '../components/Hero'
import HostelOverview from '../components/HostelOverview'
import Rooms from '../components/Rooms'
import HomeFacilitiesPreview from '../components/HomeFacilitiesPreview'
import HomeWhyChoose from '../components/HomeWhyChoose'
import Gallery from '../components/Gallery'
import Location from '../components/Location'
import ContactCTA from '../components/ContactCTA'
import './Pages.css'

const HomePage = () => {
  return (
    <div className="home-page">
      {/* 1. Hero Section: Headline, Location Badge, Primary CTAs */}
      <Hero />

      {/* 2. Hostel Overview: About UrbanNest, Key Highlights & Stats */}
      <HostelOverview />

      {/* 3. Room Types Preview: Single, Double & Triple Sharing Cards */}
      <Rooms preview={true} />

      {/* 4. Facilities & Dining Preview: 6 Curated Amenities & Meals Highlight */}
      <HomeFacilitiesPreview />

      {/* 5. Value Proposition: 4 Core Why Choose UrbanNest Pillars */}
      <HomeWhyChoose />

      {/* 6. Gallery Preview: 4 Curated Photo Cards with Lightbox */}
      <Gallery preview={true} />

      {/* 7. Location Preview: Hyderabad Hub Proximity & Interactive Map */}
      <Location preview={true} />

      {/* 8. Direct Contact & Enquiry CTA Banner */}
      <ContactCTA />
    </div>
  )
}

export default HomePage
