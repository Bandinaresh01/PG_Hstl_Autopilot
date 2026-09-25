import React from 'react'
import Hero from '../components/Hero'
import HostelOverview from '../components/HostelOverview'
import Rooms from '../components/Rooms'
import FoodDining from '../components/FoodDining'
import Facilities from '../components/Facilities'
import Gallery from '../components/Gallery'
import Location from '../components/Location'
import ContactCTA from '../components/ContactCTA'
import './Pages.css'

const HomePage = () => {
  return (
    <div className="home-page">
      {/* 1. Improved Hero Section */}
      <Hero />

      {/* 2. Hostel Overview */}
      <HostelOverview />

      {/* 3. Rooms Preview */}
      <Rooms preview={true} />

      {/* 4. Food & Dining Section (Homely Food, Every Day) */}
      <FoodDining />

      {/* 5. Facilities Preview + Why Choose UrbanNest */}
      <Facilities preview={true} />

      {/* 6. Gallery Preview (Building, Bedroom, Dining, Study) */}
      <Gallery preview={true} />

      {/* 7. Location Preview */}
      <Location preview={true} />

      {/* 8. Redesigned Wide Instant Contact CTA */}
      <ContactCTA />
    </div>
  )
}

export default HomePage
