import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import HomePage from './pages/HomePage'
import RoomsPage from './pages/RoomsPage'
import FacilitiesPage from './pages/FacilitiesPage'
import GalleryPage from './pages/GalleryPage'
import LocationPage from './pages/LocationPage'
import EnquiryPage from './pages/EnquiryPage'
import NotFoundPage from './pages/NotFoundPage'

// Owner CRM imports
import OwnerLoginPage from './pages/owner/OwnerLoginPage'
import OwnerProtectedRoute from './components/owner/OwnerProtectedRoute'
import OwnerLayout from './components/owner/OwnerLayout'
import OwnerDashboardPage from './pages/owner/OwnerDashboardPage'
import OwnerBookingsPage from './pages/owner/OwnerBookingsPage'
import OwnerPaymentsPage from './pages/owner/OwnerPaymentsPage'
import OwnerDuesPage from './pages/owner/OwnerDuesPage'
import OwnerRoomsPage from './pages/owner/OwnerRoomsPage'
import OwnerTenantsPage from './pages/owner/OwnerTenantsPage'
import OwnerModulePlaceholder from './pages/owner/OwnerModulePlaceholder'

// Tenant Portal imports
import TenantLoginPage from './pages/tenant/TenantLoginPage'
import TenantOnboardingPage from './pages/tenant/TenantOnboardingPage'
import TenantProtectedRoute from './components/tenant/TenantProtectedRoute'
import TenantLayout from './components/tenant/TenantLayout'
import TenantDashboardPage from './pages/tenant/TenantDashboardPage'
import TenantStayPage from './pages/tenant/TenantStayPage'
import TenantPaymentsPage from './pages/tenant/TenantPaymentsPage'
import TenantServicesPage from './pages/tenant/TenantServicesPage'

import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==================================================
            1. OWNER AUTHENTICATION (Standalone Layout)
        ================================================== */}
        <Route path="/owner/login" element={<OwnerLoginPage />} />

        {/* ==================================================
            2. OWNER CRM DASHBOARD & MODULES (Protected Owner Routes)
        ================================================== */}
        <Route element={<OwnerProtectedRoute />}>
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="dashboard" element={<OwnerDashboardPage />} />
          <Route
            path="leads"
            element={
              <OwnerModulePlaceholder
                title="Leads & Enquiries Management"
                description="Lead tracking, enquiry follow-ups, and prospective tenant communication pipeline."
              />
            }
          />
          <Route path="bookings" element={<OwnerBookingsPage />} />
          <Route path="rooms" element={<OwnerRoomsPage />} />
          <Route path="tenants" element={<OwnerTenantsPage />} />
          <Route path="payments" element={<OwnerPaymentsPage />} />
          <Route path="dues" element={<OwnerDuesPage />} />
          <Route
            path="visitors"
            element={
              <OwnerModulePlaceholder
                title="Visitor Logs & Security"
                description="Daily visitor entry/exit records, host resident authorization, and security logs."
              />
            }
          />
          <Route
            path="complaints"
            element={
              <OwnerModulePlaceholder
                title="Tenant Complaints & Ticketing"
                description="Resident support ticketing, plumber/electrician assignments, and resolution tracking."
              />
            }
          />
          <Route
            path="maintenance"
            element={
              <OwnerModulePlaceholder
                title="Facility Maintenance"
                description="Preventive equipment maintenance, vendor work orders, and appliance servicing."
              />
            }
          />
          <Route
            path="announcements"
            element={
              <OwnerModulePlaceholder
                title="Announcements & Notices"
                description="Broadcast notifications, hostel rules, meal timing notices, and holiday announcements."
              />
            }
          />
          <Route
            path="reports"
            element={
              <OwnerModulePlaceholder
                title="Financial & Occupancy Reports"
                description="Revenue breakdowns, expense reports, monthly occupancy trends, and exportable CSVs."
              />
            }
          />
          <Route
            path="settings"
            element={
              <OwnerModulePlaceholder
                title="Hostel Settings & Preferences"
                description="Hostel profile, room pricing rules, staff roles, and notification preferences."
              />
            }
          />
        </Route>
      </Route>

      {/* ==================================================
          3. TENANT AUTHENTICATION & LOGIN (Standalone)
      ================================================== */}
      <Route path="/tenant/login" element={<TenantLoginPage />} />

      {/* ==================================================
          4. TENANT PORTAL & ONBOARDING (Protected Tenant Routes)
      ================================================== */}
      <Route element={<TenantProtectedRoute />}>
        <Route path="/tenant/onboarding" element={<TenantOnboardingPage />} />
        <Route path="/tenant" element={<TenantLayout />}>
          <Route index element={<Navigate to="/tenant/dashboard" replace />} />
          <Route path="dashboard" element={<TenantDashboardPage />} />
          <Route path="stay" element={<TenantStayPage />} />
          <Route path="payments" element={<TenantPaymentsPage />} />
          <Route path="services" element={<TenantServicesPage />} />
        </Route>
      </Route>

      {/* ==================================================
          5. PUBLIC WEBSITE ROUTES (PublicLayout)
      ================================================== */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/facilities" element={<FacilitiesPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/location" element={<LocationPage />} />
          <Route path="/enquiry" element={<EnquiryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
