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
import OwnerLeadsPage from './pages/owner/OwnerLeadsPage'
import OwnerBookingsPage from './pages/owner/OwnerBookingsPage'
import OwnerPaymentsPage from './pages/owner/OwnerPaymentsPage'
import OwnerDuesPage from './pages/owner/OwnerDuesPage'
import OwnerRoomsPage from './pages/owner/OwnerRoomsPage'
import OwnerTenantsPage from './pages/owner/OwnerTenantsPage'
import OwnerComplaintsPage from './pages/owner/OwnerComplaintsPage'
import OwnerMaintenancePage from './pages/owner/OwnerMaintenancePage'
import OwnerVisitorsPage from './pages/owner/OwnerVisitorsPage'
import OwnerAnnouncementsPage from './pages/owner/OwnerAnnouncementsPage'
import OwnerReportsPage from './pages/owner/OwnerReportsPage'
import OwnerSettingsPage from './pages/owner/OwnerSettingsPage'
import OwnerPropertyPage from './pages/owner/OwnerPropertyPage'

// Tenant Portal imports
import TenantLoginPage from './pages/tenant/TenantLoginPage'
import TenantOnboardingPage from './pages/tenant/TenantOnboardingPage'
import TenantProtectedRoute from './components/tenant/TenantProtectedRoute'
import TenantLayout from './components/tenant/TenantLayout'
import TenantDashboardPage from './pages/tenant/TenantDashboardPage'
import TenantStayPage from './pages/tenant/TenantStayPage'
import TenantPaymentsPage from './pages/tenant/TenantPaymentsPage'
import TenantServicesPage from './pages/tenant/TenantServicesPage'
import TenantComplaintsPage from './pages/tenant/TenantComplaintsPage'
import TenantVisitorsPage from './pages/tenant/TenantVisitorsPage'

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
            <Route path="leads" element={<OwnerLeadsPage />} />
            <Route path="bookings" element={<OwnerBookingsPage />} />
            <Route path="rooms" element={<OwnerRoomsPage />} />
            <Route path="tenants" element={<OwnerTenantsPage />} />
            <Route path="payments" element={<OwnerPaymentsPage />} />
            <Route path="dues" element={<OwnerDuesPage />} />
            <Route path="visitors" element={<OwnerVisitorsPage />} />
            <Route path="complaints" element={<OwnerComplaintsPage />} />
            <Route path="maintenance" element={<OwnerMaintenancePage />} />
            <Route path="announcements" element={<OwnerAnnouncementsPage />} />
            <Route path="reports" element={<OwnerReportsPage />} />
            <Route path="property" element={<OwnerPropertyPage />} />
            <Route path="settings" element={<OwnerSettingsPage />} />
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
          <Route path="complaints" element={<TenantComplaintsPage />} />
          <Route path="complaints/:complaintId" element={<TenantComplaintsPage />} />
          <Route path="visitors" element={<TenantVisitorsPage />} />
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
